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
    return response.data; // { url, filename, width, height, isAiReady }
  },

  /**
   * Replace product image with high-resolution image file or URL
   */
  async replaceProductImage(id, { file, imageUrl }) {
    if (file) {
      const formData = new FormData();
      formData.append('image', file);
      const response = await apiClient.post(`/admin/products/${id}/replace-image`, formData, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } else {
      const response = await apiClient.post(
        `/admin/products/${id}/replace-image`,
        { imageUrl },
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    }
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
  },

  /**
   * Import single Myntra reference garment with authorized photos
   */
  async importSingleMyntraProduct(formData) {
    const response = await apiClient.post('/admin/import/myntra/single', formData, {
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Preview and validate CSV rows without committing
   */
  async previewMyntraCsv(csvData) {
    let payload = csvData;
    let headers = this.getAuthHeaders();
    if (csvData instanceof FormData) {
      headers['Content-Type'] = 'multipart/form-data';
    } else {
      payload = { csvText: csvData };
    }

    const response = await apiClient.post('/admin/import/myntra/csv-preview', payload, {
      headers
    });
    return response.data;
  },

  /**
   * Commit pre-validated CSV rows into database
   */
  async commitMyntraCsv(validatedRows) {
    const response = await apiClient.post(
      '/admin/import/myntra/csv-commit',
      { validatedRows },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Update product approval status
   */
  async updateProductApprovalStatus(id, status, notes = '') {
    const response = await apiClient.put(
      `/admin/products/${id}/approval-status`,
      { status, notes },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Download sample 12-column CSV import template
   */
  async downloadImportTemplate() {
    const response = await apiClient.get('/admin/import/template', {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'myntra_import_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  /**
   * Remove all products from catalogue (?confirm=true)
   */
  async deleteAllProducts() {
    const response = await apiClient.delete('/admin/products/all?confirm=true', {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Bulk delete selected products
   */
  async bulkDeleteProducts(ids) {
    const response = await apiClient.delete('/admin/products/bulk', {
      headers: this.getAuthHeaders(),
      data: { ids }
    });
    return response.data;
  },

  /**
   * Reset and re-seed catalogue to default atelier collection
   */
  async resetSeedCatalogue() {
    const response = await apiClient.post('/admin/catalogue/reset-seed', {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Supplier Management (Portal Admin)
   */
  async getSuppliers() {
    const response = await apiClient.get('/admin/suppliers', {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async updateSupplierStatus(id, status, reason = '') {
    const response = await apiClient.put(`/admin/suppliers/${id}/status`, { status, reason }, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async getSupplierProducts(id) {
    const response = await apiClient.get(`/admin/suppliers/${id}/products`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }
};

export default adminService;

