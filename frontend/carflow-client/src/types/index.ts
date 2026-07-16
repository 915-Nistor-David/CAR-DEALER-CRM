export interface AuthUser {
  token: string;
  userId: number;
  name: string;
  email: string;
  role: string;
  dealershipId: number;
  dealershipName: string;
}

export interface Stage {
  stageId: number;
  name: string;
  sortOrder: number;
}

export interface Vehicle {
  vehicleId: number;
  vin?: string | null;
  make: string;
  model: string;
  year: number;
  km: number;
  purchasePrice: number;
  acquisitionSource?: string | null;
  description?: string | null;
  currentStageId: number;
  currentStageName: string;
  createdAt: string;
  mainPhotoUrl?: string | null;
  totalCosts: number;
  isSold: boolean;
  enteredStageAt: string;
  daysInStage: number;
}

export interface Photo {
  photoId: number;
  url: string;
  category: string;
  sortOrder: number;
}

export interface Cost {
  costId: number;
  category: string;
  amount: number;
  date: string;
  description?: string | null;
}

export interface HistoryEntry {
  historyId: number;
  fromStageName?: string | null;
  toStageName: string;
  userName: string;
  timestamp: string;
  note?: string | null;
}

export interface SaleInfo {
  saleId: number;
  salePrice: number;
  saleDate: string;
  type: string;
  financingPartner?: string | null;
  financingTerms?: string | null;
  buyerName: string;
  buyerPhone?: string | null;
  docsHandedOver: boolean;
  platesDone: boolean;
  warrantyGiven: boolean;
}

export interface VehicleDetail extends Vehicle {
  photos: Photo[];
  costs: Cost[];
  history: HistoryEntry[];
  sale?: SaleInfo | null;
  profit?: number | null;
}

export interface SaveVehicleRequest {
  vin?: string | null;
  make: string;
  model: string;
  year: number;
  km: number;
  purchasePrice: number;
  acquisitionSource?: string | null;
  description?: string | null;
}

export interface CreateSaleRequest {
  salePrice: number;
  saleDate: string;
  type: string;
  financingPartner?: string | null;
  financingTerms?: string | null;
  buyerName: string;
  buyerPhone?: string | null;
}

export interface SaleListItem {
  saleId: number;
  vehicleId: number;
  vehicleName: string;
  purchasePrice: number;
  totalCosts: number;
  salePrice: number;
  profit: number;
  saleDate: string;
  type: string;
  financingPartner?: string | null;
  buyerName: string;
  buyerPhone?: string | null;
  docsHandedOver: boolean;
  platesDone: boolean;
  warrantyGiven: boolean;
}

export const COST_CATEGORIES = ["Transport", "Service", "Piese", "Detailing", "Altele"] as const;
export const PHOTO_CATEGORIES = ["Exterior", "Interior", "Defecte"] as const;
