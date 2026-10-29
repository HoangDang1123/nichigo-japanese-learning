export type AuthFormMode = "login" | "register";
export type AuthFieldErrors = Record<string, string>;

export function validateAuthFields(
  mode: AuthFormMode,
  email: string,
  password: string,
  confirmation = "",
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const normalizedEmail = email.trim();
  if (!normalizedEmail) errors.email = "Vui lòng nhập email.";
  else if (normalizedEmail.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.email = "Vui lòng nhập địa chỉ email hợp lệ.";
  }

  const passwordBytes = new TextEncoder().encode(password).length;
  if (!password) errors.password = "Vui lòng nhập mật khẩu.";
  else if (mode === "register" && password.length < 8) errors.password = "Mật khẩu cần có ít nhất 8 ký tự.";
  else if (password.length > 72 || passwordBytes > 72) errors.password = "Mật khẩu không được vượt quá giới hạn 72 byte.";
  if (mode === "register" && confirmation !== password) errors.confirmation = "Mật khẩu xác nhận chưa khớp.";

  return errors;
}

export function safePostLoginPath(requested: string | null): string {
  return requested && requested.startsWith("/") && !requested.startsWith("//") && !requested.includes("\\")
    ? requested
    : "/";
}
