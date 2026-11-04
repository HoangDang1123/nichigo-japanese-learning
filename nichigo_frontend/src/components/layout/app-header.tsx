"use client";

import Link from "next/link";
import { AccountMenu } from "@/components/account/account-menu";
import { BrandLogo } from "@/components/branding/brand-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { AuthUser } from "@/api/auth";
import type { AuthStatus } from "@/store/slices/auth-slice";
import { MobileNav } from "./mobile-nav";
import styles from "./app-shell.module.css";

interface AppHeaderProps {
  title: string;
  pathname: string;
  status: AuthStatus;
  user: AuthUser | null;
  onLogout: () => Promise<void>;
}

export function AppHeader({ title, pathname, status, user, onLogout }: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.mobileBrand}>
        <MobileNav pathname={pathname} />
        <Link href="/" className={styles.mobileLogo} aria-label="NichiGo — Trang chủ">
          <BrandLogo size="mobile" />
        </Link>
      </div>
      <div className={styles.headerTitle}>{title}</div>
      <div className={styles.headerActions}>
        <ThemeSwitcher />
        <AccountMenu status={status} user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}
