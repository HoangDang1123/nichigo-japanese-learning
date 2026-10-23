import * as React from "react";
import styles from "./card.module.css";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "accent" | "interactive";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", variant = "default", children, ...props }, ref) => {
    const variantClass = {
      default: "",
      accent: styles.variantAccent,
      interactive: styles.variantInteractive,
    }[variant];

    return (
      <div
        ref={ref}
        className={`${styles.card} ${variantClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export function CardHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${styles.header} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`${styles.title} ${className}`.trim()} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`${styles.description} ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${styles.content} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${styles.footer} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
