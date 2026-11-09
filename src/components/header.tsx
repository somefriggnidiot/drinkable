"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Member } from "@/domain/types";
import { Icon } from "./icon";
import { Dialog } from "./dialog";
import styles from "./ui.module.css";
export function Header({ member }: { member: Member | null }) {
  const pathname = usePathname();
  const home = pathname === "/";
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const links = (
    <>
      <Link href="/" aria-current={home ? "page" : undefined}>
        Home
      </Link>
      <Link
        href="/explore/"
        aria-current={pathname === "/explore" ? "page" : undefined}
      >
        Map
      </Link>
      <Link
        href="/browse/"
        aria-current={pathname === "/browse" ? "page" : undefined}
      >
        Browse All
      </Link>
      <details className={styles.help}>
        <summary>Help</summary>
        <div>
          <Link href="/faq/">FAQ</Link>
          <Link href="/contact-drinkable/">Contact</Link>
        </div>
      </details>
    </>
  );
  return (
    <>
      <header className={`${styles.header} ${home ? styles.headerHome : ""}`}>
        <div className={styles.headerInner}>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.mobileOnly}`}
            aria-label="Open menu"
            onClick={() => setMenu(true)}
          >
            <Icon name="menu" />
          </button>
          <Link
            href="/"
            aria-label="Drinkable City home"
            className={styles.logo}
          >
            <img
              src="/brand/wordmark.svg"
              alt="Drinkable City"
              width="168"
              height="42"
            />
          </Link>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.desktopSearch}`}
            onClick={() => setSearch(true)}
            aria-label="Search breweries"
          >
            <Icon name="search" />
          </button>
          <nav aria-label="Main navigation" className={styles.desktopNav}>
            {links}
          </nav>
          <Link
            href={member ? "/my-account/dashboard/" : "/my-account/"}
            aria-label={member ? "My account" : "Sign in or register"}
            className={styles.accountLink}
          >
            <Icon name="user" />
            <span>
              {member ? (
                member.name
              ) : (
                <>
                  Sign in <span className={styles.muted}>or</span> Register
                </>
              )}
            </span>
          </Link>
          <Link className={styles.headerAdd} href="/add-listing/">
            <Icon name="pin" /> Add a Brewery
          </Link>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.mobileOnly}`}
            onClick={() => setSearch(true)}
            aria-label="Search breweries"
          >
            <Icon name="search" />
          </button>
        </div>
      </header>
      {menu && (
        <Dialog title="Drinkable City" onClose={() => setMenu(false)}>
          <nav
            aria-label="Mobile navigation"
            className={styles.mobileNav}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setMenu(false);
            }}
          >
            {links}
            <Link href="/add-listing/">Add a Brewery</Link>
            <Link href={member ? "/my-account/dashboard/" : "/my-account/"}>
              {member ? "My account" : "Sign in or register"}
            </Link>
            {member && (member.role === "admin" || member.role === "staff") && (
              <Link href="/admin/">Staff administration</Link>
            )}
          </nav>
        </Dialog>
      )}
      {search && (
        <Dialog title="Search breweries" onClose={() => setSearch(false)}>
          <form
            action="/browse/"
            className={styles.inlineForm}
            onSubmit={() => setSearch(false)}
          >
            <label className={styles.grow}>
              Name or keyword
              <input name="q" type="search" required maxLength={150} />
            </label>
            <button type="submit" className={styles.primary}>
              Search
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
