"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/auth-slice";
import { AppHeader } from "./app-header";
import { DesktopSidebar } from "./desktop-sidebar";
import styles from "./app-shell.module.css";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  /** Use for focused experiences such as a lesson reader while keeping the shared header. */
  hideSidebar?: boolean;
}

export function AppShell({ children, title, hideSidebar = false }: AppShellProps) {
  const pathname = usePathname();
  const { user, status } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    if (window.localStorage.getItem("nichigo-sidebar-collapsed") === "true") {
      requestAnimationFrame(() => setCollapsed(true));
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("nichigo-sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <div className={`${styles.shell} ${hideSidebar ? styles.shellFocused : ""} ${collapsed && !hideSidebar ? styles.shellCollapsed : ""}`}>
      <a className={styles.skipLink} href="#main-content">Đi tới nội dung chính</a>
      {!hideSidebar && <DesktopSidebar collapsed={collapsed} onToggle={toggleSidebar} pathname={pathname} />}
      <div className={styles.workspace}>
        <AppHeader title={title} pathname={pathname} status={status} user={user}
          onLogout={async () => { await dispatch(logout()).unwrap(); }} />
        <main id="main-content" className={styles.main} tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
