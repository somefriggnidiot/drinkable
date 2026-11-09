import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, appUrl } from "./auth";
import { pool } from "@/db";
import { AppError } from "./errors";
import type { Member } from "@/domain/types";

export async function memberFromHeaders(h: Headers): Promise<Member | null> {
  const result = await auth.api.getSession({ headers: h });
  if (!result) return null;
  // Re-read permissions so revoked ownership, disabled accounts, and changed staff roles take effect immediately.
  const { rows } = await pool.query(
    'SELECT id,name,email,email_verified AS "emailVerified",role,disabled,image FROM app_user WHERE id=$1',
    [result.user.id],
  );
  return rows[0] && !rows[0].disabled ? (rows[0] as Member) : null;
}
export async function currentMember() {
  return memberFromHeaders(await headers());
}
export async function requireMember(h: Headers): Promise<Member> {
  const member = await memberFromHeaders(h);
  if (!member) throw new AppError(401, "Sign in to continue.");
  if (!member.emailVerified)
    throw new AppError(403, "Verify your email to continue.");
  return member;
}
export async function requirePageMember(): Promise<Member> {
  const member = await currentMember();
  if (!member) redirect("/my-account/");
  if (!member.emailVerified) redirect("/my-account/?verify=1");
  return member;
}
export function isStaff(member: Member | null) {
  return member?.role === "staff" || member?.role === "admin";
}
export function staffOnly(member: Member) {
  if (!isStaff(member)) throw new AppError(403, "Staff access is required.");
}
export function adminOnly(member: Member) {
  if (member.role !== "admin")
    throw new AppError(403, "Administrator access is required.");
}
export function checkOrigin(request: Request) {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    request.headers.get("origin") !== new URL(appUrl).origin
  )
    throw new AppError(403, "This request must come from Drinkable City.");
}
export async function canEdit(member: Member, breweryId: string) {
  if (isStaff(member)) return true;
  const result = await pool.query(
    "SELECT 1 FROM ownership WHERE user_id=$1 AND brewery_id=$2",
    [member.id, breweryId],
  );
  return Boolean(result.rowCount);
}
