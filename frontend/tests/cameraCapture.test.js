import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraService } from '../src/services/cameraService.js';

test('Webcam Capture Reliability Test Suite', async (t) => {
  // Helper to create a mock canvas factory
  const createMockCanvas = ({ shouldFailToBlob = false, dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' } = {}) => {
    return (w, h) => {
      let drawImageCalled = false;
      return {
        width: w,
        height: h,
        getContext: (type) => {
          if (type !== '2d') return null;
          return {
            drawImage: (video, sx, sy, sw, sh) => {
              drawImageCalled = true;
            }
          };
        },
        toDataURL: (mime, quality) => {
          return dataUrl;
        },
        toBlob: (callback, mime, quality) => {
          if (shouldFailToBlob) {
            callback(null);
          } else {
            // Return a valid Blob
            const sampleBlob = new Blob(['mock-jpeg-bytes'], { type: mime || 'image/jpeg' });
            callback(sampleBlob);
          }
        }
      };
    };
  };

  // Test 1: Successful capture with valid video and canvas
  await t.test('1. Successful capture: creates File named captured-photo.jpg with JPEG Blob', async () => {
    const mockVideo = {
      readyState: 4, // HAVE_ENOUGH_DATA
      videoWidth: 1280,
      videoHeight: 720
    };

    const createCanvas = createMockCanvas({ shouldFailToBlob: false });
    const result = await cameraService.captureFrame(mockVideo, { createCanvas });

    assert.ok(result, 'Result should be returned');
    assert.equal(result.width, 1280, 'Width must match videoWidth');
    assert.equal(result.height, 720, 'Height must match videoHeight');
    assert.ok(result.blob, 'Blob must exist');
    assert.equal(result.blob.type, 'image/jpeg', 'Blob must be image/jpeg');
    assert.ok(result.file, 'File must exist');
    assert.equal(result.file.name, 'captured-photo.jpg', 'File must be named captured-photo.jpg');
    assert.equal(result.file.type, 'image/jpeg', 'File type must be image/jpeg');
    assert.ok(result.dataUrl.startsWith('data:image/jpeg'), 'dataUrl must be a valid data URI');
  });

  // Test 2: Video not ready (readyState < 2)
  await t.test('2. Video not ready: rejects when readyState < 2', async () => {
    const notReadyVideo = {
      readyState: 1, // HAVE_METADATA only (no frame data)
      videoWidth: 1280,
      videoHeight: 720
    };

    const createCanvas = createMockCanvas();

    await assert.rejects(
      async () => {
        await cameraService.captureFrame(notReadyVideo, { createCanvas });
      },
      (err) => {
        return (
          err instanceof Error &&
          err.message.includes('Video stream is not ready for capture') &&
          err.message.includes('readyState: 1')
        );
      }
    );
  });

  // Test 3: Zero video dimensions (videoWidth <= 0 or videoHeight <= 0)
  await t.test('3. Zero video dimensions: rejects when videoWidth or videoHeight is 0', async () => {
    const zeroDimVideo = {
      readyState: 3, // HAVE_FUTURE_DATA
      videoWidth: 0,
      videoHeight: 720
    };

    const createCanvas = createMockCanvas();

    await assert.rejects(
      async () => {
        await cameraService.captureFrame(zeroDimVideo, { createCanvas });
      },
      (err) => {
        return (
          err instanceof Error &&
          err.message.includes('Video dimensions are invalid')
        );
      }
    );

    const zeroHeightVideo = {
      readyState: 2,
      videoWidth: 1280,
      videoHeight: 0
    };

    await assert.rejects(
      async () => {
        await cameraService.captureFrame(zeroHeightVideo, { createCanvas });
      },
      (err) => {
        return (
          err instanceof Error &&
          err.message.includes('Video dimensions are invalid')
        );
      }
    );
  });

  // Test 4: Null Blob returned by canvas.toBlob()
  await t.test('4. Null Blob: gracefully handles and rejects when toBlob() returns null', async () => {
    const validVideo = {
      readyState: 2, // HAVE_CURRENT_DATA
      videoWidth: 640,
      videoHeight: 480
    };

    const nullBlobCanvas = createMockCanvas({ shouldFailToBlob: true });

    await assert.rejects(
      async () => {
        await cameraService.captureFrame(validVideo, { createCanvas: nullBlobCanvas });
      },
      (err) => {
        return (
          err instanceof Error &&
          err.message.includes('canvas.toBlob() returned null')
        );
      }
    );
  });

  // Test 5: Missing videoElement reference
  await t.test('5. Missing video element: rejects when video element is null or undefined', async () => {
    await assert.rejects(
      async () => {
        await cameraService.captureFrame(null);
      },
      (err) => {
        return (
          err instanceof Error &&
          err.message.includes('Video element reference is null or undefined')
        );
      }
    );
  });
});

