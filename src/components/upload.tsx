"use client";
import { useState } from "react";
import { apiFetch, errorMessage } from "@/lib/client";
import styles from "./ui.module.css";
export function Upload({
  label,
  onReady,
}: {
  label: string;
  onReady: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function upload(file: File) {
    setBusy(true);
    setMessage("Uploading photo…");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("alt", label);
      const result = await apiFetch<{ id: string }>("/api/media", {
        method: "POST",
        body: form,
      });
      for (let attempt = 0; attempt < 60; attempt++) {
        const state = await apiFetch<{ status: string; url: string }>(
          `/api/media/${result.id}`,
        );
        if (state.status === "ready") {
          onReady(state.url);
          setMessage("Photo ready.");
          return;
        }
        if (state.status === "failed")
          throw new Error(
            "The photo could not be processed. Please upload another image.",
          );
        setMessage("Processing photo…");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      throw new Error(
        "Processing is taking longer than expected. Please try again shortly.",
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.upload}>
      <label>
        {label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </label>
      <small>JPEG, PNG, or WebP. Up to 10 MB.</small>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
