export const navigationItems = [
  { label: "Trang chủ", href: "/" },
  { label: "Lộ trình học", href: "/learn" },
  { label: "Kỹ năng", href: "/skills" },
  { label: "Tiến độ", href: "/progress" },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
