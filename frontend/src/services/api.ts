import { SareeProduct, User, CustomerSession, TryOnJob, KioskDevice } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('sajee_token');
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: 'omit', // Using explicit Bearer token header
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Products
  async getProducts(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetchJson<{ success: boolean; data: SareeProduct[]; pagination: any }>(`/products?${qs}`);
    return res;
  },

  async getProductById(id: string) {
    const res = await fetchJson<{ success: boolean; data: SareeProduct }>(`/products/${id}`);
    return res.data;
  },

  async getProductBySku(sku: string) {
    const res = await fetchJson<{ success: boolean; data: SareeProduct }>(`/products/sku/${encodeURIComponent(sku)}`);
    return res.data;
  },

  async createProduct(productData: any) {
    const res = await fetchJson<{ success: boolean; data: SareeProduct }>('/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    return res.data;
  },

  async saveAnnotations(productId: string, annotations: any) {
    const res = await fetchJson<{ success: boolean; data: any }>(`/products/${productId}/annotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(annotations),
    });
    return res.data;
  },

  // Sessions & QR Codes
  async createSession(data: { storeId?: string; kioskId?: string; customerName?: string; initialProductIds?: string[] }) {
    const res = await fetchJson<{
      success: boolean;
      data: {
        sessionId: string;
        collectionId: string;
        token: string;
        qrDataUrl: string;
        qrTargetUrl: string;
        expiresAt: string;
        status: string;
      };
    }>('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async getSessionByToken(token: string) {
    const res = await fetchJson<{
      success: boolean;
      data: {
        session: CustomerSession;
        collection: { id: string; name: string };
        sarees: SareeProduct[];
      };
    }>(`/sessions/${encodeURIComponent(token)}`);
    return res.data;
  },

  async giveConsent(sessionId: string, consent: boolean) {
    const res = await fetchJson<{ success: boolean; consent: boolean }>(`/sessions/${sessionId}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent }),
    });
    return res;
  },

  async purgeSessionData(sessionId: string) {
    const res = await fetchJson<{ success: boolean; message: string }>(`/sessions/${sessionId}/purge`, {
      method: 'POST',
    });
    return res;
  },

  async revokeSession(sessionId: string) {
    const res = await fetchJson<{ success: boolean; message: string }>(`/sessions/${sessionId}/revoke`, {
      method: 'POST',
    });
    return res;
  },

  // Collections
  async addItemToCollection(collectionId: string, item: { productId?: string; sku?: string }) {
    const res = await fetchJson<{ success: boolean; message: string; productId: string }>(`/collections/${collectionId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return res;
  },

  async removeItemFromCollection(collectionId: string, productId: string) {
    const res = await fetchJson<{ success: boolean; message: string }>(`/collections/${collectionId}/items/${productId}`, {
      method: 'DELETE',
    });
    return res;
  },

  // Virtual Try-On
  async submitTryOn(formData: FormData) {
    const token = localStorage.getItem('sajee_token');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(`${API_BASE}/tryon`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Try-on submission failed');
    return data;
  },

  async pollTryOnJob(jobId: string) {
    const res = await fetchJson<{ success: boolean; data: TryOnJob }>(`/tryon/${jobId}`);
    return res.data;
  },

  async retryTryOnJob(jobId: string) {
    const res = await fetchJson<{ success: boolean; message: string }>(`/tryon/${jobId}/retry`, {
      method: 'POST',
    });
    return res;
  },

  // Kiosks & Analytics
  async getKiosks() {
    const res = await fetchJson<{ success: boolean; data: KioskDevice[] }>('/kiosks');
    return res.data;
  },

  async getAnalytics() {
    const res = await fetchJson<{ success: boolean; data: any }>('/analytics/overview');
    return res.data;
  },

  // Auth
  async login(email: string, pass: string) {
    const res = await fetchJson<{ success: boolean; user: User; token: string }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    localStorage.setItem('sajee_token', res.token);
    localStorage.setItem('sajee_user', JSON.stringify(res.user));
    return res;
  },

  async register(data: any) {
    const res = await fetchJson<{ success: boolean; user: User; token: string }>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    localStorage.setItem('sajee_token', res.token);
    localStorage.setItem('sajee_user', JSON.stringify(res.user));
    return res;
  },

  async getMe() {
    const res = await fetchJson<{ success: boolean; user: User }>('/auth/me');
    return res.user;
  },

  logout() {
    localStorage.removeItem('sajee_token');
    localStorage.removeItem('sajee_user');
  },

  getStoredUser(): User | null {
    try {
      const u = localStorage.getItem('sajee_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }
};
