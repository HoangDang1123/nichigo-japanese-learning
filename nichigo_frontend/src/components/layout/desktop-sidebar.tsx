"use client";

import * as React from "react";
import Link from "next/link";
import { ChartNoAxesCombined, CircleUserRound, Compass, Gamepad2, GraduationCap, House, PanelLeftClose, PanelLeftOpen, Settings, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/branding/brand-logo";
import { navigationItems, isActivePath } from "./navigation";
import styles from "./app-shell.module.css";

const icons = [House, Compass, GraduationCap, Sparkles, Gamepad2, ChartNoAxesCombined, CircleUserRound, Settings] as const;

export function DesktopSidebar({ collapsed, onToggle, pathname }: { collapsed: boolean; onToggle: () => void; pathname: string }) {
  const handleNavigationKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>("a[href]"));
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    let next = current;
    if (links.length === 0) return;
    if (event.key === "ArrowDown") next = (current + 1) % links.length;
    else if (event.key === "ArrowUp") next = (current - 1 + links.length) % links.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = links.length - 1;
    else return;
    event.preventDefault();
    links[next]?.focus();
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`} aria-label="Thanh điều hướng">
      <div className={styles.sidebarTop}>
        <Link href="/" className={styles.brand} aria-label="NichiGo — Trang chủ">
          <BrandLogo size={collapsed ? "mobile" : "sidebar"} />
        </Link>
        <button className={styles.collapseButton} type="button" onClick={onToggle}
          aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          aria-expanded={!collapsed} title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}>
          {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.8} aria-hidden="true" /> : <PanelLeftClose size={18} strokeWidth={1.8} aria-hidden="true" />}
        </button>
      </div>
      <p className={styles.sidebarNote}>Không gian học tiếng Nhật</p>
      <div className={styles.sidebarNavigation} onKeyDown={handleNavigationKeyDown}>
        <nav aria-label="Điều hướng chính" className={styles.nav}>
          {navigationItems.slice(0, 6).map((item, index) => {
          const Icon = icons[index] ?? GraduationCap;
          const active = isActivePath(pathname, item.href);
          const content = <><Icon size={19} strokeWidth={1.8} aria-hidden="true" /><span className={styles.navLabel}>{item.label}</span></>;
          return item.available ? (
            <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined}
              className={`${styles.navItem} ${active ? styles.navActive : ""}`} title={collapsed ? item.label : undefined}>
              {content}
            </Link>
          ) : (
            <span key={item.label} className={`${styles.navItem} ${styles.navUnavailable}`} aria-disabled="true"
              title={collapsed ? `${item.label} — Sắp ra mắt` : undefined}>
              {content}<span className={styles.comingSoon}>Sắp ra mắt</span>
            </span>
          );
          })}
        </nav>
        <nav aria-label="Điều hướng tài khoản" className={`${styles.nav} ${styles.navBottom}`}>
          {navigationItems.slice(6).map((item, index) => {
            const Icon = icons[index + 6] ?? Settings;
            const active = isActivePath(pathname, item.href);
            return item.available ? (
              <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined}
                className={`${styles.navItem} ${active ? styles.navActive : ""}`} title={collapsed ? item.label : undefined}>
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            ) : (
              <span key={item.label} className={`${styles.navItem} ${styles.navUnavailable}`} aria-disabled="true"
                title={collapsed ? `${item.label} — Sắp ra mắt` : undefined}>
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span className={styles.navLabel}>{item.label}</span>
                <span className={styles.comingSoon}>Sắp ra mắt</span>
              </span>
            );
          })}
        </nav>
      </div>
      <p className={styles.sidebarFooter}>一歩ずつ · Từng bước một</p>
    </aside>
  );
}
