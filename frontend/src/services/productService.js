import apiClient from './apiClient';

export const productService = {
  /**
   * Fetch all clothing products directly from PostgreSQL REST API
   */
  async getProducts(params = {}) {
    const response = await apiClient.get('/products', { params });
    return response.data?.data || [];
  },

  /**
   * Fetch single product details by ID or slug directly from PostgreSQL
   */
  async getProductById(id) {
    const response = await apiClient.get(`/products/${id}`);
    return response.data?.data;
  },

  /**
   * Fetch categories and navigation tabs directly from PostgreSQL
   */
  async getCategories() {
    const response = await apiClient.get('/categories');
    const categories = response.data?.data || [];
    categories.mainNavigation = response.data?.mainNavigation || [];
    categories.subcategories = response.data?.subcategories || {};
    return categories;
  }
};

export default productService;
