import type { InputHTMLAttributes } from "react";

export default function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
      {...props}
    />
  );
}
