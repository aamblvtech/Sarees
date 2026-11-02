export interface SareeComponentBbox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface SareeAnnotations {
  id?: string;
  productId?: string;
  bodyBbox?: SareeComponentBbox;
  palluBbox?: SareeComponentBbox;
  mainBorderBbox?: SareeComponentBbox;
  secondaryBorderBbox?: SareeComponentBbox;
  motifsBbox?: SareeComponentBbox;
  blousePieceBbox?: SareeComponentBbox;
  detectionMethod?: 'manual' | 'ai_assisted' | 'ai_auto';
  isVerified?: boolean;
  notes?: string;
}

export interface ProductImage {
  id?: string;
  imageUrl: string;
  imageType: 'folded' | 'draped' | 'pallu' | 'border' | 'detail';
  isPrimary?: boolean;
}

export interface SareeProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  fabric: string;
  color: string;
  occasion: string;
  borderType?: string;
  palluDetails?: string;
  blousePiece: boolean;
  blouseDetails?: string;
  stockQuantity: number;
  status: 'available' | 'reserved' | 'sold_out';
  primaryImage: string;
  images?: ProductImage[];
  annotations?: SareeAnnotations;
  related?: SareeProduct[];
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'customer' | 'staff' | 'admin';
  phone?: string;
  consentDataSaving?: boolean;
  createdAt?: string;
}

export interface CustomerSession {
  id: string;
  storeId?: string;
  kioskId?: string;
  status: 'active' | 'expired' | 'revoked' | 'completed';
  customerConsent: boolean;
  customerName?: string;
  expiresAt: string;
  createdAt: string;
}

export interface TryOnJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'model_unavailable';
  provider: 'artcraft' | 'fal' | 'replicate' | 'idm_vton' | 'mock' | string;
  resultImageUrl?: string;
  isSimulation: boolean;
  disclaimer: string;
  errorMessage?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    fabric: string;
    color: string;
    price: number;
  };
}

export interface KioskDevice {
  id: string;
  name: string;
  identifier: string;
  status: 'active' | 'inactive' | 'maintenance';
  storeName?: string;
  cameraConfig?: {
    resolution: string;
    orientation: string;
    sensor: string;
  };
  lastHeartbeat?: string;
}
