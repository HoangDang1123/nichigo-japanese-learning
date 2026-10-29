"use client";

import Image from "next/image";
import styles from "./brand-logo.module.css";

interface BrandLogoProps {
  size?: "auth" | "sidebar" | "mobile";
  className?: string;
}

export function BrandLogo({ size = "auth", className = "" }: BrandLogoProps) {
  if (size === "mobile") {
    return (
      <span className={`${styles.logo} ${styles.mobile} ${className}`.trim()}>
        <Image
          className={styles.image}
          src="/branding/icon-medium.png"
          width={152}
          height={157}
          sizes="40px"
          alt="NichiGo"
        />
      </span>
    );
  }

  const sidebar = size === "sidebar";
  return (
    <span className={`${styles.logo} ${sidebar ? styles.sidebar : styles.auth} ${className}`.trim()}>
      <Image
        className={`${styles.image} ${styles.light}`}
        src="/branding/logo-card-light-transparent.png"
        width={1189}
        height={368}
        sizes={sidebar ? "200px" : "272px"}
        alt="NichiGo — Learn Japanese your way"
      />
      <Image
        className={`${styles.image} ${styles.dark}`}
        src="/branding/logo-card-dark-transparent.png"
        width={1189}
        height={368}
        sizes={sidebar ? "200px" : "272px"}
        alt="NichiGo — Learn Japanese your way"
      />
    </span>
  );
}
