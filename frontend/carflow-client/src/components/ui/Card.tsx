import type { ReactNode } from "react";

export default function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    // p-4 sub 640px: pe un ecran de 375px cardul are ~303px utili, iar cei 8px
    // recuperati din padding conteaza pentru campurile si tabelele dinauntru.
    <div className={`rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5 ${className}`}>
      {children}
    </div>
  );
}
