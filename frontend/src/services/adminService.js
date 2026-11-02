import apiClient from './apiClient';

const TOKEN_KEY = 'vestra_admin_token';
const ADMIN_USER_KEY = 'vestra_admin_user';

export const adminService = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getCurrentAdmin() {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  setSession(token, admin) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(admin));
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  },

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  /**
   * Admin Login
   */
  async login(email, password) {
    const response = await apiClient.post('/admin/login', { email, password });
    if (response.data?.success && response.data?.token) {
      this.setSession(response.data.token, response.data.admin);
    }
    return response.data;
  },

  /**
   * Fetch authenticated admin profile
   */
  async getProfile() {
    const response = await apiClient.get('/admin/me', {
      headers: this.getAuthHeaders()
    });
    return response.data?.admin;
  },

  /**
   * Fetch dashboard statistics
   */
  async getStats() {
    const response = await apiClient.get('/admin/stats', {
      headers: this.getAuthHeaders()
    });
    return response.data?.data;
  },

  /**
   * Fetch all products (including active & inactive)
   */
  async getProducts() {
    const response = await apiClient.get('/admin/products', {
      headers: this.getAuthHeaders()
    });
    return response.data?.data || [];
  },

  /**
   * Create a new product in PostgreSQL
   */
  async createProduct(productData) {
    const response = await apiClient.post('/admin/products', productData, {
      headers: this.getAuthHeaders()
    });
    return response.data?.data;
  },

  /**
   * Update an existing product in PostgreSQL
   */
  async updateProduct(id, productData) {
    const response = await apiClient.put(`/admin/products/${id}`, productData, {
      headers: this.getAuthHeaders()
    });
    return response.data?.data;
  },

  /**
   * Delete product from PostgreSQL
   */
  async deleteProduct(id) {
    const response = await apiClient.delete(`/admin/products/${id}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Upload actual image file to backend
   */
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.post('/admin/upload', formData, {
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data; // { url, filename }
  },

  /**
   * Fetch all categories
   */
  async getCategories() {
    const response = await apiClient.get('/admin/categories', {
      headers: this.getAuthHeaders()
    });
    return response.data?.data || [];
  },

  /**
   * Create category in PostgreSQL
   */
  async createCategory(categoryData) {
    const response = await apiClient.post('/admin/categories', categoryData, {
      headers: this.getAuthHeaders()
    });
    return response.data?.data;
  }
};

export default adminService;

