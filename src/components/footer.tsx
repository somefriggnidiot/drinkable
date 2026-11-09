"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./ui.module.css";
export function Footer() {
  const home = usePathname() === "/";
  return (
    <footer className={`${styles.footer} ${home ? styles.footerHome : ""}`}>
      {!home && (
        <p className={styles.disclaimer}>
          Digital and intellectual assets on listings belong to their respective
          businesses. Drinkable is not affiliated with any business listed on
          Drinkable.City.
        </p>
      )}
      <p>
        © Design by{" "}
        <a href="https://daycodigital.com" rel="noreferrer" target="_blank">
          <strong>Day Co</strong>
        </a>
      </p>
      <nav aria-label="Footer navigation">
        <Link href="/privacy-policy/">Privacy</Link>
        <Link href="/terms/">Terms</Link>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("drinkable:cookie"))}
        >
          Cookie settings
        </button>
      </nav>
    </footer>
  );
}
