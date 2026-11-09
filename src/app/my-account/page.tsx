import { redirect } from "next/navigation";
import { currentMember } from "@/lib/access";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "My account" };
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const member = await currentMember();
  if (member?.emailVerified) redirect("/my-account/dashboard/");
  const query = await searchParams;
  return (
    <AuthForm
      mode={Object.hasOwn(query, "register") ? "register" : "signin"}
      google={Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      )}
      error={
        query.verify
          ? "Please verify your email before continuing."
          : query.error
            ? "We couldn’t complete sign-in. Please try again."
            : undefined
      }
    />
  );
}
