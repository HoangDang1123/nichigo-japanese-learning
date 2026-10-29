"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login, register } from "@/store/slices/auth-slice";
import { ArrowLeft, Check, Eye, EyeOff } from "lucide-react";
import { authErrorMessage } from "@/api/auth";
import { safePostLoginPath, validateAuthFields } from "@/lib/auth/auth-validation";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/branding/brand-logo";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/states/loading-state";
import styles from "./auth-form.module.css";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const status = useAppSelector((state) => state.auth.status);
  const dispatch = useAppDispatch();
  const submittedLogin = React.useRef(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [registered, setRegistered] = React.useState(false);

  React.useEffect(() => {
    if (status === "authenticated" && !submittedLogin.current) router.replace("/");
  }, [status, router]);

  if (status === "checking") {
    return <div className={styles.loading}><BrandLogo /><LoadingState label="Đang kiểm tra phiên đăng nhập…" /></div>;
  }
  if (status === "authenticated") {
    return <p className={styles.notice} role="status">Đang chuyển về trang chủ…</p>;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const validationErrors = validateAuthFields(mode, email, password, confirmation);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const normalizedEmail = email.trim();
      if (mode === "login") {
        submittedLogin.current = true;
        await dispatch(login({ email: normalizedEmail, password })).unwrap();
        const requested = new URLSearchParams(window.location.search).get("next");
        router.replace(safePostLoginPath(requested));
      } else {
        await dispatch(register({ email: normalizedEmail, password })).unwrap();
        setRegistered(true);
      }
    } catch (cause) {
      setError(authErrorMessage(cause, mode));
    } finally {
      setSubmitting(false);
    }
  };

  if (registered) {
    return (
      <section className={styles.success} aria-labelledby="register-success-title" role="status">
        <BrandLogo />
        <span className={styles.successMark} aria-hidden="true"><Check size={22} strokeWidth={2} /></span>
        <h2 id="register-success-title">Tạo tài khoản thành công</h2>
        <p>Tài khoản đã được tạo. Hãy đăng nhập để bắt đầu sử dụng Nichigo.</p>
        <Button onClick={() => router.push("/login")}>Đến trang đăng nhập</Button>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="auth-title">
      <BrandLogo />
      <div className={styles.intro}>
        <span className={styles.kana} lang="ja" aria-hidden="true">ようこそ</span>
        <h1 id="auth-title">{mode === "login" ? "Chào mừng bạn trở lại" : "Bắt đầu hành trình mới"}</h1>
        <p className={styles.description}>
          {mode === "login" ? "Đăng nhập để tiếp tục hành trình học tiếng Nhật." : "Tạo tài khoản để cùng Nichigo học tiếng Nhật từng bước."}
        </p>
      </div>

      {status === "unavailable" && (
        <p className={styles.warning} role="status">Chưa kết nối được máy chủ. Bạn vẫn có thể thử lại thao tác bên dưới.</p>
      )}
      {error && <p className={styles.errorSummary} role="alert" aria-live="assertive">{error}</p>}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          maxLength={320}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          errorMessage={fieldErrors.email}
        />

        <div className={styles.passwordField}>
          <Input
            label="Mật khẩu"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "register" ? 8 : undefined}
            maxLength={72}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            errorMessage={fieldErrors.password}
          />
          <button type="button" className={styles.visibility} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((visible) => !visible)}>
            {showPassword ? <EyeOff size={19} strokeWidth={1.8} aria-hidden="true" /> : <Eye size={19} strokeWidth={1.8} aria-hidden="true" />}
          </button>
        </div>

        {mode === "register" && (
          <div className={styles.passwordField}>
            <Input
              label="Xác nhận mật khẩu"
              type={showConfirmation ? "text" : "password"}
              name="confirm-password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              errorMessage={fieldErrors.confirmation}
            />
            <button type="button" className={styles.visibility} aria-label={showConfirmation ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowConfirmation((visible) => !visible)}>
              {showConfirmation ? <EyeOff size={19} strokeWidth={1.8} aria-hidden="true" /> : <Eye size={19} strokeWidth={1.8} aria-hidden="true" />}
            </button>
          </div>
        )}

        {mode === "register" && <p className={styles.helper}>Mật khẩu cần từ 8 đến 72 byte.</p>}
        <Button type="submit" className={styles.submit} isLoading={submitting}>
          {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </Button>
      </form>

      <p className={styles.switchMode}>
        {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
        <Link href={mode === "login" ? "/register" : "/login"}>
          {mode === "login" ? "Tạo tài khoản" : "Đăng nhập"}
        </Link>
      </p>
      <Link href="/" className={styles.homeLink}><ArrowLeft size={17} strokeWidth={1.8} aria-hidden="true" /> Trở về trang chủ</Link>
    </section>
  );
}
