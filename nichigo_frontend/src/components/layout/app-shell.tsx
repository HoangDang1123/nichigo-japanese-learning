"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AccountMenu } from "@/components/account/account-menu";
import { navigationItems, isActivePath } from "./navigation";
import { MobileNav } from "./mobile-nav";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/auth-slice";
import { BrandLogo } from "@/components/branding/brand-logo";
import styles from "./app-shell.module.css";

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const { user, status } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">Đi tới nội dung chính</a>
      <aside className={styles.sidebar} aria-label="Thanh điều hướng">
        <Link href="/" className={styles.brand} aria-label="NichiGo — Trang chủ">
          <BrandLogo size="sidebar" />
        </Link>
        <p className={styles.sidebarNote}>Không gian học tiếng Nhật</p>
        <nav aria-label="Điều hướng chính" className={styles.nav}>
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href}
              aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
              className={isActivePath(pathname, item.href) ? styles.navActive : styles.navItem}>
              {item.label}
            </Link>
          ))}
        </nav>
        <p className={styles.sidebarFooter}>一歩ずつ · Từng bước một</p>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.mobileBrand}>
            <MobileNav pathname={pathname} />
            <Link href="/" className={styles.mobileLogo} aria-label="NichiGo — Trang chủ"><BrandLogo size="mobile" /></Link>
          </div>
          <div className={styles.headerTitle}>{title}</div>
          <div className={styles.headerActions}>
            <ThemeSwitcher />
            <AccountMenu status={status} user={user} onLogout={async () => { await dispatch(logout()).unwrap(); }} />
          </div>
        </header>
        <main id="main-content" className={styles.main} tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
