import apiClient from './apiClient';

export const imageUploadService = {
  /**
   * Validate image before uploading
   */
  validateFile(file) {
    if (!file) {
      return { valid: false, error: 'Please choose an image file.' };
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Only JPG, PNG, and WebP images are supported.' };
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit. Please upload a smaller image.' };
    }

    return { valid: true };
  },

  /**
   * Read file as a data URL for instant high-speed client-side preview
   */
  readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Upload image file to backend
   */
  async uploadPhoto(file) {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await apiClient.post('/tryon/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data?.file;
    } catch (error) {
      console.warn('[imageUploadService] Server upload fallback. Using local data URL preview.');
      const localUrl = await this.readFileAsDataUrl(file);
      return {
        filename: file.name,
        url: localUrl,
        size: file.size,
        mimetype: file.type
      };
    }
  }
};

export default imageUploadService;

