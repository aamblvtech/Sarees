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
   * Fast zero-dependency parser for image dimensions from Buffer headers
   * Supports JPEG (SOF0/SOF2), PNG (IHDR), and WebP (VP8/VP8L/VP8X)
   */
  parseImageDimensions(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
      return null;
    }

    try {
      // 1. JPEG Check (FF D8)
      if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
        let offset = 2;
        while (offset < buffer.length - 8) {
          if (buffer[offset] !== 0xFF) {
            offset++;
            continue;
          }
          const marker = buffer[offset + 1];
          // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
          if ([0xC0, 0xC1, 0xC2].includes(marker)) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            if (width > 0 && height > 0) {
              return { format: 'jpeg', width, height };
            }
          }
          if (marker === 0xDA || marker === 0xD9) break; // SOS or EOI
          const length = buffer.readUInt16BE(offset + 2);
          if (length <= 2) break;
          offset += 2 + length;
        }
      }

      // 2. PNG Check (89 50 4E 47 0D 0A 1A 0A)
      if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4E &&
        buffer[3] === 0x47
      ) {
        // IHDR chunk starts at byte 12 (length: 4, type 'IHDR': 4, width: 4, height: 4)
        if (buffer.length >= 24) {
          const width = buffer.readUInt32BE(16);
          const height = buffer.readUInt32BE(20);
          return { format: 'png', width, height };
        }
      }

      // 3. WebP Check (RIFF ... WEBP)
      if (
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      ) {
        const type = buffer.toString('ascii', 12, 16);
        if (type === 'VP8 ' && buffer.length >= 30) {
          const width = buffer.readUInt16LE(26) & 0x3fff;
          const height = buffer.readUInt16LE(28) & 0x3fff;
          return { format: 'webp', width, height };
        } else if (type === 'VP8L' && buffer.length >= 25) {
          const b1 = buffer[21];
          const b2 = buffer[22];
          const b3 = buffer[23];
          const b4 = buffer[24];
          const width = 1 + (((b2 & 0x3f) << 8) | b1);
          const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
          return { format: 'webp', width, height };
        } else if (type === 'VP8X' && buffer.length >= 30) {
          const width = 1 + buffer.readUIntLE(24, 3);
          const height = 1 + buffer.readUIntLE(27, 3);
          return { format: 'webp', width, height };
        }
      }
    } catch (err) {
      console.warn('[Image Inspector] Header parse notice:', err.message);
    }

    return null;
  },

  /**
   * Comprehensive Customer Photo Quality & Identity Preservation Inspector
   * Analyzes resolution, aspect ratio, and body framing to prevent AI facial distortion.
   */
  inspectCustomerPhoto(buffer, filename = '') {
    const dims = this.parseImageDimensions(buffer);
    const fileSize = buffer.length;

    const warnings = [];
    const recommendations = [];
    let suitabilityScore = 100;
    let framing = 'unknown';
    let width = dims?.width || null;
    let height = dims?.height || null;
    let aspectRatio = width && height ? height / width : 1.0;

    if (!dims) {
      suitabilityScore -= 20;
      warnings.push('Image format header could not be fully verified.');
    } else {
      // 1. Resolution Check
      if (width < 400 || height < 500) {
        suitabilityScore -= 35;
        warnings.push(`Low resolution (${width}x${height}px). Recommended minimum is 720x1080px.`);
        recommendations.push('Upload a higher resolution photograph to preserve facial details and fabric textures.');
      } else if (width < 600 || height < 800) {
        suitabilityScore -= 15;
        recommendations.push('Resolution is acceptable, but 1080p standing photos provide highest identity preservation.');
      }

      // 2. Framing & Aspect Ratio Analysis
      // Standing portraits typically have aspect ratio (H/W) between 1.25 and 2.2
      if (aspectRatio < 1.1) {
        framing = 'close_up';
        suitabilityScore -= 40;
        warnings.push('Framing Notice: Image appears to be a close-up selfie or landscape photo.');
        recommendations.push(
          'For accurate body proportions and natural draping, please upload a standing portrait showing your torso and body. Close-up selfies force AI to guess missing body parts, which can alter facial structure and proportions.'
        );
      } else if (aspectRatio < 1.35) {
        framing = 'three_quarter';
        suitabilityScore -= 10;
        recommendations.push('Upper-body / 3/4 portrait detected. Full standing portraits yield highest realism.');
      } else {
        framing = 'full_body';
        recommendations.push('Optimal portrait aspect ratio detected for virtual garment draping.');
      }
    }

    suitabilityScore = Math.max(10, Math.min(100, suitabilityScore));
    const suitable = suitabilityScore >= 50;

    return {
      suitable,
      suitabilityScore,
      framing,
      width,
      height,
      aspectRatio: Number(aspectRatio.toFixed(2)),
      fileSize,
      fileSizeBytes: fileSize,
      warnings,
      recommendations,
      identityPreservationGrade: suitabilityScore >= 80 ? 'HIGH' : suitabilityScore >= 55 ? 'MODERATE' : 'POOR_FRAMING'
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
