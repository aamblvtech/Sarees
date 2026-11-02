import apiClient from './apiClient';

export const tryOnService = {
  /**
   * Fetch active AI provider metadata from backend
   */
  async getProviderInfo() {
    try {
      const response = await apiClient.get('/tryon/provider-info');
      return response.data?.data;
    } catch (err) {
      return {
        provider: 'genlook_tryon_v1',
        model: 'Genlook Virtual Try-On',
        available: false,
        status: 'connection_error'
      };
    }
  },

  /**
   * Fetch pre-calibrated luxury model silhouettes
   */
  async getSampleSilhouettes() {
    try {
      const response = await apiClient.get('/tryon/sample-silhouettes');
      return response.data?.data || [];
    } catch (err) {
      return [];
    }
  },

  /**
   * Upload customer silhouette photo file (from computer)
   */
  async uploadSilhouette(file) {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await apiClient.post('/tryon/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data?.file;
  },

  /**
   * Upload live camera snapshot (base64 data URI)
   */
  async uploadCameraSnapshot(dataUri) {
    const response = await apiClient.post('/tryon/upload-base64', { dataUri });
    return response.data?.file;
  },

  /**
   * Upload custom customer outfit garment image (Module 2)
   */
  async uploadCustomGarment(file) {
    const formData = new FormData();
    formData.append('garment', file);

    const response = await apiClient.post('/tryon/upload-garment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data?.file;
  },

  /**
   * Create a single-use 5-minute QR mobile upload session (Module 4)
   */
  async createQrSession() {
    const response = await apiClient.post('/tryon/qr-sessions');
    return response.data?.session;
  },

  /**
   * Poll status of a mobile upload session (Module 4 & 5)
   */
  async getQrSession(token) {
    const response = await apiClient.get(`/tryon/qr-sessions/${token}`);
    return response.data?.session;
  },

  /**
   * Upload photo from mobile device to active QR session (Module 4)
   */
  async uploadMobilePhoto(token, file, consent = true) {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('consent', String(consent));

    const response = await apiClient.post(`/tryon/qr-sessions/${token}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  /**
   * Mark QR session as consumed by the kiosk (Module 5)
   */
  async consumeQrSession(token) {
    try {
      const response = await apiClient.post(`/tryon/qr-sessions/${token}/consume`);
      return response.data;
    } catch (err) {
      return { success: false };
    }
  },

  /**
   * Create and trigger a virtual try-on job
   * Supports catalogue items (productId) or custom outfits (customGarmentUrl)
   */
  async createTryOnJob({
    productId,
    customGarmentUrl,
    customGarmentFilename,
    customGarmentName,
    userPhotoUrl,
    userPhotoFilename,
    selectedSize = 'M',
    fitPreference = 'tailored',
    category
  }) {
    const response = await apiClient.post('/tryon/jobs', {
      productId,
      customGarmentUrl,
      customGarmentFilename,
      customGarmentName,
      userPhotoUrl,
      userPhotoFilename,
      selectedSize,
      fitPreference,
      category
    });
    return response.data;
  },

  /**
   * Poll status of an ongoing try-on job in PostgreSQL
   */
  async getJobStatus(jobId) {
    const response = await apiClient.get(`/tryon/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Securely delete customer uploaded silhouette from backend storage (Privacy requirement)
   */
  async purgeCustomerPhoto(filename, externalUserId) {
    try {
      const url = externalUserId
        ? `/tryon/cleanup/${filename}?externalUserId=${encodeURIComponent(externalUserId)}`
        : `/tryon/cleanup/${filename}`;
      const response = await apiClient.delete(url);
      return response.data;
    } catch (err) {
      console.warn('[Privacy Cleanup Error]:', err.message);
      return { success: false };
    }
  }
};

export default tryOnService;
