## 🚀 Deploy Debugging Playbook (Next.js + Tailwind + Firebase Hosting)

---

### 0. Golden Rule

> **Always fix the *earliest* error in the logs first.**
> Everything else might just be fallout.

---

### 1. When a deploy fails or `/` returns 500

1. **Open deploy logs**

   * Firebase / Cloud Run / Vercel → view build + runtime logs.
   * Scroll to the **first “Error:”** after the build starts.

2. **Classify the error**

   **A. Dependency / module errors**

   * Messages like:

     * `Cannot find module 'X'`
     * `Module not found: Can't resolve 'X'`
   * Usually from things like Tailwind plugins, PostCSS, or imports.

   **B. Config errors**

   * Tailwind / Next / PostCSS / env:

     * `Invalid configuration object`
     * `Unknown property 'xyz' in tailwind.config`
     * Missing `process.env.SOMETHING`

   **C. Type / runtime errors**

   * TypeScript:

     * `Expected 1 arguments, but got 2`
     * `Type 'string' is not assignable to type 'Foo'`
   * Runtime:

     * `Cannot read properties of undefined`
     * `TypeError: X is not a function`

3. **Follow the branch:**

---

### 2. Branch A – “Cannot find module 'X'”

1. **Check package.json**

   * Search for `"X"` in `dependencies` and `devDependencies`.

2. **Fix:**

   * If missing:

     ```bash
     npm install X       # or
     npm install -D X    # if it’s a build-time plugin (like Tailwind)
     ```
   * If present but still failing:

     ```bash
     rm -rf node_modules package-lock.json
     npm install
     ```

3. **Re-run locally:**

   ```bash
   npm run build
   ```

   * Only push/deploy once `npm run build` passes **without** that module error.

---

### 3. Branch B – Config errors (Tailwind / Next / env)

1. **Tailwind / PostCSS**

   * Check `tailwind.config.(ts|js)`:

     * Any plugin you `require(...)` **must** be installed.
     * Any custom paths in `content: []` must be valid.

2. **Next.js config**

   * Check `next.config.(js|mjs|ts)` for syntax or experimental flags.

3. **Env**

   * If something mentions `process.env`, verify:

     * `.env.local` in dev.
     * Correct env vars in Firebase/Vercel project config.

Then re-run:

```bash
npm run lint
npm run build
```

---

### 4. Branch C – TypeScript / runtime errors

Once build + config are clean:

1. **Type mismatch / arity issues**

   Example from your saga:

   ```ts
   // Function expects an object:
   export async function getReviewSummary(input: { productId: string }) {}

   // ❌ Wrong:
   const summary = await getReviewSummary(product.id);

   // ✅ Correct:
   const summary = await getReviewSummary({ productId: product.id });
   ```

2. **Pattern:**

   * Read the **exact** types in the function definition.
   * Make your call site match that type.
   * If you change the function signature, update all call sites.

3. **Runtime errors**

   * Add temporary `console.log` or guards (e.g. check nulls) and redeploy.
   * In Next 13/14, remember server vs client components (no browser-only APIs on the server).

---

## 🛡️ How to Prevent This Stuff Upfront

Here’s how to make future-you’s life less spicy.

### 1. Always `npm run build` locally before deploying

* This catches:

  * missing modules,
  * Tailwind/PostCSS config issues,
  * TypeScript errors.

If `npm run dev` works but `npm run build` fails, treat **build** as the source of truth.

---

### 2. Lock down “no phantom imports” with ESLint

Add / ensure this rule:

```jsonc
// .eslintrc.*
{
  "rules": {
    "import/no-extraneous-dependencies": "error"
  }
}
```

This yells if you `require('@tailwindcss/container-queries')` without it being in `package.json`.

---

### 3. CI checks before deploy

Even a tiny GitHub Action does wonders:

* Steps:

  1. `npm ci`
  2. `npm run lint`
  3. `npm run build`

If that passes, your Firebase build *should* be boring.

---

### 4. Be paranoid about Tailwind plugins

Any time you touch `tailwind.config.ts`:

* If you add a plugin:

  * `npm install -D <plugin-name>`
* If you remove a plugin from `package.json`:

  * Also remove its `require(...)` from `tailwind.config`.

Mini-checklist comment you can stick at the top of the config:

```ts
// NOTE: Every plugin in `plugins: []` MUST exist in devDependencies.
```

---

### 5. Use a tiny health page

Create something like `/healthz` or `/status` in `app/healthz/page.tsx`:

```tsx
export default function HealthzPage() {
  return <div>OK</div>;
}
```

If `/healthz` 500s after deploy, you know it’s **global build/runtime**, not just some fancy component.

---

### 6. Log reading ritual

When you see a wall of red:

1. Find the **first** error after the build starts.
2. Say out loud (yes, actually):

   > “Is this a dependency, config, or app-level error?”
3. Fix that **one** cleanly.
4. Repeat.

It sounds cheesy, but this little ritual is how humans avoid getting hypnotized by the wrong error.