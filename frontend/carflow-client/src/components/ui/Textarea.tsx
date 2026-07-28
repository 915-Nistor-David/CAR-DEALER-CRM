import type { TextareaHTMLAttributes } from "react";
import { fieldClass } from "./fieldStyles";

export default function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClass} ${className}`} {...props} />;
}
