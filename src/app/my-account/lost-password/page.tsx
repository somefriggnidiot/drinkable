import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Reset password" };
export default function Forgot() {
  return <AuthForm mode="forgot" google={false} />;
}
