// ioredis モック実装
class RedisMock {
  constructor() {
    this.data = new Map();
    this.listeners = new Map();
  }

  async get(key) {
    return this.data.get(key) || null;
  }

  async set(key, value) {
    this.data.set(key, value);
    return 'OK';
  }

  async setex(key, ttl, value) {
    this.data.set(key, value);
    // TTLは無視（テストでは不要）
    return 'OK';
  }

  async del(...keys) {
    let deleted = 0;
    for (const key of keys) {
      if (this.data.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }

  async keys(pattern) {
    const results = [];
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.data.keys()) {
      if (regex.test(key)) {
        results.push(key);
      }
    }
    return results;
  }

  async quit() {
    this.data.clear();
    this.listeners.clear();
    return 'OK';
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    return this;
  }

  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  removeAllListeners() {
    this.listeners.clear();
    return this;
  }
}

module.exports = {
  Redis: RedisMock,
  default: RedisMock,
};
