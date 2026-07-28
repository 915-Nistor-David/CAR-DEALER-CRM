import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { CloseIcon } from "../icons";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Butoanele de jos. Raman fixate, nu se duc la vale odata cu formularul. */
  footer?: ReactNode;
  /** Daca e dat, panoul devine `<form>` — altfel butonul de submit din footer
   *  ar fi in afara formularului si Enter n-ar mai trimite nimic. */
  onSubmit?: (e: React.FormEvent) => void;
  size?: "md" | "lg";
}

const sizes = { md: "sm:max-w-md", lg: "sm:max-w-lg" } as const;

// Pe telefon modalul e o foaie ancorata jos, nu o casuta centrata pe verticala.
// Un panou centrat se calculeaza fata de viewportul *mare*, deci cand apar bara
// de adresa si tastatura se taie la ambele capete si nu mai ajungi la butoane.
// Ancorat jos + `dvh` nu se poate intampla: creste in sus, in spatiul ramas.
export default function Modal({
  title,
  onClose,
  children,
  footer,
  onSubmit,
  size = "lg",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(true);

  useEffect(() => {
    // Focusam panoul, nu primul camp: pe telefon asta ar deschide tastatura
    // instant si ar acoperi jumatate din formular inainte sa-l vezi.
    const restoreTo = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      // Capcana de focus: fara ea, Tab pleaca in pagina de dedesubt, care e
      // inertă vizual dar in continuare navigabila de la tastatura.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreTo?.focus();
    };
  }, [onClose]);

  const Panel = onSubmit ? "form" : "div";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:px-4"
      // mousedown, nu click: cu `click` un drag pornit inauntrul formularului si
      // terminat pe fundal inchidea dialogul si pierdea tot ce scrisesei.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Panel
        ref={panelRef as never}
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-border bg-surface shadow-xl outline-none sm:rounded-2xl ${sizes[size]}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6">
          <h2 className="min-w-0 truncate text-lg font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-hover hover:text-ink sm:h-9 sm:w-9"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {children}
        </div>

        {footer && (
          <div className="flex shrink-0 justify-end gap-3 border-t border-border px-4 py-3 sm:px-6">
            {footer}
          </div>
        )}
      </Panel>
    </div>,
    document.body
  );
}
