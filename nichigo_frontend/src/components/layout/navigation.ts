export const navigationItems = [
  { label: "Trang chủ", href: "/", available: true },
  { label: "Lộ trình học", href: "/learn", available: true },
  { label: "Khóa học", href: "/courses", available: false },
  { label: "Kỹ năng", href: "/skills", available: true },
  { label: "Mini game", href: "/games", available: false },
  { label: "Tiến độ", href: "/progress", available: true },
  { label: "Hồ sơ", href: "/profile", available: false },
  { label: "Cài đặt", href: "/settings", available: false },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
