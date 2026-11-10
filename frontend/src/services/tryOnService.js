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

    const response = await apiClient.post('/tryon/upload', formData);
    return {
      ...response.data?.file,
      qualityAssessment: response.data?.qualityAssessment
    };
  },

  /**
   * Upload live camera snapshot (base64 data URI)
   */
  async uploadCameraSnapshot(dataUri) {
    const response = await apiClient.post('/tryon/upload-base64', { dataUri });
    return {
      ...response.data?.file,
      qualityAssessment: response.data?.qualityAssessment
    };
  },

  /**
   * Inspect customer photo quality and framing suitability
   */
  async inspectPhoto(photoUrl, filename) {
    try {
      const response = await apiClient.post('/tryon/inspect-photo', { photoUrl, filename });
      return response.data?.data;
    } catch (err) {
      return null;
    }
  },

  /**
   * Upload custom customer outfit garment image (Module 2)
   */
  async uploadCustomGarment(file) {
    const formData = new FormData();
    formData.append('garment', file);

    const response = await apiClient.post('/tryon/upload-garment', formData);
    return response.data?.file || response.data;
  },

  /**
   * Upload custom garment captured from webcam snapshot (Base64 data URI)
   */
  async uploadCustomGarmentBase64(dataUri, name = 'Captured Outfit') {
    const response = await apiClient.post('/tryon/upload-garment-base64', { dataUri, name });
    return response.data?.file || response.data;
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

    const response = await apiClient.post(`/tryon/qr-sessions/${token}/upload`, formData);
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
    productTitle,
    productSku,
    productImageUrl,
    sessionId,
    customerSessionId,
    customGarmentUrl,
    customGarmentFilename,
    customGarmentName,
    userPhotoUrl,
    userPhotoFilename,
    customerImageId,
    selectedSize = 'M',
    fitPreference = 'tailored',
    category
  }) {
    const response = await apiClient.post('/tryon/jobs', {
      productId,
      productTitle,
      productSku,
      productImageUrl,
      sessionId,
      customerSessionId,
      customGarmentUrl,
      customGarmentFilename,
      customGarmentName,
      userPhotoUrl,
      userPhotoFilename,
      customerImageId,
      selectedSize,
      fitPreference,
      category
    });
    return response.data;
  },

  /**
   * Submit multiple independent try-on jobs for selected outfits (Batch Try-On)
   * Reuses the same customer photo and cached customerImageId across all outfits.
   */
  async createBatchTryOnJobs({
    productIds,
    products,
    userPhotoUrl,
    userPhotoFilename,
    customerImageId,
    sessionId,
    customerSessionId,
    selectedSize = 'M',
    fitPreference = 'tailored'
  }) {
    const response = await apiClient.post('/tryon/batch-jobs', {
      productIds,
      products,
      userPhotoUrl,
      userPhotoFilename,
      customerImageId,
      sessionId,
      customerSessionId,
      selectedSize,
      fitPreference
    });
    return response.data;
  },

  /**
   * Retry a failed try-on job without re-running successful generations
   */
  async retryJob(jobId) {
    const response = await apiClient.post(`/tryon/jobs/${jobId}/retry`);
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
   * Fetch customer generation history with guaranteed product metadata
   */
  async getHistory({ sessionId, productId, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (sessionId) params.append('sessionId', sessionId);
    if (productId) params.append('productId', productId);
    if (limit) params.append('limit', limit);

    const response = await apiClient.get(`/tryon/history?${params.toString()}`);
    return response.data;
  },

  /**
   * Report an anatomical defect (three hands, extra limb, limb distortion) on a generated result
   */
  async reportDefect({ jobId, defectType, notes }) {
    const response = await apiClient.post('/tryon/report-defect', { jobId, defectType, notes });
    return response.data;
  },

  /**
   * Fetch Saree Image Audit & Quality Report (18 low-resolution sarees + 6 high-res atelier items)
   */
  async getSareesAuditReport() {
    const response = await apiClient.get('/tryon/sarees/audit-report');
    return response.data;
  },

  /**
   * Trigger Option B local enhancement for all 18 low-res sarees
   */
  async enhanceAllLowResSarees() {
    const response = await apiClient.post('/tryon/sarees/enhance-all');
    return response.data;
  },

  /**
   * Admin: Approve enhanced saree to AI_READY
   */
  async approveEnhancedSaree(id, notes) {
    const response = await apiClient.post(`/tryon/sarees/${id}/approve`, { notes });
    return response.data;
  },

  /**
   * Admin: Reject enhanced saree for studio reshoot
   */
  async rejectEnhancedSaree(id, reason) {
    const response = await apiClient.post(`/tryon/sarees/${id}/reject`, { reason });
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
