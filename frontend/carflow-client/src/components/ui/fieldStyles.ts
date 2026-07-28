// Clasele comune pentru input / select / textarea, intr-un singur loc: pana
// acum textarea din VehicleForm le copia verbatim si ar fi ramas in urma la
// fiecare corectie facuta in Input.tsx.
//
// De ce `text-base` pe telefon si `sm:text-sm` de la 640px in sus: Safari pe
// iOS mareste pagina automat cand primeste focus un camp cu font sub 16px, si
// nu revine singur la loc dupa. Cu 16px reali pe mobil zoom-ul nu se declanseaza,
// iar densitatea de pe desktop ramane exact cea de azi.
// `py-2.5` duce campul de la 38px la 46px inaltime — peste pragul de 44px
// recomandat pentru atingere cu degetul.
export const fieldClass =
  "w-full rounded-md border border-border bg-surface-alt px-3 py-2.5 text-base text-ink " +
  "placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent " +
  "sm:py-2 sm:text-sm";
