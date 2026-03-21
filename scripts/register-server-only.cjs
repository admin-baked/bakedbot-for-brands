/**
 * CLI preload that turns the Next.js `server-only` marker into a no-op.
 *
 * This is intentionally limited to standalone script execution. App/runtime
 * code should continue importing `server-only` normally.
 */

const Module = require('module');

const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'server-only') {
    return {};
  }

  return originalLoad.call(this, request, parent, isMain);
};
