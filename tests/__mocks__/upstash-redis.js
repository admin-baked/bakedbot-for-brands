const store = new Map();

class Redis {
  constructor(_config = {}) {}

  static fromEnv() {
    return new Redis();
  }

  async get(key) {
    return store.has(key) ? store.get(key) : null;
  }

  async set(key, value, _options = {}) {
    store.set(key, value);
    return 'OK';
  }

  async del(...keys) {
    let deleted = 0;
    for (const key of keys) {
      if (store.delete(key)) deleted += 1;
    }
    return deleted;
  }

  async keys(pattern = '*') {
    if (pattern === '*') return Array.from(store.keys());

    const escaped = String(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
    return Array.from(store.keys()).filter((key) => regex.test(key));
  }

  async incr(key) {
    const nextValue = Number(store.get(key) ?? 0) + 1;
    store.set(key, nextValue);
    return nextValue;
  }

  async expire(_key, _seconds) {
    return 1;
  }

  async ttl(_key) {
    return -1;
  }
}

module.exports = {
  Redis,
  __store: store,
};
