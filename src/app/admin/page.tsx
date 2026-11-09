import { notFound } from "next/navigation";
import { requirePageMember, isStaff } from "@/lib/access";
import { api } from "@/lib/api";
import { headers } from "next/headers";
import { Admin } from "@/components/admin";
import { adminSections } from "@/domain/admin";
export const metadata = {
  title: "Staff administration",
  robots: { index: false, follow: false },
};
export default async function Administration({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const member = await requirePageMember();
  if (!isStaff(member)) notFound();
  const query = await searchParams;
  const section = query.section || "breweries";
  if (
    !adminSections.some((value) => value === section) ||
    (section === "users" && member.role !== "admin")
  )
    notFound();
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1));
  const response = await api(
    new Request(
      `${process.env.APP_URL || "http://localhost:3000"}/api/admin/${section}?page=${page}`,
      { headers: await headers() },
    ),
    ["admin", section],
  );
  if (!response.ok) throw new Error("The staff section could not be loaded.");
  return (
    <Admin
      section={section}
      rows={await response.json()}
      admin={member.role === "admin"}
      page={page}
    />
  );
}
