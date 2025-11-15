/**
 * Rate limiter simple pour Socket.IO
 */
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  check(socketId) {
    const now = Date.now();
    const userRequests = this.requests.get(socketId) || [];
    
    // Nettoyer les anciennes requêtes
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false; // Rate limit dépassé
    }
    
    validRequests.push(now);
    this.requests.set(socketId, validRequests);
    
    return true;
  }

  cleanup() {
    // Nettoyer périodiquement
    setInterval(() => {
      const now = Date.now();
      for (const [socketId, requests] of this.requests.entries()) {
        const valid = requests.filter(time => now - time < this.windowMs);
        if (valid.length === 0) {
          this.requests.delete(socketId);
        } else {
          this.requests.set(socketId, valid);
        }
      }
    }, this.windowMs * 2);
  }
}

// ✅ CORRECTION ICI - Exporter la classe directement
module.exports = RateLimiter;
