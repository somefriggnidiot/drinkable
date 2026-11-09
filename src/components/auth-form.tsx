"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { errorMessage } from "@/lib/client";
import styles from "./ui.module.css";
import { useHydrated } from "@/lib/use-hydrated";
type Mode = "signin" | "register" | "forgot" | "reset";
export function AuthForm({
  mode,
  google,
  token,
  error,
}: {
  mode: Mode;
  google: boolean;
  token?: string;
  error?: string;
}) {
  const ready = useHydrated();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(error || "");
  const [sent, setSent] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "register") {
        const result = await authClient.signUp.email({
          name: String(data.get("name")),
          email: String(data.get("email")),
          password: String(data.get("password")),
          callbackURL: "/my-account/dashboard/",
        });
        if (result.error) throw new Error(result.error.message);
        setSent(true);
      } else if (mode === "signin") {
        const result = await authClient.signIn.email({
          email: String(data.get("email")),
          password: String(data.get("password")),
          rememberMe: data.get("remember") === "on",
        });
        if (result.error) throw new Error(result.error.message);
        router.push("/my-account/dashboard/");
        router.refresh();
      } else if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email: String(data.get("email")),
          redirectTo: `${window.location.origin}/my-account/reset-password/`,
        });
        if (result.error) throw new Error(result.error.message);
        setSent(true);
      } else {
        if (!token)
          throw new Error(
            "This reset link is incomplete. Request a new password reset email.",
          );
        const result = await authClient.resetPassword({
          newPassword: String(data.get("password")),
          token,
        });
        if (result.error) throw new Error(result.error.message);
        setSent(true);
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function googleSignIn() {
    setBusy(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/my-account/dashboard/",
      });
      if (result.error) throw new Error(result.error.message);
    } catch (error) {
      setMessage(errorMessage(error));
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className={styles.authPage}>
      <section className={styles.authPanel}>
        {mode === "signin" || mode === "register" ? (
          <nav className={styles.authTabs} aria-label="Account access">
            <Link
              href="/my-account/"
              aria-current={mode === "signin" ? "page" : undefined}
            >
              Sign in
            </Link>
            <Link
              href="/my-account/?register=1"
              aria-current={mode === "register" ? "page" : undefined}
            >
              Register
            </Link>
          </nav>
        ) : (
          <h1>
            {mode === "forgot"
              ? "Lost your password?"
              : "Choose a new password"}
          </h1>
        )}
        {sent ? (
          <div className={styles.success} role="status">
            {mode === "register" ? (
              "Check your email to verify your account before signing in."
            ) : mode === "forgot" ? (
              "If an account exists for that email, we’ve sent a password reset link."
            ) : (
              <>
                Your password has been reset.{" "}
                <Link href="/my-account/">Sign in</Link>.
              </>
            )}
          </div>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            {mode === "register" && (
              <label>
                Display name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={mode === "signin" ? 1 : 10}
                  maxLength={128}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                />
              </label>
            )}
            {mode === "register" && (
              <label className={styles.checkbox}>
                <input type="checkbox" required />I agree to the{" "}
                <Link href="/terms/">terms</Link> and{" "}
                <Link href="/privacy-policy/">privacy policy</Link>.
              </label>
            )}
            {mode === "signin" && (
              <label className={styles.checkbox}>
                <input name="remember" type="checkbox" defaultChecked />
                Remember me
              </label>
            )}
            <button
              type="submit"
              className={styles.primary}
              disabled={busy || !ready}
            >
              {busy
                ? "Please wait…"
                : {
                    signin: "Sign in",
                    register: "Sign up",
                    forgot: "Send reset link",
                    reset: "Reset password",
                  }[mode]}
            </button>
          </form>
        )}
        {message && (
          <p role="alert" className={styles.error}>
            {message}
          </p>
        )}
        {mode === "signin" && (
          <p style={{ marginTop: 20 }}>
            <Link href="/my-account/lost-password/">Forgot password?</Link>
          </p>
        )}
        {google && (mode === "signin" || mode === "register") && !sent && (
          <>
            <p style={{ textAlign: "center", marginTop: 25 }}>
              Or connect with
            </p>
            <button
              type="button"
              className={styles.googleButton}
              disabled={busy}
              onClick={googleSignIn}
            >
              Continue with Google
            </button>
          </>
        )}
      </section>
    </main>
  );
}
