"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ChevronDown, LogIn, LogOut, UserPlus, UserRound } from "lucide-react";
import { ApiError } from "@/api";
import { authErrorMessage, type AuthUser } from "@/api/auth";
import type { AuthStatus } from "@/store/slices/auth-slice";
import { usePopover } from "@/components/ui/use-popover";
import styles from "./account-menu.module.css";

interface AccountMenuProps {
  status: AuthStatus;
  user: AuthUser | null;
  onLogout: () => Promise<void>;
  /** Optional presentation fields for a future profile API; the current auth API supplies neither. */
  profile?: { displayName?: string; avatarUrl?: string };
}

function emailIdentifier(email: string | undefined): string {
  return email?.split("@", 1)[0]?.trim() || "Tài khoản";
}

function emailInitial(email: string | undefined): string {
  const first = email?.trim().match(/[\p{L}\p{N}]/u)?.[0];
  return first?.toLocaleUpperCase("vi-VN") ?? "?";
}

export function AccountMenu({ status, user, onLogout, profile }: AccountMenuProps) {
  const { open, rootRef, triggerRef, toggle, close } = usePopover();
  const [logoutError, setLogoutError] = React.useState("");
  const [loggingOut, setLoggingOut] = React.useState(false);
  const id = React.useId();
  const busy = status === "checking";
  const authenticated = status === "authenticated" && user !== null;
  const identifier = profile?.displayName?.trim() || emailIdentifier(user?.email);

  const handleLogout = async () => {
    setLogoutError("");
    setLoggingOut(true);
    try {
      await onLogout();
      close();
    } catch (error) {
      setLogoutError(authErrorMessage(error, "logout"));
      if (error instanceof ApiError && error.status === 401) close();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={busy ? "Đang kiểm tra tài khoản" : authenticated ? `Tài khoản ${user.email}` : status === "unavailable" ? "Tài khoản, chưa thể kết nối" : "Tài khoản khách"}
        aria-expanded={open}
        aria-controls={id}
        aria-busy={busy || loggingOut}
        disabled={busy || loggingOut}
        onClick={toggle}
      >
        <span className={styles.avatar} aria-hidden="true">
          {authenticated && profile?.avatarUrl ? (
            <Image src={profile.avatarUrl} alt="" width={36} height={36} unoptimized />
          ) : authenticated ? emailInitial(user.email) : <UserRound size={19} strokeWidth={1.8} aria-hidden="true" />}
        </span>
        <span className={styles.copy}>
          <span className={styles.greeting}>{busy ? "Xin chào!" : authenticated ? "Chào mừng trở lại" : "Xin chào!"}</span>
          <span className={styles.label} title={authenticated ? identifier : undefined}>
            {busy ? "Đang kiểm tra" : authenticated ? identifier : status === "unavailable" ? "Chưa kết nối" : "Khách"}
          </span>
        </span>
        <ChevronDown className={styles.chevron} size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {open && !busy && (
        <div className={styles.popover} id={id} role="group" aria-label="Tài khoản Nichigo">
          {status === "unavailable" && (
            <p className={styles.statusMessage} role="status"><AlertCircle size={17} strokeWidth={1.8} aria-hidden="true" />Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại sau.</p>
          )}
          {authenticated && (
            <>
              <p className={styles.email} title={user.email}>{user.email}</p>
              <nav className={styles.links} aria-label="Tài khoản">
                <button type="button" className={styles.menuLink} disabled={loggingOut} onClick={handleLogout}>
                  <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
                  {loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
                </button>
              </nav>
            </>
          )}
          {status === "guest" && (
            <nav className={styles.links} aria-label="Tài khoản">
              <Link href="/login" className={styles.menuLink} onClick={() => close()}>
                <LogIn size={17} strokeWidth={1.8} aria-hidden="true" /> Đăng nhập
              </Link>
              <Link href="/register" className={styles.menuLink} onClick={() => close()}>
                <UserPlus size={17} strokeWidth={1.8} aria-hidden="true" /> Tạo tài khoản
              </Link>
            </nav>
          )}
          {logoutError && <p className={styles.error} role="alert">{logoutError}</p>}
        </div>
      )}
    </div>
  );
}
