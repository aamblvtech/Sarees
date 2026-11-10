import apiClient from './apiClient';

export const catalogueSourcesService = {
  /**
   * Fetch overview of all sources with live statuses & counts
   */
  async getSourcesOverview() {
    const res = await apiClient.get('/catalogue-sources');
    return res.data?.data || [];
  },

  /**
   * Test connection to a specific source
   */
  async testSourceConnection(slug) {
    const res = await apiClient.post(`/catalogue-sources/${slug}/test`);
    return res.data?.data;
  },

  /**
   * Search products on an external source
   */
  async searchSourceProducts(slug, query = '', limit = 10, page = 1) {
    const res = await apiClient.get(`/catalogue-sources/${slug}/search`, {
      params: { q: query, limit, page }
    });
    return res.data?.data;
  },

  /**
   * Import a single product into PostgreSQL
   */
  async importSingleProduct(product, supplierId = null) {
    const res = await apiClient.post('/catalogue-sources/import-single', {
      product,
      supplierId
    });
    return res.data;
  },

  /**
   * Import supplier CSV in batch
   */
  async importSupplierCsv({ csvText, csvFile, supplierId, defaultCurrency, imageUsagePermission }) {
    if (csvFile) {
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      if (supplierId) formData.append('supplierId', supplierId);
      if (defaultCurrency) formData.append('defaultCurrency', defaultCurrency);
      if (imageUsagePermission) formData.append('imageUsagePermission', imageUsagePermission);

      const res = await apiClient.post('/catalogue-sources/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    }

    const res = await apiClient.post('/catalogue-sources/import-csv', {
      csvText,
      supplierId,
      defaultCurrency,
      imageUsagePermission
    });
    return res.data;
  },

  /**
   * Fetch registered suppliers
   */
  async getSuppliers() {
    const res = await apiClient.get('/catalogue-sources/suppliers');
    return res.data?.data || [];
  },

  /**
   * Register a new supplier
   */
  async createSupplier(supplierData) {
    const res = await apiClient.post('/catalogue-sources/suppliers', supplierData);
    return res.data?.data;
  }
};

export default catalogueSourcesService;

