import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary:
    "bg-gradient-to-br from-[#8b6bff] to-[#5b34d9] text-white shadow-[0_4px_20px_-4px_rgba(124,90,255,0.5)] hover:from-[#9a7dff] hover:to-[#6a43e8]",
  secondary: "bg-surface-alt text-ink border border-border hover:bg-surface-hover",
  ghost: "text-ink-secondary hover:bg-surface-alt hover:text-ink",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export default function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
