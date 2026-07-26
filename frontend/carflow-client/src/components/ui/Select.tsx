import type { SelectHTMLAttributes } from "react";

export default function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
