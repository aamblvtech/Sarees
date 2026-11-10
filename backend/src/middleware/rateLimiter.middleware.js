/**
 * In-Memory Sliding Window Rate Limiter
 * Provides zero-dependency rate limiting for authentication and upload endpoints.
 */
export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 50, message = 'Too many requests, please try again later.' } = {}) {
  const requests = new Map();

  // Periodic cleanup of stale IP records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of requests.entries()) {
      const active = timestamps.filter(t => now - t < windowMs);
      if (active.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, active);
      }
    }
  }, 5 * 60 * 1000);

  return (req, res, next) => {
    // In test environment, allow high throughput
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const key = `${req.baseUrl || ''}${req.path}:${ip}`;
    const now = Date.now();

    const timestamps = requests.get(key) || [];
    const validTimestamps = timestamps.filter(t => now - t < windowMs);

    if (validTimestamps.length >= max) {
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterMs: windowMs - (now - validTimestamps[0])
      });
    }

    validTimestamps.push(now);
    requests.set(key, validTimestamps);
    next();
  };
}

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please try again after 15 minutes.'
});

export const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Upload rate limit exceeded. Please wait a few moments before uploading more assets.'
});
