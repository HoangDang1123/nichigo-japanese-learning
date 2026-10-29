"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
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
    firstLinkRef.current?.focus();
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
        aria-label="Điều hướng Nichigo" onClose={onClosed}
        onClick={(event) => { if (event.target === dialogRef.current) closeMenu(); }}>
        <div className={styles.mobileDialogContent}>
          <div className={styles.dialogTop}>
            <span className={styles.dialogBrand}>Nichigo</span>
            <button type="button" className={styles.closeButton} onClick={closeMenu} aria-label="Đóng menu"><X size={20} strokeWidth={1.8} aria-hidden="true" /></button>
          </div>
          <nav aria-label="Điều hướng trên điện thoại" className={styles.mobileLinks}>
            {navigationItems.map((item, index) => (
              <Link key={item.href} ref={index === 0 ? firstLinkRef : undefined}
                href={item.href} onClick={closeMenu}
                aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                className={isActivePath(pathname, item.href) ? styles.navActive : styles.navItem}>
                {item.label}
              </Link>
            ))}
          </nav>
          <p className={styles.mobileNote}>一歩ずつ · Từng bước một</p>
        </div>
      </dialog>
    </div>
  );
}
