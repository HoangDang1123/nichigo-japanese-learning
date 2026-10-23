"use client";

import * as React from "react";
import styles from "./tooltip.module.css";

export interface TooltipProps {
  content: React.ReactNode;
  position?: "top" | "bottom";
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}

export function Tooltip({
  content,
  position = "top",
  children,
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const tooltipId = React.useId();

  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => setIsVisible(false);
  const handleFocus = () => setIsVisible(true);
  const handleBlur = () => setIsVisible(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsVisible(false);
    }
  };

  const positionClass = position === "bottom" ? styles.positionBottom : styles.positionTop;

  // Clone child to attach accessible props and listeners
  const trigger = React.cloneElement(children, {
    "aria-describedby": isVisible ? tooltipId : undefined,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseEnter?.(e);
      handleMouseEnter();
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseLeave?.(e);
      handleMouseLeave();
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      children.props.onFocus?.(e);
      handleFocus();
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      children.props.onBlur?.(e);
      handleBlur();
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      children.props.onKeyDown?.(e);
      handleKeyDown(e);
    },
  });

  return (
    <div className={styles.wrapper}>
      {trigger}
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`${styles.tooltip} ${positionClass}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
