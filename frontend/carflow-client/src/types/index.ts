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
  alertDays?: number | null;
  notifyRole?: string | null;
  isSaleReady: boolean;
  isSoldStage: boolean;
  vehicleCount: number;
}

export interface SaveStageRequest {
  name: string;
  alertDays?: number | null;
  notifyRole?: string | null;
  isSaleReady: boolean;
  isSoldStage: boolean;
}

export interface Vehicle {
  vehicleId: number;
  vin?: string | null;
  make: string;
  model: string;
  year: number;
  km: number;
  // null pentru non-Owner — pretul de achizitie e confidential
  purchasePrice: number | null;
  rarDate?: string | null;
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

export interface VehicleDocument {
  documentId: number;
  name: string;
  isDone: boolean;
  dueDate?: string | null;
  createdAt: string;
}

export interface SaveDocumentRequest {
  name: string;
  isDone: boolean;
  dueDate?: string | null;
}

export interface VehicleDetail extends Vehicle {
  photos: Photo[];
  costs: Cost[];
  history: HistoryEntry[];
  documents: VehicleDocument[];
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
  rarDate?: string | null;
  acquisitionSource?: string | null;
  description?: string | null;
}

// Starea formularelor permite camp gol (null) ca stergerea unei valori numerice
// sa nu devina 0 tacit; se valideaza la submit.
export interface VehicleFormState extends Omit<SaveVehicleRequest, "year" | "km" | "purchasePrice"> {
  year: number | null;
  km: number | null;
  purchasePrice: number | null;
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
  // null pentru non-Owner
  purchasePrice: number | null;
  totalCosts: number;
  salePrice: number;
  profit: number | null;
  saleDate: string;
  type: string;
  financingPartner?: string | null;
  buyerName: string;
  buyerPhone?: string | null;
  docsHandedOver: boolean;
  platesDone: boolean;
  warrantyGiven: boolean;
}

export interface AppNotification {
  notificationId: number;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  unreadCount: number;
  items: AppNotification[];
}

export interface ManagedUser {
  userId: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface DealerSettings {
  defaultStageAlertDays: number;
  stockAlertDays: number;
}

export interface StageMoveCount {
  // Etapele sterse au toate acelasi nume generic — cheia unica e stageId
  stageId: number;
  stageName: string;
  count: number;
}

export interface UserActivity {
  userId: number;
  userName: string;
  role: string;
  totalMoves: number;
  lastMoveAt?: string | null;
  stageBreakdown: StageMoveCount[];
}

export interface ActivityReport {
  from: string;
  to: string;
  users: UserActivity[];
}

export const COST_CATEGORIES = ["Transport", "Service", "Piese", "Detailing", "Altele"] as const;
export const PHOTO_CATEGORIES = ["Exterior", "Interior", "Defecte"] as const;

// Rolurile aplicatiei (fara diacritice — asa vin din backend/JWT)
export const ROLES = ["Owner", "Vanzari", "Junior"] as const;
export const ROLE_LABELS: Record<string, string> = {
  Owner: "Administrator",
  Vanzari: "Vânzător",
  Junior: "Junior (service/detailing)",
};
