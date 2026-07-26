export const CAR_BRANDS = [
  "Alfa Romeo", "Audi", "BMW", "Chevrolet", "Chrysler", "Citroën", "Cupra",
  "Dacia", "DS", "Fiat", "Ford", "Honda", "Hyundai", "Jaguar", "Jeep", "Kia",
  "Land Rover", "Lexus", "Mazda", "Mercedes-Benz", "Mini", "Mitsubishi",
  "Nissan", "Opel", "Peugeot", "Porsche", "Renault", "Seat", "Škoda",
  "Smart", "SsangYong", "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen",
  "Volvo",
] as const;

/** Trims and matches against the canonical brand list case-insensitively, so
 * "bmw"/"Bmw"/"BMW" all resolve to the same canonical "BMW". Falls back to the
 * trimmed raw value when nothing matches, so unusual makes never disappear. */
export function normalizeBrand(raw: string): string {
  const trimmed = raw.trim();
  const match = CAR_BRANDS.find((b) => b.toLowerCase() === trimmed.toLowerCase());
  return match ?? trimmed;
}

/** Distinct normalized brands actually present in the given vehicles, sorted. */
export function getAvailableBrands(vehicles: { make: string }[]): string[] {
  const set = new Set(vehicles.map((v) => normalizeBrand(v.make)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Distinct models among vehicles matching the given (normalized) brand, sorted.
 * Pass null/empty brand to get all distinct models. */
export function getModelsForBrand(
  vehicles: { make: string; model: string }[],
  brand: string | null
): string[] {
  const matching = brand
    ? vehicles.filter((v) => normalizeBrand(v.make).toLowerCase() === brand.toLowerCase())
    : vehicles;
  const set = new Set(matching.map((v) => v.model.trim()).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
