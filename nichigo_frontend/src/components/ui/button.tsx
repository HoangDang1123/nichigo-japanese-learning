import * as React from "react";
import styles from "./button.module.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variantClass = {
      primary: styles.variantPrimary,
      secondary: styles.variantSecondary,
      outline: styles.variantOutline,
      ghost: styles.variantGhost,
      danger: styles.variantDanger,
    }[variant];

    const sizeClass = {
      sm: styles.sizeSm,
      md: styles.sizeMd,
      lg: styles.sizeLg,
    }[size];

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || isLoading}
        aria-busy={isLoading ? true : undefined}
        className={`${styles.button} ${variantClass} ${sizeClass} ${className}`.trim()}
        {...props}
      >
        {isLoading && (
          <span
            className={styles.spinner}
            aria-hidden="true"
          />
        )}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
