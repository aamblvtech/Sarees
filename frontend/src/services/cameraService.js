/**
 * Camera Service
 * Encapsulates HTML5 MediaDevices camera access, stream lifecycle, and robust canvas snapshot capture.
 */
export const cameraService = {
  /**
   * Check if camera is supported in current browser
   */
  isSupported() {
    return !!(typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  },

  /**
   * Request webcam stream
   */
  async startCamera(constraints = { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } }) {
    if (!this.isSupported()) {
      throw new Error('Camera access is not supported by your browser or environment.');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No camera device was detected on your machine.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        throw new Error('Camera is already in use by another application or tab.');
      } else {
        throw new Error(`Failed to access camera: ${err.message}`);
      }
    }
  },

  /**
   * Capture snapshot frame from an active video element
   *
   * Validations enforced:
   * 1. videoElement exists
   * 2. videoElement.readyState >= 2 (HAVE_CURRENT_DATA)
   * 3. videoElement.videoWidth > 0 and videoElement.videoHeight > 0
   * 4. Canvas creation and 2D context retrieval
   * 5. ctx.drawImage frame transfer
   * 6. canvas.toBlob conversion to JPEG Blob
   * 7. Null/corrupt Blob detection and handling
   * 8. Creation of File named 'captured-photo.jpg'
   *
   * @param {HTMLVideoElement} videoElement
   * @param {Object} [options]
   * @param {Function} [options.createCanvas] - Optional canvas factory for testing/custom environments
   * @param {number} [options.quality=0.95] - JPEG quality between 0 and 1
   * @returns {Promise<{ file: File, blob: Blob, dataUrl: string, width: number, height: number }>}
   */
  async captureFrame(videoElement, options = {}) {
    // 1. Verify video element exists
    if (!videoElement) {
      throw new Error('Video element reference is null or undefined.');
    }

    // 2. Verify readyState >= 2 (HAVE_CURRENT_DATA)
    // HTMLMediaElement: 0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA
    const readyState = typeof videoElement.readyState === 'number' ? videoElement.readyState : 0;
    if (readyState < 2) {
      throw new Error(`Video stream is not ready for capture (readyState: ${readyState}). Please wait for the camera feed to stabilize.`);
    }

    // 3. Verify videoWidth and videoHeight are greater than zero
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;

    if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
      throw new Error(`Video dimensions are invalid (width: ${width}, height: ${height}). Ensure the camera has delivered video frames.`);
    }

    // 4. Canvas creation
    let canvas;
    if (typeof options.createCanvas === 'function') {
      canvas = options.createCanvas(width, height);
    } else if (typeof document !== 'undefined' && document.createElement) {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    } else {
      throw new Error('DOM Canvas API is not available in the current environment.');
    }

    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx || typeof ctx.drawImage !== 'function') {
      throw new Error('Failed to acquire 2D rendering context for canvas snapshot.');
    }

    // 5. Draw the current video frame onto the canvas
    try {
      ctx.drawImage(videoElement, 0, 0, width, height);
    } catch (drawErr) {
      throw new Error(`Failed to draw video frame onto canvas: ${drawErr.message}`);
    }

    // Capture dataUrl as fallback / instant preview
    const quality = options.quality ?? 0.95;
    let dataUrl = '';
    if (typeof canvas.toDataURL === 'function') {
      try {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      } catch (dataUrlErr) {
        console.warn('[Camera Service] canvas.toDataURL warning:', dataUrlErr.message);
      }
    }

    // 6. Convert canvas to JPEG Blob using toBlob()
    const blob = await new Promise((resolve, reject) => {
      if (typeof canvas.toBlob !== 'function') {
        // Fallback for environments lacking native toBlob
        if (dataUrl && typeof atob !== 'undefined') {
          try {
            const byteString = atob(dataUrl.split(',')[1]);
            const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            resolve(new Blob([ab], { type: mimeString }));
            return;
          } catch (e) {
            reject(new Error(`Fallback Blob creation failed: ${e.message}`));
            return;
          }
        }
        reject(new Error('canvas.toBlob is not supported in this environment.'));
        return;
      }

      try {
        canvas.toBlob(
          (b) => {
            if (!b) {
              reject(new Error('canvas.toBlob() returned null. Failed to generate image Blob from camera frame.'));
            } else {
              resolve(b);
            }
          },
          'image/jpeg',
          quality
        );
      } catch (blobErr) {
        reject(new Error(`canvas.toBlob() invocation failed: ${blobErr.message}`));
      }
    });

    // 7. Verify resulting Blob
    if (!blob || !(blob instanceof Blob)) {
      throw new Error('The captured image Blob is invalid or null.');
    }

    // 8. Create a File named 'captured-photo.jpg'
    let file;
    if (typeof File !== 'undefined') {
      file = new File([blob], 'captured-photo.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
    } else {
      // In environments where File is not defined, return decorated Blob
      file = blob;
      file.name = 'captured-photo.jpg';
      file.lastModified = Date.now();
    }

    return {
      file,
      blob,
      dataUrl: dataUrl || (typeof URL !== 'undefined' ? URL.createObjectURL(blob) : ''),
      width,
      height
    };
  },

  /**
   * Stop all active media tracks for a given stream safely
   */
  stopStream(stream) {
    if (stream && stream.getTracks) {
      stream.getTracks().forEach((track) => {
        try {
          if (track.readyState !== 'ended') {
            track.stop();
          }
        } catch (e) {
          console.warn('[Camera Service] Error stopping media track:', e);
        }
      });
    }
  }
};

export default cameraService;
