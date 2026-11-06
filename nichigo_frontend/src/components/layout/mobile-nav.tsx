"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/branding/brand-logo";
import { navigationItems, isActivePath } from "./navigation";
import styles from "./app-shell.module.css";

export function MobileNav({ pathname }: { pathname: string }) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const firstLinkRef = React.useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = React.useState(false);

  const openMenu = () => {
    dialogRef.current?.showModal();
    setOpen(true);
    requestAnimationFrame(() => firstLinkRef.current?.focus());
  };
  const closeMenu = () => dialogRef.current?.close();
  const onClosed = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={styles.mobileNav}>
      <button ref={triggerRef} type="button" className={styles.menuButton}
        aria-label="Mở menu điều hướng" aria-haspopup="dialog" aria-expanded={open}
        aria-controls="nichigo-mobile-menu" onClick={openMenu}>
        <Menu size={21} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <dialog id="nichigo-mobile-menu" ref={dialogRef} className={styles.mobileDialog}
        aria-label="Điều hướng NichiGo" onClose={onClosed}
        onClick={(event) => { if (event.target === dialogRef.current) closeMenu(); }}>
        <div className={styles.mobileDialogContent}>
          <div className={styles.dialogTop}>
            <BrandLogo size="sidebar" className={styles.dialogLogo} />
            <button type="button" className={styles.closeButton} onClick={closeMenu} aria-label="Đóng menu">
              <X size={20} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Điều hướng trên điện thoại" className={styles.mobileLinks}>
            {navigationItems.map((item, index) => {
              const active = isActivePath(pathname, item.href);
              return item.available ? (
                <Link key={item.label} ref={index === 0 ? firstLinkRef : undefined}
                  href={item.href} onClick={closeMenu}
                  aria-current={active ? "page" : undefined}
                  className={`${styles.navItem} ${active ? styles.navActive : ""}`}>
                  {item.label}
                </Link>
              ) : (
                <span key={item.label} className={`${styles.navItem} ${styles.navUnavailable}`} aria-disabled="true">
                  {item.label}<span className={styles.comingSoon}>Sắp ra mắt</span>
                </span>
              );
            })}
          </nav>
          <p className={styles.mobileNote}><span lang="ja">一歩ずつ</span> · Từng bước một</p>
        </div>
      </dialog>
    </div>
  );
}
