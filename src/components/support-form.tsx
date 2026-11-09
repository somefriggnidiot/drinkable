"use client";
import { useState, type FormEvent } from "react";
import { apiFetch, errorMessage } from "@/lib/client";
import styles from "./ui.module.css";
export function SupportForm({
  kind,
  breweryId,
}: {
  kind: "contact" | "suggestion" | "claim" | "report";
  breweryId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setMessage("");
    try {
      const path =
        kind === "contact"
          ? "/api/contact"
          : `/api/${{ suggestion: "suggestions", claim: "claims", report: "reports" }[kind]}/${breweryId}`;
      await apiFetch(path, { method: "POST", body: JSON.stringify(data) });
      setDone(true);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <p role="status" className={styles.success}>
        {kind === "claim"
          ? "Your ownership claim is awaiting staff review."
          : kind === "report"
            ? "Thank you. Staff will review your report."
            : "Thank you. Your message has been sent to Drinkable staff."}
      </p>
    );
  return (
    <form className={styles.form} onSubmit={submit}>
      {kind === "contact" && (
        <>
          <label>
            Name
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </label>
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Subject
            <input name="subject" required minLength={2} maxLength={200} />
          </label>
          <label>
            Message
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={10000}
            />
          </label>
          <label className={styles.hiddenField} aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </>
      )}
      {kind === "suggestion" && (
        <>
          <label>
            Your email
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <label>
            What needs changed?
            <textarea name="message" minLength={10} maxLength={5000} required />
          </label>
          <label>
            Where can this information be validated?
            <textarea name="evidence" minLength={5} maxLength={2000} required />
          </label>
        </>
      )}
      {kind === "claim" && (
        <>
          <p>
            Tell us how you are connected to this brewery. Include your role and
            an official website or business contact that staff can use to verify
            ownership.
          </p>
          <label>
            Ownership evidence
            <textarea
              name="evidence"
              minLength={20}
              maxLength={5000}
              required
            />
          </label>
        </>
      )}
      {kind === "report" && (
        <label>
          Why are you reporting this review?
          <textarea name="reason" minLength={10} maxLength={2000} required />
        </label>
      )}
      {message && (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}
      <button type="submit" className={styles.primary} disabled={busy}>
        {busy
          ? "Sending…"
          : kind === "claim"
            ? "Submit ownership claim"
            : kind === "report"
              ? "Send report"
              : "Send message"}
      </button>
    </form>
  );
}
