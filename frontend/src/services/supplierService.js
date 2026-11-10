import apiClient from './apiClient';

const TOKEN_KEY = 'vestra_supplier_token';
const USER_KEY = 'vestra_supplier_user';

export const supplierService = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getCurrentSupplier() {
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  setSession(token, supplier) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(supplier));
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  /**
   * Supplier Login
   */
  async login(email, password) {
    const response = await apiClient.post('/supplier/login', { email, password });
    if (response.data?.success && response.data?.token) {
      this.setSession(response.data.token, response.data.supplier);
    }
    return response.data;
  },

  /**
   * Register new supplier
   */
  async register(registrationData) {
    const response = await apiClient.post('/supplier/register', registrationData);
    return response.data;
  },

  /**
   * Get authenticated supplier profile and session info
   */
  async getProfile() {
    const response = await apiClient.get('/supplier/me', {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Update supplier profile details
   */
  async updateProfile(profileData) {
    const response = await apiClient.put('/supplier/profile', profileData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Get supplier dashboard metrics and recent submissions
   */
  async getDashboard() {
    const response = await apiClient.get('/supplier/dashboard', {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Get paginated products for this supplier
   */
  async getProducts(params = {}) {
    const response = await apiClient.get('/supplier/products', {
      headers: this.getAuthHeaders(),
      params
    });
    return response.data;
  },

  /**
   * Get single product details
   */
  async getProduct(id) {
    const response = await apiClient.get(`/supplier/products/${id}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Create a new product
   */
  async createProduct(productData) {
    const response = await apiClient.post('/supplier/products', productData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Update product details
   */
  async updateProduct(id, productData) {
    const response = await apiClient.put(`/supplier/products/${id}`, productData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Delete product
   */
  async deleteProduct(id) {
    const response = await apiClient.delete(`/supplier/products/${id}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Upload garment images (verifies minimum 250x250)
   */
  async uploadImages(formData) {
    const response = await apiClient.post('/supplier/upload-images', formData, {
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Batch import products from CSV
   */
  async importCsv(formData) {
    const response = await apiClient.post('/supplier/import-csv', formData, {
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export default supplierService;
