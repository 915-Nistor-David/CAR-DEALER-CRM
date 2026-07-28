import type { InputHTMLAttributes } from "react";
import { fieldClass } from "./fieldStyles";

export default function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}
