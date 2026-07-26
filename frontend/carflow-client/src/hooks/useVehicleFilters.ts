import { useState } from "react";
import { normalizeBrand } from "../utils/carBrands";
import type { Vehicle } from "../types";

export function useVehicleFilters() {
  const [search, setSearch] = useState("");
  const [brand, setBrandState] = useState("");
  const [model, setModel] = useState("");

  const setBrand = (value: string) => {
    setBrandState(value);
    setModel("");
  };

  const filterVehicles = (vehicles: Vehicle[]): Vehicle[] => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (brand && normalizeBrand(v.make).toLowerCase() !== brand.toLowerCase()) return false;
      if (model && v.model.toLowerCase() !== model.toLowerCase()) return false;
      if (!q) return true;
      return (
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.vin ?? "").toLowerCase().includes(q)
      );
    });
  };

  return { search, setSearch, brand, setBrand, model, setModel, filterVehicles };
}
