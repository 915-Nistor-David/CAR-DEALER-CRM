import { useEffect } from "react";

// Blocheaza scroll-ul paginii cat timp un panou peste tot ecranul e deschis
// (drawerul de navigare, modalele). Pe telefon, fara asta pagina din spate
// se misca sub deget si face rubber-banding in iOS.
// Salvam si restauram valoarea precedenta ca doua panouri suprapuse sa nu se calce.
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
