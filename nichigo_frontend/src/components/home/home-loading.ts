import type { AuthStatus } from "../../store/slices/auth-slice";

/** The auth check is the only live initial data request on Home today. */
export function isHomeLoading(status: AuthStatus): boolean {
  return status === "checking";
}
