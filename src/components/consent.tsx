"use client";
import Script from "next/script";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./ui.module.css";
const subscribeLocal = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("drinkable:consent", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("drinkable:consent", callback);
  };
};
const localSnapshot = () => {
  try {
    return localStorage.getItem("drinkable-consent") || "unset";
  } catch {
    return "unset";
  }
};
const subscribeCmp = (callback: () => void) => {
  document.addEventListener("cookieyes_consent_update", callback);
  document.addEventListener("drinkable:cmp-ready", callback);
  return () => {
    document.removeEventListener("cookieyes_consent_update", callback);
    document.removeEventListener("drinkable:cmp-ready", callback);
  };
};
const cmpSnapshot = () =>
  Boolean(window.getCkyConsent?.().categories?.advertisement);
export function Consent() {
  const stored = useSyncExternalStore(
    subscribeLocal,
    localSnapshot,
    () => "loading",
  );
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const cmp = process.env.NEXT_PUBLIC_COOKIEYES_ID;
  useEffect(() => {
    const show = () => {
      if (cmp) {
        document.querySelector<HTMLButtonElement>(".cky-btn-revisit")?.click();
      } else {
        setPreferences(true);
        setOpen(true);
      }
    };
    window.addEventListener("drinkable:cookie", show);
    return () => window.removeEventListener("drinkable:cookie", show);
  }, [cmp]);
  const choose = (accept: boolean) => {
    try {
      localStorage.setItem(
        "drinkable-consent",
        JSON.stringify({ advertising: accept, at: new Date().toISOString() }),
      );
    } catch {}
    window.dispatchEvent(new Event("drinkable:consent"));
    setOpen(false);
    setDismissed(true);
  };
  if (cmp)
    return (
      <Script
        id="cookieyes"
        src={`https://cdn-cookieyes.com/client_data/${cmp}/script.js`}
        strategy="afterInteractive"
        onReady={() => {
          document.dispatchEvent(new Event("drinkable:cmp-ready"));
        }}
      />
    );
  if (!open && (stored !== "unset" || dismissed)) return null;
  return (
    <section aria-label="Cookie preferences" className={styles.cookieBanner}>
      <strong>
        {preferences ? "Cookie settings" : "We value your privacy"}
      </strong>
      <p>
        We use essential cookies to keep your account secure. Advertising
        services are enabled only when the site’s consent service is configured
        and you agree.
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={() => choose(false)}>
          Reject optional
        </button>
        <button type="button" onClick={() => setPreferences(!preferences)}>
          Preferences
        </button>
        <button
          type="button"
          className={styles.primary}
          onClick={() => choose(true)}
        >
          Accept optional
        </button>
      </div>
      {preferences && (
        <p>
          Essential account cookies are always active. You can return to these
          settings from the footer.
        </p>
      )}
    </section>
  );
}
declare global {
  interface Window {
    getCkyConsent?: () => { categories?: { advertisement?: boolean } };
    adsbygoogle?: unknown[];
  }
}
export function AdSlot({
  placement,
}: {
  placement: "home" | "results" | "detail";
}) {
  const consent = useSyncExternalStore(subscribeCmp, cmpSnapshot, () => false);
  const previousConsent = useRef(consent);
  useEffect(() => {
    if (previousConsent.current && !consent) window.location.reload();
    previousConsent.current = consent;
  }, [consent]);
  const [failed, setFailed] = useState(false);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot = {
    home: process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT,
    results: process.env.NEXT_PUBLIC_ADSENSE_RESULTS_SLOT,
    detail: process.env.NEXT_PUBLIC_ADSENSE_DETAIL_SLOT,
  }[placement];
  if (
    !client ||
    !slot ||
    !process.env.NEXT_PUBLIC_COOKIEYES_ID ||
    !consent ||
    failed
  )
    return null;
  return (
    <aside className={styles.adSlot} aria-label="Advertisement">
      <small>Advertisement</small>
      <Script
        id="drinkable-adsense"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onReady={() => {
          try {
            (window.adsbygoogle ||= []).push({});
          } catch {
            setFailed(true);
          }
        }}
        onError={() => setFailed(true)}
      />
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          minHeight: placement === "detail" ? 250 : 100,
        }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
