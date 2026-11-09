import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Choose a new password" };
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const query = await searchParams;
  return (
    <AuthForm
      mode="reset"
      token={query.token}
      google={false}
      error={
        query.error
          ? "This reset link has expired. Please request another."
          : undefined
      }
    />
  );
}
