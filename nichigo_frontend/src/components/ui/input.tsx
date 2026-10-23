import * as React from "react";
import styles from "./input.module.css";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id: customId,
      label,
      helperText,
      errorMessage,
      required,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const id = customId || generatedId;
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;

    const hasError = Boolean(errorMessage);
    const showHelper = !hasError && Boolean(helperText);

    // Only reference the ID of the element that is actually rendered in the DOM
    const messageId = hasError ? errorId : showHelper ? helperId : null;

    const describedBy = [
      props["aria-describedby"],
      messageId,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <div className={styles.container}>
        {label && (
          <label htmlFor={id} className={styles.label}>
            {label}
            {required && <span className={styles.required} aria-hidden="true">*</span>}
          </label>
        )}
        <div className={styles.inputWrapper}>
          <input
            ref={ref}
            id={id}
            required={required}
            disabled={disabled}
            aria-invalid={hasError ? "true" : undefined}
            aria-describedby={describedBy}
            className={`${styles.input} ${hasError ? styles.inputError : ""} ${className}`.trim()}
            {...props}
          />
        </div>
        {hasError ? (
          <span id={errorId} className={styles.errorMessage} role="alert">
            {errorMessage}
          </span>
        ) : showHelper ? (
          <span id={helperId} className={styles.helperText}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
