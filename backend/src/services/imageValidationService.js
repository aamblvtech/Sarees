import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dedicated private directories for customer uploads
const customerUploadsDir = path.join(__dirname, '..', '..', 'uploads', 'customer_silhouettes');
const customGarmentsDir = path.join(__dirname, '..', '..', 'uploads', 'custom_garments');

[customerUploadsDir, customGarmentsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export const imageValidationService = {
  getUploadsDir() {
    return customerUploadsDir;
  },

  getCustomGarmentsDir() {
    return customGarmentsDir;
  },

  /**
   * Validate image metadata (MIME type, size, format)
   * @param {Object} file - Multer file object or raw file buffer info
   */
  validateUploadedFile(file) {
    if (!file) {
      return { valid: false, error: 'No image file was provided.' };
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Invalid file format (${file.mimetype}). Only JPEG, PNG, and WebP are supported for virtual try-on.`
      };
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a smaller photo.`
      };
    }

    const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (ext && !validExtensions.includes(ext)) {
      return {
        valid: false,
        error: `Invalid file extension (${ext}). Expected .jpg, .png, or .webp.`
      };
    }

    return { valid: true };
  },

  /**
   * Validates base64 data URI (used by live webcam snapshot capture)
   */
  validateBase64DataUri(dataUri) {
    if (!dataUri || typeof dataUri !== 'string') {
      return { valid: false, error: 'Missing base64 image data.' };
    }

    const match = dataUri.match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
    if (!match) {
      return {
        valid: false,
        error: 'Invalid image format. Expected a base64 JPEG, PNG, or WebP data URI.'
      };
    }

    const mime = match[1];
    const base64Data = match[3];
    const approxSizeBytes = Math.round((base64Data.length * 3) / 4);

    if (approxSizeBytes > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: 'Captured image exceeds the 10MB size limit.'
      };
    }

    return {
      valid: true,
      mime,
      buffer: Buffer.from(base64Data, 'base64')
    };
  },

  /**
   * Securely delete a customer photo from disk (Privacy requirement)
   */
  deleteCustomerPhoto(filename) {
    if (!filename) return false;

    // Sanitize filename to avoid path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(customerUploadsDir, safeFilename);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch (err) {
      console.warn(`[Privacy] Could not delete photo ${safeFilename}:`, err.message);
    }
    return false;
  },

  /**
   * Convert local image file to base64 Data URI for external AI API ingestion
   */
  fileToDataUri(filePathOrUrl) {
    if (!filePathOrUrl) return null;

    // If it's already a public URL or data URI, return directly
    if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://') || filePathOrUrl.startsWith('data:')) {
      return filePathOrUrl;
    }

    // If it's a relative path on disk
    let fullPath = filePathOrUrl;
    if (!path.isAbsolute(fullPath)) {
      fullPath = path.join(__dirname, '..', '..', filePathOrUrl);
    }

    if (fs.existsSync(fullPath)) {
      const ext = path.extname(fullPath).toLowerCase().replace('.', '') || 'jpeg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const fileBuffer = fs.readFileSync(fullPath);
      return `data:${mime};base64,${fileBuffer.toString('base64')}`;
    }

    return null;
  }
};

export default imageValidationService;
