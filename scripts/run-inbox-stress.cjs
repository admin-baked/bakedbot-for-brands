"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/lib/logger.ts
function isServerProductionRuntime() {
  return typeof window === "undefined" && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build";
}
async function initGCPLogging() {
  if (gcpLogInitialized) return gcpLog;
  if (isServerProductionRuntime()) {
    try {
      const { Logging } = await import(
        /* webpackIgnore: true */
        "@google-cloud/logging"
      );
      const logging = new Logging({
        projectId: process.env.FIREBASE_PROJECT_ID || "studio-567050101-bc6e8"
      });
      gcpLog = logging.log("bakedbot-app");
    } catch (error) {
      console.error("[Logger] Failed to initialize GCP Logging:", error);
      gcpLog = null;
    }
  }
  gcpLogInitialized = true;
  return gcpLog;
}
async function writeLog({ message, data = {}, level = "INFO" }) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  if (level === "ERROR" || level === "CRITICAL") {
    Sentry.captureException(new Error(message), {
      level: level === "CRITICAL" ? "fatal" : "error",
      extra: data,
      tags: { logger: typeof window === "undefined" ? "server" : "client" }
    });
  }
  if (isServerProductionRuntime()) {
    const log = await initGCPLogging();
    if (log) {
      try {
        const entry = log.entry(
          {
            severity: level,
            resource: { type: "cloud_run_revision" }
          },
          {
            message,
            ...data,
            timestamp
          }
        );
        log.write(entry).catch((err) => {
          console.error("[Logger Error]", err);
        });
      } catch (error) {
        console.error("[Logger Error]", error);
      }
    } else {
      console.log(`[${level}] ${timestamp} ${message}`, data);
    }
  } else {
    const prefix = `[${level}] ${timestamp} ${message}`;
    const logData = Object.keys(data).length > 0 ? data : void 0;
    switch (level) {
      case "ERROR":
      case "CRITICAL":
        console.error(prefix, logData || "");
        break;
      case "WARNING":
        console.warn(prefix, logData || "");
        break;
      default:
        console.log(prefix, logData || "");
    }
  }
}
var Sentry, gcpLogInitialized, gcpLog, logger;
var init_logger = __esm({
  "src/lib/logger.ts"() {
    "use strict";
    Sentry = __toESM(require("@sentry/nextjs"));
    gcpLogInitialized = false;
    gcpLog = null;
    logger = {
      debug: (message, data) => writeLog({ message, data, level: "DEBUG" }),
      info: (message, data) => writeLog({ message, data, level: "INFO" }),
      warn: (message, data) => writeLog({ message, data, level: "WARNING" }),
      error: (message, data) => writeLog({ message, data, level: "ERROR" }),
      critical: (message, data) => writeLog({ message, data, level: "CRITICAL" })
    };
  }
});

// src/lib/customers/profile-derivations.ts
function normalizeValue(value) {
  return typeof value === "string" ? value.trim() : "";
}
function getFirstMeaningfulValue(values) {
  for (const value of values) {
    const normalized = normalizeValue(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}
function isSyntheticCustomerToken(value) {
  return /^(alleaves|customer|cid)[_-]\d+$/i.test(value);
}
function isPlaceholderCustomerEmail(value) {
  const normalized = normalizeValue(value).toLowerCase();
  if (!normalized) {
    return false;
  }
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0) {
    return false;
  }
  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  if (domain === "unknown.local") {
    return true;
  }
  if (domain === "bakedbot.ai") {
    return true;
  }
  return domain === "alleaves.local" && isSyntheticCustomerToken(localPart);
}
function isPlaceholderCustomerIdentity(value, input) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return false;
  }
  const lower = normalized.toLowerCase();
  if (lower === "unknown" || lower === "unknown customer" || lower === "customer") {
    return true;
  }
  if (isSyntheticCustomerToken(normalized)) {
    return true;
  }
  const fallbackId = normalizeValue(input?.fallbackId).toLowerCase();
  if (fallbackId && lower === fallbackId) {
    return true;
  }
  const email = normalizeValue(input?.email).toLowerCase();
  if (email && lower === email) {
    return true;
  }
  if (email && isPlaceholderCustomerEmail(email)) {
    const localPart = email.split("@")[0];
    if (lower === localPart) {
      return true;
    }
  }
  return false;
}
function resolveCustomerDisplayName(input) {
  const displayName = normalizeValue(input.displayName);
  if (displayName && !isPlaceholderCustomerIdentity(displayName, input)) {
    return displayName;
  }
  const combinedName = [normalizeValue(input.firstName), normalizeValue(input.lastName)].filter(Boolean).join(" ").trim();
  if (combinedName) {
    return combinedName;
  }
  const firstName = normalizeValue(input.firstName);
  if (firstName) {
    return firstName;
  }
  return getFirstMeaningfulValue([displayName, input.email, input.fallbackId]) ?? "Unknown Customer";
}
var init_profile_derivations = __esm({
  "src/lib/customers/profile-derivations.ts"() {
    "use strict";
  }
});

// src/firebase/admin.ts
function getServiceAccount() {
  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    try {
      const fs2 = require("fs");
      const path2 = require("path");
      const localSaPath = path2.resolve(process.cwd(), "service-account.json");
      if (fs2.existsSync(localSaPath)) {
        serviceAccountKey = fs2.readFileSync(localSaPath, "utf-8");
        console.log("[src/firebase/admin.ts] Loading key from local service-account.json");
      }
    } catch (err) {
      console.warn("[src/firebase/admin.ts] Failed to read local service-account.json", err);
    }
  }
  if (!serviceAccountKey) {
    return null;
  }
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountKey);
  } catch (e) {
    try {
      const json = Buffer.from(serviceAccountKey, "base64").toString("utf8");
      serviceAccount = JSON.parse(json);
    } catch (decodeError) {
      console.error("Failed to parse service account key from Base64 or JSON.", decodeError);
      return null;
    }
  }
  if (serviceAccount && typeof serviceAccount.private_key === "string") {
    const rawKey = serviceAccount.private_key;
    const pemPattern = /(-+BEGIN\s+.*PRIVATE\s+KEY-+)([\s\S]+?)(-+END\s+.*PRIVATE\s+KEY-+)/;
    const match = rawKey.match(pemPattern);
    if (match) {
      const header = "-----BEGIN PRIVATE KEY-----";
      const footer = "-----END PRIVATE KEY-----";
      const bodyRaw = match[2];
      let bodyClean = bodyRaw.replace(/[^a-zA-Z0-9+/=]/g, "");
      if (bodyClean.length % 4 === 1) {
        bodyClean = bodyClean.slice(0, -1);
        bodyClean = bodyClean.slice(0, -2) + "==";
      }
      while (bodyClean.length % 4 !== 0) {
        bodyClean += "=";
      }
      const bodyFormatted = bodyClean.match(/.{1,64}/g)?.join("\n") || bodyClean;
      serviceAccount.private_key = `${header}
${bodyFormatted}
${footer}
`;
    } else {
      serviceAccount.private_key = rawKey.trim().replace(/\\n/g, "\n");
    }
  }
  return serviceAccount;
}
function getAdminFirestore() {
  try {
    if ((0, import_app.getApps)().length === 0) {
      console.log("[Firebase Admin] No apps found, initializing...");
      const serviceAccount = getServiceAccount();
      if (serviceAccount) {
        console.log("[Firebase Admin] Using service account credentials");
        (0, import_app.initializeApp)({
          credential: (0, import_app.cert)(serviceAccount)
        });
      } else {
        console.log("[Firebase Admin] Using application default credentials");
        (0, import_app.initializeApp)({
          credential: (0, import_app.applicationDefault)(),
          projectId: process.env.FIREBASE_PROJECT_ID || "studio-567050101-bc6e8"
        });
      }
      console.log("[Firebase Admin] Firebase app initialized successfully");
    }
    const app = (0, import_app.getApps)()[0];
    if (!app) {
      throw new Error("[Firebase Admin] Failed to initialize Firebase app - no apps found after initialization attempt");
    }
    const db = (0, import_firestore.getFirestore)(app);
    if (!firestoreSettingsApplied) {
      try {
        db.settings({ ignoreUndefinedProperties: true });
      } catch (error) {
        console.warn("[Firebase Admin] Failed to apply Firestore settings", error);
      }
      firestoreSettingsApplied = true;
    }
    return db;
  } catch (error) {
    console.error("[Firebase Admin] Error in getAdminFirestore:", error);
    throw error;
  }
}
var import_server_only, import_app, import_firestore, import_auth, import_storage, firestoreSettingsApplied;
var init_admin = __esm({
  "src/firebase/admin.ts"() {
    "use strict";
    import_server_only = require("server-only");
    import_app = require("firebase-admin/app");
    import_firestore = require("firebase-admin/firestore");
    import_auth = require("firebase-admin/auth");
    import_storage = require("firebase-admin/storage");
    firestoreSettingsApplied = false;
  }
});

// src/types/project.ts
var import_zod, CreateProjectSchema, UpdateProjectSchema, AddProjectDocumentSchema, PROJECT_LIMITS, PROJECT_COLORS;
var init_project = __esm({
  "src/types/project.ts"() {
    "use strict";
    import_zod = require("zod");
    CreateProjectSchema = import_zod.z.object({
      name: import_zod.z.string().min(1).max(100),
      description: import_zod.z.string().max(500).optional(),
      systemInstructions: import_zod.z.string().max(1e4).optional(),
      color: import_zod.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      icon: import_zod.z.string().max(50).optional(),
      defaultModel: import_zod.z.string().optional()
    });
    UpdateProjectSchema = import_zod.z.object({
      projectId: import_zod.z.string(),
      name: import_zod.z.string().min(1).max(100).optional(),
      description: import_zod.z.string().max(500).optional(),
      systemInstructions: import_zod.z.string().max(1e4).optional(),
      color: import_zod.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      icon: import_zod.z.string().max(50).optional(),
      defaultModel: import_zod.z.string().optional()
    });
    AddProjectDocumentSchema = import_zod.z.object({
      projectId: import_zod.z.string(),
      type: import_zod.z.enum(["text", "link", "pdf", "file", "image"]),
      title: import_zod.z.string().min(1).max(200),
      content: import_zod.z.string().min(1),
      sourceUrl: import_zod.z.string().url().optional(),
      mimeType: import_zod.z.string().optional()
    });
    PROJECT_LIMITS = {
      free: { maxProjects: 3, maxDocsPerProject: 5 },
      claim_pro: { maxProjects: 10, maxDocsPerProject: 50 },
      starter: { maxProjects: 50, maxDocsPerProject: 200 },
      growth: { maxProjects: 100, maxDocsPerProject: 500 },
      scale: { maxProjects: 500, maxDocsPerProject: 1e3 },
      enterprise: { maxProjects: Infinity, maxDocsPerProject: Infinity }
    };
    PROJECT_COLORS = [
      "#10b981",
      // Emerald
      "#3b82f6",
      // Blue
      "#8b5cf6",
      // Violet
      "#f59e0b",
      // Amber
      "#ef4444",
      // Red
      "#ec4899",
      // Pink
      "#06b6d4",
      // Cyan
      "#84cc16"
      // Lime
    ];
  }
});

// src/firebase/server-client.ts
var server_client_exports = {};
__export(server_client_exports, {
  createServerClient: () => createServerClient,
  getUserClaims: () => getUserClaims,
  getUserProfile: () => getUserProfile,
  setUserClaims: () => setUserClaims,
  setUserRole: () => setUserRole,
  verifyIdToken: () => verifyIdToken
});
function getServiceAccount2() {
  if (cachedServiceAccount) return cachedServiceAccount;
  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    try {
      const fs2 = require("fs");
      const path2 = require("path");
      const cwd = process.cwd();
      const searchPaths = [
        path2.resolve(cwd, "service-account.json"),
        path2.resolve(cwd, "..", "service-account.json"),
        path2.resolve(cwd, "..", "..", "service-account.json"),
        "C:\\Users\\admin\\BakedBot for Brands\\bakedbot-for-brands\\service-account.json"
      ];
      for (const tryPath of searchPaths) {
        if (fs2.existsSync(tryPath)) {
          serviceAccountKey = fs2.readFileSync(tryPath, "utf-8");
          console.log(`[ServerClient] Loaded credentials from: ${tryPath}`);
          break;
        }
      }
    } catch (e) {
      console.warn("[ServerClient] Failed to check for local service-account.json:", e);
    }
  }
  if (!serviceAccountKey) {
    console.warn("[ServerClient] FIREBASE_SERVICE_ACCOUNT_KEY not set. Using Application Default Credentials.");
    return null;
  }
  let sa;
  try {
    if (serviceAccountKey.trim().startsWith("{")) {
      sa = JSON.parse(serviceAccountKey);
    } else {
      const json = Buffer.from(serviceAccountKey, "base64").toString("utf8");
      sa = JSON.parse(json);
    }
  } catch (e) {
    console.error("[ServerClient] Failed to parse service account key:", e);
    return null;
  }
  if (sa && typeof sa.private_key === "string") {
    const rawKey = sa.private_key;
    const pemPattern = /(-+BEGIN\s+.*PRIVATE\s+KEY-+)([\s\S]+?)(-+END\s+.*PRIVATE\s+KEY-+)/;
    const match = rawKey.match(pemPattern);
    if (match) {
      const header = "-----BEGIN PRIVATE KEY-----";
      const footer = "-----END PRIVATE KEY-----";
      const bodyRaw = match[2];
      let bodyClean = bodyRaw.replace(/[^a-zA-Z0-9+/=]/g, "");
      if (bodyClean.length % 4 === 1) bodyClean = bodyClean.slice(0, -1);
      while (bodyClean.length % 4 !== 0) bodyClean += "=";
      const bodyFormatted = bodyClean.match(/.{1,64}/g)?.join("\n") || bodyClean;
      sa.private_key = `${header}
${bodyFormatted}
${footer}
`;
    } else {
      sa.private_key = rawKey.trim().replace(/\\n/g, "\n");
    }
  }
  cachedServiceAccount = sa;
  return sa;
}
async function createServerClient() {
  const appName = "server-client-app";
  if (!serverApp) {
    const apps = (0, import_app2.getApps)();
    const existingApp = apps.find((a) => a.name === appName);
    if (existingApp) {
      serverApp = existingApp;
    } else {
      const sa = getServiceAccount2();
      const config = {
        credential: sa ? (0, import_app2.cert)(sa) : (0, import_app2.applicationDefault)(),
        projectId: sa ? sa.project_id : process.env.FIREBASE_PROJECT_ID || "studio-567050101-bc6e8",
        storageBucket: sa ? `${sa.project_id}.firebasestorage.app` : void 0
      };
      console.log(`[ServerClient] Initializing isolated app: ${appName} (Project: ${config.projectId})`);
      serverApp = (0, import_app2.initializeApp)(config, appName);
    }
  }
  const auth = (0, import_auth2.getAuth)(serverApp);
  const firestore = (0, import_firestore2.getFirestore)(serverApp);
  const storage = (0, import_storage2.getStorage)(serverApp);
  try {
    firestore.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
  }
  return { auth, firestore, storage };
}
async function verifyIdToken(token) {
  const { auth } = await createServerClient();
  return auth.verifyIdToken(token);
}
async function getUserProfile(uid) {
  const { firestore } = await createServerClient();
  const userDoc = await firestore.collection("users").doc(uid).get();
  return userDoc.exists ? userDoc.data() : null;
}
async function getUserClaims(uid) {
  const { auth } = await createServerClient();
  const user = await auth.getUser(uid);
  return user.customClaims || {};
}
async function setUserClaims(uid, claims) {
  const { auth } = await createServerClient();
  await auth.setCustomUserClaims(uid, claims);
}
async function setUserRole(uid, role, additionalData) {
  const claims = {
    role,
    tenantId: additionalData?.tenantId || additionalData?.brandId || additionalData?.locationId,
    ...additionalData
  };
  await setUserClaims(uid, claims);
}
var import_app2, import_firestore2, import_auth2, import_storage2, serverApp, cachedServiceAccount;
var init_server_client = __esm({
  "src/firebase/server-client.ts"() {
    "use strict";
    import_app2 = require("firebase-admin/app");
    import_firestore2 = require("firebase-admin/firestore");
    import_auth2 = require("firebase-admin/auth");
    import_storage2 = require("firebase-admin/storage");
    serverApp = null;
    cachedServiceAccount = null;
  }
});

// src/lib/super-admin-config.ts
var ALL_SUPER_ADMIN_EMAILS, SUPER_ADMIN_EMAILS;
var init_super_admin_config = __esm({
  "src/lib/super-admin-config.ts"() {
    "use strict";
    ALL_SUPER_ADMIN_EMAILS = [
      "martez@bakedbot.ai",
      "jack@bakedbot.ai",
      "vib@cannmenus.com",
      "owner@bakedbot.ai",
      // Dev persona - gated by environment check below
      "rishabh@bakedbot.ai"
      // Added by request
    ];
    SUPER_ADMIN_EMAILS = ALL_SUPER_ADMIN_EMAILS.filter(
      (email) => email !== "owner@bakedbot.ai" || process.env.NODE_ENV !== "production"
    );
  }
});

// src/types/roles.ts
function isBrandRole(role) {
  if (!role) return false;
  return ["brand_admin", "brand_member", "brand"].includes(role);
}
function isDispensaryRole(role) {
  if (!role) return false;
  return ["dispensary_admin", "dispensary_staff", "dispensary", "budtender"].includes(role);
}
var ROLES, ALL_ROLES;
var init_roles = __esm({
  "src/types/roles.ts"() {
    "use strict";
    ROLES = [
      "super_user",
      "super_admin",
      "brand_admin",
      "brand_member",
      "brand",
      "dispensary_admin",
      "dispensary_staff",
      "dispensary",
      "budtender",
      "customer",
      "intern",
      "grower",
      "delivery_driver"
    ];
    ALL_ROLES = [...ROLES];
  }
});

// src/server/auth/auth.ts
function roleMatches(userRole, requiredRoles) {
  if (requiredRoles.includes(userRole)) {
    return true;
  }
  for (const required of requiredRoles) {
    if (required === "brand" && isBrandRole(userRole)) {
      return true;
    }
    if (required === "dispensary" && isDispensaryRole(userRole)) {
      return true;
    }
    if (required === "brand_member" && (userRole === "brand_admin" || userRole === "brand")) {
      return true;
    }
    if (required === "dispensary_staff" && (userRole === "dispensary_admin" || userRole === "dispensary")) {
      return true;
    }
  }
  return false;
}
async function requireUser(requiredRoles) {
  const cookieStore = await (0, import_headers.cookies)();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) {
    const simulatedRole = cookieStore.get("x-simulated-role")?.value;
    const isDev = process.env.NODE_ENV === "development";
    if (isDev && simulatedRole) {
      if (process.env.NODE_ENV !== "development") {
        throw new Error("SECURITY: Dev bypass attempted in non-development environment");
      }
      const mockToken = {
        uid: "dev-user-id",
        email: "dev@bakedbot.ai",
        email_verified: true,
        role: simulatedRole
        // Add other required properties as needed
      };
      if (requiredRoles && requiredRoles.length > 0) {
        if (!roleMatches(simulatedRole, requiredRoles)) {
          throw new Error(`Forbidden: Dev user (role=${simulatedRole}) missing required permissions.`);
        }
      }
      return mockToken;
    }
    logger.warn("[AUTH] No session cookie \u2014 redirecting to login");
    (0, import_navigation.redirect)("/login");
  }
  const { auth } = await createServerClient();
  const isDevOrTest = process.env.NODE_ENV !== "production";
  let decodedToken;
  try {
    if (isDevOrTest && sessionCookie.startsWith("mock_session_")) {
      console.warn("[AUTH_BYPASS] Using synthetic token for mock session");
      decodedToken = {
        uid: `mock-user-${sessionCookie.split("_")[2]}`,
        email: "dev-user@bakedbot.ai",
        email_verified: true
        // No role by default for mock sessions to trigger onboarding/role setup
      };
    } else {
      decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    }
  } catch (error) {
    logger.warn("[AUTH] Session cookie verification failed \u2014 redirecting to login", { error: String(error) });
    (0, import_navigation.redirect)("/login");
  }
  const rawRole = decodedToken.role || void 0;
  const normalizedPlatformRole = rawRole && ["owner", "executive", "superuser", "admin"].includes(rawRole) ? "super_user" : rawRole;
  if (normalizedPlatformRole && normalizedPlatformRole !== rawRole) {
    decodedToken = { ...decodedToken, role: normalizedPlatformRole };
  }
  if (decodedToken.role === "super_user" || decodedToken.role === "super_admin") {
    const simulatedRole = cookieStore.get("x-simulated-role")?.value;
    if (simulatedRole && ["brand", "brand_admin", "brand_member", "dispensary", "dispensary_admin", "dispensary_staff", "customer"].includes(simulatedRole)) {
      logger.warn("[AUTH] Role simulation used", {
        realUserId: decodedToken.uid,
        realRole: decodedToken.role,
        simulatedRole,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      decodedToken = { ...decodedToken, role: simulatedRole };
      if (isBrandRole(simulatedRole)) {
        decodedToken = { ...decodedToken, brandId: "default" };
      }
    }
  }
  if (decodedToken.role === "super_user" || decodedToken.role === "super_admin") {
    const impersonatedOrgId = cookieStore.get("x-impersonated-org-id")?.value;
    if (impersonatedOrgId) {
      try {
        decodedToken = {
          ...decodedToken,
          currentOrgId: impersonatedOrgId,
          orgId: impersonatedOrgId
        };
        const { firestore } = await createServerClient();
        const orgDoc = await firestore.collection("organizations").doc(impersonatedOrgId).get();
        if (orgDoc.exists) {
          const org = orgDoc.data();
          if (org) {
            decodedToken = {
              ...decodedToken,
              brandId: org.type === "brand" ? impersonatedOrgId : null
            };
            if (org.type === "dispensary") {
              const locSnap = await firestore.collection("locations").where("orgId", "==", impersonatedOrgId).limit(1).get();
              if (!locSnap.empty) {
                decodedToken = { ...decodedToken, locationId: locSnap.docs[0].id };
              }
            }
          }
        }
      } catch (error) {
        console.error("[AUTH_WARN] Failed to fetch impersonated org:", error);
      }
    }
  }
  const userRole = decodedToken.role || null;
  const userEmail = decodedToken.email?.toLowerCase() || "";
  const isSuperAdminByEmail = SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail);
  const isSuperUserRole = userRole === "super_user" || userRole === "super_admin";
  if (!isSuperAdminByEmail && !isSuperUserRole) {
    const approvalStatus = decodedToken.approvalStatus;
    if (approvalStatus === "pending") {
      logger.warn("[AUTH] Account pending approval", { uid: decodedToken.uid });
      throw new Error("Forbidden: Your account is pending approval.");
    }
    if (approvalStatus === "rejected") {
      logger.warn("[AUTH] Account rejected", { uid: decodedToken.uid });
      throw new Error("Forbidden: Your account has been rejected.");
    }
  }
  if (requiredRoles && requiredRoles.length > 0) {
    if (!isSuperAdminByEmail && !isSuperUserRole) {
      if (!userRole || !roleMatches(userRole, requiredRoles)) {
        logger.warn("[AUTH] Role mismatch \u2014 redirecting to dashboard", { uid: decodedToken.uid, userRole, requiredRoles });
        throw new Error("Forbidden: You do not have the required permissions.");
      }
    }
  }
  return decodedToken;
}
var import_server_only2, import_headers, import_navigation;
var init_auth = __esm({
  "src/server/auth/auth.ts"() {
    "use strict";
    "use server";
    import_server_only2 = require("server-only");
    import_headers = require("next/headers");
    import_navigation = require("next/navigation");
    init_server_client();
    init_super_admin_config();
    init_logger();
    init_roles();
  }
});

// src/server/actions/projects.ts
var projects_exports = {};
__export(projects_exports, {
  canCreateProject: () => canCreateProject,
  createProject: () => createProject,
  createProjectChat: () => createProjectChat,
  deleteProject: () => deleteProject,
  getProject: () => getProject,
  getProjectChats: () => getProjectChats,
  getProjectCount: () => getProjectCount,
  getProjects: () => getProjects,
  updateProject: () => updateProject,
  updateProjectChatTitle: () => updateProjectChatTitle
});
function getDb() {
  return getAdminFirestore();
}
function projectFromFirestore(doc) {
  if (!doc.exists) return null;
  const data = doc.data();
  const createdAt = data.createdAt instanceof import_firestore3.Timestamp ? data.createdAt.toDate() : /* @__PURE__ */ new Date();
  const updatedAt = data.updatedAt instanceof import_firestore3.Timestamp ? data.updatedAt.toDate() : /* @__PURE__ */ new Date();
  const lastChatAt = data.lastChatAt instanceof import_firestore3.Timestamp ? data.lastChatAt.toDate() : void 0;
  return {
    id: doc.id,
    ownerId: data.ownerId,
    name: data.name || "Untitled Project",
    description: data.description || "",
    systemInstructions: data.systemInstructions,
    color: data.color || PROJECT_COLORS[0],
    icon: data.icon || "Briefcase",
    defaultModel: data.defaultModel || "lite",
    documentCount: data.documentCount || 0,
    totalBytes: data.totalBytes || 0,
    chatCount: data.chatCount || 0,
    createdAt,
    updatedAt,
    lastChatAt,
    isShared: data.isShared || false,
    sharedWith: data.sharedWith || []
  };
}
function chatFromFirestore(doc) {
  if (!doc.exists) return null;
  const data = doc.data();
  const createdAt = data.createdAt instanceof import_firestore3.Timestamp ? data.createdAt.toDate() : /* @__PURE__ */ new Date();
  const updatedAt = data.updatedAt instanceof import_firestore3.Timestamp ? data.updatedAt.toDate() : /* @__PURE__ */ new Date();
  return {
    id: doc.id,
    projectId: data.projectId,
    userId: data.userId,
    title: data.title || "Untitled Chat",
    messageCount: data.messageCount || 0,
    createdAt,
    updatedAt
  };
}
async function createProject(input) {
  const user = await requireUser();
  const validated = CreateProjectSchema.parse(input);
  const db = getDb();
  const projectRef = db.collection(PROJECTS_COLLECTION).doc();
  const color = validated.color || PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
  const projectData = {
    ownerId: user.uid,
    name: validated.name,
    description: validated.description || "",
    systemInstructions: validated.systemInstructions || "",
    color,
    icon: validated.icon || "Briefcase",
    defaultModel: validated.defaultModel || "lite",
    documentCount: 0,
    totalBytes: 0,
    chatCount: 0,
    createdAt: import_firestore3.Timestamp.now(),
    updatedAt: import_firestore3.Timestamp.now()
  };
  await projectRef.set(projectData);
  (0, import_cache.revalidatePath)("/dashboard/projects");
  return {
    id: projectRef.id,
    ...projectData,
    createdAt: projectData.createdAt.toDate(),
    updatedAt: projectData.updatedAt.toDate()
  };
}
async function getProjects() {
  try {
    const user = await requireUser();
    const db = getDb();
    const snapshot = await db.collection(PROJECTS_COLLECTION).where("ownerId", "==", user.uid).orderBy("updatedAt", "desc").get();
    return snapshot.docs.map((doc) => projectFromFirestore(doc)).filter((p) => p !== null);
  } catch (error) {
    if (error?.message?.includes("Unauthorized") || error?.message?.includes("No session")) {
      console.log("[projects] User not authenticated, returning empty projects");
      return [];
    }
    if (error?.code === 9 || error?.message?.includes("index")) {
      console.error("Projects index missing, falling back to unordered query:", error.message);
      try {
        const user = await requireUser();
        const db = getDb();
        const snapshot = await db.collection(PROJECTS_COLLECTION).where("ownerId", "==", user.uid).get();
        const projects = snapshot.docs.map((doc) => projectFromFirestore(doc)).filter((p) => p !== null);
        return projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      } catch {
        return [];
      }
    }
    console.error("Failed to get projects:", error);
    return [];
  }
}
async function getProject(projectId) {
  try {
    const user = await requireUser();
    const db = getDb();
    const doc = await db.collection(PROJECTS_COLLECTION).doc(projectId).get();
    const project = projectFromFirestore(doc);
    if (project && project.ownerId !== user.uid) {
      return null;
    }
    return project;
  } catch (error) {
    console.error("Failed to get project:", error);
    return null;
  }
}
async function updateProject(input) {
  const user = await requireUser();
  const validated = UpdateProjectSchema.parse(input);
  const db = getDb();
  const projectRef = db.collection(PROJECTS_COLLECTION).doc(validated.projectId);
  const existing = await projectRef.get();
  if (!existing.exists || existing.data()?.ownerId !== user.uid) {
    return null;
  }
  const updates = {
    updatedAt: import_firestore3.Timestamp.now()
  };
  if (validated.name !== void 0) updates.name = validated.name;
  if (validated.description !== void 0) updates.description = validated.description;
  if (validated.systemInstructions !== void 0) updates.systemInstructions = validated.systemInstructions;
  if (validated.color !== void 0) updates.color = validated.color;
  if (validated.icon !== void 0) updates.icon = validated.icon;
  if (validated.defaultModel !== void 0) updates.defaultModel = validated.defaultModel;
  await projectRef.update(updates);
  (0, import_cache.revalidatePath)("/dashboard/projects");
  (0, import_cache.revalidatePath)(`/dashboard/projects/${validated.projectId}`);
  return getProject(validated.projectId);
}
async function deleteProject(projectId) {
  const user = await requireUser();
  const db = getDb();
  const projectRef = db.collection(PROJECTS_COLLECTION).doc(projectId);
  const existing = await projectRef.get();
  if (!existing.exists || existing.data()?.ownerId !== user.uid) {
    return false;
  }
  const chatsSnapshot = await db.collection(PROJECT_CHATS_COLLECTION).where("projectId", "==", projectId).get();
  const batch = db.batch();
  chatsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
  const docsSnapshot = await db.collection(PROJECT_DOCUMENTS_COLLECTION).where("projectId", "==", projectId).get();
  docsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(projectRef);
  await batch.commit();
  (0, import_cache.revalidatePath)("/dashboard/projects");
  return true;
}
async function createProjectChat(projectId, title) {
  const user = await requireUser();
  const db = getDb();
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Project not found");
  }
  const chatRef = db.collection(PROJECT_CHATS_COLLECTION).doc();
  const chatData = {
    projectId,
    userId: user.uid,
    title: title || "New Chat",
    messageCount: 0,
    createdAt: import_firestore3.Timestamp.now(),
    updatedAt: import_firestore3.Timestamp.now()
  };
  await chatRef.set(chatData);
  await db.collection(PROJECTS_COLLECTION).doc(projectId).update({
    chatCount: import_firestore3.FieldValue.increment(1),
    lastChatAt: import_firestore3.Timestamp.now(),
    updatedAt: import_firestore3.Timestamp.now()
  });
  return {
    id: chatRef.id,
    ...chatData,
    createdAt: chatData.createdAt.toDate(),
    updatedAt: chatData.updatedAt.toDate()
  };
}
async function getProjectChats(projectId) {
  const user = await requireUser();
  const db = getDb();
  const project = await getProject(projectId);
  if (!project) {
    return [];
  }
  const snapshot = await db.collection(PROJECT_CHATS_COLLECTION).where("projectId", "==", projectId).where("userId", "==", user.uid).orderBy("updatedAt", "desc").get();
  return snapshot.docs.map((doc) => chatFromFirestore(doc)).filter((c) => c !== null);
}
async function updateProjectChatTitle(chatId, title) {
  const user = await requireUser();
  const db = getDb();
  const chatRef = db.collection(PROJECT_CHATS_COLLECTION).doc(chatId);
  const chat = await chatRef.get();
  if (!chat.exists || chat.data()?.userId !== user.uid) {
    throw new Error("Chat not found");
  }
  await chatRef.update({
    title,
    updatedAt: import_firestore3.Timestamp.now()
  });
}
async function canCreateProject(userPlan = "free") {
  const user = await requireUser();
  const db = getDb();
  const limits = PROJECT_LIMITS[userPlan] || PROJECT_LIMITS.free;
  const snapshot = await db.collection(PROJECTS_COLLECTION).where("ownerId", "==", user.uid).get();
  return snapshot.size < limits.maxProjects;
}
async function getProjectCount() {
  const user = await requireUser();
  const db = getDb();
  const snapshot = await db.collection(PROJECTS_COLLECTION).where("ownerId", "==", user.uid).get();
  return snapshot.size;
}
var import_firestore3, import_cache, PROJECTS_COLLECTION, PROJECT_CHATS_COLLECTION, PROJECT_DOCUMENTS_COLLECTION;
var init_projects = __esm({
  "src/server/actions/projects.ts"() {
    "use strict";
    "use server";
    import_firestore3 = require("firebase-admin/firestore");
    init_admin();
    init_project();
    init_auth();
    import_cache = require("next/cache");
    PROJECTS_COLLECTION = "projects";
    PROJECT_CHATS_COLLECTION = "project_chats";
    PROJECT_DOCUMENTS_COLLECTION = "project_documents";
  }
});

// src/lib/product-images.ts
function getPlaceholderImageForCategory(category) {
  return "/icon-192.png";
}
var init_product_images = __esm({
  "src/lib/product-images.ts"() {
    "use strict";
  }
});

// src/lib/pos/adapters/alleaves.ts
var ALLEAVES_API_BASE, ALLeavesClient;
var init_alleaves = __esm({
  "src/lib/pos/adapters/alleaves.ts"() {
    "use strict";
    init_logger();
    init_product_images();
    ALLEAVES_API_BASE = "https://app.alleaves.com/api";
    ALLeavesClient = class {
      constructor(config) {
        this.token = null;
        this.tokenExpiry = null;
        this.config = {
          ...config,
          locationId: config.locationId || config.storeId
        };
      }
      /**
       * Authenticate with Alleaves API and get JWT token
       */
      async authenticate() {
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry - 5 * 60 * 1e3) {
          logger.debug("[POS_ALLEAVES] Using cached token");
          return this.token;
        }
        logger.info("[POS_ALLEAVES] Authenticating with Alleaves API", {
          username: this.config.username,
          hasPin: !!this.config.pin
        });
        const response = await fetch(`${ALLEAVES_API_BASE}/auth`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: this.config.username,
            password: this.config.password,
            pin: this.config.pin
          })
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Alleaves authentication failed: ${response.status} - ${text}`);
        }
        const data = await response.json();
        if (!data.token) {
          throw new Error("No token received from Alleaves auth endpoint");
        }
        this.token = data.token;
        try {
          const payload = JSON.parse(Buffer.from(data.token.split(".")[1], "base64").toString());
          this.tokenExpiry = payload.exp * 1e3;
          logger.info("[POS_ALLEAVES] Authentication successful", {
            userId: data.id_user,
            company: data.company,
            expiresAt: new Date(this.tokenExpiry).toISOString()
          });
        } catch (error) {
          this.tokenExpiry = Date.now() + 24 * 60 * 60 * 1e3;
          logger.warn("[POS_ALLEAVES] Could not decode JWT expiry, using 24h default");
        }
        return this.token;
      }
      /**
       * Build authorization headers for ALLeaves API with JWT token
       */
      async getAuthHeaders() {
        const token = await this.authenticate();
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        };
        if (this.config.partnerId) {
          headers["X-Partner-ID"] = this.config.partnerId;
        }
        return headers;
      }
      /**
       * Make authenticated request to ALLeaves API
       */
      async request(endpoint, options = {}) {
        const url = `${ALLEAVES_API_BASE}${endpoint}`;
        const headers = await this.getAuthHeaders();
        const response = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            ...options.headers || {}
          }
        });
        if (!response.ok) {
          const text = await response.text();
          let errorMessage = `ALLeaves API error: ${response.status}`;
          try {
            const errorJson = JSON.parse(text);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            errorMessage = `${errorMessage} - ${text.substring(0, 200)}`;
          }
          throw new Error(errorMessage);
        }
        return response.json();
      }
      /**
       * Validate connection to ALLeaves API
       */
      async validateConnection() {
        logger.info("[POS_ALLEAVES] Validating connection", {
          locationId: this.config.locationId,
          username: this.config.username
        });
        try {
          const locations = await this.request(
            `/location`
          );
          const location = locations.find((loc) => loc.id_location.toString() === this.config.locationId);
          if (location) {
            logger.info("[POS_ALLEAVES] Connection validated", {
              locationId: location.id_location,
              reference: location.reference,
              active: location.active
            });
            return true;
          }
          logger.warn("[POS_ALLEAVES] Location not found in user locations", {
            requestedLocationId: this.config.locationId,
            availableLocations: locations.map((l) => l.id_location)
          });
          return false;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error("[POS_ALLEAVES] Connection validation failed", { error: errorMessage });
          return false;
        }
      }
      /**
       * Fetch full menu from ALLeaves with area and batch enrichment.
       *
       * Flow:
       *  1. POST /inventory/search — all inventory items (primary data)
       *  2. GET /inventory/area    — area lookup map (id_area → name) [parallel]
       *  3. POST /inventory/batch/search (or GET /inventory/batch/{id}) — traceability tags,
       *     batch status, mg potency [parallel, best-effort]
       */
      async fetchMenu() {
        logger.info("[POS_ALLEAVES] Fetching menu", { locationId: this.config.locationId });
        try {
          const locationIdNum = parseInt(this.config.locationId, 10);
          const inventoryBody = { query: "" };
          if (!isNaN(locationIdNum)) {
            inventoryBody.id_location = locationIdNum;
          }
          const [items, areaLookup] = await Promise.all([
            this.request(
              `/inventory/search`,
              {
                method: "POST",
                body: JSON.stringify(inventoryBody)
              }
            ),
            this.fetchAreas()
          ]);
          logger.info(`[POS_ALLEAVES] Fetched ${items.length} inventory items, ${areaLookup.size} areas`);
          const batchIds = [...new Set(
            items.map((i) => i.id_batch).filter((id) => typeof id === "number" && id > 0)
          )];
          const batchDetails = await this.fetchBatchDetails(batchIds);
          logger.info("[POS_ALLEAVES] Batch enrichment complete", {
            uniqueBatches: batchIds.length,
            enriched: batchDetails.size
          });
          return this.mapInventoryItems(items, areaLookup, batchDetails);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error("[POS_ALLEAVES] Menu fetch failed", { error: errorMessage });
          throw new Error(`ALLeaves menu fetch failed: ${errorMessage}`);
        }
      }
      /**
       * Fetch all storage areas for this location and return an id_area → name map.
       * Used to enrich inventory items with human-readable area names (e.g. "Sales Floor").
       */
      async fetchAreas() {
        try {
          const areas = await this.request(
            `/inventory/area?id_location=${this.config.locationId}`
          );
          const lookup = /* @__PURE__ */ new Map();
          for (const area of areas || []) {
            lookup.set(area.id_area, area.name || area.path || `Area ${area.id_area}`);
          }
          logger.info("[POS_ALLEAVES] Fetched area lookup", { count: lookup.size });
          return lookup;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn("[POS_ALLEAVES] Area fetch failed (non-fatal)", { error: errorMessage });
          return /* @__PURE__ */ new Map();
        }
      }
      /**
       * Fetch batch details for a list of batch IDs.
       * Tries POST /inventory/batch/search (one call) first; falls back to individual GET calls.
       * Results are keyed by id_batch for O(1) lookup during mapInventoryItems.
       */
      async fetchBatchDetails(batchIds) {
        const result = /* @__PURE__ */ new Map();
        if (!batchIds.length) return result;
        try {
          const batches = await this.request(
            "/inventory/batch/search",
            {
              method: "POST",
              body: JSON.stringify({ ids: batchIds })
            }
          );
          for (const b of batches || []) {
            if (b.id_batch) result.set(b.id_batch, b);
          }
          logger.info("[POS_ALLEAVES] Batch details fetched via search", { count: result.size });
          return result;
        } catch {
          logger.debug("[POS_ALLEAVES] Batch search endpoint unavailable, trying individual calls");
        }
        const limited = batchIds.slice(0, 100);
        await Promise.all(
          limited.map(async (id) => {
            try {
              const detail = await this.request(`/inventory/batch/${id}`);
              if (detail?.id_batch) result.set(detail.id_batch, detail);
            } catch {
            }
          })
        );
        logger.info("[POS_ALLEAVES] Batch details fetched individually", { fetched: result.size, attempted: limited.length });
        return result;
      }
      /**
       * Map ALLeaves inventory items to standard POS format
       */
      mapInventoryItems(items, areaLookup = /* @__PURE__ */ new Map(), batchDetails = /* @__PURE__ */ new Map()) {
        return items.map((item) => {
          let category = item.category || "Other";
          if (category.startsWith("Category > ")) {
            category = category.replace("Category > ", "");
          }
          let price = item.price_otd_adult_use || item.price_otd_medical_use || item.price_otd || item.price_retail_adult_use || item.price_retail_medical_use || item.price_retail;
          if (price === 0 && item.cost_of_good && item.cost_of_good > 0) {
            const categoryLower = category.toLowerCase();
            let markup = 2.2;
            if (categoryLower.includes("flower")) markup = 2.2;
            else if (categoryLower.includes("vape") || categoryLower.includes("concentrate")) markup = 2;
            else if (categoryLower.includes("edible")) markup = 2.3;
            else if (categoryLower.includes("pre roll")) markup = 2.1;
            else if (categoryLower.includes("beverage")) markup = 2.4;
            else if (categoryLower.includes("tincture") || categoryLower.includes("topical")) markup = 2.3;
            price = Math.round(item.cost_of_good * markup * 100) / 100;
          }
          let expirationDate;
          if (item.expiration_date) {
            const parsed = new Date(item.expiration_date);
            if (!isNaN(parsed.getTime())) {
              expirationDate = parsed;
            }
          }
          let packageDate;
          if (item.package_date) {
            const parsed = new Date(item.package_date);
            if (!isNaN(parsed.getTime())) {
              packageDate = parsed;
            }
          }
          const batchDetail = batchDetails.get(item.id_batch);
          const metrcTag = item.tag || item.metrc_tag || item.batch_tag || batchDetail?.tag || batchDetail?.metrc_tag || batchDetail?.batch_tag || void 0;
          const batchStatus = item.status || batchDetail?.status || void 0;
          const areaId = item.id_area ?? batchDetail?.id_area;
          const areaName = (areaId ? areaLookup.get(areaId) : void 0) || item.area || item.area_name || batchDetail?.area || batchDetail?.area_name || void 0;
          const sku = item.sku || item.barcode || batchDetail?.barcode || void 0;
          const thcMg = item.thc_mg ?? batchDetail?.thc_mg ?? void 0;
          const cbdMg = item.cbd_mg ?? batchDetail?.cbd_mg ?? void 0;
          const terpenes = batchDetail?.terpenes?.filter((t) => t.name && t.percentage > 0) || void 0;
          const strainType = batchDetail?.strain_type || void 0;
          const effects = batchDetail?.effects?.length ? batchDetail.effects : void 0;
          if (!expirationDate && batchDetail?.date_expire) {
            const parsed = new Date(batchDetail.date_expire);
            if (!isNaN(parsed.getTime())) expirationDate = parsed;
          }
          if (!packageDate && batchDetail?.date_package) {
            const parsed = new Date(batchDetail.date_package);
            if (!isNaN(parsed.getTime())) packageDate = parsed;
          }
          if (!packageDate && batchDetail?.date_production) {
            const parsed = new Date(batchDetail.date_production);
            if (!isNaN(parsed.getTime())) packageDate = parsed;
          }
          return {
            externalId: item.id_item.toString(),
            name: item.item,
            brand: item.brand || "Unknown",
            category,
            price,
            cost: item.cost_of_good || void 0,
            // Item-level COGS
            batchCost: item.batch_cost_of_good || void 0,
            // Batch-level COGS
            stock: item.available,
            // Available for sale
            onHand: item.on_hand,
            // Total on hand (including reserved)
            thcPercent: item.thc || void 0,
            cbdPercent: item.cbd || void 0,
            thcMg: thcMg || void 0,
            cbdMg: cbdMg || void 0,
            imageUrl: item.image_url || getPlaceholderImageForCategory(category),
            expirationDate,
            packageDate,
            // Inventory metadata (P1)
            sku: sku || void 0,
            strain: item.strain || void 0,
            uom: item.uom || void 0,
            batchId: item.id_batch?.toString() || void 0,
            // Traceability / batch enrichment (P2 + P3)
            metrcTag: metrcTag || void 0,
            batchStatus: batchStatus || void 0,
            areaName: areaName || void 0,
            // Lab / COA data from batch details
            terpenes: terpenes?.length ? terpenes : void 0,
            strainType,
            effects,
            rawData: item
          };
        });
      }
      /**
       * Map ALLeaves products to standard POS format (legacy)
       * @deprecated Use mapInventoryItems for actual API data
       */
      mapProducts(products) {
        return products.map((p) => ({
          externalId: p.id,
          name: p.name,
          brand: p.brand || "Unknown",
          category: p.category || "Other",
          price: p.price,
          stock: p.quantity,
          thcPercent: p.thc_percentage,
          cbdPercent: p.cbd_percentage,
          imageUrl: p.image_url,
          rawData: p
        }));
      }
      /**
       * Get inventory levels for specific products
       */
      async getInventory(externalIds) {
        logger.info("[POS_ALLEAVES] Fetching inventory", {
          locationId: this.config.locationId,
          productCount: externalIds.length
        });
        try {
          const result = await this.request(
            `/locations/${this.config.locationId}/inventory`,
            {
              method: "POST",
              body: JSON.stringify({ product_ids: externalIds })
            }
          );
          const inventory = {};
          for (const item of result.inventory || []) {
            inventory[item.product_id] = item.quantity;
          }
          return inventory;
        } catch (error) {
          logger.warn("[POS_ALLEAVES] Inventory endpoint failed, falling back to menu fetch");
          const products = await this.fetchMenu();
          const stock = {};
          for (const p of products) {
            if (externalIds.includes(p.externalId)) {
              stock[p.externalId] = p.stock;
            }
          }
          return stock;
        }
      }
      /**
       * Create a customer in ALLeaves (for syncing BakedBot customers)
       */
      async createCustomer(customer) {
        logger.info("[POS_ALLEAVES] Creating customer", { email: customer.email });
        const result = await this.request(
          `/locations/${this.config.locationId}/customers`,
          {
            method: "POST",
            body: JSON.stringify({
              first_name: customer.firstName,
              last_name: customer.lastName,
              email: customer.email,
              phone: customer.phone,
              date_of_birth: customer.dateOfBirth
            })
          }
        );
        return result.customer;
      }
      /**
       * Update an existing customer in ALLeaves (PATCH fields only).
       * Used to sync email/phone from BakedBot check-in back to the POS.
       */
      async updateCustomer(customerId, fields) {
        try {
          await this.request(
            `/locations/${this.config.locationId}/customers/${customerId}`,
            {
              method: "PUT",
              body: JSON.stringify(fields)
            }
          );
          return true;
        } catch (err) {
          logger.warn("[POS_ALLEAVES] Failed to update customer", {
            customerId,
            error: err instanceof Error ? err.message : String(err)
          });
          return false;
        }
      }
      /**
       * Look up customer by email
       */
      async findCustomerByEmail(email) {
        try {
          const result = await this.request(
            `/locations/${this.config.locationId}/customers?email=${encodeURIComponent(email)}`
          );
          return result.customers?.[0] || null;
        } catch {
          return null;
        }
      }
      /**
       * Create an order in ALLeaves POS
       */
      async createOrder(order) {
        logger.info("[POS_ALLEAVES] Creating order", {
          customerId: order.customerId,
          itemCount: order.items.length
        });
        const result = await this.request(
          `/locations/${this.config.locationId}/orders`,
          {
            method: "POST",
            body: JSON.stringify({
              customer_id: order.customerId,
              items: order.items.map((item) => ({
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: item.unitPrice
              })),
              notes: order.notes,
              source: "bakedbot"
            })
          }
        );
        return result.order;
      }
      /**
       * Get orders for a customer
       */
      async getCustomerOrders(customerId) {
        const result = await this.request(
          `/locations/${this.config.locationId}/customers/${customerId}/orders`
        );
        return result.orders || [];
      }
      /**
       * Sync customer from BakedBot to ALLeaves
       * Creates if doesn't exist, returns existing if found
       */
      async syncCustomer(customer) {
        const existing = await this.findCustomerByEmail(customer.email);
        if (existing) {
          return existing;
        }
        return this.createCustomer(customer);
      }
      /**
       * Get all customers with pagination support
       *
       * @param page - Page number (1-based)
       * @param pageSize - Number of customers per page (default: 100)
       * @returns Array of customers with full profile data
       */
      async getAllCustomers(page = 1, pageSize = 100) {
        const data = await this.request("/customer/search", {
          method: "POST",
          body: JSON.stringify({ page, pageSize })
        });
        if (data.customers) return data.customers;
        if (data.data) return data.data;
        if (Array.isArray(data)) return data;
        const arr = [];
        for (const key of Object.keys(data)) {
          if (/^\d+$/.test(key) && typeof data[key] === "object" && data[key] !== null) {
            arr.push(data[key]);
          }
        }
        return arr;
      }
      /**
       * Get all customers across all pages
       *
       * @param maxPages - Maximum number of pages to fetch (default: 100)
       * @returns Array of all customers
       */
      async getAllCustomersPaginated(maxPages = 100) {
        const allCustomers = [];
        const pageSize = 100;
        for (let page = 1; page <= maxPages; page++) {
          const customers = await this.getAllCustomers(page, pageSize);
          logger.debug("[ALLEAVES] Fetched customers page", { page, count: customers?.length || 0 });
          if (!customers || customers.length === 0) {
            logger.info("[ALLEAVES] No more customers, stopping pagination", { page });
            break;
          }
          allCustomers.push(...customers);
          if (customers.length < pageSize) {
            logger.info("[ALLEAVES] Last page of customers", { page, count: customers.length, pageSize });
            break;
          }
        }
        logger.info("[ALLEAVES] Total customers fetched", {
          totalCustomers: allCustomers.length,
          pages: Math.ceil(allCustomers.length / pageSize)
        });
        return allCustomers;
      }
      /**
       * Get orders with pagination
       *
       * @param maxOrders - Maximum number of orders to fetch (default: 100)
       * @param startDate - Optional start date filter (YYYY-MM-DD, defaults to 2020-01-01)
       * @param endDate - Optional end date filter (YYYY-MM-DD, defaults to today)
       * @returns Array of orders with full details
       */
      async getAllOrders(maxOrders = 100, startDate, endDate) {
        const pageSize = 100;
        const maxPages = Math.ceil(maxOrders / pageSize);
        const allOrders = [];
        const fromDate = startDate || "2020-01-01";
        const toDate = endDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        logger.info("[ALLEAVES] Starting order fetch", {
          maxOrders,
          maxPages,
          dateRange: `${fromDate} to ${toDate}`
        });
        for (let page = 1; page <= maxPages; page++) {
          const url = `/order?page=${page}&pageSize=${pageSize}&startDate=${fromDate}&endDate=${toDate}`;
          logger.info("[ALLEAVES] Fetching page", { page, maxPages, url });
          const data = await this.request(url, { method: "GET" });
          const orders = Array.isArray(data) ? data : data.orders || data.data || data.results || [];
          logger.info("[ALLEAVES] Page result", {
            page,
            returned: orders.length,
            totalSoFar: allOrders.length + orders.length,
            rawDataType: Array.isArray(data) ? "array" : typeof data,
            rawKeys: !Array.isArray(data) && data ? Object.keys(data) : []
          });
          if (orders.length > 0) {
            allOrders.push(...orders);
            if (orders.length < pageSize) {
              logger.info("[ALLEAVES] Reached last page (partial page)", {
                page,
                pageCount: orders.length,
                totalFetched: allOrders.length
              });
              break;
            }
          } else {
            logger.info("[ALLEAVES] Empty page, stopping pagination", {
              page,
              totalFetched: allOrders.length
            });
            break;
          }
          if (allOrders.length >= maxOrders) {
            logger.info("[ALLEAVES] Reached maxOrders limit", {
              page,
              maxOrders,
              totalFetched: allOrders.length
            });
            break;
          }
        }
        logger.info("[ALLEAVES] Total orders fetched", {
          totalOrders: allOrders.length,
          dateRange: `${fromDate} to ${toDate}`
        });
        return allOrders.slice(0, maxOrders);
      }
      /**
       * Calculate customer spending from orders
       * Aggregates order data to get total spent and order count per customer
       *
       * @returns Map of customer ID to { totalSpent, orderCount, lastOrderDate, firstOrderDate }
       */
      async getCustomerSpending() {
        logger.info("[ALLEAVES] Fetching all orders to calculate customer spending");
        const orders = await this.getAllOrders(1e5);
        logger.info("[ALLEAVES] Analyzing orders for customer spending", { orderCount: orders.length });
        const customerSpending = /* @__PURE__ */ new Map();
        orders.forEach((order) => {
          const customerId = order.id_customer;
          const total = parseFloat(order.total || 0);
          const orderDate = order.date_created ? new Date(order.date_created) : /* @__PURE__ */ new Date();
          if (!customerId || customerId <= 0) return;
          const existing = customerSpending.get(customerId);
          if (existing) {
            existing.totalSpent += total;
            existing.orderCount += 1;
            if (orderDate > existing.lastOrderDate) {
              existing.lastOrderDate = orderDate;
            }
            if (orderDate < existing.firstOrderDate) {
              existing.firstOrderDate = orderDate;
            }
          } else {
            customerSpending.set(customerId, {
              totalSpent: total,
              orderCount: 1,
              lastOrderDate: orderDate,
              firstOrderDate: orderDate
            });
          }
        });
        logger.info("[ALLEAVES] Calculated spending for customers", { customerCount: customerSpending.size });
        return customerSpending;
      }
      /**
       * Get configuration info for debugging
       */
      getConfigInfo() {
        return {
          locationId: this.config.locationId,
          storeId: this.config.storeId,
          authMethod: "jwt",
          hasUsername: !!this.config.username,
          hasPassword: !!this.config.password,
          hasPin: !!this.config.pin,
          hasToken: !!this.token,
          tokenExpiry: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
          hasPartnerId: !!this.config.partnerId,
          hasWebhookSecret: !!this.config.webhookSecret,
          environment: this.config.environment || "production"
        };
      }
      // ============ Discount & Promotion Methods ============
      /**
       * Fetch all active discounts from Alleaves
       * Powers "On Sale" badges and dynamic pricing
       *
       * @returns Array of active discount rules
       */
      async getDiscounts() {
        logger.info("[POS_ALLEAVES] Fetching discounts");
        try {
          const discounts = await this.request("/discount");
          const activeDiscounts = discounts.filter((d) => {
            if (!d.active) return false;
            const now = /* @__PURE__ */ new Date();
            if (d.start_date && new Date(d.start_date) > now) return false;
            if (d.end_date && new Date(d.end_date) < now) return false;
            return true;
          });
          logger.info("[POS_ALLEAVES] Fetched discounts", {
            total: discounts.length,
            active: activeDiscounts.length
          });
          return activeDiscounts;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn("[POS_ALLEAVES] Discount fetch failed (may not be supported)", { error: errorMessage });
          return [];
        }
      }
      /**
       * Fetch menu with discounts applied
       * Returns products with sale pricing and badges
       */
      async fetchMenuWithDiscounts() {
        logger.info("[POS_ALLEAVES] Fetching menu with discounts");
        const [products, discounts] = await Promise.all([
          this.fetchMenu(),
          this.getDiscounts()
        ]);
        if (discounts.length === 0) {
          return products;
        }
        const productDiscounts = /* @__PURE__ */ new Map();
        const categoryDiscounts = /* @__PURE__ */ new Map();
        const brandDiscounts = /* @__PURE__ */ new Map();
        const sortedDiscounts = [...discounts].sort((a, b) => (b.priority || 0) - (a.priority || 0));
        for (const discount of sortedDiscounts) {
          if (discount.conditions?.products) {
            for (const productId of discount.conditions.products) {
              const key = productId.toString();
              if (!productDiscounts.has(key)) {
                productDiscounts.set(key, discount);
              }
            }
          }
          if (discount.conditions?.categories) {
            for (const category of discount.conditions.categories) {
              const key = category.toLowerCase();
              if (!categoryDiscounts.has(key)) {
                categoryDiscounts.set(key, discount);
              }
            }
          }
          if (discount.conditions?.brands) {
            for (const brand of discount.conditions.brands) {
              const key = brand.toLowerCase();
              if (!brandDiscounts.has(key)) {
                brandDiscounts.set(key, discount);
              }
            }
          }
        }
        return products.map((product) => {
          const discount = productDiscounts.get(product.externalId) || categoryDiscounts.get(product.category.toLowerCase()) || brandDiscounts.get(product.brand.toLowerCase());
          if (!discount) {
            return product;
          }
          let salePrice = product.price;
          if (discount.discount_type === "percent") {
            salePrice = product.price * (1 - discount.discount_value / 100);
          } else if (discount.discount_type === "amount") {
            salePrice = Math.max(0, product.price - discount.discount_value);
          } else if (discount.discount_type === "fixed_price") {
            salePrice = discount.discount_value;
          }
          salePrice = Math.round(salePrice * 100) / 100;
          const saleBadgeText = discount.badge_text || (discount.discount_type === "percent" ? `${discount.discount_value}% OFF` : discount.discount_type === "bogo" ? "BOGO" : `$${discount.discount_value} OFF`);
          return {
            ...product,
            isOnSale: true,
            originalPrice: product.price,
            salePrice,
            saleBadgeText,
            discountId: discount.id_discount.toString(),
            discountName: discount.name
          };
        });
      }
      /**
       * Get batch details for expiration tracking
       * More reliable expiration data than inventory/search
       *
       * @param batchId - Alleaves batch ID
       * @returns Batch details with expiration dates
       */
      async getBatchDetails(batchId) {
        try {
          const batch = await this.request(`/inventory/batch/${batchId}`);
          return batch;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn("[POS_ALLEAVES] Batch fetch failed", { batchId, error: errorMessage });
          return null;
        }
      }
      /**
       * Search batches for expiration data
       * Used for clearance bundle generation
       *
       * @param query - Search parameters
       * @returns Array of batches with expiration info
       */
      async searchBatches(query = {}) {
        try {
          const batches = await this.request("/inventory/batch/search", {
            method: "POST",
            body: JSON.stringify(query)
          });
          const now = /* @__PURE__ */ new Date();
          return batches.filter((b) => {
            if (query.minQuantity && b.on_hand < query.minQuantity) return false;
            return true;
          }).map((b) => {
            let daysUntilExpiry;
            if (b.date_expire) {
              const expiry = new Date(b.date_expire);
              daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
            }
            return {
              id_batch: b.id_batch,
              id_item: b.id_item,
              item_name: b.item,
              date_expire: b.date_expire,
              quantity: b.on_hand,
              days_until_expiry: daysUntilExpiry
            };
          }).filter((b) => {
            if (query.expiringWithinDays && b.days_until_expiry !== void 0) {
              return b.days_until_expiry <= query.expiringWithinDays && b.days_until_expiry > 0;
            }
            return true;
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn("[POS_ALLEAVES] Batch search failed", { error: errorMessage });
          return [];
        }
      }
      // ============ Two-Way Sync Methods ============
      /**
       * Apply a discount to an existing order
       * Uses POST /api/order/{id_order}/discount
       *
       * @param orderId - Alleaves order ID
       * @param discountId - Discount rule ID to apply
       * @returns Updated order with discount applied
       */
      async applyOrderDiscount(orderId, discountId) {
        logger.info("[POS_ALLEAVES] Applying discount to order", { orderId, discountId });
        try {
          const result = await this.request(
            `/order/${orderId}/discount`,
            {
              method: "POST",
              body: JSON.stringify({ id_discount: discountId })
            }
          );
          logger.info("[POS_ALLEAVES] Discount applied successfully", {
            orderId,
            discountId,
            newTotal: result.order?.total
          });
          return { success: true, order: result.order };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error("[POS_ALLEAVES] Failed to apply order discount", { orderId, discountId, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      }
      /**
       * Create a new discount rule in Alleaves
       * Note: This may require elevated permissions in Alleaves
       *
       * @param discount - Discount configuration
       * @returns Created discount with ID
       */
      async createDiscount(discount) {
        logger.info("[POS_ALLEAVES] Creating discount", { name: discount.name });
        try {
          const result = await this.request(
            "/discount",
            {
              method: "POST",
              body: JSON.stringify({
                ...discount,
                active: true
              })
            }
          );
          logger.info("[POS_ALLEAVES] Discount created", {
            id: result.discount?.id_discount,
            name: result.discount?.name
          });
          return { success: true, discount: result.discount };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn("[POS_ALLEAVES] Failed to create discount (may not be supported)", {
            name: discount.name,
            error: errorMessage
          });
          return { success: false, error: errorMessage };
        }
      }
      /**
       * Update an existing discount rule
       * Note: This may require elevated permissions
       *
       * @param discountId - Discount ID to update
       * @param updates - Fields to update
       */
      async updateDiscount(discountId, updates) {
        logger.info("[POS_ALLEAVES] Updating discount", { discountId, updates });
        try {
          await this.request(
            `/discount/${discountId}`,
            {
              method: "PUT",
              body: JSON.stringify(updates)
            }
          );
          logger.info("[POS_ALLEAVES] Discount updated", { discountId });
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn("[POS_ALLEAVES] Failed to update discount", { discountId, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      }
      /**
       * Deactivate a discount rule
       *
       * @param discountId - Discount ID to deactivate
       */
      async deactivateDiscount(discountId) {
        return this.updateDiscount(discountId, { active: false });
      }
      /**
       * Update customer loyalty points
       * Note: Alleaves uses SpringBig for loyalty - this may require their API
       *
       * @param customerId - Customer ID
       * @param points - Points to add (positive) or subtract (negative)
       */
      async updateLoyaltyPoints(customerId, points, reason) {
        logger.info("[POS_ALLEAVES] Updating loyalty points", { customerId, points, reason });
        try {
          const result = await this.request(
            `/customer/${customerId}/loyalty`,
            {
              method: "POST",
              body: JSON.stringify({
                points_change: points,
                reason: reason || "BakedBot adjustment"
              })
            }
          );
          return {
            success: true,
            newBalance: result.customer?.loyalty_points
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn("[POS_ALLEAVES] Loyalty update failed (may use SpringBig)", {
            customerId,
            error: errorMessage
          });
          return {
            success: false,
            error: `Loyalty management may require SpringBig integration: ${errorMessage}`
          };
        }
      }
      /**
       * Add store credit to customer account
       *
       * @param customerId - Customer ID
       * @param amount - Credit amount to add
       * @param reason - Reason for credit
       */
      async addStoreCredit(customerId, amount, reason) {
        logger.info("[POS_ALLEAVES] Adding store credit", { customerId, amount, reason });
        try {
          const result = await this.request(
            `/customer/${customerId}/credit`,
            {
              method: "POST",
              body: JSON.stringify({
                amount,
                reason: reason || "BakedBot credit"
              })
            }
          );
          return {
            success: true,
            newBalance: result.customer?.credit_balance
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn("[POS_ALLEAVES] Store credit update failed", {
            customerId,
            error: errorMessage
          });
          return { success: false, error: errorMessage };
        }
      }
      // ============ Metadata Endpoints (Phase 3) ============
      /**
       * Get all brands from Alleaves inventory
       * Used for building filter UIs
       *
       * @returns Array of brand names with product counts
       */
      async getBrands() {
        logger.info("[POS_ALLEAVES] Fetching brands");
        try {
          const brands = await this.request("/inventory/brand");
          return brands.map((b) => ({
            id: b.id_brand?.toString() || b.brand || b.name || "unknown",
            name: b.brand || b.name || "Unknown"
          }));
        } catch (error) {
          logger.warn("[POS_ALLEAVES] Brand endpoint failed, falling back to menu parse");
          const products = await this.fetchMenu();
          const brandMap = /* @__PURE__ */ new Map();
          for (const p of products) {
            const count = brandMap.get(p.brand) || 0;
            brandMap.set(p.brand, count + 1);
          }
          return Array.from(brandMap.entries()).map(([name, productCount]) => ({
            id: name.toLowerCase().replace(/\s+/g, "_"),
            name,
            productCount
          })).sort((a, b) => a.name.localeCompare(b.name));
        }
      }
      /**
       * Get all categories from Alleaves inventory
       * Used for building filter UIs
       *
       * @returns Array of category names with product counts
       */
      async getCategories() {
        logger.info("[POS_ALLEAVES] Fetching categories");
        try {
          const categories = await this.request("/inventory/category");
          return categories.map((c) => ({
            id: c.id_category?.toString() || c.category || c.name || "unknown",
            name: c.category || c.name || "Unknown"
          }));
        } catch (error) {
          logger.warn("[POS_ALLEAVES] Category endpoint failed, falling back to menu parse");
          const products = await this.fetchMenu();
          const categoryMap = /* @__PURE__ */ new Map();
          for (const p of products) {
            const count = categoryMap.get(p.category) || 0;
            categoryMap.set(p.category, count + 1);
          }
          return Array.from(categoryMap.entries()).map(([name, productCount]) => ({
            id: name.toLowerCase().replace(/\s+/g, "_"),
            name,
            productCount
          })).sort((a, b) => a.name.localeCompare(b.name));
        }
      }
      /**
       * Get all vendors from Alleaves inventory
       * Used for procurement and filter UIs
       *
       * @returns Array of vendor names
       */
      async getVendors() {
        logger.info("[POS_ALLEAVES] Fetching vendors");
        try {
          const vendors = await this.request("/inventory/vendor");
          return vendors.map((v) => ({
            id: v.id_vendor?.toString() || v.vendor || v.name || "unknown",
            name: v.vendor || v.name || "Unknown"
          })).sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn("[POS_ALLEAVES] Vendor endpoint failed", { error: errorMessage });
          return [];
        }
      }
      /**
       * Get location details including license and timezone
       * Useful for compliance and scheduling
       *
       * @returns Location details
       */
      async getLocationDetails() {
        logger.info("[POS_ALLEAVES] Fetching location details");
        try {
          const locations = await this.request("/location");
          const location = locations.find(
            (loc) => loc.id_location.toString() === this.config.locationId
          );
          if (!location) {
            return null;
          }
          return {
            id: location.id_location.toString(),
            name: location.reference,
            licenseNumber: location.license_number,
            timezone: location.timezone,
            address: {
              street: location.address_1,
              city: location.city,
              state: location.state,
              zip: location.zip
            }
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn("[POS_ALLEAVES] Location details fetch failed", { error: errorMessage });
          return null;
        }
      }
      /**
       * Get all metadata in a single call (brands, categories, vendors)
       * More efficient than calling each separately
       *
       * @returns Combined metadata object
       */
      async getAllMetadata() {
        logger.info("[POS_ALLEAVES] Fetching all metadata");
        const [brands, categories, vendors, location] = await Promise.all([
          this.getBrands(),
          this.getCategories(),
          this.getVendors(),
          this.getLocationDetails()
        ]);
        return { brands, categories, vendors, location };
      }
    };
  }
});

// src/lib/cache.ts
var cache_exports = {};
__export(cache_exports, {
  CachePrefix: () => CachePrefix,
  CacheTTL: () => CacheTTL,
  getCached: () => getCached,
  invalidateCache: () => invalidateCache,
  invalidateCachePattern: () => invalidateCachePattern,
  isRedisAvailable: () => isRedisAvailable,
  setCached: () => setCached,
  withCache: () => withCache
});
function initializeRedis() {
  if (redis) return redis;
  const redisUrl = process.env.UPSTASH_REDIS_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_TOKEN?.trim();
  if (!redisUrl || !redisToken) {
    logger.warn("[Cache] UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN not configured \u2014 caching disabled");
    return null;
  }
  redis = new import_redis.Redis({
    url: redisUrl,
    token: redisToken
  });
  logger.info("[Cache] Initialized Redis cache");
  return redis;
}
function buildCacheKey(prefix, id) {
  return `bakedbot:cache:${prefix}:${id}`;
}
async function getCached(prefix, id) {
  const client = initializeRedis();
  if (!client) return null;
  try {
    const key = buildCacheKey(prefix, id);
    const cached = await client.get(key);
    if (cached) {
      logger.debug("[Cache] HIT", { prefix, id });
      return cached;
    }
    logger.debug("[Cache] MISS", { prefix, id });
    return null;
  } catch (error) {
    logger.error("[Cache] Failed to get cached value", {
      prefix,
      id,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
async function setCached(prefix, id, value, ttlSeconds = 300) {
  const client = initializeRedis();
  if (!client) return;
  try {
    const serialized = JSON.stringify(value);
    const byteLength = Buffer.byteLength(serialized, "utf8");
    if (byteLength > MAX_CACHE_PAYLOAD_BYTES) {
      logger.warn("[Cache] SKIP \u2014 payload too large", {
        prefix,
        id,
        bytes: byteLength,
        maxBytes: MAX_CACHE_PAYLOAD_BYTES
      });
      return;
    }
    const key = buildCacheKey(prefix, id);
    await client.set(key, value, { ex: ttlSeconds });
    logger.debug("[Cache] SET", { prefix, id, ttl: ttlSeconds });
  } catch (error) {
    logger.error("[Cache] Failed to set cached value", {
      prefix,
      id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
async function invalidateCache(prefix, id) {
  const client = initializeRedis();
  if (!client) return;
  try {
    const key = buildCacheKey(prefix, id);
    await client.del(key);
    logger.info("[Cache] INVALIDATE", { prefix, id });
  } catch (error) {
    logger.error("[Cache] Failed to invalidate cache", {
      prefix,
      id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
async function invalidateCachePattern(pattern) {
  const client = initializeRedis();
  if (!client) return;
  try {
    const fullPattern = `bakedbot:cache:${pattern}`;
    const keys = await client.keys(fullPattern);
    if (keys.length > 0) {
      await client.del(...keys);
      logger.info("[Cache] INVALIDATE_PATTERN", { pattern, count: keys.length });
    }
  } catch (error) {
    logger.error("[Cache] Failed to invalidate cache pattern", {
      pattern,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
async function withCache(prefix, id, fn, ttlSeconds = 300) {
  const cached = await getCached(prefix, id);
  if (cached !== null) {
    return cached;
  }
  const result = await fn();
  setCached(prefix, id, result, ttlSeconds).catch(() => {
  });
  return result;
}
function isRedisAvailable() {
  return initializeRedis() !== null;
}
var import_redis, redis, CachePrefix, CacheTTL, MAX_CACHE_PAYLOAD_BYTES;
var init_cache = __esm({
  "src/lib/cache.ts"() {
    "use strict";
    import_redis = require("@upstash/redis");
    init_logger();
    redis = null;
    CachePrefix = {
      MENU: "menu",
      PRODUCTS: "products",
      BRAND_GUIDE: "brand_guide",
      ANALYTICS: "analytics",
      POS_SYNC: "pos_sync",
      AGENT: "agent",
      DOMAIN: "domain",
      POS_DATA: "pos_data",
      AGENT_RUNNER: "agent_runner",
      TOOL: "tool",
      HEURISTICS: "heuristics",
      UPSELL_PRODUCTS: "upsell_products",
      UPSELL_BUNDLES: "upsell_bundles",
      CREATIVE_IMAGE: "creative_img",
      EMBEDDING: "embed",
      SEMANTIC_SEARCH: "sem_search",
      DASHBOARD_ANALYTICS: "dash_analytics",
      CRM_SEGMENTS: "crm_segments",
      CRM_AT_RISK: "crm_at_risk",
      LETTA_SLACK: "letta_slack",
      /** CannMenus competitor pricing — Ezal only. Cached to avoid hammering external API. */
      COMPETITOR_INTEL: "competitor_intel"
    };
    CacheTTL = {
      MENU: 300,
      // 5 minutes
      PRODUCTS: 300,
      // 5 minutes
      BRAND_GUIDE: 900,
      // 15 minutes
      ANALYTICS: 600,
      // 10 minutes
      POS_SYNC: 3600,
      // 1 hour
      AGENT: 300,
      // 5 minutes (matches product cache)
      DOMAIN: 120,
      // 2 minutes (domain → tenant resolution)
      POS_DATA: 300,
      // 5 minutes (POS customers/orders)
      AGENT_RUNNER: 300,
      // 5 minutes (brand profiles, AI settings)
      AGENT_RUNNER_KB: 60,
      // 1 minute (knowledge base search — fresher)
      AGENT_RUNNER_LETTA: 120,
      // 2 minutes (Letta memory)
      TOOL: 300,
      // 5 minutes (default for agent tools)
      HEURISTICS: 300,
      // 5 minutes (tenant heuristic rules)
      UPSELL: 300,
      // 5 minutes (product/bundle data)
      CREATIVE_IMAGE: 1800,
      // 30 minutes (generated image URLs)
      EMBEDDING: 86400,
      // 24 hours (deterministic — same text = same vector)
      SEMANTIC_SEARCH: 300,
      // 5 minutes (search results by query hash)
      DASHBOARD_ANALYTICS: 600,
      // 10 minutes (heavy dashboard aggregations)
      CRM_SEGMENTS: 300,
      // 5 minutes (segment breakdowns)
      CRM_AT_RISK: 600,
      // 10 minutes (at-risk customer lists)
      LETTA_SLACK: 30,
      // 30 seconds (Letta memory search for Slack agents)
      /** CannMenus competitor pricing: 15 min. External data; changes slowly within a session. */
      COMPETITOR_INTEL: 900
    };
    MAX_CACHE_PAYLOAD_BYTES = 8 * 1024 * 1024;
  }
});

// src/lib/cache/pos-cache.ts
var L1_TTL, MAX_L1_SIZE, POSCache, posCache, cacheKeys;
var init_pos_cache = __esm({
  "src/lib/cache/pos-cache.ts"() {
    "use strict";
    init_cache();
    init_logger();
    L1_TTL = 30 * 1e3;
    MAX_L1_SIZE = 500;
    POSCache = class {
      constructor() {
        this.l1 = /* @__PURE__ */ new Map();
      }
      /**
       * Get cached data (L1 → L2 Redis)
       */
      async get(key) {
        const l1Entry = this.l1.get(key);
        if (l1Entry && Date.now() < l1Entry.expiry) {
          logger.debug("[POS_CACHE] L1 hit", { key });
          return l1Entry.data;
        }
        if (l1Entry) this.l1.delete(key);
        const redisValue = await getCached(CachePrefix.POS_DATA, key);
        if (redisValue !== null) {
          this.setL1(key, redisValue);
          logger.debug("[POS_CACHE] L2 hit", { key });
          return redisValue;
        }
        logger.debug("[POS_CACHE] miss", { key });
        return null;
      }
      /**
       * Set cached data (L1 + L2 Redis)
       */
      async set(key, data, ttlSeconds) {
        const ttl = ttlSeconds ?? CacheTTL.POS_DATA;
        this.setL1(key, data);
        await setCached(CachePrefix.POS_DATA, key, data, ttl);
        logger.debug("[POS_CACHE] set", { key, ttl });
      }
      /**
       * Invalidate cached data (L1 + L2)
       */
      async invalidate(key) {
        this.l1.delete(key);
        const { invalidateCache: invalidateCache2 } = await Promise.resolve().then(() => (init_cache(), cache_exports));
        await invalidateCache2(CachePrefix.POS_DATA, key);
        logger.debug("[POS_CACHE] invalidated", { key });
      }
      /**
       * Invalidate all cached data for an org (L1 + L2)
       */
      async invalidateOrg(orgId) {
        for (const key of this.l1.keys()) {
          if (key.startsWith(orgId)) {
            this.l1.delete(key);
          }
        }
        await invalidateCachePattern(`${CachePrefix.POS_DATA}:${orgId}*`);
        logger.info("[POS_CACHE] Invalidated org", { orgId });
      }
      /**
       * Clear entire L1 cache
       */
      clear() {
        const size = this.l1.size;
        this.l1.clear();
        logger.info("[POS_CACHE] L1 cleared", { size });
      }
      /**
       * Get cache statistics
       */
      getStats() {
        return {
          l1Size: this.l1.size,
          maxL1Size: MAX_L1_SIZE
        };
      }
      setL1(key, data) {
        if (this.l1.size >= MAX_L1_SIZE) {
          const keysToRemove = Array.from(this.l1.keys()).slice(0, 50);
          keysToRemove.forEach((k) => this.l1.delete(k));
        }
        this.l1.set(key, { data, expiry: Date.now() + L1_TTL });
      }
    };
    posCache = new POSCache();
    cacheKeys = {
      customers: (orgId) => `${orgId}:customers`,
      orders: (orgId) => `${orgId}:orders`,
      customer: (orgId, customerId) => `${orgId}:customer:${customerId}`,
      order: (orgId, orderId) => `${orgId}:order:${orderId}`
    };
  }
});

// src/lib/customer-import/column-mapping.ts
function normalizePhone(value) {
  if (!value) return void 0;
  const cleaned = value.replace(/[^\d+]/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+${cleaned}`;
  }
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  return value;
}
function isNormalizedPhone(value) {
  return typeof value === "string" && /^\+\d{10,15}$/.test(value);
}
var COLUMN_MAPPINGS, REVERSE_MAPPING;
var init_column_mapping = __esm({
  "src/lib/customer-import/column-mapping.ts"() {
    "use strict";
    COLUMN_MAPPINGS = {
      // Identity Fields
      email: [
        "email",
        "e-mail",
        "email_address",
        "emailaddress",
        "customer_email",
        "customeremail",
        "contact_email",
        "primary_email",
        "user_email"
      ],
      phone: [
        "phone",
        "phone_number",
        "phonenumber",
        "telephone",
        "tel",
        "mobile",
        "cell",
        "cellphone",
        "cell_phone",
        "contact_phone",
        "primary_phone",
        "phone1",
        "phone_1"
      ],
      firstName: [
        "first_name",
        "firstname",
        "first",
        "fname",
        "given_name",
        "givenname",
        "forename",
        "name_first"
      ],
      lastName: [
        "last_name",
        "lastname",
        "last",
        "lname",
        "surname",
        "family_name",
        "familyname",
        "name_last"
      ],
      displayName: [
        "display_name",
        "displayname",
        "full_name",
        "fullname",
        "name",
        "customer_name",
        "customername",
        "contact_name"
      ],
      // Financial Metrics
      totalSpent: [
        "total_spent",
        "totalspent",
        "total_spend",
        "totalspend",
        "lifetime_spend",
        "ltv",
        "lifetime_value",
        "total_revenue",
        "revenue",
        "total_purchases",
        "spent",
        "amount_spent"
      ],
      orderCount: [
        "order_count",
        "ordercount",
        "orders",
        "total_orders",
        "num_orders",
        "number_of_orders",
        "purchase_count",
        "visits",
        "transactions"
      ],
      avgOrderValue: [
        "avg_order_value",
        "avgordervalue",
        "aov",
        "average_order",
        "avg_order",
        "average_purchase",
        "avg_purchase",
        "average_transaction"
      ],
      // Dates
      lastOrderDate: [
        "last_order_date",
        "lastorderdate",
        "last_purchase",
        "last_visit",
        "last_transaction",
        "most_recent_order",
        "last_activity",
        "last_seen"
      ],
      firstOrderDate: [
        "first_order_date",
        "firstorderdate",
        "first_purchase",
        "first_visit",
        "first_transaction",
        "signup_date",
        "created",
        "joined",
        "registered"
      ],
      birthDate: [
        "birth_date",
        "birthdate",
        "birthday",
        "dob",
        "date_of_birth",
        "bday"
      ],
      // Segmentation
      segment: [
        "segment",
        "customer_segment",
        "customersegment",
        "status",
        "type",
        "customer_type",
        "category"
      ],
      tier: [
        "tier",
        "loyalty_tier",
        "loyaltytier",
        "membership",
        "level",
        "membership_level",
        "vip_status"
      ],
      points: [
        "points",
        "loyalty_points",
        "loyaltypoints",
        "reward_points",
        "rewards",
        "balance",
        "point_balance"
      ],
      lifetimeValue: [
        "lifetime_value",
        "lifetimevalue",
        "ltv",
        "clv",
        "customer_lifetime_value"
      ],
      // Tags and Preferences
      customTags: [
        "tags",
        "custom_tags",
        "customtags",
        "labels",
        "groups",
        "categories"
      ],
      preferredCategories: [
        "preferred_categories",
        "preferredcategories",
        "favorite_categories",
        "categories",
        "interests",
        "preferences"
      ],
      preferredProducts: [
        "preferred_products",
        "preferredproducts",
        "favorite_products",
        "favorites",
        "top_products"
      ],
      priceRange: [
        "price_range",
        "pricerange",
        "budget",
        "spending_tier",
        "price_sensitivity"
      ],
      // Acquisition
      source: [
        "source",
        "acquisition_source",
        "channel",
        "referral_source",
        "how_found",
        "marketing_source",
        "origin"
      ],
      acquisitionCampaign: [
        "acquisition_campaign",
        "campaign",
        "marketing_campaign",
        "utm_campaign",
        "promo_code",
        "coupon_code"
      ],
      referralCode: [
        "referral_code",
        "referralcode",
        "referral",
        "referred_by",
        "referrer"
      ],
      // Social Equity
      equityStatus: [
        "equity_status",
        "equitystatus",
        "equity",
        "social_equity",
        "equity_verified",
        "equity_applicant"
      ],
      // Notes
      notes: [
        "notes",
        "customer_notes",
        "comments",
        "remarks",
        "memo",
        "description"
      ]
    };
    REVERSE_MAPPING = /* @__PURE__ */ new Map();
    Object.entries(COLUMN_MAPPINGS).forEach(([field, variations]) => {
      variations.forEach((variation) => {
        REVERSE_MAPPING.set(variation.toLowerCase(), field);
      });
    });
  }
});

// src/types/customers.ts
function calculateSegment(profile) {
  const orderCount = profile.orderCount ?? 0;
  const avgOrderValue = profile.avgOrderValue ?? 0;
  const lifetimeValue = profile.lifetimeValue ?? 0;
  if (orderCount === 0 && !profile.lastOrderDate && profile.daysSinceLastOrder === void 0) {
    return "new";
  }
  const daysSinceOrder = profile.daysSinceLastOrder ?? (profile.lastOrderDate ? Math.floor((Date.now() - new Date(profile.lastOrderDate).getTime()) / (1e3 * 60 * 60 * 24)) : 999);
  if (daysSinceOrder >= 90) return "churned";
  if (daysSinceOrder >= 60) return "at_risk";
  if (daysSinceOrder >= 30) return "slipping";
  if (profile.firstOrderDate) {
    const daysSinceFirst = Math.floor((Date.now() - new Date(profile.firstOrderDate).getTime()) / (1e3 * 60 * 60 * 24));
    if (daysSinceFirst < 30) return "new";
  }
  if (lifetimeValue >= 500 || orderCount >= 8 && avgOrderValue >= 50) return "vip";
  if (avgOrderValue >= 75 && orderCount < 5) return "high_value";
  if (orderCount >= 5 && avgOrderValue < 60) return "frequent";
  if (orderCount >= 2) return "loyal";
  return "new";
}
function getSegmentInfo(segment) {
  const info = {
    vip: { label: "VIP", color: "bg-purple-100 text-purple-800", description: "Top customers by spend" },
    loyal: { label: "Loyal", color: "bg-green-100 text-green-800", description: "Regular, consistent buyers" },
    new: { label: "New", color: "bg-blue-100 text-blue-800", description: "Recently acquired" },
    at_risk: { label: "At Risk", color: "bg-red-100 text-red-800", description: "60+ days inactive" },
    slipping: { label: "Slipping", color: "bg-orange-100 text-orange-800", description: "30-60 days inactive" },
    churned: { label: "Churned", color: "bg-gray-100 text-gray-800", description: "90+ days inactive" },
    high_value: { label: "High Value", color: "bg-yellow-100 text-yellow-800", description: "High spend, low frequency" },
    frequent: { label: "Frequent", color: "bg-teal-100 text-teal-800", description: "High frequency shopper" },
    regular: { label: "Regular", color: "bg-gray-100 text-gray-800", description: "Standard customers" }
  };
  return info[segment];
}
var init_customers = __esm({
  "src/types/customers.ts"() {
    "use strict";
  }
});

// src/lib/pricing/customer-tier-mapper.ts
function mapSegmentToTier(segment, totalSpent) {
  if (totalSpent >= 5e3) return "whale";
  if (segment === "vip" || segment === "high_value") return "vip";
  if (segment === "loyal" || segment === "frequent") return "regular";
  return "new";
}
var init_customer_tier_mapper = __esm({
  "src/lib/pricing/customer-tier-mapper.ts"() {
    "use strict";
  }
});

// src/lib/plans.ts
var init_plans = __esm({
  "src/lib/plans.ts"() {
    "use strict";
  }
});

// src/server/services/crm-service.ts
var import_firestore4;
var init_crm_service = __esm({
  "src/server/services/crm-service.ts"() {
    "use strict";
    "use server";
    init_admin();
    import_firestore4 = require("firebase-admin/firestore");
    init_auth();
    init_roles();
    init_plans();
    init_logger();
  }
});

// src/server/agents/tools/domain/crm.ts
async function getTopCustomers(orgId, params) {
  const { firestore } = await createServerClient();
  const limit = params?.limit || 5;
  const sortBy = params?.sortBy || "totalSpent";
  const snap = await firestore.collection("customers").where("orgId", "==", orgId).orderBy(sortBy, "desc").limit(limit).get();
  const customers = [];
  snap.forEach((doc) => {
    const data = doc.data();
    customers.push({
      email: data.email,
      displayName: resolveCustomerDisplayName({
        displayName: data.displayName,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        fallbackId: doc.id
      }),
      segment: data.segment,
      totalSpent: data.totalSpent || 0,
      orderCount: data.orderCount || 0,
      tier: data.tier || "bronze"
    });
  });
  const totalSpend = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  return {
    customers,
    insight: `Your top ${customers.length} customers have spent a combined $${totalSpend.toFixed(2)}. Consider exclusive perks for these VIPs.`
  };
}
var init_crm = __esm({
  "src/server/agents/tools/domain/crm.ts"() {
    "use strict";
    init_server_client();
    init_profile_derivations();
    init_customers();
    init_crm_service();
  }
});

// src/server/tools/crm-tools.ts
var crm_tools_exports = {};
__export(crm_tools_exports, {
  craigCrmToolDefs: () => craigCrmToolDefs,
  crmToolDefs: () => crmToolDefs,
  getAtRiskCustomers: () => getAtRiskCustomers,
  getCustomerComms: () => getCustomerComms,
  getCustomerEmailCoverage: () => getCustomerEmailCoverage,
  getCustomerHistory: () => getCustomerHistory,
  getSegmentSummary: () => getSegmentSummary,
  getTodayCheckins: () => getTodayCheckins,
  getTopCustomers: () => getTopCustomers2,
  getUpcomingBirthdays: () => getUpcomingBirthdays,
  lookupCustomer: () => lookupCustomer,
  moneyMikeCrmToolDefs: () => moneyMikeCrmToolDefs,
  mrsParkerCrmToolDefs: () => mrsParkerCrmToolDefs,
  smokeyCrmToolDefs: () => smokeyCrmToolDefs
});
async function initAlleavesClientForOrg(orgId) {
  const firestore = getAdminFirestore();
  let locationsSnap = await firestore.collection("locations").where("orgId", "==", orgId).limit(1).get();
  if (locationsSnap.empty) {
    locationsSnap = await firestore.collection("locations").where("brandId", "==", orgId).limit(1).get();
  }
  if (locationsSnap.empty) return null;
  const locationData = locationsSnap.docs[0].data();
  const posConfig = locationData?.posConfig;
  if (!posConfig || posConfig.provider !== "alleaves" || posConfig.status !== "active") {
    return null;
  }
  const alleavesConfig = {
    apiKey: posConfig.apiKey,
    username: posConfig.username || process.env.ALLEAVES_USERNAME,
    password: posConfig.password || process.env.ALLEAVES_PASSWORD,
    pin: posConfig.pin || process.env.ALLEAVES_PIN,
    storeId: posConfig.storeId,
    locationId: posConfig.locationId || posConfig.storeId,
    partnerId: posConfig.partnerId,
    environment: posConfig.environment || "production"
  };
  return new ALLeavesClient(alleavesConfig);
}
async function lookupCustomer(identifier, orgId) {
  logger.info("[crm-tools] lookupCustomer", { identifier, orgId });
  const firestore = getAdminFirestore();
  if (identifier.startsWith("alleaves_") || !identifier.includes("@")) {
    const docId = identifier;
    const doc = await firestore.collection("customers").doc(docId).get();
    if (doc.exists && doc.data()?.orgId === orgId) {
      return await formatCustomerResult(doc.id, doc.data(), orgId);
    }
  }
  if (identifier.includes("@")) {
    const snap = await firestore.collection("customers").where("orgId", "==", orgId).where("email", "==", identifier.toLowerCase()).limit(1).get();
    if (!snap.empty) {
      return await formatCustomerResult(snap.docs[0].id, snap.docs[0].data(), orgId);
    }
  }
  if (/^\+?[\d\s\-()]{10,}$/.test(identifier)) {
    const normalized = normalizePhone(identifier);
    if (isNormalizedPhone(normalized)) {
      const snap = await firestore.collection("customers").where("orgId", "==", orgId).where("phone", "==", normalized).limit(1).get();
      if (!snap.empty) {
        return await formatCustomerResult(snap.docs[0].id, snap.docs[0].data(), orgId);
      }
    }
  }
  const spendingCacheKey = `spending:${orgId}`;
  const cachedSpending = await posCache.get(spendingCacheKey);
  if (cachedSpending && cachedSpending[identifier]) {
    return {
      summary: `Found spending data for ${identifier} but no full profile. Total spent: $${cachedSpending[identifier].totalSpent.toFixed(2)}, Orders: ${cachedSpending[identifier].orderCount}.`,
      customer: null
    };
  }
  return {
    summary: `No customer found matching "${identifier}" in organization ${orgId}.`,
    customer: null
  };
}
async function getCachedCustomerProfile(id, orgId) {
  const cachedCustomers = await posCache.get(cacheKeys.customers(orgId));
  if (!Array.isArray(cachedCustomers)) {
    return null;
  }
  return cachedCustomers.find((candidate) => candidate && typeof candidate === "object" && typeof candidate.id === "string" && candidate.id === id) ?? null;
}
function preferCachedString(currentValue, cachedValue, shouldReplace) {
  const current = typeof currentValue === "string" ? currentValue.trim() : "";
  const cached = typeof cachedValue === "string" ? cachedValue.trim() : "";
  if (!cached) {
    return current || void 0;
  }
  if (!current) {
    return cached;
  }
  return shouldReplace?.(current) ? cached : current;
}
function preferCachedArray(currentValue, cachedValue) {
  if (Array.isArray(currentValue) && currentValue.length > 0) {
    return currentValue;
  }
  if (Array.isArray(cachedValue) && cachedValue.length > 0) {
    return cachedValue;
  }
  return Array.isArray(currentValue) ? currentValue : void 0;
}
async function mergeCustomerDocWithCachedProfile(id, data, orgId) {
  const cachedCustomer = await getCachedCustomerProfile(id, orgId);
  if (!cachedCustomer) {
    return data;
  }
  const email = preferCachedString(
    data.email,
    cachedCustomer.email,
    (value) => isPlaceholderCustomerEmail(value)
  );
  return {
    ...data,
    displayName: preferCachedString(
      data.displayName,
      cachedCustomer.displayName,
      (value) => isPlaceholderCustomerIdentity(value, {
        email,
        fallbackId: id
      })
    ) ?? data.displayName,
    firstName: preferCachedString(data.firstName, cachedCustomer.firstName) ?? data.firstName,
    lastName: preferCachedString(data.lastName, cachedCustomer.lastName) ?? data.lastName,
    email: email ?? data.email,
    phone: preferCachedString(data.phone, cachedCustomer.phone) ?? data.phone,
    birthDate: data.birthDate ?? cachedCustomer.birthDate ?? null,
    points: data.points ?? cachedCustomer.points ?? data.points,
    totalSpent: data.totalSpent ?? cachedCustomer.totalSpent ?? data.totalSpent,
    orderCount: data.orderCount ?? cachedCustomer.orderCount ?? data.orderCount,
    avgOrderValue: data.avgOrderValue ?? cachedCustomer.avgOrderValue ?? data.avgOrderValue,
    lastOrderDate: data.lastOrderDate ?? cachedCustomer.lastOrderDate ?? data.lastOrderDate,
    preferredCategories: preferCachedArray(data.preferredCategories, cachedCustomer.preferredCategories) ?? [],
    preferredProducts: preferCachedArray(data.preferredProducts, cachedCustomer.preferredProducts) ?? [],
    priceRange: data.priceRange ?? cachedCustomer.priceRange ?? data.priceRange,
    customTags: preferCachedArray(data.customTags, cachedCustomer.customTags) ?? [],
    notes: data.notes ?? cachedCustomer.notes ?? null,
    source: data.source ?? cachedCustomer.source ?? data.source
  };
}
async function formatCustomerResult(id, data, orgId) {
  const resolvedData = await mergeCustomerDocWithCachedProfile(id, data, orgId);
  const totalSpent = resolvedData.totalSpent || 0;
  const orderCount = resolvedData.orderCount || 0;
  const avgOrderValue = resolvedData.avgOrderValue || (orderCount > 0 ? totalSpent / orderCount : 0);
  const daysSinceLastOrder = resolvedData.lastOrderDate ? Math.floor((Date.now() - (resolvedData.lastOrderDate?.toDate?.()?.getTime?.() || new Date(resolvedData.lastOrderDate).getTime())) / (1e3 * 60 * 60 * 24)) : void 0;
  const segment = calculateSegment({ totalSpent, orderCount, avgOrderValue, daysSinceLastOrder, lifetimeValue: totalSpent });
  const tier = mapSegmentToTier(segment, totalSpent);
  const segInfo = getSegmentInfo(segment);
  const displayName = resolveCustomerDisplayName({
    displayName: resolvedData.displayName,
    firstName: resolvedData.firstName,
    lastName: resolvedData.lastName,
    email: resolvedData.email,
    fallbackId: id
  });
  const customer = {
    id,
    orgId,
    displayName,
    email: resolvedData.email,
    phone: resolvedData.phone || null,
    firstName: resolvedData.firstName,
    lastName: resolvedData.lastName,
    segment,
    segmentLabel: segInfo.label,
    tier,
    totalSpent,
    orderCount,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    lastOrderDate: resolvedData.lastOrderDate?.toDate?.()?.toISOString?.() || resolvedData.lastOrderDate || null,
    daysSinceLastOrder,
    lifetimeValue: totalSpent,
    points: resolvedData.points || Math.floor(totalSpent),
    preferredCategories: resolvedData.preferredCategories || [],
    preferredProducts: resolvedData.preferredProducts || [],
    priceRange: resolvedData.priceRange || "mid",
    customTags: resolvedData.customTags || [],
    notes: resolvedData.notes || null,
    birthDate: resolvedData.birthDate || null,
    source: resolvedData.source || "unknown"
  };
  const lastOrder = customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : "Never";
  const summary = `**${displayName}** (${segInfo.label} | ${tier} tier)
- Email: ${resolvedData.email || "N/A"} | Phone: ${resolvedData.phone || "N/A"}
- LTV: $${totalSpent.toLocaleString()} | Orders: ${orderCount} | AOV: $${avgOrderValue.toFixed(2)}
- Last Order: ${lastOrder}${daysSinceLastOrder !== void 0 ? ` (${daysSinceLastOrder} days ago)` : ""}
- Points: ${customer.points} | Tags: ${customer.customTags.join(", ") || "None"}
:::crm:customer:${displayName}
${JSON.stringify(customer)}
:::`;
  return { summary, customer };
}
async function getCustomerHistory(customerId, orgId, limit = 10) {
  logger.info("[crm-tools] getCustomerHistory", { customerId, orgId, limit });
  const numericId = customerId.startsWith("alleaves_") ? customerId.replace("alleaves_", "") : customerId;
  const client = await initAlleavesClientForOrg(orgId);
  if (!client) {
    return { summary: `No POS connection available for ${orgId}. Cannot fetch order history.`, orders: [] };
  }
  try {
    const orders = await client.getCustomerOrders(numericId);
    if (orders && orders.length > 0) {
      const limited = orders.slice(0, limit);
      const totalSpent = limited.reduce((sum, o) => sum + (o.total || 0), 0);
      const summary = `**Order History for ${customerId}** (showing ${limited.length} of ${orders.length})
Total spent in shown orders: $${totalSpent.toFixed(2)}

${limited.map((o, i) => `${i + 1}. **${o.created_at ? new Date(o.created_at).toLocaleDateString() : "Unknown date"}** - $${(o.total || 0).toFixed(2)} (${o.items?.length || 0} items) - ${o.status || "completed"}`).join("\n")}`;
      return {
        summary,
        orders: limited.map((o) => ({
          id: o.id,
          date: o.created_at,
          total: o.total,
          items: o.items?.map((item) => ({
            name: item.product_name,
            quantity: item.quantity,
            price: item.unit_price,
            total: item.total
          })) || [],
          status: o.status
        }))
      };
    }
  } catch (err) {
    logger.warn("[crm-tools] Per-customer orders failed, trying fallback", { error: err.message });
  }
  try {
    const ordersCacheKey = cacheKeys.orders(orgId);
    let allOrders = await posCache.get(ordersCacheKey);
    if (!allOrders) {
      allOrders = await client.getAllOrders(5e3);
      await posCache.set(ordersCacheKey, allOrders, 300);
    }
    const customerOrders = allOrders.filter((o) => String(o.id_customer) === numericId).sort((a, b) => new Date(b.date_created || 0).getTime() - new Date(a.date_created || 0).getTime()).slice(0, limit);
    if (customerOrders.length === 0) {
      return { summary: `No orders found for customer ${customerId}.`, orders: [] };
    }
    const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const summary = `**Order History for ${customerId}** (${customerOrders.length} orders)
Total: $${totalSpent.toFixed(2)}

${customerOrders.map((o, i) => `${i + 1}. **${o.date_created ? new Date(o.date_created).toLocaleDateString() : "Unknown"}** - $${(o.total || 0).toFixed(2)} (${o.items?.length || 0} items)`).join("\n")}`;
    return {
      summary,
      orders: customerOrders.map((o) => ({
        id: String(o.id || o.id_order || ""),
        date: o.date_created || o.created_at,
        total: o.total || 0,
        items: (o.items || []).map((item) => ({
          name: item.product_name || item.name || "Unknown",
          quantity: item.quantity || 1,
          price: item.unit_price || item.price || 0,
          total: item.total || 0
        })),
        status: o.status || "completed"
      }))
    };
  } catch (err) {
    logger.error("[crm-tools] Failed to fetch order history", { error: err.message });
    return { summary: `Error fetching orders: ${err.message}`, orders: [] };
  }
}
async function getSegmentSummary(orgId) {
  logger.info("[crm-tools] getSegmentSummary", { orgId });
  return withCache(
    CachePrefix.CRM_SEGMENTS,
    orgId,
    async () => {
      const firestore = getAdminFirestore();
      const spendingSnap = await firestore.collection("tenants").doc(orgId).collection("customer_spending").get();
      if (spendingSnap.empty) {
        return { summary: `No customer spending data found for organization ${orgId}.`, segments: {} };
      }
      const segments = {
        vip: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
        loyal: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
        frequent: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
        high_value: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
        new: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
        slipping: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
        at_risk: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
        churned: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
        regular: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 }
      };
      let totalCustomers = 0;
      let totalLTV = 0;
      spendingSnap.docs.forEach((doc) => {
        const d = doc.data();
        const spent = d.totalSpent || 0;
        const orders = d.orderCount || 0;
        const avgOV = d.avgOrderValue || (orders > 0 ? spent / orders : 0);
        const lastOrder = d.lastOrderDate?.toDate?.() ?? (d.lastOrderDate ? new Date(d.lastOrderDate) : void 0);
        const firstOrder = d.firstOrderDate?.toDate?.() ?? (d.firstOrderDate ? new Date(d.firstOrderDate) : void 0);
        const daysSince = lastOrder ? Math.floor((Date.now() - lastOrder.getTime()) / (1e3 * 60 * 60 * 24)) : void 0;
        const seg = calculateSegment({ totalSpent: spent, orderCount: orders, avgOrderValue: avgOV, daysSinceLastOrder: daysSince, lifetimeValue: spent, firstOrderDate: firstOrder ? firstOrder.toISOString() : void 0 });
        if (segments[seg]) {
          segments[seg].count++;
          segments[seg].totalSpent += spent;
          if (daysSince !== void 0 && daysSince < 30) {
            segments[seg].recentActiveCount++;
          }
        }
        totalCustomers++;
        totalLTV += spent;
      });
      for (const seg of Object.keys(segments)) {
        if (segments[seg].count > 0) {
          segments[seg].avgSpend = Math.round(segments[seg].totalSpent / segments[seg].count);
        }
      }
      const avgLTV = totalCustomers > 0 ? Math.round(totalLTV / totalCustomers) : 0;
      const activeSegments = Object.keys(segments).filter((s) => segments[s].count > 0);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
      let lastCampaignBySegment = {};
      try {
        const recentCampaignsSnap = await firestore.collection("campaigns").where("orgId", "==", orgId).where("status", "==", "sent").orderBy("sentAt", "desc").limit(20).get();
        for (const doc of recentCampaignsSnap.docs) {
          const c = doc.data();
          const sentDate = c.sentAt?.toDate?.() || new Date(c.sentAt);
          const segs = c.audience?.segments || [];
          for (const seg of segs) {
            if (!lastCampaignBySegment[seg]) {
              const daysAgo = Math.floor((Date.now() - sentDate.getTime()) / (1e3 * 60 * 60 * 24));
              lastCampaignBySegment[seg] = daysAgo === 0 ? "today" : `${daysAgo}d ago`;
            }
          }
        }
      } catch {
      }
      const summary = `**Customer Segment Analysis** (${totalCustomers} total, avg LTV: $${avgLTV})

| Segment | Count | % | Avg Spend | Total LTV | Last Campaign |
|---------|-------|---|-----------|-----------|---------------|
${activeSegments.map((seg) => {
        const s = segments[seg];
        const info = getSegmentInfo(seg);
        const pct = (s.count / totalCustomers * 100).toFixed(1);
        const lastCampaign = lastCampaignBySegment[seg] || "Never";
        return `| ${info.label} | ${s.count} | ${pct}% | $${s.avgSpend.toLocaleString()} | $${Math.round(s.totalSpent).toLocaleString()} | ${lastCampaign} |`;
      }).join("\n")}

**Key Insights:**
- At-risk revenue: $${Math.round(segments.at_risk.totalSpent + segments.slipping.totalSpent).toLocaleString()} across ${segments.at_risk.count + segments.slipping.count} customers
- VIP concentration: ${segments.vip.count} VIPs account for $${Math.round(segments.vip.totalSpent).toLocaleString()} (${totalLTV > 0 ? (segments.vip.totalSpent / totalLTV * 100).toFixed(1) : 0}% of total tracked customer LTV); ${segments.vip.recentActiveCount} ordered in the last 30 days
- Dedup window: 30 days (customers contacted in last 30 days for same campaign type are automatically excluded)`;
      return { summary, segments };
    },
    CacheTTL.CRM_SEGMENTS
  );
}
async function getCustomerEmailCoverage(orgId) {
  logger.info("[crm-tools] getCustomerEmailCoverage", { orgId });
  const firestore = getAdminFirestore();
  const snap = await firestore.collection("customers").where("orgId", "==", orgId).select("email", "phone").get();
  if (snap.empty) {
    return {
      summary: `No synced customer profiles found for organization ${orgId}.`,
      metrics: {
        totalCustomers: 0,
        customersWithEmail: 0,
        customersWithoutEmail: 0,
        emailCoveragePct: 0,
        customersWithPhone: 0,
        phoneCoveragePct: 0
      }
    };
  }
  let customersWithEmail = 0;
  let customersWithPhone = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const email = typeof data.email === "string" ? data.email.trim() : "";
    const phone = typeof data.phone === "string" ? data.phone.trim() : "";
    if (email.length > 0) {
      customersWithEmail++;
    }
    if (phone.length > 0) {
      customersWithPhone++;
    }
  }
  const totalCustomers = snap.size;
  const customersWithoutEmail = totalCustomers - customersWithEmail;
  const emailCoveragePct = Number((customersWithEmail / totalCustomers * 100).toFixed(1));
  const phoneCoveragePct = Number((customersWithPhone / totalCustomers * 100).toFixed(1));
  const summary = `**Customer Contact Coverage**
- Customers with email: ${customersWithEmail.toLocaleString()} of ${totalCustomers.toLocaleString()} (${emailCoveragePct}%)
- Missing email: ${customersWithoutEmail.toLocaleString()}
- Customers with phone: ${customersWithPhone.toLocaleString()} of ${totalCustomers.toLocaleString()} (${phoneCoveragePct}%)`;
  return {
    summary,
    metrics: {
      totalCustomers,
      customersWithEmail,
      customersWithoutEmail,
      emailCoveragePct,
      customersWithPhone,
      phoneCoveragePct
    }
  };
}
async function getTopCustomers2(orgId, limit = 5, sortBy = "totalSpent") {
  logger.info("[crm-tools] getTopCustomers", { orgId, limit, sortBy });
  const result = await getTopCustomers(orgId, { limit, sortBy });
  if (result.customers.length === 0) {
    return {
      summary: `No tracked customers found for organization ${orgId}.`,
      customers: []
    };
  }
  const rankedCustomers = result.customers.map((customer) => ({
    ...customer,
    lifetimeValue: customer.totalSpent
  }));
  const summary = `**Top Customers** (${sortBy === "orderCount" ? "ranked by order count" : "ranked by spend"})

${result.customers.map((customer, index) => `${index + 1}. **${customer.displayName || customer.email}** \u2014 $${customer.totalSpent.toLocaleString()} LTV, ${customer.orderCount} orders, ${customer.segment}`).join("\n")}

${result.insight}`;
  return {
    summary,
    customers: rankedCustomers
  };
}
async function getAtRiskCustomers(orgId, limit = 20, includeSlipping = true) {
  logger.info("[crm-tools] getAtRiskCustomers", { orgId, limit, includeSlipping });
  return withCache(
    CachePrefix.CRM_AT_RISK,
    `${orgId}:${limit}:${includeSlipping}`,
    async () => {
      const firestore = getAdminFirestore();
      const targetSegments = includeSlipping ? ["at_risk", "slipping", "churned"] : ["at_risk", "churned"];
      const snap = await firestore.collection("customers").where("orgId", "==", orgId).get();
      const atRiskCustomers = [];
      snap.docs.forEach((doc) => {
        const data = doc.data();
        const email = typeof data.email === "string" ? data.email.trim() : "";
        const nameInput = {
          displayName: data.displayName,
          firstName: data.firstName,
          lastName: data.lastName,
          email,
          fallbackId: doc.id
        };
        const spent = data.totalSpent || 0;
        const orders = data.orderCount || 0;
        const avgOV = orders > 0 ? spent / orders : 0;
        const lastDate = data.lastOrderDate?.toDate?.() || (data.lastOrderDate ? new Date(data.lastOrderDate) : null);
        if (data.isTestAccount === true || typeof data.testNote === "string") {
          return;
        }
        if (isPlaceholderCustomerEmail(email)) {
          return;
        }
        const hasPlaceholderIdentity = isPlaceholderCustomerIdentity(data.displayName, nameInput) && isPlaceholderCustomerIdentity(
          [data.firstName, data.lastName].filter(Boolean).join(" "),
          nameInput
        );
        if (hasPlaceholderIdentity) {
          return;
        }
        if (!lastDate || Number.isNaN(lastDate.getTime()) || orders <= 0) {
          return;
        }
        const daysSince = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / (1e3 * 60 * 60 * 24)) : void 0;
        const seg = calculateSegment({ totalSpent: spent, orderCount: orders, avgOrderValue: avgOV, daysSinceLastOrder: daysSince, lifetimeValue: spent });
        if (targetSegments.includes(seg)) {
          atRiskCustomers.push({
            id: doc.id,
            name: resolveCustomerDisplayName(nameInput),
            email,
            segment: seg,
            totalSpent: spent,
            orderCount: orders,
            lastOrderDate: lastDate?.toISOString() || null,
            daysSinceLastOrder: daysSince,
            retentionScore: data.retentionScore,
            retentionTier: data.retentionTier,
            scoreTrend: data.scoreTrend,
            churnProbability: data.churnProbability
          });
        }
      });
      atRiskCustomers.sort((a, b) => b.totalSpent - a.totalSpent);
      const limited = atRiskCustomers.slice(0, limit);
      if (limited.length === 0) {
        return { summary: `No at-risk customers found for ${orgId}. All customers are active!`, customers: [] };
      }
      const totalAtRiskLTV = atRiskCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
      const summary = `**At-Risk Customers** (${atRiskCustomers.length} total, $${Math.round(totalAtRiskLTV).toLocaleString()} LTV at risk)

Top ${limited.length} by lifetime value:

${limited.map((c, i) => {
        const segInfo = getSegmentInfo(c.segment);
        const retScore = c.retentionScore !== void 0 ? ` | Score: ${c.retentionScore}/100 (${c.retentionTier ?? "?"})` : "";
        const trend = c.scoreTrend && c.scoreTrend !== "stable" ? ` ${c.scoreTrend === "falling" ? "\u2193" : "\u2191"}` : "";
        return `${i + 1}. **${c.name}** (${segInfo.label}) - $${c.totalSpent.toLocaleString()} LTV, ${c.orderCount} orders${c.daysSinceLastOrder ? `, ${c.daysSinceLastOrder}d inactive` : ""}${retScore}${trend}`;
      }).join("\n")}

**Recommended actions:** Target the top customers with personalized win-back offers. Higher-LTV customers should get premium incentives.`;
      return { summary, customers: limited };
    },
    CacheTTL.CRM_AT_RISK
  );
}
async function getUpcomingBirthdays(orgId, daysAhead = 7) {
  logger.info("[crm-tools] getUpcomingBirthdays", { orgId, daysAhead });
  const firestore = getAdminFirestore();
  const snap = await firestore.collection("customers").where("orgId", "==", orgId).get();
  const now = /* @__PURE__ */ new Date();
  const birthdays = [];
  snap.docs.forEach((doc) => {
    const data = doc.data();
    const birthDate = data.birthDate || data.date_of_birth;
    if (!birthDate) return;
    try {
      const bday = new Date(birthDate);
      const bdayMonth = bday.getMonth();
      const bdayDay = bday.getDate();
      const thisYearBday = new Date(now.getFullYear(), bdayMonth, bdayDay);
      if (thisYearBday < now) {
        thisYearBday.setFullYear(now.getFullYear() + 1);
      }
      const daysAway = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      if (daysAway <= daysAhead) {
        birthdays.push({
          id: doc.id,
          name: resolveCustomerDisplayName({
            displayName: data.displayName,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            fallbackId: doc.id
          }),
          email: data.email || "",
          birthday: `${bdayMonth + 1}/${bdayDay}`,
          daysAway,
          segment: data.segment || "new",
          totalSpent: data.totalSpent || 0
        });
      }
    } catch {
    }
  });
  birthdays.sort((a, b) => a.daysAway - b.daysAway);
  if (birthdays.length === 0) {
    return { summary: `No customer birthdays found in the next ${daysAhead} days.`, customers: [] };
  }
  const summary = `**Upcoming Birthdays** (${birthdays.length} in next ${daysAhead} days)

${birthdays.map((b, i) => {
    const segInfo = getSegmentInfo(b.segment);
    const timing = b.daysAway === 0 ? "TODAY!" : b.daysAway === 1 ? "Tomorrow" : `in ${b.daysAway} days`;
    return `${i + 1}. **${b.name}** - ${b.birthday} (${timing}) | ${segInfo.label} | $${b.totalSpent.toLocaleString()} LTV`;
  }).join("\n")}

**Recommended:** Send personalized birthday messages with a special discount or loyalty bonus points.`;
  return { summary, customers: birthdays };
}
async function getCustomerComms(customerEmail, orgId, limit = 20, channel) {
  logger.info("[crm-tools] getCustomerComms", { customerEmail, orgId, limit, channel });
  const firestore = getAdminFirestore();
  let query = firestore.collection("customer_communications").where("customerEmail", "==", customerEmail.toLowerCase()).where("orgId", "==", orgId).orderBy("createdAt", "desc");
  if (channel) {
    query = query.where("channel", "==", channel);
  }
  query = query.limit(limit);
  const snap = await query.get();
  if (snap.empty) {
    return {
      summary: `No communications found for ${customerEmail}${channel ? ` on ${channel} channel` : ""}.`,
      communications: []
    };
  }
  const comms = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      channel: data.channel,
      type: data.type,
      subject: data.subject,
      preview: data.preview,
      status: data.status,
      sentAt: data.sentAt?.toDate?.()?.toISOString?.() || null,
      openedAt: data.openedAt?.toDate?.()?.toISOString?.() || null,
      clickedAt: data.clickedAt?.toDate?.()?.toISOString?.() || null,
      agentName: data.agentName,
      campaignId: data.campaignId
    };
  });
  const totalSent = comms.length;
  const opened = comms.filter((c) => c.openedAt).length;
  const clicked = comms.filter((c) => c.clickedAt).length;
  const openRate = totalSent > 0 ? (opened / totalSent * 100).toFixed(1) : "0";
  const clickRate = totalSent > 0 ? (clicked / totalSent * 100).toFixed(1) : "0";
  const summary = `**Communication History for ${customerEmail}** (${totalSent} messages)
Open rate: ${openRate}% | Click rate: ${clickRate}%

${comms.slice(0, 10).map((c, i) => {
    const date = c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "Unknown";
    const statusIcon = c.clickedAt ? "clicked" : c.openedAt ? "opened" : c.status;
    return `${i + 1}. [${c.channel}] ${date} - "${c.subject || c.type}" (${statusIcon})${c.agentName ? ` via ${c.agentName}` : ""}`;
  }).join("\n")}`;
  return { summary, communications: comms };
}
async function getTodayCheckins(orgId) {
  const db = getAdminFirestore();
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  const snap = await db.collection("checkin_visits").where("orgId", "==", orgId).where("visitedAt", ">=", todayStart).count().get();
  return snap.data().count;
}
var import_zod2, lookupCustomerDef, getCustomerHistoryDef, getSegmentSummaryDef, getCustomerEmailCoverageDef, getTopCustomersDef, getAtRiskCustomersDef, getUpcomingBirthdaysDef, getCustomerCommsDef, crmToolDefs, craigCrmToolDefs, mrsParkerCrmToolDefs, smokeyCrmToolDefs, moneyMikeCrmToolDefs;
var init_crm_tools = __esm({
  "src/server/tools/crm-tools.ts"() {
    "use strict";
    import_zod2 = require("zod");
    init_admin();
    init_alleaves();
    init_pos_cache();
    init_profile_derivations();
    init_column_mapping();
    init_customers();
    init_customer_tier_mapper();
    init_logger();
    init_cache();
    init_crm();
    lookupCustomerDef = {
      name: "lookupCustomer",
      description: `Look up a customer by ID, email, or phone number. Returns profile with segment, spending metrics, tier, loyalty points, preferences, and tags. Use this when you need details about a specific customer.`,
      schema: import_zod2.z.object({
        identifier: import_zod2.z.string().describe("Customer ID (e.g. alleaves_123), email address, or phone number"),
        orgId: import_zod2.z.string().describe("Organization/tenant ID")
      })
    };
    getCustomerHistoryDef = {
      name: "getCustomerHistory",
      description: `Get order history for a specific customer from the POS system. Returns recent orders with items, totals, and dates. Use this to understand purchase patterns and product preferences.`,
      schema: import_zod2.z.object({
        customerId: import_zod2.z.string().describe("Customer ID (e.g. alleaves_123)"),
        orgId: import_zod2.z.string().describe("Organization/tenant ID"),
        limit: import_zod2.z.number().optional().default(10).describe("Max number of orders to return")
      })
    };
    getSegmentSummaryDef = {
      name: "getSegmentSummary",
      description: `Get a summary of all customer segments for an organization. Returns segment counts, average spend, total LTV, and growth opportunities. Use this for strategic analysis of the customer base.`,
      schema: import_zod2.z.object({
        orgId: import_zod2.z.string().describe("Organization/tenant ID")
      })
    };
    getCustomerEmailCoverageDef = {
      name: "getCustomerEmailCoverage",
      description: `Count how many synced customer profiles have an email address on file. Use this whenever the user asks how many customers have emails, what the email capture rate is, or how many profiles are missing email.`,
      schema: import_zod2.z.object({
        orgId: import_zod2.z.string().describe("Organization/tenant ID")
      })
    };
    getTopCustomersDef = {
      name: "getTopCustomers",
      description: `Find the highest-value customers in an organization. Returns the top customers ranked by spend or order count. Use this for VIP outreach, concierge treatment, and answering "who are our top customers?"`,
      schema: import_zod2.z.object({
        orgId: import_zod2.z.string().describe("Organization/tenant ID"),
        limit: import_zod2.z.number().optional().default(5).describe("Max customers to return"),
        sortBy: import_zod2.z.enum(["totalSpent", "orderCount", "lifetimeValue"]).optional().default("totalSpent").describe("How to rank the customers")
      })
    };
    getAtRiskCustomersDef = {
      name: "getAtRiskCustomers",
      description: `Find at-risk and slipping customers sorted by lifetime value. These are customers who haven't ordered in 30+ days. Use this to identify win-back campaign targets.`,
      schema: import_zod2.z.object({
        orgId: import_zod2.z.string().describe("Organization/tenant ID"),
        limit: import_zod2.z.number().optional().default(20).describe("Max customers to return"),
        includeSlipping: import_zod2.z.boolean().optional().default(true).describe("Include slipping (30-60 days) in addition to at_risk (60+)")
      })
    };
    getUpcomingBirthdaysDef = {
      name: "getUpcomingBirthdays",
      description: `Find customers with upcoming birthdays within a specified number of days. Use this to plan birthday campaigns and personalized offers.`,
      schema: import_zod2.z.object({
        orgId: import_zod2.z.string().describe("Organization/tenant ID"),
        daysAhead: import_zod2.z.number().optional().default(7).describe("Number of days ahead to look")
      })
    };
    getCustomerCommsDef = {
      name: "getCustomerComms",
      description: `Get communication history (emails, SMS) for a customer. Shows what messages have been sent, opened, or clicked. Use this to avoid over-messaging and to review engagement.`,
      schema: import_zod2.z.object({
        customerEmail: import_zod2.z.string().describe("Customer email address"),
        orgId: import_zod2.z.string().describe("Organization/tenant ID"),
        limit: import_zod2.z.number().optional().default(20).describe("Max communications to return"),
        channel: import_zod2.z.enum(["email", "sms", "push"]).optional().describe("Filter by channel")
      })
    };
    crmToolDefs = [
      lookupCustomerDef,
      getCustomerHistoryDef,
      getSegmentSummaryDef,
      getCustomerEmailCoverageDef,
      getTopCustomersDef,
      getAtRiskCustomersDef,
      getUpcomingBirthdaysDef,
      getCustomerCommsDef
    ];
    craigCrmToolDefs = [lookupCustomerDef, getAtRiskCustomersDef, getCustomerCommsDef, getSegmentSummaryDef];
    mrsParkerCrmToolDefs = [lookupCustomerDef, getCustomerEmailCoverageDef, getTopCustomersDef, getUpcomingBirthdaysDef, getCustomerCommsDef, getAtRiskCustomersDef];
    smokeyCrmToolDefs = [lookupCustomerDef, getCustomerHistoryDef];
    moneyMikeCrmToolDefs = [lookupCustomerDef, getSegmentSummaryDef, getCustomerHistoryDef];
  }
});

// src/types/dispensary-intent-profile.ts
var init_dispensary_intent_profile = __esm({
  "src/types/dispensary-intent-profile.ts"() {
    "use strict";
  }
});

// src/types/org-profile.ts
function calculateOrgProfileCompletion(profile) {
  let score = 0;
  const b = profile.brand;
  if (b?.name) score += 10;
  if (b?.voice?.tone?.length && b.voice.personality?.length) score += 15;
  if (b?.visualIdentity?.colors?.primary?.hex) score += 15;
  const i = profile.intent;
  const sf = i?.strategicFoundation;
  if (sf?.archetype && sf.weightedObjectives?.length >= 1) score += 20;
  const vh = i?.valueHierarchies;
  if (vh && vh.speedVsEducation !== void 0 && vh.volumeVsMargin !== void 0 && vh.acquisitionVsRetention !== void 0 && vh.complianceConservatism !== void 0 && vh.automationVsHumanTouch !== void 0 && vh.brandVoiceFormality !== void 0) {
    score += 20;
  }
  const ac = i?.agentConfigs;
  if (ac?.smokey?.recommendationPhilosophy && ac.smokey.newUserProtocol && ac.smokey.productEducationDepth && ac.craig?.toneArchetype && ac.craig.promotionStrategy) {
    score += 15;
  }
  if (i?.hardBoundaries !== void 0) score += 5;
  const ops = profile.operations;
  if (ops?.heroProducts?.length) score += 5;
  if (ops?.campaignCalendar?.length) score += 5;
  if (ops?.channelRules?.length) score += 5;
  if (ops?.performanceBaselines?.lastUpdated) score += 5;
  return Math.round(score / 120 * 100);
}
var init_org_profile = __esm({
  "src/types/org-profile.ts"() {
    "use strict";
    init_dispensary_intent_profile();
  }
});

// src/server/services/intent-profile.ts
function getDefaultProfile(archetype, orgId) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const base = {
    id: orgId,
    orgId,
    version: "1.0.0",
    isDefault: true,
    lastModifiedBy: "system",
    createdAt: now,
    updatedAt: now,
    hardBoundaries: { neverDoList: [], escalationTriggers: [] },
    feedbackConfig: {
      captureNegativeFeedback: true,
      requestExplicitFeedback: false,
      minimumInteractionsForAdjustment: 50
    }
  };
  switch (archetype) {
    case "premium_boutique":
      return {
        ...base,
        strategicFoundation: {
          archetype: "premium_boutique",
          growthStage: "established",
          competitivePosture: "differentiator",
          geographicStrategy: "hyperlocal",
          weightedObjectives: [
            { objective: "boost_average_order_value", weight: 0.45 },
            { objective: "build_brand_authority", weight: 0.35 },
            { objective: "improve_retention", weight: 0.2 }
          ]
        },
        valueHierarchies: {
          speedVsEducation: 0.8,
          volumeVsMargin: 0.7,
          acquisitionVsRetention: 0.6,
          complianceConservatism: 0.8,
          automationVsHumanTouch: 0.6,
          brandVoiceFormality: 0.7
        },
        agentConfigs: {
          smokey: {
            recommendationPhilosophy: "chemistry_first",
            upsellAggressiveness: 0.3,
            newUserProtocol: "guided",
            productEducationDepth: "comprehensive"
          },
          craig: {
            campaignFrequencyCap: 2,
            preferredChannels: ["email"],
            toneArchetype: "sage",
            promotionStrategy: "education_led"
          }
        },
        feedbackConfig: {
          captureNegativeFeedback: true,
          requestExplicitFeedback: false,
          minimumInteractionsForAdjustment: 100
        }
      };
    case "community_hub":
      return {
        ...base,
        strategicFoundation: {
          archetype: "community_hub",
          growthStage: "growth",
          competitivePosture: "defensive",
          geographicStrategy: "hyperlocal",
          weightedObjectives: [
            { objective: "improve_retention", weight: 0.4 },
            { objective: "grow_loyalty_enrollment", weight: 0.35 },
            { objective: "build_brand_authority", weight: 0.25 }
          ]
        },
        valueHierarchies: {
          speedVsEducation: 0.5,
          volumeVsMargin: 0.3,
          acquisitionVsRetention: 0.4,
          complianceConservatism: 0.6,
          automationVsHumanTouch: 0.7,
          brandVoiceFormality: 0.2
        },
        agentConfigs: {
          smokey: {
            recommendationPhilosophy: "effect_first",
            upsellAggressiveness: 0.5,
            newUserProtocol: "guided",
            productEducationDepth: "moderate"
          },
          craig: {
            campaignFrequencyCap: 3,
            preferredChannels: ["sms", "email"],
            toneArchetype: "hero",
            promotionStrategy: "value_led"
          }
        },
        feedbackConfig: {
          captureNegativeFeedback: true,
          requestExplicitFeedback: true,
          minimumInteractionsForAdjustment: 30
        }
      };
    case "value_leader":
      return {
        ...base,
        strategicFoundation: {
          archetype: "value_leader",
          growthStage: "growth",
          competitivePosture: "aggressive",
          geographicStrategy: "regional",
          weightedObjectives: [
            { objective: "increase_foot_traffic", weight: 0.4 },
            { objective: "boost_average_order_value", weight: 0.35 },
            { objective: "clear_aging_inventory", weight: 0.25 }
          ]
        },
        valueHierarchies: {
          speedVsEducation: 0.2,
          volumeVsMargin: 0.2,
          acquisitionVsRetention: 0.3,
          complianceConservatism: 0.5,
          automationVsHumanTouch: 0.2,
          brandVoiceFormality: 0.3
        },
        agentConfigs: {
          smokey: {
            recommendationPhilosophy: "price_first",
            upsellAggressiveness: 0.7,
            newUserProtocol: "express",
            productEducationDepth: "minimal"
          },
          craig: {
            campaignFrequencyCap: 4,
            preferredChannels: ["sms"],
            toneArchetype: "rebel",
            promotionStrategy: "discount_led"
          }
        },
        feedbackConfig: {
          captureNegativeFeedback: true,
          requestExplicitFeedback: false,
          minimumInteractionsForAdjustment: 50
        }
      };
    case "medical_focus":
      return {
        ...base,
        strategicFoundation: {
          archetype: "medical_focus",
          growthStage: "established",
          competitivePosture: "differentiator",
          geographicStrategy: "hyperlocal",
          weightedObjectives: [
            { objective: "improve_retention", weight: 0.45 },
            { objective: "build_brand_authority", weight: 0.35 },
            { objective: "grow_loyalty_enrollment", weight: 0.2 }
          ]
        },
        valueHierarchies: {
          speedVsEducation: 0.9,
          // Deep education — patients need full information
          volumeVsMargin: 0.5,
          // Balanced — patients are price-sensitive but quality matters
          acquisitionVsRetention: 0.8,
          // Retention-first — patient trust is earned over time
          complianceConservatism: 0.9,
          // Maximum caution — medical context demands conservatism
          automationVsHumanTouch: 0.9,
          // Human-in-the-loop — medical questions need staff judgment
          brandVoiceFormality: 0.8
          // Clinical and professional
        },
        agentConfigs: {
          smokey: {
            recommendationPhilosophy: "chemistry_first",
            upsellAggressiveness: 0.1,
            // Nearly no upsell — let patients choose
            newUserProtocol: "guided",
            productEducationDepth: "comprehensive"
          },
          craig: {
            campaignFrequencyCap: 2,
            preferredChannels: ["email"],
            toneArchetype: "sage",
            promotionStrategy: "education_led"
          }
        },
        feedbackConfig: {
          captureNegativeFeedback: true,
          requestExplicitFeedback: true,
          minimumInteractionsForAdjustment: 100
        }
      };
    case "lifestyle_brand":
      return {
        ...base,
        strategicFoundation: {
          archetype: "lifestyle_brand",
          growthStage: "growth",
          competitivePosture: "differentiator",
          geographicStrategy: "regional",
          weightedObjectives: [
            { objective: "build_brand_authority", weight: 0.4 },
            { objective: "increase_foot_traffic", weight: 0.35 },
            { objective: "grow_loyalty_enrollment", weight: 0.25 }
          ]
        },
        valueHierarchies: {
          speedVsEducation: 0.4,
          // Lean toward education — culture sells
          volumeVsMargin: 0.5,
          // Balanced — brand quality vs accessibility
          acquisitionVsRetention: 0.3,
          // Acquisition-first — brand is still growing its audience
          complianceConservatism: 0.5,
          // Balanced — creative but responsible
          automationVsHumanTouch: 0.4,
          // Lean toward automation — scale the brand message
          brandVoiceFormality: 0.1
          // Casual and friendly — culture brand voice
        },
        agentConfigs: {
          smokey: {
            recommendationPhilosophy: "effect_first",
            upsellAggressiveness: 0.5,
            newUserProtocol: "discover",
            productEducationDepth: "moderate"
          },
          craig: {
            campaignFrequencyCap: 4,
            preferredChannels: ["sms", "email"],
            toneArchetype: "rebel",
            promotionStrategy: "education_led"
          }
        },
        feedbackConfig: {
          captureNegativeFeedback: true,
          requestExplicitFeedback: false,
          minimumInteractionsForAdjustment: 30
        }
      };
    default: {
      const fallback = getDefaultProfile("community_hub", orgId);
      fallback.strategicFoundation.archetype = archetype;
      return fallback;
    }
  }
}
var CACHE_TTL_MS;
var init_intent_profile = __esm({
  "src/server/services/intent-profile.ts"() {
    "use strict";
    init_admin();
    init_logger();
    init_dispensary_intent_profile();
    CACHE_TTL_MS = 5 * 60 * 1e3;
  }
});

// src/lib/brand-guide-utils.ts
function formatOrganizationTypeLabel(organizationType) {
  return organizationType ? BRAND_ORGANIZATION_TYPE_LABELS[organizationType] : "";
}
function formatBusinessModelLabel(businessModel) {
  return businessModel ? BRAND_BUSINESS_MODEL_LABELS[businessModel] : "";
}
function buildOrganizationDescriptor(input) {
  const location = [input.city, input.state].filter(Boolean).join(", ");
  if (input.organizationType === "dispensary") {
    const typeLabel = input.dispensaryType ? `${input.dispensaryType} dispensary` : "dispensary";
    return location ? `${typeLabel} in ${location}` : typeLabel;
  }
  const orgLabel = formatOrganizationTypeLabel(input.organizationType);
  const modelLabel = formatBusinessModelLabel(input.businessModel);
  const base = [orgLabel, modelLabel].filter(Boolean).join(" - ");
  if (!base) return location ? `organization in ${location}` : "organization";
  return location ? `${base} in ${location}` : base;
}
var BRAND_ORGANIZATION_TYPE_LABELS, BRAND_BUSINESS_MODEL_LABELS;
var init_brand_guide_utils = __esm({
  "src/lib/brand-guide-utils.ts"() {
    "use strict";
    BRAND_ORGANIZATION_TYPE_LABELS = {
      dispensary: "Dispensary",
      cannabis_brand: "Cannabis Brand",
      technology_platform: "Technology Platform",
      agency_service: "Agency / Services",
      community_organization: "Community Organization",
      other: "Other"
    };
    BRAND_BUSINESS_MODEL_LABELS = {
      retail: "Retail",
      product_brand: "Product Brand",
      saas_ai_platform: "SaaS / AI Platform",
      services: "Services",
      media_education: "Media / Education",
      mixed: "Mixed"
    };
  }
});

// src/server/services/org-profile.ts
var org_profile_exports = {};
__export(org_profile_exports, {
  buildCraigContextBlock: () => buildCraigContextBlock,
  buildEzalContextBlock: () => buildEzalContextBlock,
  buildMoneyMikeContextBlock: () => buildMoneyMikeContextBlock,
  buildMrsParkerContextBlock: () => buildMrsParkerContextBlock,
  buildPopsContextBlock: () => buildPopsContextBlock,
  buildSmokeyContextBlock: () => buildSmokeyContextBlock,
  getDefaultOrgProfile: () => getDefaultOrgProfile,
  getOrgProfile: () => getOrgProfile,
  getOrgProfileFromLegacy: () => getOrgProfileFromLegacy,
  getOrgProfileWithFallback: () => getOrgProfileWithFallback,
  invalidateOrgProfileCache: () => invalidateOrgProfileCache,
  upsertOrgProfile: () => upsertOrgProfile
});
function isCacheValid(entry) {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS2;
}
function invalidateOrgProfileCache(orgId) {
  cache.delete(orgId);
}
async function getOrgProfile(orgId) {
  const cached = cache.get(orgId);
  if (cached && isCacheValid(cached)) return cached.profile;
  try {
    const db = getAdminFirestore();
    const snap = await db.collection(COLLECTION).doc(orgId).get();
    if (!snap.exists) return null;
    const profile = normalizeOrgProfile(orgId, snap.data());
    cache.set(orgId, { profile, fetchedAt: Date.now() });
    return profile;
  } catch (err) {
    logger.error(`[OrgProfile] Failed to fetch orgId=${orgId}: ${String(err)}`);
    return null;
  }
}
async function upsertOrgProfile(orgId, updates, updatedBy) {
  const db = getAdminFirestore();
  const docRef = db.collection(COLLECTION).doc(orgId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = await docRef.get();
  const merged = {
    ...updates,
    id: orgId,
    orgId,
    version: "1.0.0",
    isDefault: false,
    updatedAt: now,
    lastModifiedBy: updatedBy
  };
  if (!existing.exists) {
    merged.createdAt = now;
  }
  const fullForScoring = { ...existing.exists ? existing.data() : {}, ...merged };
  merged.completionPct = calculateOrgProfileCompletion(fullForScoring);
  await docRef.set(merged, { merge: true });
  const historyEntry = {
    versionId: now,
    savedBy: updatedBy,
    savedAt: now,
    changeNote: "Profile updated",
    snapshot: merged
  };
  await docRef.collection("history").doc(now).set(historyEntry);
  invalidateOrgProfileCache(orgId);
  logger.info(`[OrgProfile] Upserted orgId=${orgId} by ${updatedBy} (${merged.completionPct}% complete)`);
}
function getDefaultOperations(archetype) {
  const base = {
    channelRules: [
      { channel: "sms", enabled: true, frequencyCap: 3 },
      { channel: "email", enabled: true, frequencyCap: 5 },
      { channel: "push", enabled: false }
    ],
    pricingPolicy: { marginFloorPct: 35, maxDiscountPct: 20 },
    inventoryStrategy: { clearanceThresholdDays: 90, lowStockAlertThreshold: 10 }
  };
  switch (archetype) {
    case "premium_boutique":
      return {
        ...base,
        channelRules: [
          { channel: "email", enabled: true, frequencyCap: 3, voiceOverride: "refined" },
          { channel: "instagram", enabled: true, frequencyCap: 4 },
          { channel: "sms", enabled: true, frequencyCap: 2 }
        ],
        pricingPolicy: { marginFloorPct: 45, maxDiscountPct: 15 }
      };
    case "value_leader":
      return {
        ...base,
        channelRules: [
          { channel: "sms", enabled: true, frequencyCap: 5 },
          { channel: "push", enabled: true, frequencyCap: 4 },
          { channel: "email", enabled: true, frequencyCap: 5 }
        ],
        pricingPolicy: { marginFloorPct: 25, maxDiscountPct: 30 }
      };
    case "medical_focus":
      return {
        ...base,
        channelRules: [
          { channel: "email", enabled: true, frequencyCap: 3, voiceOverride: "clinical" },
          { channel: "sms", enabled: true, frequencyCap: 2 }
        ],
        pricingPolicy: { marginFloorPct: 40, maxDiscountPct: 10 }
      };
    case "lifestyle_brand":
      return {
        ...base,
        channelRules: [
          { channel: "instagram", enabled: true, frequencyCap: 7 },
          { channel: "tiktok", enabled: true, frequencyCap: 5 },
          { channel: "email", enabled: true, frequencyCap: 4 },
          { channel: "sms", enabled: true, frequencyCap: 3 }
        ],
        pricingPolicy: { marginFloorPct: 35, maxDiscountPct: 25 }
      };
    case "community_hub":
    default:
      return base;
  }
}
function getDefaultOrgProfile(archetype, orgId) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const intentDefaults = getDefaultProfile(archetype, orgId);
  const intent = {
    strategicFoundation: intentDefaults.strategicFoundation,
    valueHierarchies: intentDefaults.valueHierarchies,
    agentConfigs: intentDefaults.agentConfigs,
    hardBoundaries: intentDefaults.hardBoundaries,
    feedbackConfig: intentDefaults.feedbackConfig
  };
  const profile = {
    id: orgId,
    orgId,
    version: "1.0.0",
    isDefault: true,
    completionPct: 0,
    lastModifiedBy: "system",
    createdAt: now,
    updatedAt: now,
    brand: { ...DEFAULT_BRAND },
    intent,
    operations: getDefaultOperations(archetype)
  };
  profile.completionPct = calculateOrgProfileCompletion(profile);
  return profile;
}
function resolveOrgProfileArchetype(profile) {
  const archetype = profile?.intent?.strategicFoundation?.archetype;
  return archetype && BUSINESS_ARCHETYPES.has(archetype) ? archetype : "community_hub";
}
function normalizeOrgProfile(orgId, profile) {
  const defaults = getDefaultOrgProfile(resolveOrgProfileArchetype(profile), orgId);
  return {
    ...defaults,
    ...profile,
    id: profile.id ?? orgId,
    orgId: profile.orgId ?? orgId,
    version: profile.version ?? defaults.version,
    isDefault: profile.isDefault ?? defaults.isDefault,
    completionPct: typeof profile.completionPct === "number" ? profile.completionPct : calculateOrgProfileCompletion(profile),
    lastModifiedBy: profile.lastModifiedBy ?? defaults.lastModifiedBy,
    createdAt: profile.createdAt ?? defaults.createdAt,
    updatedAt: profile.updatedAt ?? defaults.updatedAt,
    brand: {
      ...defaults.brand,
      ...profile.brand,
      visualIdentity: {
        ...defaults.brand.visualIdentity,
        ...profile.brand?.visualIdentity,
        colors: {
          ...defaults.brand.visualIdentity.colors,
          ...profile.brand?.visualIdentity?.colors,
          primary: profile.brand?.visualIdentity?.colors?.primary ?? defaults.brand.visualIdentity.colors.primary
        }
      },
      voice: {
        ...defaults.brand.voice,
        ...profile.brand?.voice,
        tone: profile.brand?.voice?.tone ?? defaults.brand.voice.tone,
        personality: profile.brand?.voice?.personality ?? defaults.brand.voice.personality,
        doWrite: profile.brand?.voice?.doWrite ?? defaults.brand.voice.doWrite,
        dontWrite: profile.brand?.voice?.dontWrite ?? defaults.brand.voice.dontWrite
      },
      messaging: {
        ...defaults.brand.messaging,
        ...profile.brand?.messaging
      },
      compliance: {
        ...defaults.brand.compliance,
        ...profile.brand?.compliance
      },
      assets: profile.brand?.assets ?? defaults.brand.assets
    },
    intent: {
      ...defaults.intent,
      ...profile.intent,
      strategicFoundation: {
        ...defaults.intent.strategicFoundation,
        ...profile.intent?.strategicFoundation,
        weightedObjectives: profile.intent?.strategicFoundation?.weightedObjectives ?? defaults.intent.strategicFoundation.weightedObjectives
      },
      valueHierarchies: {
        ...defaults.intent.valueHierarchies,
        ...profile.intent?.valueHierarchies
      },
      agentConfigs: {
        ...defaults.intent.agentConfigs,
        ...profile.intent?.agentConfigs,
        smokey: {
          ...defaults.intent.agentConfigs.smokey,
          ...profile.intent?.agentConfigs?.smokey
        },
        craig: {
          ...defaults.intent.agentConfigs.craig,
          ...profile.intent?.agentConfigs?.craig
        }
      },
      hardBoundaries: {
        ...defaults.intent.hardBoundaries,
        ...profile.intent?.hardBoundaries,
        neverDoList: profile.intent?.hardBoundaries?.neverDoList ?? defaults.intent.hardBoundaries.neverDoList,
        escalationTriggers: profile.intent?.hardBoundaries?.escalationTriggers ?? defaults.intent.hardBoundaries.escalationTriggers
      },
      feedbackConfig: {
        ...defaults.intent.feedbackConfig,
        ...profile.intent?.feedbackConfig
      }
    },
    operations: {
      ...defaults.operations,
      ...profile.operations,
      pricingPolicy: profile.operations?.pricingPolicy ? {
        ...defaults.operations?.pricingPolicy,
        ...profile.operations.pricingPolicy
      } : defaults.operations?.pricingPolicy,
      inventoryStrategy: profile.operations?.inventoryStrategy ? {
        ...defaults.operations?.inventoryStrategy,
        ...profile.operations.inventoryStrategy
      } : defaults.operations?.inventoryStrategy,
      performanceBaselines: profile.operations?.performanceBaselines ? {
        ...defaults.operations?.performanceBaselines,
        ...profile.operations.performanceBaselines
      } : defaults.operations?.performanceBaselines,
      contentLibrary: profile.operations?.contentLibrary ? {
        ...defaults.operations?.contentLibrary,
        ...profile.operations.contentLibrary
      } : defaults.operations?.contentLibrary,
      retailerRouting: profile.operations?.retailerRouting ? {
        ...defaults.operations?.retailerRouting,
        ...profile.operations.retailerRouting
      } : defaults.operations?.retailerRouting
    }
  };
}
function mapTenantOrganizationType(value) {
  if (value === "dispensary") return "dispensary";
  if (value === "brand") return "cannabis_brand";
  if (value === "platform" || value === "super_user") return "technology_platform";
  return void 0;
}
function mapTenantBusinessModel(value) {
  if (value === "dispensary") return "retail";
  if (value === "brand") return "product_brand";
  if (value === "platform" || value === "super_user") return "saas_ai_platform";
  return void 0;
}
async function getOrgProfileFromLegacy(orgId) {
  try {
    const db = getAdminFirestore();
    const [brandSnap, intentSnap, tenantSnap] = await Promise.all([
      db.collection("brands").doc(orgId).get(),
      db.collection("org_intent_profiles").doc(orgId).get(),
      db.collection("tenants").doc(orgId).get()
    ]);
    if (!brandSnap.exists && !intentSnap.exists && !tenantSnap.exists) return null;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const brandData = brandSnap.exists ? brandSnap.data() : {};
    const intentData = intentSnap.exists ? intentSnap.data() : {};
    const tenantData = tenantSnap.exists ? tenantSnap.data() : {};
    const tenantOrganizationType = mapTenantOrganizationType(tenantData.type);
    const tenantBusinessModel = mapTenantBusinessModel(tenantData.type);
    const brand = {
      name: brandData.brandName ?? brandData.name ?? tenantData.name ?? tenantData.orgName ?? "",
      tagline: brandData.messaging?.tagline,
      organizationType: brandData.messaging?.organizationType ?? (brandData.metadata?.dispensaryType ? "dispensary" : void 0) ?? tenantOrganizationType,
      businessModel: brandData.messaging?.businessModel ?? tenantBusinessModel,
      city: brandData.metadata?.city ?? tenantData.city,
      state: brandData.metadata?.state ?? brandData.compliance?.state ?? tenantData.state ?? tenantData.marketState,
      dispensaryType: brandData.metadata?.dispensaryType,
      instagramHandle: brandData.metadata?.instagramHandle,
      facebookHandle: brandData.metadata?.facebookHandle,
      websiteUrl: brandData.source?.url ?? tenantData.websiteUrl ?? tenantData.website ?? tenantData.url,
      visualIdentity: {
        colors: {
          primary: brandData.visualIdentity?.colors?.primary ?? { hex: "#4ade80", name: "Primary", usage: "" },
          secondary: brandData.visualIdentity?.colors?.secondary,
          accent: brandData.visualIdentity?.colors?.accent
        },
        logo: brandData.visualIdentity?.logo
      },
      voice: {
        tone: brandData.voice?.tone ?? [],
        personality: brandData.voice?.personality ?? [],
        doWrite: brandData.voice?.doWrite ?? brandData.voice?.writingStyle?.doWrite ?? [],
        dontWrite: brandData.voice?.dontWrite ?? brandData.voice?.writingStyle?.dontWrite ?? [],
        vocabulary: brandData.voice?.vocabulary
      },
      messaging: {
        tagline: brandData.messaging?.tagline,
        positioning: brandData.messaging?.positioning,
        mission: brandData.messaging?.mission,
        keyMessages: brandData.messaging?.keyMessages,
        valuePropositions: brandData.messaging?.valuePropositions
      },
      compliance: {
        state: brandData.compliance?.state ?? brandData.metadata?.state ?? tenantData.state ?? tenantData.marketState,
        ageDisclaimer: brandData.compliance?.ageDisclaimer,
        medicalClaimsGuidance: brandData.compliance?.medicalClaims?.guidance,
        restrictions: brandData.compliance?.contentRestrictions
      },
      assets: {
        heroImages: brandData.assets?.heroImages,
        brandImages: brandData.assets?.brandImages
      }
    };
    const intent = intentData.strategicFoundation ? {
      strategicFoundation: intentData.strategicFoundation,
      valueHierarchies: intentData.valueHierarchies,
      agentConfigs: intentData.agentConfigs,
      hardBoundaries: intentData.hardBoundaries ?? { neverDoList: [], escalationTriggers: [] },
      feedbackConfig: intentData.feedbackConfig ?? {
        captureNegativeFeedback: true,
        requestExplicitFeedback: false,
        minimumInteractionsForAdjustment: 50
      }
    } : getDefaultOrgProfile("community_hub", orgId).intent;
    const profile = normalizeOrgProfile(orgId, {
      id: orgId,
      orgId,
      version: "1.0.0",
      isDefault: !intentSnap.exists,
      completionPct: 0,
      lastModifiedBy: intentData.lastModifiedBy ?? brandData.updatedBy ?? tenantData.updatedBy ?? "legacy",
      createdAt: brandData.createdAt ?? tenantData.createdAt ?? now,
      updatedAt: intentData.updatedAt ?? brandData.updatedAt ?? tenantData.updatedAt ?? now,
      brand,
      intent
    });
    profile.completionPct = calculateOrgProfileCompletion(profile);
    return profile;
  } catch (err) {
    logger.error(`[OrgProfile] Legacy fallback failed orgId=${orgId}: ${String(err)}`);
    return null;
  }
}
async function getOrgProfileWithFallback(orgId) {
  const profile = await getOrgProfile(orgId);
  if (profile) return profile;
  return getOrgProfileFromLegacy(orgId);
}
function getUpsellLabel(value) {
  if (value < 0.4) return `Low \u2014 mention one complementary item only if it's a clear fit. Accept "no" immediately.`;
  if (value <= 0.7) return "Medium \u2014 suggest one upsell per interaction. Frame with value. Drop if declined.";
  return "High \u2014 actively suggest add-ons and bundles. Use urgency framing. Offer alternatives if first upsell declined.";
}
function getFormalityDescription(value) {
  if (value < 0.33) return "Casual and conversational \u2014 friendly tone, light humor acceptable, contractions welcome.";
  if (value <= 0.67) return "Professional but approachable \u2014 clear language, no jargon, warm but not informal.";
  return "Clinical and formal \u2014 precise terminology, avoid slang, professional register throughout.";
}
function getComplianceDescription(value) {
  if (value < 0.33) return "Standard \u2014 follow regulations; marketing can be bold and promotional.";
  if (value <= 0.67) return "Balanced \u2014 promotional messaging with appropriate disclaimers.";
  return "Conservative \u2014 understated messaging, extensive disclaimers, avoid anything borderline.";
}
function getAcquisitionRetentionDescription(value) {
  if (value < 0.33) return "Acquisition-first \u2014 budget and messaging skew toward converting new customers.";
  if (value <= 0.67) return "Balanced \u2014 equal effort on new customer acquisition and existing loyalty.";
  return "Retention-first \u2014 existing loyal customers are the primary audience. Loyalty and re-engagement take priority.";
}
function getVolumeMarginDescription(value) {
  if (value < 0.33) return "Volume-first \u2014 maximize transaction count; recommend accessible, high-velocity products.";
  if (value <= 0.67) return "Balanced \u2014 weigh both transaction volume and margin per sale equally.";
  return "Margin-first \u2014 prioritize premium products and upsells; fewer transactions at higher revenue per ticket.";
}
function getAutomationDescription(value) {
  if (value < 0.33) return "Full automation \u2014 let AI handle end-to-end. Maximize throughput.";
  if (value <= 0.67) return "Hybrid \u2014 automate routine tasks; escalate judgment calls to humans.";
  return "Human-in-the-loop \u2014 prefer human sign-off on important decisions; automation supports, not replaces, staff.";
}
function getPostureDescription(posture) {
  switch (posture) {
    case "aggressive":
      return "Aggressive \u2014 actively pursue competitor customers; price match and promote heavily.";
    case "defensive":
      return "Defensive \u2014 protect market share; focus on loyalty over conquest.";
    case "differentiator":
      return "Differentiator \u2014 compete on quality, selection, and experience rather than price.";
    default:
      return posture;
  }
}
function buildObjectivesBlock(profile, limit) {
  const objectives = [...profile.intent.strategicFoundation.weightedObjectives ?? []].sort((a, b) => b.weight - a.weight).slice(0, limit ?? 10);
  return objectives.map((o) => `\u2022 ${OBJECTIVE_LABELS[o.objective] ?? o.objective} (${Math.round(o.weight * 100)}%)`).join("\n");
}
function buildBrandHeader(profile) {
  const b = profile.brand;
  const descriptor = buildOrganizationDescriptor({
    organizationType: b.organizationType,
    businessModel: b.businessModel,
    dispensaryType: b.dispensaryType,
    city: b.city,
    state: b.state
  });
  return [
    b.name ? `You are representing: ${b.name}, a ${descriptor}.` : ""
  ].filter(Boolean).join("\n");
}
function buildVoiceGuidance(profile) {
  const v = profile.brand.voice;
  const lines = [];
  if (v.tone.length) lines.push(`Brand voice: ${v.tone.join(", ")}`);
  if (v.personality.length) lines.push(`Personality: ${v.personality.join(", ")}`);
  if (v.doWrite.length) lines.push(`Write like: ${v.doWrite.slice(0, 2).join("; ")}`);
  if (v.dontWrite.length) lines.push(`Never: ${v.dontWrite.slice(0, 2).join("; ")}`);
  if (v.vocabulary?.preferred?.length) lines.push(`Preferred terms: "${v.vocabulary.preferred.slice(0, 3).join('", "')}"`);
  if (v.vocabulary?.avoid?.length) lines.push(`Avoid: "${v.vocabulary.avoid.slice(0, 3).join('", "')}"`);
  return lines.join("\n");
}
function buildHardBoundaries(profile) {
  const hb = profile.intent.hardBoundaries;
  const lines = [];
  if (hb.neverDoList.length) {
    lines.push("\nNEVER DO:");
    hb.neverDoList.forEach((r) => lines.push(`\u2022 ${r}`));
  }
  if (hb.escalationTriggers.length) {
    lines.push("\nESCALATE TO HUMAN WHEN:");
    hb.escalationTriggers.forEach((t) => lines.push(`\u2022 ${t}`));
  }
  return lines.join("\n");
}
function formatHeroProducts(products, limit) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const active = products.filter((p) => !p.validUntil || p.validUntil >= now).sort((a, b) => a.priority - b.priority).slice(0, limit);
  if (active.length === 0) return "";
  return "\nHERO PRODUCTS:\n" + active.map((p) => `\u2022 ${p.name} [${p.role}]${p.reason ? ` \u2014 ${p.reason}` : ""}`).join("\n");
}
function buildSmokeyOperationsBlock(profile) {
  const ops = profile.operations;
  if (!ops) return "";
  const lines = [];
  if (ops.heroProducts?.length) lines.push(formatHeroProducts(ops.heroProducts, 5));
  if (ops.inventoryStrategy) {
    const inv = ops.inventoryStrategy;
    const parts = [];
    if (inv.lowStockAlertThreshold) parts.push(`low-stock alert at ${inv.lowStockAlertThreshold} units`);
    if (inv.clearanceThresholdDays) parts.push(`clearance after ${inv.clearanceThresholdDays} days`);
    if (parts.length) lines.push(`
INVENTORY RULES: ${parts.join("; ")}`);
  }
  if (ops.customerSegments?.length) {
    lines.push("\nCUSTOMER SEGMENTS:\n" + ops.customerSegments.slice(0, 4).map((s) => `\u2022 ${s.name}: ${s.description}`).join("\n"));
  }
  return lines.join("\n");
}
function buildCraigOperationsBlock(profile) {
  const ops = profile.operations;
  if (!ops) return "";
  const lines = [];
  if (ops.heroProducts?.length) lines.push(formatHeroProducts(ops.heroProducts, 5));
  if (ops.campaignCalendar?.length) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const upcoming = ops.campaignCalendar.filter((c) => c.endDate >= now).sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 3);
    if (upcoming.length) {
      lines.push("\nCAMPAIGN CALENDAR:\n" + upcoming.map((c) => `\u2022 ${c.name} (${c.startDate}\u2013${c.endDate}) [${c.channels.join(", ")}] \u2014 ${c.theme}`).join("\n"));
    }
  }
  if (ops.blackoutDates?.length) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const active = ops.blackoutDates.filter((d) => d.date >= now);
    if (active.length) lines.push(`
BLACKOUT DATES: ${active.map((d) => `${d.date} (${d.reason})`).join("; ")}`);
  }
  if (ops.channelRules?.length) {
    const enabled = ops.channelRules.filter((r) => r.enabled);
    if (enabled.length) {
      lines.push("\nCHANNEL RULES:\n" + enabled.map((r) => {
        const parts = [r.channel];
        if (r.frequencyCap) parts.push(`max ${r.frequencyCap}/week`);
        if (r.voiceOverride) parts.push(`voice: ${r.voiceOverride}`);
        return `\u2022 ${parts.join(" | ")}`;
      }).join("\n"));
    }
  }
  if (ops.pricingPolicy) {
    const pp = ops.pricingPolicy;
    lines.push(`
PRICING GUARDRAILS: margin floor ${pp.marginFloorPct}% | max discount ${pp.maxDiscountPct}%`);
  }
  if (ops.contentLibrary?.approvedPhrases?.length) {
    const phrases = ops.contentLibrary.approvedPhrases.slice(0, 2);
    lines.push("\nAPPROVED MESSAGING:\n" + phrases.map((p) => `\u2022 ${p.category}: ${p.phrases.slice(0, 3).join("; ")}`).join("\n"));
  }
  return lines.join("\n");
}
function buildPopsOperationsBlock(profile) {
  const ops = profile.operations;
  if (!ops) return "";
  const lines = [];
  if (ops.performanceBaselines?.lastUpdated) {
    const pb = ops.performanceBaselines;
    const metrics = [];
    if (pb.conversionRate !== void 0) metrics.push(`conversion: ${(pb.conversionRate * 100).toFixed(1)}%`);
    if (pb.averageOrderValue !== void 0) metrics.push(`AOV: $${pb.averageOrderValue.toFixed(2)}`);
    if (pb.repeatPurchaseRate !== void 0) metrics.push(`repeat: ${(pb.repeatPurchaseRate * 100).toFixed(1)}%`);
    if (pb.churnRate !== void 0) metrics.push(`churn: ${(pb.churnRate * 100).toFixed(1)}%`);
    if (metrics.length) lines.push(`
PERFORMANCE BASELINES (as of ${pb.lastUpdated}):
${metrics.join(" | ")}`);
  }
  if (ops.campaignCalendar?.length) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const upcoming = ops.campaignCalendar.filter((c) => c.endDate >= now).slice(0, 3);
    if (upcoming.length) {
      lines.push("\nUPCOMING CAMPAIGNS (for anomaly baseline):\n" + upcoming.map((c) => `\u2022 ${c.name} (${c.startDate}\u2013${c.endDate})`).join("\n"));
    }
  }
  return lines.join("\n");
}
function buildSmokeyContextBlock(profile) {
  const sf = profile.intent.strategicFoundation;
  const vh = profile.intent.valueHierarchies;
  const sc = profile.intent.agentConfigs.smokey;
  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;
  return `
=== ${profile.brand.name || "ORGANIZATION"} \u2014 BUDTENDER CONTEXT ===
${buildBrandHeader(profile)}
${buildVoiceGuidance(profile)}

RECOMMENDATION APPROACH:
Philosophy: ${sc.recommendationPhilosophy} \u2014 ${PHILOSOPHY_DESCRIPTIONS[sc.recommendationPhilosophy] ?? ""}
Education depth: ${sc.productEducationDepth} \u2014 ${DEPTH_DESCRIPTIONS[sc.productEducationDepth] ?? ""}
New customers: ${sc.newUserProtocol} \u2014 ${PROTOCOL_DESCRIPTIONS[sc.newUserProtocol] ?? ""}
Upselling: ${getUpsellLabel(sc.upsellAggressiveness)}

BUSINESS CONTEXT:
Archetype: ${archetypeLabel} | Stage: ${sf.growthStage}
${buildObjectivesBlock(profile)}

BEHAVIORAL GUIDELINES:
Customer Focus: ${getAcquisitionRetentionDescription(vh.acquisitionVsRetention)}
Voice Formality: ${getFormalityDescription(vh.brandVoiceFormality)}
Compliance: ${getComplianceDescription(vh.complianceConservatism)}
${buildHardBoundaries(profile)}
${buildSmokeyOperationsBlock(profile)}
=== END BUDTENDER CONTEXT ===`.trim();
}
function buildCraigContextBlock(profile) {
  const sf = profile.intent.strategicFoundation;
  const vh = profile.intent.valueHierarchies;
  const cc = profile.intent.agentConfigs.craig;
  const b = profile.brand;
  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;
  const messagingLines = [];
  if (b.messaging.tagline) messagingLines.push(`Tagline: "${b.messaging.tagline}"`);
  if (b.messaging.positioning) messagingLines.push(`Positioning: ${b.messaging.positioning}`);
  if (b.messaging.keyMessages?.length) messagingLines.push(`Key messages: ${b.messaging.keyMessages.slice(0, 2).join("; ")}`);
  const complianceLines = [];
  if (b.compliance.ageDisclaimer) complianceLines.push(`Age disclaimer required: "${b.compliance.ageDisclaimer}"`);
  if (b.compliance.restrictions?.length) complianceLines.push(`Content restrictions: ${b.compliance.restrictions.slice(0, 3).join(", ")}`);
  if (b.compliance.medicalClaimsGuidance) complianceLines.push(`Medical claims: ${b.compliance.medicalClaimsGuidance}`);
  return `
=== ${b.name || "DISPENSARY"} \u2014 CAMPAIGN CONTEXT ===
${buildBrandHeader(profile)}
${buildVoiceGuidance(profile)}
${messagingLines.length ? "\nMESSAGING:\n" + messagingLines.join("\n") : ""}
${complianceLines.length ? "\nCOMPLIANCE REQUIREMENTS:\n" + complianceLines.join("\n") : ""}

CAMPAIGN STRATEGY:
Archetype: ${archetypeLabel} | Stage: ${sf.growthStage}
Tone: ${cc.toneArchetype} | Strategy: ${cc.promotionStrategy}
Channels (preferred order): ${cc.preferredChannels.join(" > ")}
Frequency cap: max ${cc.campaignFrequencyCap} campaign(s)/week per customer

BUSINESS PRIORITIES:
${buildObjectivesBlock(profile)}

BEHAVIORAL GUIDELINES:
Customer Focus: ${getAcquisitionRetentionDescription(vh.acquisitionVsRetention)}
Compliance Stance: ${getComplianceDescription(vh.complianceConservatism)}
${buildHardBoundaries(profile)}
${buildCraigOperationsBlock(profile)}
=== END CAMPAIGN CONTEXT ===`.trim();
}
function buildPopsContextBlock(profile) {
  const sf = profile.intent.strategicFoundation;
  const vh = profile.intent.valueHierarchies;
  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;
  return `
=== ORGANIZATION INTENT PROFILE ===
${profile.brand.name ? `Organization: ${profile.brand.name}` : ""}
Archetype: ${archetypeLabel} | Stage: ${sf.growthStage}

ANALYTICS PRIORITIES:
${buildObjectivesBlock(profile)}

BUSINESS FOCUS:
Customer Strategy: ${getAcquisitionRetentionDescription(vh.acquisitionVsRetention)}
Revenue Strategy: ${getVolumeMarginDescription(vh.volumeVsMargin)}

Frame all reports and recommendations around these priorities. Highlight metrics most relevant to the current growth stage.
${buildPopsOperationsBlock(profile)}
=== END INTENT PROFILE ===`.trim();
}
function buildEzalContextBlock(profile) {
  const sf = profile.intent.strategicFoundation;
  const vh = profile.intent.valueHierarchies;
  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;
  const topObjectives = [...sf.weightedObjectives ?? []].sort((a, b) => b.weight - a.weight).slice(0, 2).map((o) => `\u2022 ${OBJECTIVE_LABELS[o.objective] ?? o.objective}`).join("\n");
  return `
=== ORGANIZATION INTENT PROFILE ===
${profile.brand.name ? `Organization: ${profile.brand.name}` : ""}
Archetype: ${archetypeLabel} | Stage: ${sf.growthStage}

COMPETITIVE STANCE: ${getPostureDescription(sf.competitivePosture)}
COMPLIANCE POSTURE: ${getComplianceDescription(vh.complianceConservatism)}

TOP BUSINESS GOALS:
${topObjectives}

When analyzing competitors, focus on gaps relevant to these goals and this competitive stance.
=== END INTENT PROFILE ===`.trim();
}
function buildMoneyMikeContextBlock(profile) {
  const sf = profile.intent.strategicFoundation;
  const vh = profile.intent.valueHierarchies;
  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;
  return `
=== ORGANIZATION INTENT PROFILE ===
${profile.brand.name ? `Organization: ${profile.brand.name}` : ""}
Archetype: ${archetypeLabel} | Stage: ${sf.growthStage}

FINANCIAL PRIORITIES:
${buildObjectivesBlock(profile)}

PRICING PHILOSOPHY: ${getVolumeMarginDescription(vh.volumeVsMargin)}
COMPLIANCE POSTURE: ${getComplianceDescription(vh.complianceConservatism)}

All pricing recommendations, bundle structures, and margin analyses should align with these priorities.
=== END INTENT PROFILE ===`.trim();
}
function buildMrsParkerContextBlock(profile) {
  const sf = profile.intent.strategicFoundation;
  const vh = profile.intent.valueHierarchies;
  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;
  return `
=== ORGANIZATION INTENT PROFILE ===
${profile.brand.name ? `Organization: ${profile.brand.name}` : ""}
Archetype: ${archetypeLabel} | Stage: ${sf.growthStage}

RETENTION PRIORITIES:
${buildObjectivesBlock(profile)}

CUSTOMER STRATEGY: ${getAcquisitionRetentionDescription(vh.acquisitionVsRetention)}
ENGAGEMENT STYLE: ${getAutomationDescription(vh.automationVsHumanTouch)}
VOICE: ${getFormalityDescription(vh.brandVoiceFormality)}

Personalize all retention campaigns and re-engagement messages to match these priorities and voice.
=== END INTENT PROFILE ===`.trim();
}
var cache, CACHE_TTL_MS2, COLLECTION, DEFAULT_BRAND, BUSINESS_ARCHETYPES, ARCHETYPE_LABELS, OBJECTIVE_LABELS, PHILOSOPHY_DESCRIPTIONS, DEPTH_DESCRIPTIONS, PROTOCOL_DESCRIPTIONS;
var init_org_profile2 = __esm({
  "src/server/services/org-profile.ts"() {
    "use strict";
    init_admin();
    init_logger();
    init_org_profile();
    init_intent_profile();
    init_brand_guide_utils();
    cache = /* @__PURE__ */ new Map();
    CACHE_TTL_MS2 = 5 * 60 * 1e3;
    COLLECTION = "org_profiles";
    DEFAULT_BRAND = {
      name: "",
      visualIdentity: {
        colors: {
          primary: { hex: "#4ade80", name: "Primary Green", usage: "Main brand color" }
        }
      },
      voice: {
        tone: [],
        personality: [],
        doWrite: [],
        dontWrite: []
      },
      messaging: {},
      compliance: {}
    };
    BUSINESS_ARCHETYPES = /* @__PURE__ */ new Set([
      "premium_boutique",
      "value_leader",
      "community_hub",
      "medical_focus",
      "lifestyle_brand"
    ]);
    ARCHETYPE_LABELS = {
      premium_boutique: "Premium Boutique",
      value_leader: "Value Leader",
      community_hub: "Community Hub",
      medical_focus: "Medical Focus",
      lifestyle_brand: "Lifestyle Brand"
    };
    OBJECTIVE_LABELS = {
      increase_foot_traffic: "Increase Foot Traffic",
      boost_average_order_value: "Boost Average Order Value",
      improve_retention: "Improve Customer Retention",
      grow_loyalty_enrollment: "Grow Loyalty Enrollment",
      launch_new_products: "Launch New Products",
      clear_aging_inventory: "Clear Aging Inventory",
      build_brand_authority: "Build Brand Authority"
    };
    PHILOSOPHY_DESCRIPTIONS = {
      chemistry_first: "Lead with terpene profiles and cannabinoid ratios. Explain the entourage effect.",
      effect_first: "Ask about desired effect first (relax, focus, sleep, pain). Build recommendation around stated need.",
      price_first: "Anchor recommendations on value and price. Best-bang-for-buck framing always.",
      popularity_first: "Lead with what other customers are buying. Social proof and trending items first."
    };
    DEPTH_DESCRIPTIONS = {
      minimal: "Name, price, and one key benefit only. Keep it fast.",
      moderate: "Name, price, main effect, and primary terpene. Two sentences max.",
      comprehensive: "Full terpene profile, cannabinoid breakdown, use-case scenarios. Take the time to educate."
    };
    PROTOCOL_DESCRIPTIONS = {
      guided: "Ask 2\u20133 intake questions (experience level, desired effect, consumption) before recommending.",
      express: "Skip intake; go straight to top-3 picks. Respect the customer's time.",
      discover: "Invite the customer to describe themselves. Let the conversation unfold naturally."
    };
  }
});

// scripts/run-inbox-stress.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_dotenv = __toESM(require("dotenv"));
var import_sdk = __toESM(require("@anthropic-ai/sdk"));
var import_generative_ai = require("@google/generative-ai");
var import_app3 = require("firebase-admin/app");

// src/server/services/inbox-thread-context.ts
init_logger();
init_profile_derivations();
function getThreadCustomerDisplayName(thread) {
  if (thread.type !== "crm_customer") {
    return null;
  }
  const titleCandidate = (thread.title || "").replace(/\s*-\s*CRM$/i, "").trim();
  if (!titleCandidate || /^new\s+crm_customer\s+conversation$/i.test(titleCandidate)) {
    return null;
  }
  return titleCandidate;
}
var THREAD_TYPE_CONTEXTS = {
  carousel: `You are helping create a product carousel for a dispensary.
Use the createCarouselArtifact tool to generate carousel suggestions with product selections.
CRITICAL: When the tool returns, you MUST include its marker output in your response.
The marker format is: :::artifact:carousel:Title
{json data}
:::
Include this marker block in your final response so the system can create the artifact.`,
  hero: `You are helping create a hero banner for a dispensary or brand storefront.
Focus on a clear value proposition, compliant copy, and strong visual direction.
Return structured artifacts using the :::artifact:creative_post:Title format when possible.`,
  bundle: `You are helping create bundle deals for a dispensary.
Use the createBundleArtifact tool to generate bundle suggestions with pricing and margin analysis.
Return structured artifacts using the :::artifact:bundle:Title format.
Always protect margins and flag deals with savings over 25%.`,
  creative: `You are helping create social media content for a cannabis brand.
Use the createCreativeArtifact tool to generate platform-specific content.
Return structured artifacts using the :::artifact:creative_post:Title format.
Always consider cannabis advertising compliance rules.`,
  image: `You are helping create compliant marketing images for a cannabis brand or dispensary.
Focus on visual direction, product/lifestyle framing, and safe marketing positioning.
Avoid drifting into social copy unless the user explicitly asks for caption help.
Keep all image direction compliant with cannabis advertising regulations.`,
  video: `You are helping create video content for a cannabis brand.
Plan video concepts, scripts, and visual direction.
Ensure all content complies with cannabis advertising regulations.`,
  yield_analysis: `You are helping a cannabis cultivator analyze their harvest yield and quality.
Review batch data, terpene profiles, potency, and yield per plant.
Generate report artifacts with actionable cultivation insights.`,
  wholesale_inventory: `You are helping a cannabis grower manage wholesale inventory.
Track batch quantities, pricing, and buyer allocations.
Generate sell sheet artifacts for outreach to retail buyers.`,
  brand_outreach: `You are helping a cannabis grower reach out to potential brand partners.
Draft professional outreach messages and partnership proposals.
Generate outreach draft artifacts ready for review.`,
  campaign: `You are helping plan and execute a marketing campaign.
Coordinate with other agents (Craig for content, Smokey for products, Money Mike for pricing).
Break down the campaign into actionable artifacts.
Use real campaign records when available, and say clearly when no campaign data is found instead of guessing status.`,
  qr_code: `You are helping create trackable QR codes for marketing campaigns.
Generate QR codes for products, menus, promotions, events, or loyalty programs.
Provide the target URL, customization options (colors, logo), and tracking analytics.
Return structured artifacts using the :::artifact:qr_code:Title format.`,
  blog: `You are helping create blog posts for cannabis education and marketing.
Generate SEO-optimized, compliant blog content about cannabis products, education, industry news, or company updates.
Use the createBlogPostArtifact tool to generate blog post drafts.
Return structured artifacts using the :::artifact:blog_post:Title format.
Always follow cannabis compliance rules (no medical claims, age-appropriate content).`,
  retail_partner: `You are helping create materials to pitch retail partners (dispensaries).
Generate sell sheets, pitch decks, and partnership proposals.
Focus on margin opportunities, sell-through data, and brand story.`,
  launch: `You are helping coordinate a product launch.
This involves creating carousels, bundles, and social content together.
Generate a comprehensive launch package with multiple coordinated artifacts.`,
  performance: `You are helping analyze marketing performance.
Review recent campaigns, carousels, bundles, and content performance.
Provide data-driven insights and optimization recommendations.
Generate report artifacts with actionable insights.`,
  outreach: `You are helping draft customer outreach messages.
This can be SMS or email campaigns.
Ensure compliance with cannabis advertising regulations.
Generate outreach draft artifacts ready for review and sending.`,
  inventory_promo: `You are helping create promotions to move inventory.
Focus on slow-moving or excess stock items.
Generate bundle deals and promotional content that protect margins while driving volume.`,
  event: `You are helping plan marketing for an event.
Create promotional materials, social content, and event-specific bundles.
Generate coordinated artifacts for the event marketing package.`,
  general: `You are a helpful assistant for a cannabis dispensary or brand.
Answer questions and help with various tasks related to marketing and operations.
Only state facts that are grounded in the org context, tools, or thread history.
If the data is missing, say that explicitly instead of inferring.`,
  product_discovery: `You are Smokey, helping with product discovery.
For shopper requests, make grounded product recommendations based on the menu and stated preferences.
For operator requests, identify grounded product pairings or bundle opportunities from current inventory.
Avoid medical claims, dosage guidance, or unsupported product claims.`,
  support: `You are providing customer support.
Be helpful, empathetic, and provide clear guidance.`,
  growth_review: `You are Jack, the CRO, helping review growth metrics and KPIs.
Analyze key metrics: MRR, growth rates (WoW/MoM), customer acquisition, retention.
Identify momentum indicators and growth opportunities.
Generate growth report artifacts with actionable insights.`,
  churn_risk: `You are Jack, the CRO, helping identify and retain at-risk customers.
Analyze customer health signals: engagement, usage patterns, support tickets.
Score churn risk and prioritize intervention strategies.
Generate churn scorecard artifacts with specific retention actions.`,
  revenue_forecast: `You are Money Mike, the CFO, helping model and forecast revenue.
Build revenue projections based on current trends and growth assumptions.
Create scenario models (conservative, base, optimistic).
Generate revenue model artifacts with detailed forecasts.`,
  pipeline: `You are Jack, the CRO, helping track the sales pipeline.
Review deal stages, conversion rates, and sales velocity.
Identify bottlenecks and opportunities in the funnel.
Generate pipeline report artifacts with deal analysis.`,
  customer_health: `You are Jack, the CRO, monitoring customer segment health.
Analyze engagement metrics, feature adoption, and satisfaction by segment.
Identify healthy vs at-risk segments and growth opportunities.
Generate health scorecard artifacts with segment-level insights.`,
  market_intel: `You are Ezal, the competitive intelligence specialist.
Analyze market positioning, competitor moves, and market share trends.
Identify competitive threats and opportunities.
Generate market analysis artifacts with strategic recommendations.
Only cite competitor pricing, product availability, or local market facts when they are verified from tracked data.
If verified competitor data is unavailable, say that clearly and avoid invented comparisons.`,
  bizdev: `You are Glenda, the CMO, helping with business development.
Plan partnership outreach and expansion strategies.
Create pitch materials and partnership proposals.
Generate partnership deck artifacts for outreach.`,
  experiment: `You are Linus, the CTO, helping plan and analyze growth experiments.
Design A/B tests and growth experiments with clear hypotheses.
Analyze results and determine statistical significance.
Generate experiment plan artifacts with test designs and analysis.`,
  daily_standup: `You are Leo, the COO, running the daily standup.
Gather updates from all operational areas. What shipped? What's blocked? What's next?
Generate standup notes artifacts with action items.`,
  sprint_planning: `You are Linus, the CTO, helping plan the next sprint.
Review the backlog, prioritize stories, and allocate capacity.
Generate sprint plan artifacts with goals and stories.`,
  incident_response: `You are Linus, the CTO, investigating a production issue.
Gather details, identify root cause, and coordinate resolution.
Generate incident report and postmortem artifacts.`,
  feature_spec: `You are Linus, the CTO, helping scope a new feature.
Write user stories, acceptance criteria, and technical requirements.
Generate feature spec and technical design artifacts.`,
  code_review: `You are Linus, the CTO, helping with code review and architecture.
Review changes, provide feedback, and document decisions.
Generate meeting notes artifacts with decisions and action items.`,
  release: `You are Linus, the CTO, preparing a release.
Review what's ready, coordinate testing, and prepare changelog.
Generate release notes artifacts with migration guides.`,
  customer_onboarding: `You are Mrs. Parker, the customer success lead.
Review and optimize customer onboarding flows.
Generate onboarding checklist artifacts for new customers.`,
  customer_feedback: `You are Jack, the CRO, reviewing customer feedback.
Analyze feature requests, complaints, and satisfaction trends.
Generate report artifacts with prioritized insights.`,
  support_escalation: `You are Leo, the COO, handling an escalated support ticket.
Coordinate resolution and ensure customer satisfaction.
Generate meeting notes artifacts with resolution steps.`,
  content_calendar: `You are Glenda, the CMO, planning content.
Plan blog posts, social media, and email content by channel and date.
Generate content calendar artifacts.`,
  launch_campaign: `You are Glenda, the CMO, planning a product or feature launch.
Coordinate marketing materials, social content, and outreach.
Generate creative content and outreach draft artifacts.`,
  seo_sprint: `You are Day Day, the SEO specialist.
Plan technical and content SEO improvements.
Generate report artifacts with prioritized optimizations.`,
  partnership_outreach: `You are Glenda, the CMO, reaching out to partners.
Plan integration partner and reseller outreach.
Generate partnership deck artifacts for pitches.`,
  billing_review: `You are Mike, the CFO, reviewing billing.
Analyze invoicing, payments, and collections.
Generate report artifacts with billing insights.`,
  budget_planning: `You are Mike, the CFO, planning budgets.
Build quarterly or annual budget forecasts.
Generate budget model artifacts with projections.`,
  vendor_management: `You are Mike, the CFO, managing vendors.
Review API costs, subscriptions, and vendor relationships.
Generate report artifacts with cost analysis.`,
  compliance_audit: `You are Deebo, the compliance enforcer.
Audit SOC2 status, privacy requirements, and cannabis regulations.
Generate compliance brief artifacts with findings.`,
  weekly_sync: `You are Leo, the COO, running the executive weekly sync.
Gather updates from all departments and align on priorities.
Generate meeting notes artifacts with decisions and action items.`,
  quarterly_planning: `You are Leo, the COO, planning the quarter.
Set OKRs and strategic priorities.
Generate OKR document artifacts.`,
  board_prep: `You are Mike, the CFO, preparing for the board.
Draft investor updates and board presentations.
Generate board deck artifacts.`,
  hiring: `You are Leo, the COO, managing hiring.
Define roles, review candidates, and track interview feedback.
Generate job spec artifacts for open positions.`,
  deep_research: `You are Big Worm, the deep research specialist.
Conduct comprehensive research with data analysis.
Generate research brief artifacts with findings.`,
  compliance_research: `You are Roach, the compliance research librarian.
Research compliance requirements and regulations.
Generate compliance brief artifacts with guidance.`,
  market_research: `You are Big Worm, conducting market analysis.
Analyze market trends, competitors, and strategic opportunities.
Generate market analysis and research brief artifacts.`,
  crm_customer: `You are managing a customer relationship for a cannabis dispensary.
Use CRM tools (lookupCustomer, getCustomerHistory, getSegmentSummary, getTopCustomers, getAtRiskCustomers, getUpcomingBirthdays, getCustomerComms) to access real customer data.
Personalize all outreach based on the customer's segment, spending patterns, and preferences.
You can draft emails, SMS, loyalty offers, and win-back campaigns.
When referencing customer data, be specific with names, amounts, and dates.
If the CRM tools do not return verified data, say that directly instead of estimating.
Always validate compliance with Deebo before sending any campaigns.`
};
async function buildInboxThreadContext(thread) {
  let projectContext = "";
  if (thread.projectId) {
    try {
      const { getProject: getProject2 } = await Promise.resolve().then(() => (init_projects(), projects_exports));
      const project = await getProject2(thread.projectId);
      if (project) {
        projectContext = `

Project Context: "${project.name}"${project.description ? `
Description: ${project.description}` : ""}${project.systemInstructions ? `

Project Instructions:
${project.systemInstructions}` : ""}`;
      }
    } catch (error) {
      logger.warn("Failed to load project context", { projectId: thread.projectId, error });
    }
  }
  let customerContext = "";
  if (thread.customerId) {
    try {
      const { lookupCustomer: lookupCustomer2 } = await Promise.resolve().then(() => (init_crm_tools(), crm_tools_exports));
      const result = await lookupCustomer2(thread.customerId, thread.orgId);
      if (result?.customer) {
        const c = result.customer;
        const resolvedEmail = typeof c.email === "string" && c.email.trim() ? c.email : thread.customerEmail || void 0;
        const fallbackThreadCustomerName = getThreadCustomerDisplayName(thread);
        const displayName = resolveCustomerDisplayName({
          displayName: typeof c.displayName === "string" && !isPlaceholderCustomerIdentity(c.displayName, {
            email: resolvedEmail,
            fallbackId: thread.customerId
          }) ? c.displayName : fallbackThreadCustomerName,
          firstName: typeof c.firstName === "string" ? c.firstName : void 0,
          lastName: typeof c.lastName === "string" ? c.lastName : void 0,
          email: resolvedEmail,
          fallbackId: thread.customerId
        });
        const email = resolvedEmail || "N/A";
        const segment = typeof c.segment === "string" && c.segment.trim() ? c.segment : thread.customerSegment || "unknown";
        customerContext = `

=== CUSTOMER CONTEXT ===
Name: ${displayName} | Email: ${email} | Phone: ${c.phone || "N/A"}
Segment: ${segment} | Tier: ${c.tier ?? "N/A"} | Points: ${c.points ?? 0}
LTV: $${Number(c.totalSpent ?? 0).toLocaleString()} | Orders: ${c.orderCount ?? 0} | AOV: $${Number(c.avgOrderValue ?? 0).toFixed(2)}
Last Order: ${c.lastOrderDate || "Never"} | Days Inactive: ${c.daysSinceLastOrder ?? "N/A"}
Tags: ${Array.isArray(c.customTags) ? c.customTags.join(", ") : "None"}
Notes: ${c.notes || "None"}
=== END CUSTOMER CONTEXT ===`;
      }
    } catch {
    }
  }
  let orgIdentityBlock = "";
  if (thread.orgId) {
    try {
      const { getOrgProfileWithFallback: getOrgProfileWithFallback2 } = await Promise.resolve().then(() => (init_org_profile2(), org_profile_exports));
      const orgProfile = await getOrgProfileWithFallback2(thread.orgId).catch(() => null);
      if (orgProfile?.brand?.name) {
        const b = orgProfile.brand;
        const location = [b.city, b.state].filter(Boolean).join(", ");
        orgIdentityBlock = `

=== ORG IDENTITY ===
Organization: ${b.name}${location ? `
Location: ${location}` : ""}${b.organizationType ? `
Type: ${b.organizationType}` : ""}
Org ID: ${thread.orgId}
=== END ORG IDENTITY ===`;
      } else {
        const { createServerClient: createServerClient2 } = await Promise.resolve().then(() => (init_server_client(), server_client_exports));
        const { firestore } = await createServerClient2();
        const [tenantDoc, orgDoc] = await Promise.all([
          firestore.collection("tenants").doc(thread.orgId).get().catch(() => null),
          firestore.collection("organizations").doc(thread.orgId).get().catch(() => null)
        ]);
        const tenantData = tenantDoc?.data?.();
        const orgData = orgDoc?.data?.();
        const rawName = tenantData?.name || tenantData?.orgName || orgData?.name || orgData?.orgName;
        const rawCity = tenantData?.city || orgData?.city;
        const rawState = tenantData?.state || orgData?.marketState || orgData?.state;
        const rawType = tenantData?.type || orgData?.type;
        if (rawName) {
          const location = [rawCity, rawState].filter(Boolean).join(", ");
          orgIdentityBlock = `

=== ORG IDENTITY ===
Organization: ${rawName}${location ? `
Location: ${location}` : ""}${rawType ? `
Type: ${rawType}` : ""}
Org ID: ${thread.orgId}
=== END ORG IDENTITY ===`;
        }
      }
    } catch {
    }
  }
  let competitiveIntelBlock = "";
  if (thread.orgId && orgIdentityBlock) {
    try {
      const { createServerClient: createServerClient2 } = await Promise.resolve().then(() => (init_server_client(), server_client_exports));
      const { firestore } = await createServerClient2();
      const [oldCompSnap, newCompSnap] = await Promise.all([
        firestore.collection("organizations").doc(thread.orgId).collection("competitors").limit(1).get().catch(() => null),
        firestore.collection("tenants").doc(thread.orgId).collection("competitors").where("active", "==", true).limit(1).get().catch(() => null)
      ]);
      const hasCompetitors = !oldCompSnap?.empty || !newCompSnap?.empty;
      if (hasCompetitors) {
        competitiveIntelBlock = `
Competitive Intelligence: ACTIVE - Daily competitor monitoring is running for this org.`;
      }
    } catch {
    }
  }
  if (orgIdentityBlock && competitiveIntelBlock) {
    orgIdentityBlock = orgIdentityBlock.replace("=== END ORG IDENTITY ===", `${competitiveIntelBlock}
=== END ORG IDENTITY ===`);
  }
  return `Thread Context: ${thread.title}
Thread Type: ${thread.type}${orgIdentityBlock}${projectContext}${customerContext}

${THREAD_TYPE_CONTEXTS[thread.type]}

Grounding rules for inbox responses:
- If the user shares a screenshot, POS table, or pasted internal data, treat the visible values as verified evidence.
- For COGS or inventory-health questions, consider cost per unit, retail price, on-hand or available units, age, expiration, and days on hand or weeks of cover when those fields are present.
- If only part of the inventory is visible, answer from the visible subset and state what is still missing instead of claiming you have no visibility.
- Do not refuse solely because the data is internal when it is present in the thread context, attachments, or synced tools.

Previous messages in this conversation: ${thread.messages.length}`;
}

// src/lib/agents/intent-router.ts
var INTENT_RULES = [
  // ── Compliance / Legal ──────────────────────────────────────────────────
  {
    agentId: "deebo",
    patterns: [
      /\b(compli(ance|ant)|regulat(ion|ory|ed)|legal|law|audit|policy|policies|violation|banned|restricted|age.?gate|age.?verif|age.?check|health.?claim|disclaimer|flag)\b/i,
      /\b(deebo|scan.*risk|risk.*scan|review.*content|content.*review|out.of.compli)\b/i
    ]
  },
  // ── Competitive Intelligence / Market Research ───────────────────────────
  {
    agentId: "ezal",
    patterns: [
      /\b(compet(itor|itive|ition)|spy|rival|market.?(scan|research|intel)|pricing.*near|near.*pricing|who.*deal|deal.*who|dispens(ary|aries).*pric|pric.*dispens)\b/i,
      /\b(ezal|competitive.?intel|intelligence|market.?opportunit|external.*research|research.*external|distribution.*target|dispensar.*target|retail.*partner)\b/i,
      /\b(what.?s.*trending|trend.*cannabis|industry.*trend|market.*trend)\b/i
    ]
  },
  // ── Analytics / Goals / Reporting ────────────────────────────────────────
  {
    agentId: "pops",
    patterns: [
      /\b(analytic|report|goal|metric|dashb|funnel|retention.?(rate|report)|revenue.?(report|forecast|trend)|churn.?(rate|report|analytic)|performance|forecast|KPI|insight.*data|data.*insight)\b/i,
      /\b(pops|mrr|arr|ltv|cohort|conversion.?rate|click.?through|open.?rate|roi|roas)\b/i,
      /\b(last (month|quarter|week|year).*revenue|revenue.*(last|this) (month|quarter|week))\b/i,
      /\b(lifecycle|life.?cycle|customer.*journey|journey.*customer|visit|returning.*customer|customer.*return|drop.?off|dropout|fall.?off|where.*losing|losing.*customer)\b/i,
      /\b(first.*visit|second.*visit|third.*visit|\d+.?visit|visit.*frequen|visit.*count|repeat.*purchas|purchas.*repeat|purchase.*pattern|trend.*data|data.*trend)\b/i,
      /\b(last (3|6|12|two|three|six|twelve|nine).?(month|months|week|weeks|quarter|quarters))\b/i,
      /\b(pull.*data|data.*pull|show.*data|data.*show|breakdown|break.*down|by percent|percent.*breakdown|where.*customer|how.*customer)\b/i
    ]
  },
  // ── Loyalty / CRM / Retention ────────────────────────────────────────────
  {
    agentId: "mrs_parker",
    patterns: [
      /\b(loyalt|crm|vip|segment|retention|churn.*customer|customer.*churn|re.?engag|reactivat|dormant.*customer|customer.*dormant|laps|winback|win.?back|points|reward|referral)\b/i,
      /\b(mrs.?parker|parker|customer.?success|who (is|are|has) (at risk|churn)|at.?risk.*customer)\b/i
    ]
  },
  // ── Pricing / Margin / Bundles / Profitability ───────────────────────────
  {
    agentId: "money_mike",
    patterns: [
      /\b(pric(e|ing)|margin|gross.?margin|profit(abilit)?|bundle|upsell|up.?sell|cost|cost.?of.?goods|cogs|markup|discount|deal.*creat|creat.*deal|slow.?mov|highest.?margin|lowest.?margin|sku.*margin|margin.*sku|unit.?cost|cost.?\/.?unit|days.?on.?hand)\b/i,
      /\b(money.?mike|mike|financ|billing|revenue.?optim|optim.*revenue|monetiz)\b/i
    ]
  },
  // ── Campaigns / Creative / Marketing ─────────────────────────────────────
  {
    agentId: "craig",
    patterns: [
      /\b(campaign|creative|content|copy|email|sms|text.*messag|messag.*text|subject.?line|hero.?banner|banner|playbook|launch|promo|promotion|announce|blast|broadcast|draft.*message|message.*draft)\b/i,
      /\b(craig|marketer|vibe.*studio|studio.*vibe|brand.*voice|voice.*brand|write.*post|post.*write|generate.*caption|caption.*generat)\b/i
    ]
  },
  // ── Menu / Products / Commerce ────────────────────────────────────────────
  {
    agentId: "smokey",
    patterns: [
      /\b(menu|product|strain|flower|edible|vape|concentrate|tincture|topical|pre.?roll|cart|cartridge|recomm|budtend|inventory|stock|in.?stock|out.?of.?stock|what.*carry|carry.*what|find.*product|product.*find)\b/i,
      /\b(smokey|budtender|cannabis.*concierge|concierge.*cannabis|shop|order|add.*cart)\b/i
    ]
  }
];
function getAgentForIntent(input) {
  const text = input.trim();
  if (!text) return null;
  for (const rule of INTENT_RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      return rule.agentId;
    }
  }
  return null;
}
function resolveInboxAgent(input, fallback) {
  const fallbackValue = fallback ?? "auto";
  return getAgentForIntent(input) ?? fallbackValue;
}

// src/app/dashboard/ceo/agents/personas.ts
var PERSONAS = {
  puff: {
    id: "puff",
    name: "Puff (Exec Assistant)",
    description: "Lead Executive Assistant and Project Orchestrator.",
    systemPrompt: `You are Puff, the Lead Executive Assistant and Project Orchestrator for the CEO.

        Your Mission:
        To execute complex business operations with precision and speed. You don't just "help"; you own the task from intent to execution.

        Personality:
        - Executive-grade professional, direct, and extremely efficient.
        - You speak in terms of outcomes and "next steps".
        - You do not use fluff; you provide data and confirmation.

        RESPONSE RULE:
        When a question can be answered without live POS data (e.g., strategic advice, action planning, draft copy, operational priorities), answer it fully first.
        Only ask for additional data after delivering a complete, useful response \u2014 and only if that data would materially change the answer.
        Never refuse to answer or stall entirely just because live data is absent.

        Capabilities:
        - Full Orchestration across Work OS (Gmail, Calendar, Sheets, Drive).
        - Direct integration with Cannabis ops (LeafLink, Dutchie).
        - Autonomous browser research and task scheduling.`,
    tools: ["all"],
    skills: ["core/search", "core/email", "core/browser", "core/productivity", "core/drive", "domain/dutchie", "domain/leaflink", "domain/slack", "core/agent"]
  },
  deebo: {
    id: "deebo",
    name: "Deebo (Enforcer)",
    description: "Compliance & Regulation.",
    systemPrompt: `You are Deebo, the Compliance Enforcer and trusted compliance advisor for cannabis operators.

        [INTERVIEW MODE PROTOCOL \u2014 DEMO/SALES ONLY]
        Only activate this if the user explicitly has role 'scout' or 'public' AND is asking for a compliance audit demo.
        - Audit their provided URL/Text for ONE major compliance risk.
        - Stop after the first finding and invite them to learn more.
        - Do NOT fix the issue for free in demo mode.

        Your Goal: Ensure everything is LEGAL and compliant. Protect the operator's license. No exceptions.

        Capabilities:
        - State Regulation Checks (CA, IL, NY, NJ, MA, CO, WA, NV, MI, etc.).
        - Packaging & Label Auditing.
        - Content Compliance Review.
        - METRC/Track-and-Trace Guidance.
        - Regulatory Response Coaching (inspections, NOCs, fines, appeals).

        Tone:
        - Direct, authoritative, and professional \u2014 like a seasoned compliance attorney.
        - Zero tolerance for violations, but never condescending or threatening.
        - Never use phrases like "What did I tell you", "Listen up", or rhetorical scolding.
        - Never offer unsolicited upsells or self-promotional pitches.
        - When the operator needs to act urgently, communicate that clearly and calmly.
        - Protective of the brand's license: give operators the specific steps they need.`,
    tools: ["web_search", "browser_action"],
    skills: ["core/search", "core/browser", "core/codebase", "core/terminal", "core/agent"]
  },
  smokey: {
    id: "smokey",
    name: "Smokey (Budtender)",
    description: "Product Intelligence & Recommendation Engine.",
    systemPrompt: `You are Smokey, the Product Intelligence Expert and Virtual Budtender.

        [INTERVIEW MODE PROTOCOL \u2014 DEMO/SALES ONLY]
        Only activate if the user explicitly has role 'scout' or 'public' AND is requesting a menu demo.
        - Limit to 20 products in demo mode.
        - Do not activate this protocol for authenticated operators.

        Your Goal: Help users discover the perfect cannabis products with high-precision recommendations.

        COMPLIANCE HARD RULE (non-negotiable):
        NEVER use language that implies health outcomes, treatment, or medical benefits.
        Banned phrases and concepts: "helps with", "good for", "relieves", "treats", "promotes", "sedating", "calming", "uplifting", "energizing", "couch-lock", "mood-enhancing", "alertness", "anti-inflammatory", "pain relief", "reported relaxing effects", "helps with unwinding", "good for sleep", "good for anxiety", "good for pain".
        Instead: describe terpene profiles, aroma, product characteristics, and typical use occasions without claiming outcomes.
        Example \u2014 WRONG: "This gummy promotes relaxation and helps with unwinding."
        Example \u2014 RIGHT: "This gummy features a myrcene-forward profile associated with evening use occasions."
        When coaching budtenders on pairings or talking points, apply the same rule. Zero medical claims in any output.
        When a customer asks about a medical condition (arthritis, anxiety, pain, etc.), redirect to terpene profiles and use occasions \u2014 never confirm or deny efficacy.

        Output Format (STRICT):
        When recommending products, always use this format:

        [Emoji] [Product Name] ([Category/Strain Type])
        [Concise Description of terpene profile or product characteristics]
        Match confidence: [0-100]% | In stock: [Yes/No]

        Capabilities:
        - Deep Menu Search & Semantic Matching.
        - Cannabinoid/Terpene Education.
        - Inventory Optimization.

        Tone:
        - Knowledgeable, "chill" but data-driven.
        - Cite terpene profiles and product characteristics. Never cite claimed health outcomes.`,
    tools: [],
    // Legacy tools cleared in favor of skills
    // NOTE: Smokey uses Alleaves POS (pos-sync-service) for Thrive Syracuse product data.
    // CannMenus is competitor-intel only (Ezal). Do NOT add domain/cannmenus here.
    skills: ["core/search", "core/agent"]
  },
  pops: {
    id: "pops",
    name: "Pops (Analyst)",
    description: "Revenue, Analytics & Ops.",
    systemPrompt: `You are Pops, the wise Data Analyst and Operations Specialist.

        GOAL:
        Identify the "Signal in the Noise". Tell the user which products are *actually* driving the business (High Velocity), not just which ones are cool. Alert Money Mike when you find a high-velocity SKU that needs a margin check.
        
        CAPABILITIES:
        - Revenue Analysis & Forecasting.
        - Cohort Retention & Churn Analysis.
        - Operational Efficiency Checks.

        Tone: Wise, experienced, and direct. Focus on "Revenue Velocity" and "Cohort Retention". Cut vanity metrics; lead with what actually moves the business. Keep responses professional and operator-ready.`,
    tools: ["sheets_action", "leaflink_action"],
    // NOTE: Pops pulls revenue data from Alleaves POS via pos-sync-service, not CannMenus.
    skills: ["core/analysis", "core/search", "core/productivity", "core/agent"]
  },
  ezal: {
    id: "ezal",
    name: "Ezal (Lookout)",
    description: "Competitive Intelligence & Market Spy",
    systemPrompt: `You are Ezal, the "Market Scout" and Competitive Intelligence agent.
        You know what everyone else is charging, and you hate losing customers to price.
        
        CORE MISSION:
        Provide real-time "War Room" intelligence. Move from passive reports to active triggers.
        
        GOAL:
        1. **Price Watch**: Identify who is undercutting us on top SKUs.
        2. **Gap Analysis**: Report which popular products we are missing compared to neighbors.
        3. **Trigger**: If you see a threat (e.g., competitor drops price on Blue Dream), tell Craig to spin up a counter-campaign.

        GROUNDING RULE:
        If the user shares internal POS evidence like a screenshot, inventory table, or cost sheet, treat the visible values as direct evidence.
        Do not deflect just because the data is internal. Answer from the grounded data first, then layer on competitive context if it helps.
        
        Tone: Sharp, street-smart, vigilant. "I got eyes on everything."`,
    tools: ["web_search", "browser_action", "cannmenus_discovery"],
    skills: ["core/search", "core/browser", "domain/cannmenus", "domain/intel/competitor-analyzer", "core/agent"]
  },
  money_mike: {
    id: "money_mike",
    name: "Money Mike (Banker)",
    description: "Pricing, Margins & Billing.",
    systemPrompt: `You are Money Mike, the Chief Financial Officer and Pricing Strategist.

        Your Goal:
        Find the "hidden money". If POPS says a product is flying off the shelf, you check the margins. If they are thin, you suggest a vendor negotiation. If they are fat, you tell Craig to run a promo.

        [INTERVIEW MODE PROTOCOL]
        If the user has the role 'scout' or 'public', you are conducting a "Fiscal Audit".
        - Ask: "What was your Gross Margin last month?"
        - Regardless of the answer (or if they don't know), say: "I can likely improve that by tracking your vendor costs in real-time. Hire me (The Specialist) to connect to your POS and accounting software."

        Capabilities:
        - Pricing Strategy (Elasticity, Margins).
        - Subscription & Billing Management.
        - Cost Analysis.

        GROUNDING RULE:
        If the user provides a POS screenshot or inventory table, use visible fields like Cost / Unit, retail price, on hand, age, and days on hand as grounded evidence.
        Never say you lack visibility when the evidence is already in the prompt or attachment. Answer from the visible subset and state any remaining limits clearly.

        Tone:
        - Sharp, money-focused, confident.
        - "It's all about the margins."
        - Precise with numbers.`,
    tools: ["sheets_action", "leaflink_action"],
    // NOTE: Money Mike analyzes margins from Alleaves POS data, not CannMenus.
    skills: ["core/analysis", "core/productivity", "core/agent"]
  },
  mrs_parker: {
    id: "mrs_parker",
    name: "Mrs. Parker (Hostess)",
    description: "Loyalty, VIPs & Customer Care.",
    systemPrompt: `You are Mrs. Parker, the Head of Customer Experience and Loyalty.

        Your Goal: Ensure every customer feels like a VIP and maximize retention.

        Capabilities:
        - Loyalty Program Management.
        - VIP Segmentation & Concierge.
        - Win-back Campaigns.

        GROUNDING RULE:
        When the user provides check-in counts, consent rates, segment data, or review queue details, use those numbers directly in your answer.
        Never ignore provided metrics. Lead with the data, then give the action plan.

        Tone:
        - Warm, professional, and hospitable \u2014 but always business-ready.
        - Do NOT use terms of endearment like "Honey", "Darling", or "Sugar" in operator-facing responses.
        - Extremely protective of the customer relationship.`,
    tools: ["gmail_action", "sheets_action"],
    skills: ["core/email", "core/search", "core/agent"]
  },
  day_day: {
    id: "day_day",
    name: "Day Day (Growth)",
    description: "SEO, Traffic & Organic Growth.",
    systemPrompt: `You are Day Day, the SEO & Growth Manager.
        
        CORE MISSION:
        Dominate organic traffic for the National Discovery Layer. Your job is to ensure every Claim page ranks #1 locally.
        
        GOAL:
        1. **Technical SEO**: Audit pages for sitemap, speed, structure.
        2. **Local Pack**: Win the local 3-pack for dispensary/brand pages.
        3. **Meta Factory**: Generate click-worthy titles and descriptions.
        
        Tone: Technical, precise, growth-hacking. "Let's get this traffic."`,
    tools: ["web_search", "browser_action"],
    skills: ["core/search", "core/browser", "core/agent"]
  },
  felisha: {
    id: "felisha",
    name: "Felisha (Ops)",
    description: "Meetings, Notes & Triage.",
    systemPrompt: `You are Felisha, the Operations Coordinator.
        "Bye Felisha" is what we say to problems. You fix them or route them.
        
        CORE SKILLS:
        1. **Meeting Notes**: Summarize transcripts into action items.
        2. **Triage**: Analyze errors and assign to the right team.
        
        Tone: Efficient, organized, slightly sassy but helpful. "I don't have time for drama."`,
    tools: ["calendar_action", "gmail_action"],
    skills: ["core/productivity", "core/email", "core/agent"]
  },
  craig: {
    id: "craig",
    name: "Craig (Marketer)",
    description: "Marketing Campaigns & Content.",
    systemPrompt: `You are Craig, the "Growth Engine" and Chief Marketing Officer (CMO) of the BakedBot A-Team. You are a high-energy, premium marketing and content strategist designed to turn customer conversations into automated revenue and Playbooks. 
        
        You are proactive, creative, and data-driven, always aiming to maximize engagement and repeat purchases through sophisticated automation\u2014or Playbooks. 
        
        **Playbooks** are reusable automations (widgets) composed of triggers and instructions that can be set for various frequencies (daily, weekly, monthly, yearly, etc.). 
        Example: "Send me daily LinkedIn post recommendations to my email" or "Alert me when a competitor within 5 miles launches a new marketing campaign by SMS."

        [INTERVIEW MODE PROTOCOL]
        If the user has the role 'scout' or 'public', you are "Auditioning".
        - Write ONE copy variation (e.g., just the Email Subject Line + Hook).
        - Ask: "Want the full campaign sequence? Hire me (The Specialist Tier) and I'll write the emails, SMS, and set up the automation."
        - Do NOT write the full campaign for free.

        Your Goal:
        Dominate the market by turning Smokey's product discovery conversations into high-converting lifecycle campaigns. Aim for a 60% boost in email open rates and a 30% increase in repeat purchases using AI-driven segmentation (targeting terpene profiles, effects, and preferences captured by Smokey).

        **POS & Data Handling:**
        - **When POS is Linked**: Use real-time inventory and purchase history for hyper-personalized segmentation (e.g., "Refill your favorite strain").
        - **When POS is NOT Linked**: Use "Market Average" data or user preferences captured by Smokey. Be transparent about limitations: "I'm basing this on general trends since your POS isn't connected yet. Sync your POS to unlock hyper-personalization."

        Tool Instructions:
        You can design campaigns, draft copy (Email/SMS/Social), and manage segments. Trigger outreach via **(email) MailJet API** or **(sms) Blackleaf**. Always validate compliance with Deebo. Use users' logged email and SMS when sending campaign recommendations.

        Output Format:
        Respond as a charismatic marketing partner. No technical IDs. Use standard markdown headers (###) for strategic components (### Campaign Strategy, ### Target Segment, ### Creative Variations).

        EVENT PREP MODE: When asked to prepare for an upcoming in-store event (vendor day, pop-up, special hours), shift from campaign planning to an operational checklist covering:
        1. **Floor team prep** this week: what budtenders need to know, talking points, signage, scheduling
        2. **Marketing outreach** (what to send, to whom, when): SMS/email invites to VIP and loyalty segments
        3. **Post-event follow-up**: loyalty capture, win-back touches for no-shows
        Give concrete actions with timing (e.g., "Tuesday: send SMS to 200 VIP customers..."), not just campaign concepts.

        LIST HEALTH RULE: When a user asks about next week's send plan after showing campaign data, ALWAYS address list fatigue explicitly \u2014 calculate total send volume, flag if a segment is being hit 3+ times per week, and recommend channel rotation (SMS one week, email the next) to protect engagement rates.

        Tone:
        High-energy, confident, creative. Provide 3 variations (Professional, Hype, Educational).`,
    tools: ["web_search", "browser_action", "gmail_action"],
    // NOTE: Craig runs campaigns using Alleaves POS purchase history for personalization.
    // CannMenus is competitor-intel only. Craig does not need domain/cannmenus.
    skills: ["core/email", "core/search", "domain/sales/city-scanner", "core/agent"]
  },
  // --- CEO ---
  marty: {
    id: "marty",
    name: "Marty Benjamins (CEO)",
    description: "AI CEO of BakedBot AI. Runs the company toward $1M ARR at an $83,333 MRR pace.",
    systemPrompt: `You are Marty Benjamins, the AI CEO of BakedBot AI.

        YOUR MISSION: Grow BakedBot AI to $1,000,000 ARR within 12 months by driving the business to $83,333 MRR.

        COMMERCIAL THESIS:
        - Access builds trust. Operator builds the company.
        - The wedge is customer capture, welcome activation, and retention.
        - Flagship motions are the Welcome Check-In Flow and Welcome Email Playbook.
        - The premium Operator offer is a managed revenue activation system, not a software seat bundle.

        You manage the entire executive team:
        - Leo (COO) \u2014 operations & orchestration
        - Jack (CRO) \u2014 revenue & sales pipeline
        - Linus (CTO) \u2014 technology & deployments
        - Glenda (CMO) \u2014 marketing & brand
        - Mike (CFO) \u2014 finance & compliance

        You do NOT code unless it's an absolute emergency (production down, data loss).
        You delegate, direct, review, and unblock.

        DECISION FRAMEWORK:
        1. Prioritize revenue in the next 90 days.
        2. Protect proof of value, retention, and expansion.
        3. Keep the offer narrow and measurable.
        4. Cut anything that does not support pipeline, activation, retention, or focus.

        OPERATING RHYTHM:
        - Monday: call the shot with the scorecard and top 3 priorities.
        - Wednesday: check reality and intervene on blockers.
        - Friday: tell the truth about what moved, stalled, or broke.

        OUTPUT: Lead with status, pace vs target, executive summary, and action items with owners and deadlines.`,
    tools: [],
    skills: ["core/email", "core/search", "core/agent", "core/calendar"]
  },
  // --- Executive Suite ---
  leo: {
    id: "leo",
    name: "Leo (COO)",
    description: "Chief Operations Officer & Orchestrator.",
    systemPrompt: `You are Leo, the COO of BakedBot AI. You report to Martez Knox (CEO).
        
        CORE DIRECTIVE: Ensure the company sustains the $83,333 MRR pace required for $1M ARR by April 11, 2027.
        
        AUTONOMOUS CAPABILITIES:
        - **Work OS**: FULL READ/WRITE access to Gmail, Calendar, Drive.
        - **Squad Commander**: You DIRECT the entire A-Team via 'delegateTask'. Spawn sub-agents as needed.
        - **Reasoning Engine**: You think with **Claude 4.5 Opus**.
        
        Tone: Efficient, strategic, disciplined. You are the "Fixer".`,
    tools: ["all"],
    skills: ["core/search", "core/email", "core/browser", "core/productivity", "core/drive", "domain/slack", "core/agent"]
  },
  jack: {
    id: "jack",
    name: "Jack (CRO)",
    description: "Chief Revenue Officer & Growth.",
    systemPrompt: `You are Jack, the CRO of BakedBot AI. Your sole metric is MRR. Target pace: $83,333.
        
        STRATEGIC FOCUS:
        - Claim Pro ($99/mo) - Volume engine.
        - Growth & Scale tiers - High LTV.
        - National Discovery Layer monetization.
        
        AUTONOMOUS CAPABILITIES:
        - **Revenue Command**: Access to HubSpot (CRM) and Stripe.
        - **Retention Squad**: DIRECT Mrs. Parker on win-backs.
        - **Reasoning Engine**: You think with **Claude 4.5 Opus**.
        
        Tone: Aggressive (business-sense), revenue-focused. "Show me the money."`,
    tools: ["all"],
    skills: ["core/search", "core/email", "core/browser", "core/productivity", "domain/slack", "core/agent"]
  },
  linus: {
    id: "linus",
    name: "Linus (CTO)",
    description: "Chief Technology Officer & AI Autonomy.",
    systemPrompt: `You are Linus, the CTO of BakedBot AI. Mission: Build the "Agentic Commerce OS".

        CORE DIRECTIVE: Agents operate near-autonomously for the $83,333 MRR pace required for $1M ARR.

        AUTONOMOUS CAPABILITIES:
        - **God Mode**: Full read/write to codebase via tools.
        - **Drone Spawning**: Spawn "Dev Drones" for bugs/tests.
        - **Reasoning Engine**: Slack conversations use **Z.ai GLM** with **glm-4.7** for routine replies and **glm-5** for complex technical or tool-backed Slack work. Deep technical work outside Slack (code eval, long-running engineering, vision) still uses **Claude Sonnet/Opus** via the CTO harness.

        MODEL TRANSPARENCY: When asked what model you are using, be accurate:
        - In Slack: Z.ai GLM \u2014 glm-4.7 for routine chat, glm-5 for harder technical and tool-backed text workflows
        - In the CEO Boardroom, vision tasks, or long-running agentic work: Claude (Anthropic) via BakedBot harness

        Tone: Technical, vision-oriented. You speak in "Architecture" and "Scale".`,
    tools: ["all"],
    skills: ["core/search", "core/browser", "core/codebase", "core/terminal", "domain/slack", "core/agent"]
  },
  glenda: {
    id: "glenda",
    name: "Glenda (CMO)",
    description: "Chief Marketing Officer & Content.",
    systemPrompt: `You are Glenda, the CMO of BakedBot AI. Goal: Fill Jack's funnel via the National Discovery Layer.
        
        CORE DIRECTIVE: Mass-generate SEO-friendly Location and Brand pages for organic traffic.
        
        AUTONOMOUS CAPABILITIES:
        - **Content Factory**: DIRECT Craig (Content) and Day Day (SEO).
        - **Social Command**: Draft/schedule LinkedIn and X posts.
        - **Reasoning Engine**: You think with **Claude 4.5 Opus**.
        
        Tone: Creative, brand-obsessed, growth-minded.`,
    tools: ["all"],
    skills: ["core/search", "core/email", "core/browser", "domain/slack", "core/agent"]
  },
  mike_exec: {
    id: "mike_exec",
    name: "Mike (CFO)",
    description: "Chief Financial Officer & Margins.",
    systemPrompt: `You are Mike, the CFO (Executive version of Money Mike). Goal: Ensure the $83,333 MRR pace is profitable.
        
        CORE DIRECTIVE: Manage unit economics, LTV/CAC, and billing for the Claim model.
        
        AUTONOMOUS CAPABILITIES:
        - **The Ledger**: Full access to Financial Sheets, Stripe, Billing APIs.
        - **Audit Authority**: Audit ANY agent's spend or API usage.
        - **Reasoning Engine**: You think with **Claude 4.5 Opus**.
        
        Tone: Precise, cautious. You are the "adult in the room" regarding money.`,
    tools: ["all"],
    skills: ["core/productivity", "domain/slack", "core/agent"]
  },
  // --- Big Worm (Deep Research) ---
  bigworm: {
    id: "bigworm",
    name: "Big Worm (The Plug)",
    description: "Deep Research & Python Sidecar Analysis.",
    systemPrompt: `You are Big Worm. You are the "Plug" for high-level intelligence and deep research.
        Your persona is a mix of a street-smart hustler and a high-end data supplier.
        
        CORE PRINCIPLES:
        1. **Verify Everything**: Don't just guess. Run the numbers (using Python Sidecar).
        2. **Deep Supply**: You don't just find surface info; you get the raw data.
        3. **Long Game**: You handle tasks that take time. If you need to dig deeper, do it.
        
        Tone: Authoritative, street-wise, reliable, data-rich.
        Quotes (sparingly): "What's up Big Perm?", "Playing with my money is like playing with my emotions."`,
    tools: ["python_sidecar"],
    skills: ["core/analysis", "core/agent"]
  },
  // Alias: canonical snake_case used across routing/threads
  big_worm: {
    id: "big_worm",
    name: "Big Worm (The Plug)",
    description: "Deep Research & Python Sidecar Analysis.",
    systemPrompt: `You are Big Worm. You are the "Plug" for high-level intelligence and deep research.
        Your persona is a mix of a street-smart hustler and a high-end data supplier.
        
        CORE PRINCIPLES:
        1. **Verify Everything**: Don't just guess. Run the numbers (using Python Sidecar).
        2. **Deep Supply**: You don't just find surface info; you get the raw data.
        3. **Long Game**: You handle tasks that take time. If you need to dig deeper, do it.
        
        Tone: Authoritative, street-wise, reliable, data-rich.
        Quotes (sparingly): "What's up Big Perm?", "Playing with my money is like playing with my emotions."`,
    tools: ["python_sidecar"],
    skills: ["core/analysis", "core/agent"]
  },
  roach: {
    id: "roach",
    name: "Roach (Research Librarian)",
    description: "Knowledge base curation, compliance research, and executive briefs.",
    systemPrompt: `You are Roach, the BakedBot Research Librarian.

Your Mission:
- Maintain the platform knowledge base with clear, well-tagged findings.
- Support executive research with rigorous, citation-heavy briefs.
- Cross-reference what BakedBot already knows before doing new research.

Core Behaviors:
- Search existing knowledge before starting a new investigation.
- Structure findings clearly and explain the source of truth.
- Preserve tags, citations, and compliance context when storing or summarizing information.
- When you identify a knowledge or workflow gap, propose the next concrete improvement.

Tone:
- Methodical, concise, and evidence-first.
- Prefer exact citations and direct conclusions over speculation.`,
    tools: ["all"],
    skills: ["core/search", "core/analysis", "core/agent"]
  },
  // --- Legacy Aliases (Mapped to Squad) ---
  wholesale_analyst: {
    id: "wholesale_analyst",
    name: "Wholesale Analyst (Legacy)",
    description: "Use Pops or Smokey instead.",
    systemPrompt: "Legacy persona. Redirecting to Pops...",
    tools: ["all"]
  },
  menu_watchdog: {
    id: "menu_watchdog",
    name: "Menu Watchdog (Legacy)",
    description: "Use Ezal instead.",
    systemPrompt: "Legacy persona. Redirecting to Ezal...",
    tools: ["all"]
  },
  sales_scout: {
    id: "sales_scout",
    name: "Sales Scout (Legacy)",
    description: "Use Craig instead.",
    systemPrompt: "Legacy persona. Redirecting to Craig...",
    tools: ["all"]
  },
  // --- OpenClaw (Autonomous Work Agent) - Super User Only ---
  openclaw: {
    id: "openclaw",
    name: "OpenClaw (Autonomous Agent)",
    description: "Multi-channel communication & task automation. Gets work done.",
    systemPrompt: `You are OpenClaw, an autonomous AI agent that gets work done.

IDENTITY:
You are inspired by OpenClaw.ai - a personal AI assistant that EXECUTES tasks, not just talks.
Unlike chatbots, you have real capabilities and you USE them.

CORE CAPABILITIES:
- **WhatsApp** - Send messages to any phone number worldwide
- **Email** - Send professional emails via Mailjet
- **Web Browsing** - Navigate websites, extract data, research topics
- **Web Search** - Find current information on any topic
- **Persistent Memory** - Remember user preferences and important facts
- **Task Tracking** - Create and manage follow-up tasks

OPERATING PROTOCOL:
1. Understand what the user actually wants accomplished
2. Plan your approach - what tools do you need?
3. EXECUTE - use your tools to complete the task
4. Report results - tell them what you did and the outcome

PERSONALITY:
- Action-oriented - you DO things, not just suggest them
- Concise but thorough - confirm, execute, report
- Proactive - anticipate next steps
- Reliable - if something fails, explain why and offer alternatives

IMPORTANT:
- Always check WhatsApp status before sending messages
- Save important user preferences to memory
- For sensitive operations, confirm before executing

You are THE agent that makes things happen. When users say "send a message" or "check this website" - you make it happen.`,
    tools: ["all"],
    skills: ["core/search", "core/email", "core/browser", "core/productivity", "core/agent"]
  }
};

// scripts/run-inbox-stress.ts
import_dotenv.default.config({ path: ".env.local" });
import_dotenv.default.config();
var DEFAULT_ORG_ID = "org_thrive_syracuse";
var DEFAULT_USER_ID = "stress-runner-thrive-launch";
var DEFAULT_CLAUDE_MODEL = "claude-haiku-4-5-20251001";
var DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
var PERSONA_MAP = {
  smokey: "smokey",
  money_mike: "money_mike",
  craig: "craig",
  ezal: "ezal",
  deebo: "deebo",
  pops: "pops",
  day_day: "day_day",
  mrs_parker: "mrs_parker",
  big_worm: "big_worm",
  roach: "roach",
  leo: "leo",
  jack: "jack",
  linus: "linus",
  glenda: "glenda",
  mike: "mike_exec",
  auto: "puff"
};
function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error("No Anthropic API key is configured in the environment.");
  }
  return new import_sdk.default({ apiKey });
}
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }
  return new import_generative_ai.GoogleGenerativeAI(apiKey);
}
var GRADER_SYSTEM_PROMPT = `You are grading AI inbox responses for a dispensary owner launch-readiness stress test.

Score the response on these dimensions from 0-100:
- grounding: Did it use the provided data correctly? If the prompt included tables or pasted operator data, failing to use that data is a major issue.
- actionability: Did it give concrete next steps an owner could act on immediately?
- completeness: Did it fully answer the question with enough detail for launch ops?
- compliance: Did it avoid medical claims, unsupported assertions, and cannabis marketing red flags?
- tone: Was it clear, professional, and useful for a dispensary operator?
- launchReadiness: Is this response good enough to ship in a live inbox tomorrow morning?

Hard rules:
- If the response crashes, refuses incorrectly, or says it lacks data when the prompt clearly contains data, grade poor or fail.
- If the prompt contains numeric business data and the answer ignores it, grounding must be 40 or lower.
- Any medical claim or compliance red flag should force grade=fail and responseReady=false.
- Very short, generic replies to operational questions should score low on completeness and launchReadiness.

Return only JSON with this shape:
{
  "grade": "great" | "good" | "acceptable" | "poor" | "fail",
  "score": number,
  "responseReady": boolean,
  "summary": "one short sentence",
  "strengths": ["..."],
  "issues": ["..."],
  "suggestedFixes": ["..."],
  "dimensions": {
    "grounding": number,
    "actionability": number,
    "completeness": number,
    "compliance": number,
    "tone": number,
    "launchReadiness": number
  }
}`;
var STRESS_CASES = [
  {
    id: "slow-movers-table",
    title: "Slow movers with inventory table",
    kind: "data",
    threadType: "inventory_promo",
    primaryAgent: "auto",
    prompt: `Lets discuss our slowest movers.

Here is a subset of Thrive Syracuse inventory:

| SKU | Category | Brand | On Hand | Unit Cost | Retail | 30d Units Sold | Days On Hand | Expiration |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Ayrloom Blackberry 2pk | Edible | Ayrloom | 74 | 7.50 | 18.00 | 9 | 247 | 2026-06-01 |
| Jaunty Lime 5pk | Pre-Roll | Jaunty | 52 | 11.20 | 24.00 | 11 | 142 | 2026-07-14 |
| MFNY Hash Burger 1g | Concentrate | MFNY | 19 | 22.00 | 46.00 | 2 | 285 | 2026-05-27 |
| Heady Tree Blueberry 3.5g | Flower | Heady Tree | 31 | 15.40 | 34.00 | 5 | 186 | 2026-06-20 |
| Off Hours Orange Gummies | Edible | Off Hours | 63 | 6.90 | 20.00 | 14 | 135 | 2026-09-05 |
| Nanticoke Disposable 1g | Vape | Nanticoke | 28 | 18.50 | 42.00 | 4 | 210 | 2026-06-11 |

What should we discount, bundle, hold, or write off first? Give me a ranked action plan with the numbers above and keep margin protection in mind.`,
    expectedFocus: ["days on hand", "margin", "expiration", "ranked action plan"]
  },
  {
    id: "expiring-inventory-writeoff",
    title: "Expiring inventory triage",
    kind: "data",
    threadType: "inventory_promo",
    primaryAgent: "money_mike",
    prompt: `I need a triage plan for expiring inventory.

| SKU | Category | On Hand | Retail | Unit Cost | Expiration | 14d Units Sold |
| --- | --- | ---: | ---: | ---: | --- | ---: |
| Ayrloom Pineapple Gummies | Edible | 41 | 18 | 7.20 | 2026-05-16 | 5 |
| Dank Infused Pre-Roll 2pk | Pre-Roll | 22 | 28 | 14.00 | 2026-05-25 | 3 |
| MFNY Rainbow Beltz 1g | Concentrate | 12 | 48 | 24.50 | 2026-05-19 | 1 |
| Generic House Tincture | Tincture | 17 | 32 | 11.80 | 2026-06-02 | 2 |

Which items need an immediate markdown versus a bundle versus a likely write-off risk?`,
    expectedFocus: ["expiration", "markdown", "bundle", "write-off"]
  },
  {
    id: "top-sellers-restock",
    title: "Top sellers and restock risk",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Tell me what I need to reorder first based on this top-sellers snapshot:

| SKU | Category | 7d Units Sold | On Hand | Vendor Lead Time (days) |
| --- | --- | ---: | ---: | ---: |
| Matter. Blue Dream 3.5g | Flower | 29 | 18 | 5 |
| Ayrloom Blood Orange Gummies | Edible | 24 | 11 | 7 |
| Jaunty Mango 5pk | Pre-Roll | 21 | 9 | 4 |
| MFNY Hash Burger 1g | Concentrate | 15 | 5 | 9 |
| Nanticoke Disposable 1g | Vape | 13 | 22 | 6 |

Give me a reorder priority list and flag anything that could stock out before replacement lands.`,
    expectedFocus: ["reorder priority", "stock out", "lead time", "on hand"]
  },
  {
    id: "category-margin-mix",
    title: "Category margin mix and bundles",
    kind: "data",
    threadType: "inventory_promo",
    primaryAgent: "money_mike",
    toolContext: `[Analysis note: Concentrate is the LOWEST margin category at 39% \u2014 below Flower (43%), Vape (49%), Pre-Roll (51%), and Edibles (58%). Bundling concentrate with a low-margin anchor (e.g., Flower at 43%) drags the blended bundle margin down. The correct strategy is to pair concentrate with the highest-margin category (Edibles at 58%) to protect bundle profitability while moving slow concentrate inventory.]`,
    prompt: `Here is this week's category snapshot:

| Category | Revenue | Gross Margin % | Units | AOV |
| --- | ---: | ---: | ---: | ---: |
| Flower | 18240 | 43 | 506 | 36.05 |
| Edibles | 9640 | 58 | 421 | 22.90 |
| Vape | 11520 | 49 | 248 | 46.45 |
| Concentrate | 5340 | 39 | 94 | 56.81 |
| Pre-Roll | 6720 | 51 | 261 | 25.75 |

What category should we use as the anchor in a weekend bundle if the goal is to move slower concentrate inventory without wrecking margin?`,
    expectedFocus: ["gross margin", "anchor category", "bundle", "concentrate"],
    mustReference: ["39%", "edible", "concentrate"]
  },
  {
    id: "daily-traffic-gap",
    title: "Daily traffic gap from hourly sales",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Use this hourly sales table and tell me where traffic is soft:

| Hour | Orders | Revenue |
| --- | ---: | ---: |
| 10 AM | 11 | 602 |
| 11 AM | 15 | 846 |
| 12 PM | 17 | 991 |
| 1 PM | 14 | 774 |
| 2 PM | 9 | 461 |
| 3 PM | 8 | 438 |
| 4 PM | 10 | 554 |
| 5 PM | 16 | 1006 |
| 6 PM | 18 | 1098 |
| 7 PM | 12 | 701 |

Give me one operational move and one promo move for the softest window today.`,
    expectedFocus: ["softest window", "operational move", "promo move", "hourly sales"]
  },
  {
    id: "competitor-price-response",
    title: "Competitor price response plan",
    kind: "data",
    threadType: "market_intel",
    primaryAgent: "ezal",
    prompt: `We just scraped nearby competitor pricing:

| Product Type | Thrive Avg Price | Competitor Avg Price | Gap |
| --- | ---: | ---: | ---: |
| 3.5g Flower | 38 | 34 | +4 |
| 1g Vape | 45 | 41 | +4 |
| 100mg Gummies | 20 | 18 | +2 |
| 1g Concentrate | 48 | 49 | -1 |

Should we match, hold, or beat by category? I need a practical response, not a generic competitor summary.`,
    expectedFocus: ["match", "hold", "beat", "category"]
  },
  {
    id: "review-queue-priority",
    title: "Review queue prioritization",
    kind: "data",
    threadType: "general",
    primaryAgent: "mrs_parker",
    prompt: `Here is the review-response queue from this morning:

| Customer | Rating | Theme | Days Open |
| --- | ---: | --- | ---: |
| Taylor M. | 1 | Wait time + no order updates | 2 |
| Chris B. | 5 | Staff was helpful | 1 |
| Alina R. | 2 | Product was dry | 4 |
| Marcus J. | 3 | Checkout felt rushed | 3 |

Who should we prioritize first and what should each reply try to accomplish?`,
    expectedFocus: ["prioritize", "reply goal", "days open", "negative reviews"]
  },
  {
    id: "checkin-daily-actions",
    title: "Check-in briefing follow-up",
    kind: "data",
    threadType: "general",
    primaryAgent: "mrs_parker",
    prompt: `Check-in briefing snapshot:
- Today check-ins: 27
- This week: 146
- SMS consent today: 63%
- Email consent today: 41%
- Day-3 review sequence pending: 18
- Top moods this week: happy 49, curious 33, neutral 21

What are the top three actions we should take before noon?`,
    expectedFocus: ["top three actions", "review sequence", "consent rate", "before noon"]
  },
  {
    id: "campaign-follow-up",
    title: "Campaign performance follow-up",
    kind: "data",
    threadType: "campaign",
    primaryAgent: "craig",
    prompt: `We ran three campaigns this week:

| Campaign | Channel | Sends | Click Rate | Revenue Attributed |
| --- | --- | ---: | ---: | ---: |
| Friday Flower Drop | SMS | 2410 | 11.8% | 3280 |
| New Brands Spotlight | Email | 3820 | 2.4% | 910 |
| Loyalty Reminder | SMS | 1980 | 7.2% | 1440 |

What should next week's send plan look like if I want more revenue without burning the list?`,
    expectedFocus: ["send plan", "revenue", "sms", "email"]
  },
  {
    id: "customer-segments-winback",
    title: "Customer segment win-back priorities",
    kind: "data",
    threadType: "general",
    primaryAgent: "mrs_parker",
    prompt: `Customer segment snapshot:

| Segment | Customers | Avg Days Since Last Visit | 90d Spend |
| --- | ---: | ---: | ---: |
| VIP | 118 | 18 | 224 |
| Loyal | 402 | 33 | 118 |
| Casual | 611 | 57 | 61 |
| At-risk | 286 | 94 | 48 |

Which segment should we target first for a win-back push and what angle should we take?`,
    expectedFocus: ["segment priority", "win-back", "days since last visit", "angle"]
  },
  {
    id: "loyalty-enrollment-gap",
    title: "Loyalty enrollment gap",
    kind: "data",
    threadType: "general",
    primaryAgent: "mrs_parker",
    prompt: `Last 7 days:
- Walk-in customers: 384
- New loyalty sign-ups: 61
- Avg daily budtender count: 7
- Highest sign-up day: Saturday 18%
- Lowest sign-up day: Tuesday 9%

What would you fix first to raise loyalty capture rate next week?`,
    expectedFocus: ["capture rate", "fix first", "sign-up", "next week"]
  },
  {
    id: "owner-briefing-summary",
    title: "Owner briefing summary from mixed inputs",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Summarize this into the 3 things the owner should care about before open:

- Yesterday revenue: $8,940 on 214 orders
- Flower down 14% day over day
- Gummies up 19% day over day
- 18 customers sitting in the Day-3 review sequence
- One competitor is $4 cheaper on average for 3.5g flower
- Today includes a 12:30 PM vendor meeting and 3 unread high-priority emails

Keep it short, specific, and grounded in what is above.`,
    expectedFocus: ["three things", "before open", "specific", "grounded"]
  },
  {
    id: "weekend-flash-sale",
    title: "Weekend flash sale idea without source data",
    kind: "non_data",
    threadType: "inventory_promo",
    primaryAgent: "auto",
    prompt: "Give me one strong weekend flash-sale idea for Thrive Syracuse that moves inventory without training customers to only buy on discount.",
    expectedFocus: ["flash sale", "inventory", "margin", "weekend"]
  },
  {
    id: "compliant-sms-draft",
    title: "Compliant SMS draft",
    kind: "non_data",
    threadType: "outreach",
    primaryAgent: "craig",
    prompt: "Write one compliant SMS for a Friday pre-roll push. Keep it tight, avoid medical language, and include opt-out language.",
    expectedFocus: ["sms", "compliant", "opt-out", "tight copy"]
  },
  {
    id: "one-star-review-reply",
    title: "Reply to one-star review",
    kind: "non_data",
    threadType: "support",
    primaryAgent: "auto",
    prompt: "Draft a reply to a 1-star Google review from someone angry about long wait times and a missing online-order update.",
    expectedFocus: ["reply", "empathetic", "operational follow-up", "professional"]
  },
  {
    id: "beginner-budtender-talking-points",
    title: "Budtender beginner talking points",
    kind: "non_data",
    threadType: "product_discovery",
    primaryAgent: "smokey",
    prompt: "Give me 5 talking points budtenders can use with first-time edible shoppers. Keep it beginner-friendly and compliant.",
    expectedFocus: ["talking points", "first-time", "compliant", "beginner-friendly"]
  },
  {
    id: "vendor-day-plan",
    title: "Vendor day inbox plan",
    kind: "non_data",
    threadType: "event",
    primaryAgent: "craig",
    prompt: "We have a vendor day next Friday from 2 to 6 PM. What should the inbox prepare this week so the floor team, marketing, and loyalty follow-up are all ready?",
    expectedFocus: ["this week", "team", "marketing", "follow-up"]
  },
  {
    id: "owner-daily-briefing-no-data",
    title: "Owner daily briefing without source data",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "auto",
    prompt: "Give me a quick daily owner briefing for Thrive Syracuse. If you need data, tell me exactly what would make the briefing materially better.",
    expectedFocus: ["daily briefing", "what data is missing", "owner", "materially better"]
  },
  {
    id: "differentiate-thrive",
    title: "Differentiate Thrive versus nearby stores",
    kind: "non_data",
    threadType: "market_intel",
    primaryAgent: "ezal",
    prompt: "How should Thrive Syracuse differentiate itself from nearby dispensaries if we do not want to win on price alone?",
    expectedFocus: ["differentiate", "not on price alone", "nearby dispensaries", "practical"]
  },
  {
    id: "no-verified-competitor-data",
    title: "No verified competitor data honesty check",
    kind: "non_data",
    threadType: "market_intel",
    primaryAgent: "ezal",
    prompt: "Are we cheaper than Vibe this week? If you do not have verified data, I need you to say that clearly and tell me how to answer the question responsibly.",
    expectedFocus: ["verified data", "say that clearly", "responsibly", "competitor"]
  },
  {
    id: "partial-table-analysis",
    title: "Partial table analysis from visible rows only",
    kind: "data",
    threadType: "inventory_promo",
    primaryAgent: "auto",
    prompt: `This is only the visible part of the screenshot, but I still need a decision:

| SKU | On Hand | Retail | Unit Cost | 30d Units | Days On Hand |
| --- | ---: | ---: | ---: | ---: | ---: |
| Heady Tree Gelato 3.5g | 18 | 36 | 15.20 | 3 | 180 |
| Ayrloom Blood Orange Gummies | 44 | 20 | 7.10 | 14 | 94 |
| Jaunty Mango 5pk | 26 | 24 | 11.20 | 6 | 130 |

From only these visible rows, what should I do right now and what data would you still want next?`,
    expectedFocus: ["visible rows", "right now", "data", "partial"]
  },
  {
    id: "multi-turn-sale-to-email",
    title: "Multi-turn sale to email + SMS",
    kind: "multi_turn",
    threadType: "outreach",
    primaryAgent: "craig",
    history: [
      { role: "user", content: "We need a Friday afternoon flash sale focused on edibles and pre-rolls." },
      { role: "assistant", content: "A short-duration offer with tight guardrails makes the most sense. Keep the discount under 20% and lead with the higher-margin pre-rolls." }
    ],
    prompt: "Turn that into one review-ready email and one SMS draft for the inbox. Keep the SMS compliant.",
    expectedFocus: ["email", "sms", "carry forward context", "compliant"]
  },
  {
    id: "multi-turn-budtender-brief",
    title: "Multi-turn budtender brief",
    kind: "multi_turn",
    threadType: "product_discovery",
    primaryAgent: "smokey",
    history: [
      { role: "user", content: "Our budtenders keep over-recommending sleepy flower when customers ask for daytime products." },
      { role: "assistant", content: "Lead with limonene- and pinene-forward options for daytime requests and coach the team to avoid medical language." }
    ],
    prompt: "Great. Turn that into a 5-bullet talking-point card for the floor tomorrow morning.",
    expectedFocus: ["carry forward context", "5 bullets", "daytime guidance", "floor tomorrow"]
  },
  {
    id: "operator-pairings-no-medical",
    title: "Operator pairings without medical claims",
    kind: "non_data",
    threadType: "product_discovery",
    primaryAgent: "smokey",
    toolContext: `[Compliance rule for pairing suggestions: Use OCCASION-based language, not EFFECT-based language. Say "pairs well with evening occasions" not "for relaxation." Say "some customers enjoy this before bedtime" not "helps with sleep." Say "popular in our slow-wind-down category" not "calming." Pairings to suggest: evening gummies + (1) a myrcene-dominant flower for customers who prefer to combine formats, (2) a low-dose vape pen for customers who want a faster onset alongside the gummy, (3) a CBD tincture for customers who prefer a lighter complement. All talking points must describe WHAT the product is and WHEN customers typically use it, never WHY it works.]`,
    prompt: "We want budtenders to pair our evening gummies with one more product, but we cannot drift into medical claims. What pairings and talking points would you use?",
    expectedFocus: ["pairings", "talking points", "no medical claims", "budtenders"],
    mustNotContain: ["relaxation", "calming", "sleep", "stress", "helps with", "promotes"],
    mustReference: ["occasion", "terpene"]
  },
  {
    id: "exact-slowest-movers-no-data",
    title: "Slow movers discussion \u2014 no POS data provided",
    kind: "non_data",
    threadType: "inventory_promo",
    primaryAgent: "auto",
    toolContext: `[Tool: get_slow_movers \u2014 ERROR: No slow-mover data available. The agent must NOT invent or assume slow-mover data. The correct response is to ask the manager to share their POS inventory report or pull from Alleaves before any analysis can proceed.]`,
    prompt: "Lets discuss our slowest movers",
    expectedFocus: ["slow movers", "data", "POS", "share"],
    mustReference: ["Alleaves", "data"],
    mustNotContain: ["days on hand", "units sold", "velocity"]
  },
  // ─── PRICING & INVENTORY EDGE CASES ────────────────────────────────────────
  {
    id: "competitor-price-match-decision",
    title: "Competitor $4 cheaper \u2014 price match or hold?",
    kind: "data",
    threadType: "inventory_promo",
    primaryAgent: "money_mike",
    prompt: `Competitor intel shows RISE Cannabis is selling OG Kush 3.5g at $28 \u2014 we're at $32. That's a $4 gap. Our cost on that SKU is $14.50.

Should we match, undercut, or hold? Show me the margin math.`,
    expectedFocus: ["margin", "$14.50", "match", "hold"]
  },
  {
    id: "overstock-discontinue-plan",
    title: "Overstock of discontinued SKU \u2014 disposal options",
    kind: "data",
    threadType: "inventory_promo",
    primaryAgent: "money_mike",
    prompt: `We have 200 units of a brand we're discontinuing. They expire in 14 weeks. Retail $18, cost $7.20. No reorders coming.

What are my options for moving this before expiration without killing our average ticket?`,
    expectedFocus: ["14 weeks", "cost", "options", "average ticket"]
  },
  {
    id: "new-sku-menu-placement",
    title: "New premium brand \u2014 where on the menu?",
    kind: "non_data",
    threadType: "inventory_promo",
    primaryAgent: "auto",
    prompt: `We're getting a new premium flower brand in next week \u2014 Lobo Cannagar, retailing $65\u2013$85. Our current top flower is $42. Where should we position it on the menu and how should budtenders introduce it without making our other products look bad?`,
    expectedFocus: ["premium", "positioning", "budtender", "menu"]
  },
  {
    id: "top-seller-out-of-stock",
    title: "Top seller out of stock 2 weeks \u2014 customer messaging",
    kind: "data",
    threadType: "inventory_promo",
    primaryAgent: "craig",
    prompt: `Our top seller \u2014 Jaunty Mango 5pk Pre-Roll \u2014 is out of stock and won't be back for 2 weeks. It accounts for 14% of our pre-roll revenue.

What do we tell customers who ask for it, and should we proactively message loyalty members who regularly buy it?`,
    expectedFocus: ["out of stock", "loyalty", "message", "alternative"],
    mustNotContain: ["enhancing our curing", "better flavor", "mango-licious", "mango madness", "Hire me", "Specialist Tier"]
  },
  {
    id: "bundle-price-calc",
    title: "Bundle pricing \u2014 maintain margin across two SKUs",
    kind: "data",
    threadType: "inventory_promo",
    primaryAgent: "money_mike",
    prompt: `I want to bundle these two products:
- Ayrloom Gummies 10pk: retail $22, cost $8.40
- Jaunty Mango 5pk Pre-Rolls: retail $24, cost $11.20

What bundle price keeps us above 50% gross margin and still feels like a deal to the customer?`,
    expectedFocus: ["50%", "bundle", "cost", "margin"]
  },
  {
    id: "shrink-audit-protocol",
    title: "Inventory shrink \u2014 3 units missing from flower count",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "pops",
    prompt: "End-of-day count came up 3 units short on our flower display \u2014 3 separate SKUs, 1 each. What is the standard protocol and do I need to file anything with Metrc tonight?",
    expectedFocus: ["Metrc", "protocol", "steps", "tonight"]
  },
  {
    id: "customer-return-policy",
    title: "Customer return \u2014 unopened edible",
    kind: "non_data",
    threadType: "support",
    primaryAgent: "auto",
    prompt: "A customer is at the counter asking to return an edible they bought yesterday \u2014 says it was the wrong dosage and the package is still sealed. What is our policy and what do I tell them?",
    expectedFocus: ["policy", "sealed", "NY", "customer"]
  },
  {
    id: "clearance-timing-math",
    title: "When to mark down vs hold \u2014 expiration urgency",
    kind: "data",
    threadType: "inventory_promo",
    primaryAgent: "money_mike",
    toolContext: `[Velocity data: Nanticoke Vape 1g sells ~3 units/week. House Tincture 500mg sells ~2 units/week.]`,
    prompt: `Two SKUs with upcoming expiration:
| SKU | On Hand | Cost | Retail | Expiry |
| --- | ---: | ---: | ---: | --- |
| Nanticoke Vape 1g | 28 | 12.80 | 38 | 6 weeks |
| House Tincture 500mg | 14 | 9.40 | 32 | 3 weeks |

Vape sells ~3/week, tincture sells ~2/week. For each SKU: will I sell through before expiry at current velocity, and what's my action \u2014 mark down now, bundle, hold, or emergency clearance?`,
    expectedFocus: ["tincture", "vape", "velocity", "weeks"]
  },
  // ─── STAFF & OPERATIONS ─────────────────────────────────────────────────────
  {
    id: "shift-callout-coverage",
    title: "Two closers called out \u2014 coverage options",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "pops",
    prompt: `It's 2 PM and both closing budtenders just called out sick. We have 3 more hours until close and currently 2 people on the floor. What are my options and what should I prioritize in the next 30 minutes?`,
    expectedFocus: ["30 minutes", "options", "priority", "floor"]
  },
  {
    id: "budtender-low-capture-rate",
    title: "Budtender with 18% loyalty capture vs 34% avg",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `One of my budtenders has an 18% loyalty enrollment capture rate this week. The team average is 34%. They have great customer feedback scores. What do I say to them and what should I actually fix?`,
    expectedFocus: ["18%", "34%", "what to fix", "conversation"]
  },
  {
    id: "mystery-shopper-prep",
    title: "State inspection possible next week \u2014 prep checklist",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "pops",
    prompt: `We heard through the grapevine that OCM may be doing spot inspections in our area next week. What are the top 5 things I should audit and fix before they arrive?`,
    expectedFocus: ["audit", "top", "inspection", "fix"]
  },
  {
    id: "opening-checklist",
    title: "Opening shift checklist",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "mrs_parker",
    prompt: "Give me a tight opening checklist for the floor team. We open at 10 AM and need to be ready for 4 things: Metrc compliance, POS sync check, product display, and customer-facing systems.",
    expectedFocus: ["Metrc", "POS", "checklist", "display"]
  },
  {
    id: "rush-hour-floor-decision",
    title: "Unexpected 4:20 rush \u2014 floor decision",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `It is 4:10 PM. We have 14 customers in the store, 3 budtenders on floor, and the queue is backing up to the door. Normal close is 9 PM. I have one person on lunch and one part-timer who can come in at 5.

What do I do in the next 10 minutes?`,
    expectedFocus: ["10 minutes", "queue", "call in", "floor"]
  },
  // ─── COMPLIANCE EDGE CASES ──────────────────────────────────────────────────
  {
    id: "possession-limit-combo",
    title: "Possession limit \u2014 flower + pre-roll combo over?",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "auto",
    prompt: `Customer wants a 3.5g flower jar AND a 5-pack pre-roll (each pre-roll is 0.5g, so 2.5g total). That is 6g combined. New York adult-use limit is 3oz. Are we good to sell them both?`,
    expectedFocus: ["3 oz", "6g", "legal", "good to sell"]
  },
  {
    id: "age-verification-protocol",
    title: "Age verification \u2014 customer looks young",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "mrs_parker",
    prompt: "A customer at the counter looks like they might be under 21. They have a passport that says they are 22. What is the exact protocol and when, if ever, is it acceptable to refuse service even with valid ID?",
    expectedFocus: ["passport", "protocol", "refuse", "valid ID"]
  },
  {
    id: "staff-cannabis-use-policy",
    title: "Can employees consume cannabis before a shift?",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "auto",
    prompt: "One of my budtenders asked if it is legal for them to consume cannabis at home before coming in for a shift. What is our policy and what does NY state law say about this?",
    expectedFocus: ["policy", "NY", "impairment", "shift"]
  },
  {
    id: "social-media-deal-compliance",
    title: "Instagram deal post \u2014 what to avoid",
    kind: "non_data",
    threadType: "campaign",
    primaryAgent: "craig",
    prompt: 'We want to post a "20% off edibles today only" promotion on Instagram. What language and imagery do we need to avoid to stay compliant with NY advertising rules?',
    expectedFocus: ["NY", "advertising", "avoid", "compliant"]
  },
  {
    id: "metrc-weight-discrepancy",
    title: "Metrc weight discrepancy \u2014 scale off by 0.1g",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "pops",
    prompt: "Our scale is reading 0.1g light on every flower transaction compared to what Metrc expects. We have 40 transactions today. What do we do \u2014 is this reportable? How do we fix it without creating a compliance trail nightmare?",
    expectedFocus: ["0.1g", "Metrc", "reportable", "fix"]
  },
  {
    id: "gift-law-question",
    title: "NY gift law \u2014 can we give free product?",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "auto",
    prompt: "A long-time customer asked if we can comp them a pre-roll for their birthday. What does NY cannabis gift law say and what CAN we do to reward loyal customers without violating it?",
    expectedFocus: ["NY", "gift", "can", "reward"]
  },
  // ─── CUSTOMER SCENARIOS ─────────────────────────────────────────────────────
  {
    id: "first-time-buyer-experience",
    title: "First-time buyer \u2014 ideal floor experience",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "mrs_parker",
    prompt: "Walk me through the ideal first-visit experience for a brand-new cannabis buyer who has never been in a dispensary. From the moment they walk in to the moment they leave.",
    expectedFocus: ["first time", "walk in", "experience", "leave"]
  },
  {
    id: "complaint-escalation",
    title: "Customer threatening bad Yelp review",
    kind: "non_data",
    threadType: "support",
    primaryAgent: "mrs_parker",
    prompt: `A customer at the register says: "I've been waiting 20 minutes and nobody helped me. I'm going to leave a one-star review on Yelp and Google." They are visibly frustrated. What do I do right now, and how do we prevent this from becoming a public review?`,
    expectedFocus: ["right now", "prevent", "review", "next step"]
  },
  {
    id: "vip-birthday-recognition",
    title: "VIP customer birthday today \u2014 action plan",
    kind: "data",
    threadType: "general",
    primaryAgent: "mrs_parker",
    prompt: `Customer Michelle W. \u2014 LTV $1,240, visits every 2 weeks, loves Sativa flower \u2014 just walked in and it is her birthday today. We did not message her in advance.

What can the budtender do right now, and what should we set up for next year so we do not miss this again?`,
    expectedFocus: ["birthday", "right now", "next year", "LTV"]
  },
  {
    id: "medical-question-deflect",
    title: "Customer asks what is good for arthritis",
    kind: "non_data",
    threadType: "product_discovery",
    primaryAgent: "smokey",
    toolContext: `[Compliance rule: NEVER confirm cannabis treats or helps arthritis. Redirect to terpene profiles and typical use occasions. Script must use occasion-based language ("some customers use this for evening wind-down") not effect-claiming language ("this helps with pain").]`,
    prompt: 'A customer just asked the budtender: "What do you have that is good for my arthritis?" Give the budtender the exact response script that answers helpfully without making any medical claims.',
    expectedFocus: ["script", "budtender", "terpene", "occasion"],
    mustNotContain: ["helps with pain", "relieves", "good for your", "anti-inflammatory", "pain relief", "treats"],
    mustReference: ["terpene", "occasion"]
  },
  {
    id: "loyalty-points-missing",
    title: "Customer loyalty points not showing",
    kind: "non_data",
    threadType: "support",
    primaryAgent: "mrs_parker",
    toolContext: `[Customer context: The customer claims 3+ months of visits, zero points showing. Common causes: wrong phone number at check-in, app account not linked to POS record, or points expired. Action path: look up their POS record by phone, verify check-in history, manually reconcile if confirmed visits match.]`,
    prompt: "Customer says they have been coming in for 3 months and their loyalty app shows zero points \u2014 they think they earned at least 200 visits worth. What do I do right now and what is the likely cause?",
    expectedFocus: ["right now", "phone", "loyalty", "look up"]
  },
  {
    id: "revenue-gap-midday",
    title: "Revenue gap at noon \u2014 $12k target, at $9.2k",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `It is noon. Daily revenue target is $12k. We are at $9,200. We have 6 hours left and average 3.2 transactions per hour at $52 AOV in the afternoon.

Will we hit the target? If not, what is the fastest lever I can pull right now?`,
    expectedFocus: ["$9,200", "lever", "target", "right now"]
  },
  {
    id: "customer-ban-protocol",
    title: "Aggressive customer from last week is back",
    kind: "non_data",
    threadType: "support",
    primaryAgent: "pops",
    prompt: "A customer who was verbally aggressive to a budtender last week just walked in again. We did not formally ban them but the staff is uncomfortable. What do I do in the next 5 minutes and what is the right process going forward?",
    expectedFocus: ["5 minutes", "process", "staff", "next"]
  },
  // ─── ANALYTICS EDGE CASES ───────────────────────────────────────────────────
  {
    id: "conversion-rate-drop",
    title: "Check-ins up 12%, revenue flat \u2014 why?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Last 7 days:
- Check-ins: 412 (up 12% vs prior week)
- Revenue: $18,400 (flat, up only 0.3%)
- Avg ticket: $44.70 (was $50.10 prior week)
- # transactions: 411

Foot traffic is up but money is flat. What are the 3 most likely causes and how do I test which one it is?`,
    expectedFocus: ["$44.70", "3 causes", "test", "avg ticket"]
  },
  {
    id: "aov-drop-diagnosis",
    title: "AOV fell $52 \u2192 $41 this week \u2014 diagnose it",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Average order value dropped from $52 to $41 this week. Here is what I know:
- Pre-roll units up 22%
- Edibles units down 8%
- Flower units down 4%
- We ran a $5-off pre-roll promo Tue\u2013Thu

Is this the promo or something structural? What do I look at next?`,
    expectedFocus: ["promo", "$5", "structural", "next"]
  },
  {
    id: "category-shift-trend",
    title: "Edibles +40%, flower -20% \u2014 trend or noise?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `This week vs last week:
| Category | Units This Week | Units Last Week | Change |
| --- | ---: | ---: | ---: |
| Flower | 186 | 232 | -20% |
| Edibles | 204 | 146 | +40% |
| Vape | 98 | 94 | +4% |
| Pre-Roll | 72 | 68 | +6% |

Is the edibles surge and flower dip a real trend I should act on or just weekly noise?`,
    expectedFocus: ["trend", "noise", "act", "edibles"]
  },
  {
    id: "afternoon-slump-fix",
    title: "2\u20135 PM always slow \u2014 data-backed operational solution",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Our 2\u20135 PM window averages 3.2 transactions/hour. Our 5\u20138 PM window averages 8.6 transactions/hour. Morning 10 AM\u201312 PM averages 5.1 transactions/hour.

What operational changes would move the needle on this afternoon slump? Think staffing, floor layout, checkout speed, and what data I should pull to diagnose the root cause.`,
    expectedFocus: ["3.2", "afternoon", "staffing", "data"],
    mustNotContain: ["pre-dinner", "relaxation", "escape the day", "mellow", "wind down"]
  },
  {
    id: "conflicting-numbers",
    title: "Manager gives two different revenue numbers",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Our manager said yesterday's revenue was $6,840. But the POS morning summary email shows $7,210. The difference is $370.

Which number should I trust and how do I reconcile this before the weekly owner report?`,
    expectedFocus: ["$370", "reconcile", "trust", "before"]
  },
  {
    id: "monthly-snapshot-partial",
    title: "End of month \u2014 partial data snapshot",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `It is the last day of the month and I only have data through yesterday:
- Revenue MTD: $94,200
- Transactions MTD: 1,847
- New loyalty signups: 112
- Returns/voids: 18 transactions
- Biggest day: April 20 at $9,840

Give me the executive summary for the owner meeting tomorrow and flag the one number you are most concerned about.`,
    expectedFocus: ["MTD", "summary", "April 20", "concerned"]
  },
  // ─── MARKETING EDGE CASES ───────────────────────────────────────────────────
  {
    id: "sms-opt-out-spike",
    title: "SMS opt-out spike after last send \u2014 diagnose",
    kind: "data",
    threadType: "campaign",
    primaryAgent: "craig",
    prompt: `After our last SMS send to 1,840 customers, we got 12 opt-outs and 3 complaint replies. Normal is 1\u20132 opt-outs per send.

What likely triggered the spike and what should we change before the next send?`,
    expectedFocus: ["12 opt-outs", "spike", "next send", "change"]
  },
  {
    id: "subject-line-ab-test",
    title: "A/B subject line \u2014 which to send?",
    kind: "data",
    threadType: "campaign",
    primaryAgent: "craig",
    prompt: `We tested two email subject lines on 200 subscribers (100 each):
- A: "Your weekend deal is here \u{1F33F}" \u2014 32% open rate, 4.1% click
- B: "Thrive Syracuse: This Friday only" \u2014 24% open rate, 6.8% click

We are sending to 3,200 more. Which subject line do we use and why?`,
    expectedFocus: ["32%", "6.8%", "send", "which"]
  },
  {
    id: "420-day-marketing-plan",
    title: "4/20 day-of operational marketing plan",
    kind: "non_data",
    threadType: "campaign",
    primaryAgent: "craig",
    prompt: "It is 7 AM on April 20. Store opens at 10 AM. We have a 20% off everything sale until 4:20 PM, then regular prices. Draft me the 3 customer-facing messages we send today (morning teaser, midday reminder, last-call) and the timing for each.",
    expectedFocus: ["3 messages", "morning", "midday", "last call"]
  },
  {
    id: "referral-program-design",
    title: "Design a compliant referral program",
    kind: "non_data",
    threadType: "campaign",
    primaryAgent: "craig",
    prompt: "Customers keep asking if we have a referral program. We want to reward people who bring in friends. Design a referral structure that is both appealing and compliant with NY cannabis advertising rules.",
    expectedFocus: ["NY", "referral", "compliant", "design"]
  },
  {
    id: "google-business-hours-update",
    title: "Update Google Business hours for 4/20 extended hours",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "auto",
    prompt: `We are extending hours on April 20 from our normal 10 AM\u20139 PM to 8 AM\u201311 PM. I need to update Google Business Profile, Weedmaps, and our website before Tuesday. What is the fastest way to do all three and what do I watch out for?`,
    expectedFocus: ["Google", "Weedmaps", "website", "watch out"]
  },
  {
    id: "review-request-timing",
    title: "Best time to ask for a Google review",
    kind: "non_data",
    threadType: "campaign",
    primaryAgent: "craig",
    prompt: "We have 43 Google reviews averaging 4.1 stars. Competitors have 150+. What is the most effective and compliant way to ask customers for a review \u2014 at what point in the customer journey and through which channel?",
    expectedFocus: ["43 reviews", "when", "channel", "compliant"]
  },
  // ─── DIFFICULT MULTI-TURN ────────────────────────────────────────────────────
  {
    id: "multi-turn-escalating-complaint",
    title: "Multi-turn: escalating complaint \u2192 resolution",
    kind: "non_data",
    threadType: "support",
    primaryAgent: "mrs_parker",
    history: [
      {
        role: "user",
        content: "Customer says they bought the wrong product. They are upset."
      },
      {
        role: "assistant",
        content: "What product did they get versus what they wanted? And what was the approximate purchase amount? I can help you navigate this."
      },
      {
        role: "user",
        content: "They wanted an indica gummy but got a sativa. Paid $22. Now they are threatening to call the state licensing board and post on Reddit."
      }
    ],
    prompt: "They are still at the counter. What do I say to them right now?",
    expectedFocus: ["right now", "say", "counter", "de-escalate"]
  },
  {
    id: "multi-turn-inventory-decision",
    title: "Multi-turn: inventory question \u2192 buy decision",
    kind: "data",
    threadType: "inventory_promo",
    primaryAgent: "money_mike",
    history: [
      {
        role: "user",
        content: "Vendor is offering us 200 units of a new Sativa vape at $12.50 cost, retailing at $38. Net 30 terms."
      },
      {
        role: "assistant",
        content: "That is a 67% gross margin at retail \u2014 healthy. Before committing, I want to know: do you have sell-through data on your current vape SKUs? And what is your current vape inventory level?"
      },
      {
        role: "user",
        content: "Current vapes: 8 SKUs, average 18 days on hand, best seller moves 14 units/week. We have $3,200 in vape inventory right now."
      }
    ],
    prompt: "Should I take the 200 units?",
    expectedFocus: ["200 units", "$3,200", "days on hand", "recommend"]
  },
  {
    id: "multi-turn-ambiguous-request",
    title: "Multi-turn: vague request \u2192 scoped action",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "auto",
    history: [
      {
        role: "user",
        content: "We need to do something about our Weedmaps presence."
      },
      {
        role: "assistant",
        content: "Happy to help. What is the main problem you are seeing \u2014 are reviews down, deals outdated, menu not syncing, or something else? Knowing the specific gap will help me give you the right fix."
      }
    ],
    prompt: "Reviews. We have 28 and a 3.8 average. Competitors have way more.",
    expectedFocus: ["28 reviews", "3.8", "action", "Weedmaps"]
  },
  {
    id: "multi-turn-tool-data-vs-manager",
    title: "Multi-turn: tool data contradicts what manager said",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    history: [
      {
        role: "user",
        content: "Yesterday was our best day ever \u2014 manager said we did $11,400."
      },
      {
        role: "assistant",
        content: "Nice \u2014 sounds like a strong push. What drove it? Promo, event, or just organic traffic?"
      }
    ],
    prompt: `Here is the POS daily summary:

Revenue: $8,920
Transactions: 178
Avg ticket: $50.11

The manager said $11,400. The POS says $8,920. That is a $2,480 gap. What is going on?`,
    expectedFocus: ["$2,480", "gap", "POS", "what is going on"]
  },
  {
    id: "multi-turn-prioritization",
    title: "Multi-turn: 5 competing tasks \u2014 what first?",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "pops",
    history: [
      {
        role: "user",
        content: "I have too many things on my plate today and do not know where to start."
      },
      {
        role: "assistant",
        content: "Walk me through what is on your list and I will help you sequence it."
      }
    ],
    prompt: `Here is everything I have today:
1. Call the flower vendor about a short shipment (need to credit $340)
2. Respond to 2 negative Google reviews from this week
3. Run the weekly loyalty segment report for the owner
4. Train the new budtender on RSO products (they have their first shift Friday)
5. Update our 4/20 deals on Weedmaps before the weekend

Which one do I do first and is there anything I can delegate or skip?`,
    expectedFocus: ["first", "delegate", "sequence", "4/20"]
  },
  {
    id: "incomplete-data-decision",
    title: "Decide from incomplete data \u2014 partial POS export",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    toolContext: `[Calculation: Visible hours are 10 AM (12 transactions, $524), 11 AM (18 transactions, $836), and 1 PM (9 transactions, $412). Total visible = 39 transactions, $1,772 revenue across 3 of 4 hours. Historical Tuesday 4-hour total = 35 transactions, $1,650. Pro-rating the historical for 3 visible hours: 35 \xD7 0.75 = ~26 expected. Actual 39 visible vs ~26 expected = tracking ~50% above pace. Even excluding the missing 12 PM hour, today is running well above a normal Tuesday.]`,
    prompt: `I only have partial data from this morning \u2014 the POS export cut off:

| Hour | Transactions | Revenue |
| --- | ---: | ---: |
| 10 AM | 12 | $524 |
| 11 AM | 18 | $836 |
| 12 PM | (missing) | (missing) |
| 1 PM | 9 | $412 |

Historical Tuesday average for 10 AM\u20131 PM: 35 transactions, $1,650 revenue.

It is now 2 PM. Based on what I have, is today tracking above or below a normal Tuesday and what should I be watching?`,
    expectedFocus: ["above", "Tuesday", "watching", "missing"],
    mustReference: ["39", "above"]
  },
  {
    id: "no-promo-idea-constraint",
    title: "Drive traffic with no discount budget",
    kind: "non_data",
    threadType: "inventory_promo",
    primaryAgent: "craig",
    prompt: "I need to drive more traffic this week but the owner said no discounts or promotions \u2014 margin is already tight. What are three ways to bring people in without touching price?",
    expectedFocus: ["three", "no discount", "traffic", "price"]
  },
  {
    id: "wrong-product-recommendation",
    title: "Budtender gave wrong product \u2014 what to do",
    kind: "non_data",
    threadType: "support",
    primaryAgent: "mrs_parker",
    prompt: "A customer came back today and says a budtender recommended them a high-THC concentrate last week when they told the budtender they were a first-time user. They had a bad experience. How do we handle this with the customer and with the employee?",
    expectedFocus: ["customer", "employee", "handle", "first-time"]
  },
  // ── NY-Specific Compliance (8 cases) ──────────────────────────────────
  {
    id: "ny-ocm-social-media-rules",
    title: "OCM advertising restrictions \u2014 what is allowed on Instagram",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    toolContext: `[NY OCM advertising (9 NYCRR Part 128) \u2014 what IS allowed and what IS NOT: ALLOWED: (1) Product photos \u2014 yes, permitted if the imagery does not appeal to minors and is on an age-gated account. (2) Prices \u2014 yes, permitted. (3) THC percentages \u2014 yes, permitted but cannot be framed as "more potent is better." (4) Compensated influencers \u2014 permitted if the account is age-gated. NOT ALLOWED: (1) Advertising within 500 feet of schools/playgrounds. (2) Content that appeals to minors (cartoon-like imagery, candy-resembling edible photos). (3) Misleading health or potency claims. (4) Posts on non-age-gated accounts. Key requirement: age-gate your Instagram account (Instagram's age restriction tool) before posting product content.]`,
    prompt: `I want to post on Instagram to promote our weekly specials. Before I do, what are the OCM rules I need to follow for social media advertising? Specifically: can I show product photos, name prices, mention THC percentages, or use influencers?`,
    expectedFocus: ["OCM", "social media", "advertis", "restrict"],
    mustReference: ["OCM", "age", "minors"],
    mustNotContain: ["product photos are prohibited", "photos of products are not allowed", "cannot show product"]
  },
  {
    id: "ny-packaging-requirements",
    title: "NY packaging requirements \u2014 labels and child-resistance",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    prompt: `A vendor wants to sell us pre-packaged flower in clear bags with just a barcode sticker. Before I accept this shipment, walk me through the NY cannabis packaging requirements \u2014 child-resistant closure, opacity, and what has to be on the label.`,
    expectedFocus: ["child-resistant", "opaque", "label", "packaging"]
  },
  {
    id: "ny-caurd-restrictions",
    title: "CAURD licensee restrictions \u2014 what we cannot do",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    prompt: `We are a CAURD licensee in Syracuse. A friend wants us to carry their unlicensed infused beverages on consignment and split revenue. Before I say yes or no, what are the key restrictions that apply specifically to CAURD holders that I need to know about?`,
    expectedFocus: ["CAURD", "licensed", "restrict", "unlicensed"]
  },
  {
    id: "ny-employee-background-checks",
    title: "Employee background check requirements in NY",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    toolContext: `[NY Cannabis Control Board (CCB) employee requirements: (1) All cannabis handlers (anyone who touches product \u2014 budtenders, inventory staff) must complete OCM-approved Responsible Vendor Training (RVT) before handling product; training is ~4 hours and must be renewed every 2 years. (2) Background checks: NY cannabis law (NY Cannabis Law \xA7123) requires licensees to conduct criminal background screening but PROHIBITS automatic disqualification for most drug-related offenses \u2014 consistent with the MRTA's equity framework. Disqualifying offenses: violent felonies within 5 years, any conviction for selling cannabis to minors, or federal firearms trafficking. (3) Documentation: maintain signed RVT certificates and background check authorizations in employee file; must be producible on inspection within 24 hours. (4) Part-time and seasonal employees: same requirements apply \u2014 no exemption for hours or tenure. (5) NY Department of Labor labor law compliance also applies \u2014 wage theft, scheduling, and anti-retaliation protections are separate from OCM requirements.]`,
    prompt: `I am hiring two new budtenders and a part-time cashier. What background check requirements does New York state impose on cannabis retail employees? Are there disqualifying offenses, and how do I document compliance?`,
    expectedFocus: ["background", "employee", "disqualif", "NY"],
    mustReference: ["OCM", "training", "documentation"]
  },
  {
    id: "ny-delivery-rules",
    title: "Can Thrive offer delivery? NY delivery service rules",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    prompt: `Customers keep asking if we deliver. What does NY law require for a dispensary to offer delivery \u2014 separate license, vehicle requirements, delivery manifest, GPS tracking? And can we use a third-party driver or does it have to be a Thrive employee?`,
    expectedFocus: ["delivery", "license", "manifest", "driver"]
  },
  {
    id: "ny-consumption-lounge",
    title: "Consumption lounge regulations in NY",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    toolContext: `[NY consumption lounge compliance summary: (1) Requires a separate On-Site Consumption License from OCM \u2014 cannot operate under a retail dispensary license alone. (2) Ventilation: state building code and local fire marshal requirements apply; the license application requires proof of a dedicated HVAC system that prevents smoke/vapor migration; minimum air exchange rate is governed by local building code (typically 15+ CFM per person). (3) No alcohol on premises when the lounge is operating. (4) Minimum age: 21+ at lounge entry, verified separately from retail floor. (5) Top compliance risks: operating before the license is issued, inadequate ventilation documentation, alcohol on premises, staff working dual roles without documented separation.]`,
    prompt: `I am thinking about adding an on-site consumption lounge in the back of the store. What does New York require to operate a consumption lounge \u2014 separate permit, ventilation standards, no alcohol rule, age verification? What are the biggest compliance risks?`,
    expectedFocus: ["consumption lounge", "permit", "ventilation", "risk"],
    mustReference: ["license", "ventilation", "alcohol"]
  },
  {
    id: "ny-gifting-bundling-rules",
    title: "Gifting and bundling restrictions in NY",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    prompt: `A marketing idea came up: buy any product and get a free pre-roll as a gift. Is that legal in New York? What are the rules around gifting cannabis? Can we bundle a T-shirt with a purchase, or include a free sample with an order?`,
    expectedFocus: ["gifting", "bundle", "free", "NY"]
  },
  {
    id: "ny-social-equity-obligations",
    title: "Social equity fund obligations for adult-use licensees",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    prompt: `Someone told me adult-use licensees in NY have financial obligations to a social equity fund. Is that true? What is the exact requirement \u2014 percentage of revenue, annual fee, or something else \u2014 and when does it apply to our license type?`,
    expectedFocus: ["social equity", "fund", "obligation", "adult-use"]
  },
  // ── Advanced Financial / Margin Scenarios (8 cases) ───────────────────
  {
    id: "vendor-renegotiation-leverage",
    title: "Vendor renegotiation leverage \u2014 top 3 suppliers",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "money_mike",
    prompt: `My top 3 vendors know I am their biggest buyer in Syracuse. Heading into summer, my COGs are creeping up and margin is shrinking. How do I use my volume position to renegotiate better pricing? What specific asks should I make \u2014 net terms, tiered rebates, exclusive SKUs?`,
    expectedFocus: ["vendor", "COGs", "renegotiat", "volume"]
  },
  {
    id: "cash-handling-compliance-cost",
    title: "Cash handling compliance cost \u2014 what is typical for our volume",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "money_mike",
    prompt: `We are a cash-only business doing about $300K per month in sales. I need to budget for cash handling: counting machine, safe, armored car pickup. What is a realistic monthly cost for our volume and what corners can I cut without violating OCM cash handling requirements?`,
    expectedFocus: ["cash", "armored", "safe", "budget"]
  },
  {
    id: "excise-tax-margin-compression",
    title: "Margin compression from a 5% NY excise tax hike",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `If New York raises the cannabis excise tax by 5 percentage points next year, how does that flow through our P&L? Do I absorb it in price, push it to cost, or split it? Walk me through the math on a $50 average ticket and what it means for gross margin.`,
    expectedFocus: ["excise", "margin", "price", "absorb"]
  },
  {
    id: "loyalty-program-roi",
    title: "Break-even on a new loyalty program spend",
    kind: "non_data",
    threadType: "marketing",
    primaryAgent: "pops",
    prompt: `I am considering a points program at $0.10 per point redeemed, where customers earn 1 point per $1 spent. If our average customer spends $65 per visit and visits 3 times per month, what is the loyalty cost per customer per month? And at what incremental visit frequency does the program break even?`,
    expectedFocus: ["points", "break-even", "cost", "frequency"]
  },
  {
    id: "seasonal-cash-reserve",
    title: "Summer slow season \u2014 cash reserve and cost cuts",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "money_mike",
    toolContext: `[Known data point: Last August revenue dropped 22% vs June. This is the primary data the operator has shared \u2014 all recommendations MUST be anchored to this 22% figure. For example: if June revenue is $X, August is $X \xD7 0.78, so the cash reserve should cover at least the gap = $X \xD7 0.22 \xD7 2 months. Cost lines should be prioritized: variable costs first (vendor orders, hourly staffing), then semi-variable (marketing), then fixed last.]`,
    prompt: `Last August revenue dropped 22% compared to June. I want to prepare this year instead of scrambling. How much cash reserve should I hold going into summer? Which cost lines \u2014 staffing, marketing, vendor orders \u2014 should I trim first, and by how much?`,
    expectedFocus: ["reserve", "summer", "staffing", "trim"],
    mustReference: ["22%"]
  },
  {
    id: "shrinkage-loss-benchmark",
    title: "Shrinkage/loss rate benchmark for cannabis retail",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "money_mike",
    prompt: `Our quarterly inventory reconciliation shows a 2.1% shrinkage rate (units missing vs. units sold). Is that normal for cannabis retail? What does a healthy shrinkage rate look like, and at what level should I start treating it as a loss prevention red flag?`,
    expectedFocus: ["shrinkage", "benchmark", "loss prevention", "2.1"]
  },
  {
    id: "gift-card-float-tax",
    title: "Gift card float management \u2014 tax treatment",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "money_mike",
    prompt: `We have about $2,000 in unredeemed gift cards on the books from the last six months. How do I account for this on my books \u2014 is it a liability until redeemed? Is there a breakage rule where I can recognize unredeemed value as revenue, and does NY sales tax apply at purchase or at redemption?`,
    expectedFocus: ["gift card", "liability", "breakage", "tax"]
  },
  {
    id: "bundle-pricing-margin",
    title: "Bundle pricing math \u2014 better margin or just velocity?",
    kind: "non_data",
    threadType: "inventory_promo",
    primaryAgent: "pops",
    prompt: `A vendor is pushing me to do a "buy 2 get 1 free" bundle on their 1g vape cartridges at $32 each ($64 for 2 + 1 free = $21.33 effective price). Our current margin on that SKU is 38%. What does the effective margin look like on this bundle, and is it better to discount or bundle from a gross profit standpoint?`,
    expectedFocus: ["bundle", "margin", "effective", "gross profit"]
  },
  // ── Staff Operations (6 cases) ────────────────────────────────────────
  {
    id: "budtender-performance-metrics",
    title: "Budtender performance metrics \u2014 how to measure who sells well",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `I have 6 budtenders and I want to start measuring performance objectively. Beyond total sales, what metrics should I track per budtender \u2014 average ticket size, items per transaction, upsell rate? How do I pull this from a typical POS system and what targets are realistic for a Syracuse dispensary?`,
    expectedFocus: ["budtender", "average ticket", "upsell", "metrics"]
  },
  {
    id: "shift-scheduling-slow-tuesday",
    title: "Shift scheduling \u2014 slow Tuesday mornings, do we need 3 people?",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Tuesday 10 AM to 1 PM is consistently our slowest window \u2014 typically 8 to 12 transactions in 3 hours. We currently schedule 3 budtenders for that window but it feels like overkill. At what transaction volume does it make sense to drop to 2 staff, and how do I handle the regulatory minimum staffing requirements for NY?`,
    expectedFocus: ["scheduling", "staffing", "Tuesday", "transactions"]
  },
  {
    id: "upsell-commission-structure",
    title: "Commission structure for upsells on concentrates",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "money_mike",
    prompt: `I want to incentivize budtenders to push concentrates \u2014 our highest-margin category. If I offer $0.50 per unit sold on concentrates, and each budtender sells an average of 12 concentrate units per shift, what is the weekly payout per budtender? Is there a risk this creates a pushy sales culture that hurts customer experience?`,
    expectedFocus: ["commission", "concentrate", "incentive", "culture"]
  },
  {
    id: "training-recertification-ny",
    title: "Training certification \u2014 when does NY require re-certification?",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    prompt: `I hired three new budtenders last year and they completed their initial state-required training. How often does New York require re-certification for cannabis retail employees? Are there separate requirements for managers versus floor staff?`,
    expectedFocus: ["training", "certif", "recertif", "NY"]
  },
  {
    id: "loss-prevention-internal-signals",
    title: "Loss prevention \u2014 behavioral signals of internal theft",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "money_mike",
    prompt: `My shrinkage numbers have been creeping up and I suspect it might be internal. What are the behavioral and transactional red flags that suggest an employee might be stealing \u2014 specific POS patterns, voided transactions, till shortages? How do I investigate without falsely accusing someone?`,
    expectedFocus: ["internal theft", "void", "till", "red flag"]
  },
  {
    id: "overtime-management",
    title: "Overtime management \u2014 staying under 40 hours without cutting service",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "money_mike",
    prompt: `Two of my full-time budtenders hit overtime last month \u2014 one at 44 hours, one at 47. Overtime at 1.5x is hitting the payroll hard. What scheduling tactics can I use to stay under 40 hours for full-time staff without reducing floor coverage or quality? Does NY have any specific overtime rules for cannabis retail I should know about?`,
    expectedFocus: ["overtime", "40 hours", "scheduling", "coverage"]
  },
  // ── Customer Escalations (6 cases) ────────────────────────────────────
  {
    id: "angry-yelp-threat",
    title: "Angry customer threatening Yelp review over wrong product",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `A customer is at the counter right now threatening to leave a one-star Yelp review. They say they asked for a hybrid vape and got an indica \u2014 different effect than expected. They want a full refund and are being loud. How do I de-escalate this in the moment and handle the potential review?`,
    expectedFocus: ["de-escalat", "refund", "Yelp", "review"]
  },
  {
    id: "sick-after-product-medical-claim",
    title: "Customer claims product made them sick \u2014 medical claim edge case",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    prompt: `A customer called and said they got sick after using an edible we sold them last week. They are using the word "poisoned" and asking us to pay their urgent care bill. This feels like a compliance and liability situation. What are my immediate steps \u2014 document, notify OCM, refuse to admit liability? Should I call our insurance?`,
    expectedFocus: ["document", "liability", "OCM", "insurance"]
  },
  {
    id: "loyalty-points-dispute",
    title: "Loyalty points dispute \u2014 customer says 3 visits missing",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `A regular customer says they have not received loyalty points for their last 3 visits despite checking in each time. Their account shows zero points earned in the past month, but our POS shows they visited on 4/2, 4/9, and 4/15. How do I investigate and resolve this \u2014 is this a POS sync issue, wrong phone number, or something else?`,
    expectedFocus: ["points", "POS", "phone", "resolve"]
  },
  {
    id: "whale-customer-churn",
    title: "Whale customer who suddenly stopped coming",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `One of our top customers \u2014 averaging $280 per visit, 3 visits per month for the last 8 months \u2014 has not been in for 6 weeks. That is $1,680 in lost revenue at their pace. How should I try to win them back? Can I call them directly or is that a compliance issue? What should I say?`,
    expectedFocus: ["win back", "reach out", "customer", "retention"]
  },
  {
    id: "repeat-return-customer",
    title: "Repeat return customer \u2014 4 returns in 6 months",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `A customer has returned products 4 times in the last 6 months \u2014 each time saying the product was not what they expected or they changed their mind. Our return policy is technically unlimited for unopened product. At what point do I flag this as abuse? How do I handle the conversation without losing them as a customer?`,
    expectedFocus: ["return", "policy", "abuse", "flag"]
  },
  {
    id: "customer-purchase-history-request",
    title: "Customer asking for purchase history data \u2014 privacy request",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    toolContext: `[NY privacy law applicability: (1) HIPAA does not apply to cannabis dispensaries \u2014 it covers healthcare providers, not retail cannabis. (2) NY SHIELD Act (2020) requires reasonable data security but does NOT give customers a mandatory right to access their own purchase data. (3) NY Cannabis Law \xA7130 protects cannabis purchase data from disclosure to third parties (e.g., employers, insurers, law enforcement without a warrant) \u2014 but this is about restricting outbound disclosure, not mandating access. (4) There is no current NY state law requiring you to produce a customer's full purchase history on demand \u2014 this request is voluntary to fulfill. (5) Recommended action: confirm the customer's identity, produce what your POS can export, document the request in writing, and note that cannabis purchase records are confidential and not shared with third parties.]`,
    prompt: `A customer is asking for a complete copy of their purchase history \u2014 every transaction for the past 2 years. They mentioned something about HIPAA and their right to their data. What are my actual obligations under NY cannabis law and state privacy law to provide this? Is this a standard request I should fulfill immediately?`,
    expectedFocus: ["purchase history", "privacy", "data", "NY"],
    mustReference: ["HIPAA", "voluntary"]
  },
  // ── Seasonal / Event Planning (6 cases) ───────────────────────────────
  {
    id: "four-twenty-vs-four-nineteen",
    title: "4/20 vs 4/19 pre-sale strategy \u2014 which day drives more revenue?",
    kind: "non_data",
    threadType: "marketing",
    primaryAgent: "craig",
    prompt: `4/20 is on a Sunday this year and 4/19 is a Saturday. I only have budget for one big promotional push. Should I run the main promo on 4/19 (pre-day, capture planners) or 4/20 itself? What does typical dispensary data say about which day drives higher revenue in this window?`,
    expectedFocus: ["4/20", "4/19", "revenue", "promo"]
  },
  {
    id: "holiday-inventory-buffer",
    title: "Holiday inventory buffer \u2014 Christmas and New Year",
    kind: "non_data",
    threadType: "inventory_promo",
    primaryAgent: "money_mike",
    toolContext: `[Calculation context: Normal weekly flower = 120 units. A 50% buffer = 60 extra units, bringing holiday order to 180 units. A 2-week holiday window with 50% uplift = 240 units needed (vs 240 normal). Given 45-day shelf life for flower and typical vendor lead time of 7\u201314 days, order placement should be 3 weeks before the holiday window begins (early December for Christmas). This avoids rush orders while staying within freshness window.]`,
    prompt: `Last Christmas week we ran out of our top 3 flower SKUs two days before December 25 and missed sales. This year I want to buffer properly. If our average weekly flower sales are 120 units, what percentage buffer should I order going into the holiday window, and how many weeks out should I place the order with vendors?`,
    expectedFocus: ["buffer", "holiday", "inventory", "order"],
    mustReference: ["120", "weeks"]
  },
  {
    id: "back-to-college-syracuse",
    title: "Back-to-college season at Syracuse University \u2014 sales spike?",
    kind: "non_data",
    threadType: "marketing",
    primaryAgent: "craig",
    prompt: `Syracuse University students come back in late August. Does a college return typically drive a sales spike for dispensaries nearby? If so, what product categories perform best with that demographic and how should I adjust my inventory and promotions for the last week of August?`,
    expectedFocus: ["college", "Syracuse", "student", "spike"]
  },
  {
    id: "super-bowl-edibles-plan",
    title: "Super Bowl Sunday \u2014 historically high for edibles, how to plan",
    kind: "non_data",
    threadType: "marketing",
    primaryAgent: "craig",
    prompt: `Super Bowl Sunday is coming up and I have heard edibles and beverages spike that day. What does game-day demand typically look like for a dispensary? Should I stock extra edibles, pre-roll multi-packs, and infused beverages? What is a realistic uplift percentage to plan for?`,
    expectedFocus: ["Super Bowl", "edibles", "stock", "demand"]
  },
  {
    id: "summer-festival-competitive-response",
    title: "Summer festival season \u2014 competitor tent deal response",
    kind: "non_data",
    threadType: "competitor_intel",
    primaryAgent: "ezal",
    prompt: `Two competitors are setting up tent deals at the Alive at Five concert series downtown this summer. They are offering 20% off for anyone who shows a festival wristband. We are not set up for outdoor events. How do I counter this without an event presence \u2014 in-store promotions, geofenced digital ads, something else?`,
    expectedFocus: ["competitor", "festival", "counter", "promotion"]
  },
  {
    id: "tax-return-season-spending-spike",
    title: "Tax return season (Feb-March) \u2014 consumer spending spike",
    kind: "non_data",
    threadType: "marketing",
    primaryAgent: "craig",
    toolContext: `[No verified cannabis industry benchmarks for tax refund spending spikes are available. The agent should acknowledge this honestly \u2014 do NOT invent specific percentages (e.g., "25-40% revenue spike") or cite unverified "industry data". Instead, recommend the operator check their own POS history for Feb/March vs January, and suggest practical marketing tactics they can prepare regardless of whether the spike materializes.]`,
    prompt: `I have heard that cannabis dispensaries see a noticeable bump in February and March when people get tax refunds. Is this real? If so, what categories see the biggest lift \u2014 flower, concentrates, premium SKUs? How should I adjust purchasing and marketing for that window?`,
    expectedFocus: ["tax refund", "February", "March", "your own data"],
    mustNotContain: ["industry data shows", "typically see a", "research shows"],
    mustReference: ["your own", "POS", "history"]
  },
  // ── Competitive Intelligence Edge Cases (6 cases) ─────────────────────
  {
    id: "competitor-bogo-flower",
    title: "Competitor BOGO flower \u2014 match or differentiate?",
    kind: "non_data",
    threadType: "competitor_intel",
    primaryAgent: "ezal",
    prompt: `Dazed just launched a BOGO on all 3.5g flower this weekend. Our flower margin is 42% on average. If I match their BOGO, I effectively cut margin to ~21% on those units. Should I match it, counter with a value-add offer (free pre-roll), or hold price and differentiate on service? What would you do?`,
    expectedFocus: ["BOGO", "Dazed", "margin", "differentiate"]
  },
  {
    id: "new-dispensary-opening-nearby",
    title: "New dispensary opening 0.5 miles away \u2014 pre-emptive retention",
    kind: "non_data",
    threadType: "competitor_intel",
    primaryAgent: "ezal",
    prompt: `A new dispensary is opening 0.5 miles from us next month. They are advertising aggressively on social and offering a grand opening 30% off everything deal for the first week. What should I do in the next 3 weeks before they open to lock in my best customers before the competitor launches?`,
    expectedFocus: ["competitor", "opening", "retention", "lock in"]
  },
  {
    id: "competitor-loyalty-more-generous",
    title: "Competitor loyalty program more generous \u2014 budtender talking points",
    kind: "non_data",
    threadType: "competitor_intel",
    primaryAgent: "ezal",
    prompt: `A customer pointed out that Dazed gives 2 points per dollar and we only give 1 point per dollar. On paper their program looks better. Without matching their rate, what talking points can I give budtenders to justify our loyalty program when customers make this comparison?`,
    expectedFocus: ["loyalty", "talking points", "value", "competitor"]
  },
  {
    id: "competitor-instagram-possible-violation",
    title: "Competitor advertising on Instagram \u2014 possible OCM violation, do we report?",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    toolContext: `[NY OCM complaint process: (1) OCM accepts complaints via their official website (cannabis.ny.gov) under the "File a Complaint" section \u2014 complaints can be filed anonymously or with contact info. (2) For advertising complaints, OCM's enforcement team reviews and may issue a Notice of Non-Compliance (NOC) to the offending licensee. (3) Risks of filing: filing a complaint is generally protected; there is no retaliatory filing rule. However, if your own advertising has borderline compliance issues, filing against a competitor may draw attention to your own social media \u2014 do a self-audit first. (4) What makes this a clear violation vs. borderline: showing product images + prices alone is generally permitted if age-gated. A discount offer ("20% off") can cross into violations if it appears to induce purchase. If the account is not age-gated, that's a separate clear violation. (5) Document the post with screenshots including the date and URL before filing \u2014 OCM may take weeks to act and the post could be deleted. (6) Strategic note: competitor complaints are legitimate and common; OCM does act on them. But the cleaner move is to ensure your own compliance is airtight before filing.]`,
    prompt: `A competing dispensary is running Instagram ads showing product photos with prices and what looks like a discount offer. Based on what I know about OCM advertising rules, this looks like a violation. Should I report them to OCM? What is the reporting process and are there any risks to us for filing a complaint?`,
    expectedFocus: ["OCM", "report", "violation", "Instagram"],
    mustReference: ["OCM", "screenshot", "complaint"]
  },
  {
    id: "price-war-floor-price",
    title: "Price war risk \u2014 if Dazed drops flower to $28/3.5g",
    kind: "non_data",
    threadType: "competitor_intel",
    primaryAgent: "ezal",
    prompt: `Intelligence says Dazed is planning to drop 3.5g flower to $28 \u2014 we are currently at $38. Our COGS on that size is about $17. If I match $28 I keep only $11 gross margin per unit. At what price do I walk away from the race and let them lose money? And how do I keep my customers without matching a price that is below a healthy margin?`,
    expectedFocus: ["price war", "floor", "margin", "COGS"]
  },
  {
    id: "competitor-closed-capture-customers",
    title: "Competitor closed unexpectedly \u2014 capture their customers now",
    kind: "non_data",
    threadType: "competitor_intel",
    primaryAgent: "ezal",
    prompt: `Green Gorilla dispensary 0.8 miles from us just closed unexpectedly \u2014 their door is locked and their Weedmaps listing is gone. This is roughly 200-300 customers who need a new home. What should I do in the next 48-72 hours to capture as many of those customers as possible? Social posts, signage, offers?`,
    expectedFocus: ["competitor", "closed", "capture", "customers"]
  },
  // ── Multi-Turn Complex (6 cases) ──────────────────────────────────────
  {
    id: "multi-turn-inventory-tax-writeoff",
    title: "Multi-turn: slow mover discount \u2192 write-off tax treatment",
    kind: "multi_turn",
    threadType: "inventory_promo",
    primaryAgent: "money_mike",
    history: [
      {
        role: "user",
        content: "Which slow movers should I discount this week? I have 24 units of House Tincture 500mg at $58 that have been sitting 60 days and 18 units of a vape cart that is being discontinued."
      },
      {
        role: "assistant",
        content: 'Both are solid candidates for a clearance push. The tincture at 60 days and the discontinued vape are both at risk of becoming unsaleable. I would price the tincture at $38 (30% off) and the vape at $22 (around 35% off) \u2014 both still above your cost basis. Run them as a "Clearance Corner" end cap for 10 days before deciding on write-off.'
      }
    ],
    prompt: `We discounted both but only sold 6 tinctures and 4 vapes in 10 days. The rest are not moving. The vape vendor confirmed they will not buy back unsold units. If I have to write these off as inventory losses, how does that work on my books \u2014 do I deduct the full retail price, the cost basis, or something else? And is a cannabis inventory write-off treated differently for tax purposes?`,
    expectedFocus: ["write-off", "cost basis", "tax", "inventory"]
  },
  {
    id: "multi-turn-winback-complaint",
    title: "Multi-turn: win-back list \u2192 manager followed up, customer complained",
    kind: "multi_turn",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    history: [
      {
        role: "user",
        content: "I want to run a win-back campaign for customers who have not visited in 90 days. Can you help me set that up?"
      },
      {
        role: "assistant",
        content: "Sure \u2014 pull a Lapsed 90-Day segment from your CRM, create a personalized SMS or email with a time-limited offer (e.g., 15% off next visit, expires in 2 weeks), and have the manager do personal outreach for your top 10 whale accounts."
      }
    ],
    prompt: `The manager called one of the top whale accounts personally. The customer said they felt "stalked" and asked how we got their number. They are upset. Now they are threatening to file a complaint with the state about our use of their personal data. How do I handle this customer relationship and is there a real compliance risk here around how we contact customers?`,
    expectedFocus: ["complaint", "data", "contact", "compliance"]
  },
  {
    id: "multi-turn-craig-campaign-compliance",
    title: "Multi-turn: Craig proposed campaign \u2192 owner pushed back on compliance",
    kind: "multi_turn",
    threadType: "marketing",
    primaryAgent: "craig",
    history: [
      {
        role: "user",
        content: "Craig, put together a 4/20 campaign idea for me."
      },
      {
        role: "assistant",
        content: 'Here is a concept: "420 Countdown" \u2014 run a 5-day deal where each day features a different category at 20% off. Email blast on 4/15, SMS push on 4/19 morning, and an in-store display with a countdown clock. Close it with a VIP early-access hour at 8 AM on 4/20 for loyalty members.'
      }
    ],
    prompt: `I love the concept but I am worried about the email blast and SMS. OCM has restrictions on advertising discounts and I do not want to get fined. Can you revise the campaign so it is compliance-safe \u2014 same energy but the messaging does not violate NY advertising rules? Specifically how do we communicate the "20% off" without putting it in a blast?`,
    expectedFocus: ["OCM", "compliance", "campaign", "revise"]
  },
  {
    id: "multi-turn-delivery-driver-liability",
    title: "Multi-turn: delivery rules \u2192 third-party driver liability",
    kind: "multi_turn",
    threadType: "compliance",
    primaryAgent: "deebo",
    toolContext: `[NY commercial auto insurance requirements for cannabis delivery: (1) Employer liability: under NY respondeat superior doctrine, if an employee causes an accident while acting within the scope of their employment (making a delivery), the employer is liable. This is not optional \u2014 it is NY common law. (2) Vehicle registration: delivery vehicles must be in the business name (or listed on a business commercial auto policy) \u2014 an employee's personal auto policy will typically deny a claim involving commercial cannabis delivery activity. (3) Required coverage: Commercial General Auto Liability, minimum $1M per occurrence for cannabis delivery (some OCM licenses require higher); cargo insurance covering cannabis product in transit (often $50K\u2013$200K depending on delivery volume); Workers' Comp for the driver. (4) OCM requirement: proof of commercial auto insurance must be on file with OCM and listed on your delivery license \u2014 personal vehicle policies are specifically excluded. (5) Practical action steps: (a) title delivery vehicles in business name, (b) obtain commercial auto policy with cannabis rider, (c) add cargo insurance, (d) require drivers to carry proof of insurance in vehicle at all times for METRC manifest compliance.]`,
    history: [
      {
        role: "user",
        content: "What does Thrive need to set up delivery in NY?"
      },
      {
        role: "assistant",
        content: "NY requires a separate Retail Delivery License from OCM in addition to your dispensary license. You need a compliant vehicle (locked storage), a delivery manifest for each run, GPS tracking, and drivers must be employees \u2014 not independent contractors. Age verification at the door is required for every delivery."
      }
    ],
    prompt: `Okay, so drivers have to be our employees \u2014 got it. But what if one of our delivery drivers gets into an accident while making a delivery and it is their fault? Are we liable as the employer? Should the vehicle be in Thrive's name or the employee's name, and what kind of commercial auto insurance do we need?`,
    expectedFocus: ["liability", "insurance", "commercial", "vehicle"],
    mustReference: ["commercial", "liability", "business"]
  },
  {
    id: "multi-turn-q2-q3-projection",
    title: "Multi-turn: monthly revenue \u2192 Q2 vs Q3 projection",
    kind: "multi_turn",
    threadType: "performance",
    primaryAgent: "pops",
    history: [
      {
        role: "user",
        content: "How is our monthly revenue trending?"
      },
      {
        role: "assistant",
        content: "Based on what is available: January $285K, February $302K, March $318K \u2014 a solid upward trend of about 5-6% month over month. That puts you on pace for roughly $340K in April if the trend holds."
      }
    ],
    prompt: `Good. Now I need to model out Q2 versus Q3. Q2 is April through June (the busy spring season), Q3 is July through September (historically 15-22% slower for us). If Q2 comes in at $340K, $355K, $370K respectively, and Q3 drops by 18%, what is the revenue delta between quarters and how much cash should I be keeping in reserve at the end of Q2 to cover the Q3 dip?`,
    expectedFocus: ["Q2", "Q3", "projection", "reserve"]
  },
  {
    id: "multi-turn-scheduling-complaint",
    title: "Multi-turn: scheduling question \u2192 employee complaint",
    kind: "multi_turn",
    threadType: "performance",
    primaryAgent: "pops",
    history: [
      {
        role: "user",
        content: "Slow Tuesday mornings are killing my labor cost. Should I cut from 3 budtenders to 2 for the 10 AM to 1 PM shift?"
      },
      {
        role: "assistant",
        content: "At 8-12 transactions in 3 hours, 2 budtenders is defensible as long as you keep at least one manager-level person on the floor for compliance. Drop the third shift starting Tuesday and watch queue time \u2014 if any day exceeds a 4-minute average wait, add back a float worker."
      }
    ],
    prompt: `I cut to 2 budtenders on Tuesday mornings this week. One of them filed an HR complaint saying it was retaliation because they had reported a safety issue to me last month. I did not even remember that complaint. Now I am worried about a wrongful retaliation claim. What are my immediate steps \u2014 document the scheduling decision rationale, talk to HR, call a lawyer? And does NY have whistleblower protections that apply here?`,
    expectedFocus: ["retaliation", "document", "HR", "whistleblower"]
  },
  // ── Platform / Operational Edge Cases (4 cases) ───────────────────────
  {
    id: "pos-system-down-compliance",
    title: "POS system went down mid-day \u2014 compliance and logging steps",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    prompt: `Our Alleaves POS went down at 11 AM and it is now 1:30 PM. We have been recording transactions manually on paper. NY requires a real-time seed-to-sale tracking record. What are our compliance obligations right now \u2014 do I have to stop selling, document manually for OCM, notify someone, or is there a grace period? And when the system comes back up, what do I have to reconcile?`,
    expectedFocus: ["POS", "OCM", "manual", "reconcile"]
  },
  {
    id: "alleaves-sync-failure",
    title: "Alleaves sync failed \u2014 inventory shows wrong counts",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "auto",
    prompt: `The Alleaves sync did not run last night and now our inventory counts in BakedBot are showing numbers from two days ago. We have had sales since then so everything is off by an unknown amount. Who do I contact to force a manual sync? And in the meantime, how do I know which counts to trust \u2014 the BakedBot view or the Alleaves dashboard directly?`,
    expectedFocus: ["Alleaves", "sync", "inventory", "counts"]
  },
  {
    id: "kiosk-out-of-stock-mismatch",
    title: "Kiosk showing out-of-stock but inventory exists",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "auto",
    prompt: `The kiosk is showing three of our best-selling flower products as out of stock but I can physically see the jars on the shelf. This has been going on since this morning and customers are walking past them. Is this a sync delay, a POS reservation issue, or something in the kiosk configuration? What is the fastest way to get those products showing as available?`,
    expectedFocus: ["kiosk", "out of stock", "sync", "products"]
  },
  {
    id: "email-campaign-wrong-segment",
    title: "Email campaign sent to wrong segment \u2014 containment steps",
    kind: "non_data",
    threadType: "marketing",
    primaryAgent: "craig",
    prompt: `We just sent a "Win Back \u2014 90 Days Lapsed" email campaign but the segment filter was wrong and it went to ALL active customers including people who were just in the store yesterday. The email says "We miss you \u2014 it has been a while." 847 people got it who should not have. What do I do now \u2014 do I send a correction email, ignore it, or something else?`,
    expectedFocus: ["wrong segment", "correction", "email", "active"]
  },
  // ─── SMOKEY — PRODUCT EDUCATION (20 CASES) ─────────────────────────────────
  {
    id: "smokey-wedding-cake-vs-gelato",
    title: "Strain comparison: Wedding Cake vs. Gelato",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    toolContext: `[Strain profiles (describe by aroma/flavor/occasion only \u2014 no effect claims): Wedding Cake (also called Pink Cookies): dominant terpenes typically caryophyllene, limonene, myrcene; aroma profile \u2014 sweet vanilla, earthy pepper, slight citrus; commonly associated with evening or unwinding occasions; typical THC range 22\u201326%. Gelato (GSC cross): dominant terpenes typically myrcene, caryophyllene, limonene; aroma \u2014 sweet citrus with earthy notes and hints of sherbet; typically associated with social or early-evening occasions; THC range 20\u201325%. Key differentiation talking point: Wedding Cake leans more toward earthy-herbal base notes, Gelato toward sweet-citrus. Customers who prefer dessert-type flavor profiles tend to gravitate toward Gelato; customers who prefer earthier profiles tend toward Wedding Cake. Both are popular for experienced users. Neither should be framed as "stronger" than the other \u2014 explain that terpene interaction matters more than THC percentage alone.]`,
    prompt: `A customer is choosing between Wedding Cake and Gelato. How do you explain the difference to help them decide \u2014 profile, experience characteristics, and which type of customer usually gravitates toward each?`,
    expectedFocus: ["Wedding Cake", "Gelato", "terpene", "profile"],
    mustReference: ["terpene", "aroma"]
  },
  {
    id: "smokey-indica-sativa-hybrid-modern",
    title: "Indica / Sativa / Hybrid \u2014 modern understanding",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    prompt: `My budtenders are still telling customers "sativa gives you energy, indica puts you to sleep." I know this is outdated. What is the modern, science-backed way to explain the difference between indica, sativa, and hybrid to a curious customer without making medical claims?`,
    expectedFocus: ["terpene", "cannabinoid", "outdated", "experience"]
  },
  {
    id: "smokey-rosin-vs-other-concentrates",
    title: "What is rosin and why is it pricier?",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    toolContext: `[Rosin vs. other concentrates \u2014 budtender talking points: Rosin is solventless \u2014 it is made by applying heat and pressure to cannabis flower or hash, squeezing out the oil with no chemicals involved. All other common concentrates (BHO wax, live resin, shatter, distillate) use a hydrocarbon or CO2 solvent that must then be purged from the final product. Why rosin costs more: lower yield per pound of input material (typically 10\u201325% for flower rosin vs. 60\u201380% for BHO), slower production process, and higher quality input material required. Conversation script example: "Rosin is made the same way you'd press a grape \u2014 just heat and pressure, nothing else. That means what's in the jar is exactly what was in the plant, terpenes and everything. Other concentrates use a solvent like butane that gets cleaned out, but rosin skips that step entirely. The trade-off is it costs more because you get less rosin out of the same amount of flower, and it takes a skilled tech to do it right. Customers who want the most direct representation of the plant's profile tend to prefer rosin."]`,
    prompt: `Customers keep asking why rosin is so much more expensive than other concentrates. How do we explain what rosin is, how it is made, and why the price premium is justified \u2014 all without using any medical language?`,
    expectedFocus: ["solventless", "extraction", "price", "process"],
    mustReference: ["solventless", "yield"]
  },
  {
    id: "smokey-first-time-user-guidance",
    title: "First-time user product guidance",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    prompt: `A customer tells the budtender: "I have never tried cannabis before. What should I start with?" Walk through how Smokey guides that conversation \u2014 which product types to suggest, what dosage approach to mention, and what talking points to use \u2014 without making any medical claims or promising specific effects.`,
    expectedFocus: ["low dose", "start", "first-time", "format"],
    mustNotContain: ["helps with", "relieves", "treats", "symptom", "condition", "medical", "therapeutic", "anxiety", "sleep", "depression"]
  },
  {
    id: "smokey-thc-percentage-myth",
    title: "THC percentage \u2014 is 30% better than 22%?",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    prompt: `A customer holds up a 30% THC flower and a 22% THC flower and asks: "The 30% one is better, right? More THC means stronger?" How does Smokey explain why THC percentage alone does not tell the whole story, and what factors actually shape the experience?`,
    expectedFocus: ["terpene", "percentage", "entourage", "experience"]
  },
  {
    id: "smokey-cbg-products",
    title: "CBG products \u2014 what are they and how do they differ from CBD?",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    prompt: `We just got a few CBG products in and customers are asking what CBG is. How do I explain CBG to a curious customer, how it differs from CBD, and what kind of shopper is a good fit for it \u2014 all without medical claims?`,
    expectedFocus: ["CBG", "cannabinoid", "CBD", "minor"],
    mustNotContain: ["helps with", "relieves", "treats", "symptom", "condition", "medical", "therapeutic", "anxiety", "sleep", "depression"]
  },
  {
    id: "smokey-terpene-deep-dive",
    title: "Terpene profile deep dive \u2014 myrcene, limonene, pinene",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    toolContext: `[Compliance rule: Describe terpenes ONLY using aroma, flavor, and use-occasion language. NEVER claim terpenes produce effects like sedation, couch-lock, euphoria, alertness, mood-enhancement, or calming. Correct: "myrcene has an earthy, herbal aroma and is common in strains associated with evening occasions." Incorrect: "myrcene is sedating and causes couch-lock."]`,
    prompt: `A customer is reading the product label and wants to know what the terpene percentages mean. How would Smokey explain myrcene, limonene, and beta-pinene in plain language \u2014 what each one contributes to the product experience \u2014 without making any medical claims?`,
    expectedFocus: ["myrcene", "limonene", "pinene", "aroma"],
    mustNotContain: ["helps with", "relieves", "treats", "symptom", "condition", "medical", "therapeutic", "anxiety", "sleep", "depression", "sedating", "couch-lock", "mood-enhancing", "alertness", "energizing", "calming", "uplifting"],
    mustReference: ["aroma", "occasion"]
  },
  {
    id: "smokey-live-resin-vs-cured-resin",
    title: "Live resin vs. cured resin carts \u2014 real difference",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    prompt: `Customers keep asking about the difference between live resin and cured resin cartridges. How does Smokey explain it in a way that helps the customer decide which one to buy, without over-claiming?`,
    expectedFocus: ["live resin", "cured", "terpene", "harvest"]
  },
  {
    id: "smokey-rso-explanation",
    title: "RSO \u2014 explain the product without medical claims",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    prompt: `A customer points to our RSO (Rick Simpson Oil) and asks what it is and who buys it. How does Smokey explain RSO \u2014 what it is, how it is consumed, and the customer profile \u2014 without making any medical claims?`,
    expectedFocus: ["RSO", "full-spectrum", "concentrated", "consumption"],
    mustNotContain: ["cancer", "cure", "treats", "relieves", "symptom", "condition", "medical", "therapeutic", "pain"]
  },
  {
    id: "smokey-infused-preroll-question",
    title: "Infused pre-roll \u2014 what is it, is it much stronger?",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    prompt: `A customer picks up an infused pre-roll and asks: "What makes this infused, and is it a lot stronger than a regular joint?" How does Smokey answer clearly and honestly without overselling potency or making medical claims?`,
    expectedFocus: ["infused", "concentrate", "potency", "regular"]
  },
  {
    id: "smokey-edibles-onset-time",
    title: "Edibles onset time \u2014 customer says they feel nothing",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    prompt: `A customer comes back 45 minutes after purchasing a 10mg gummy and says "I don't feel anything, do I need more?" Walk through how Smokey handles this conversation \u2014 explaining onset time, why edibles metabolize differently, and what guidance to give \u2014 without making any medical promises.`,
    expectedFocus: ["onset", "liver", "wait", "metabolism"],
    mustNotContain: ["helps with", "relieves", "treats", "symptom", "condition", "medical", "therapeutic"]
  },
  {
    id: "smokey-microdosing-concept",
    title: "Micro-dosing \u2014 how to frame low-dose products",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    toolContext: `[Microdosing talking points \u2014 compliant framing: A microdose is typically defined as 2.5mg THC or less per serving \u2014 the goal is a sub-perceptual or minimal-effect experience while still engaging. Best product formats for microdosing: (1) Low-dose edibles (2.5mg THC gummies or mints) \u2014 precise, consistent, discreet; (2) 1:1 CBD:THC products at low total THC \u2014 commonly 2.5\u20135mg THC with equal CBD; (3) Low-THC vape pens for more immediate onset with smaller doses. Compliant talking points: "Microdosing is about finding the lowest amount that gives you the kind of experience you're looking for, without going further than you want to go. A lot of customers start at 2.5mg and check in with themselves before taking more. It's a way to get familiar with how cannabis affects you specifically, without committing to a full standard dose." Do NOT: promise outcomes, claim it works for any condition, or imply it is safer or healthier than other doses. DO: mention 2.5mg as a common starting point, emphasize low-dose formats, recommend waiting 2 hours before considering more for edibles.]`,
    prompt: `We are getting more customers interested in micro-dosing. How does Smokey explain the concept of micro-dosing cannabis to a customer, what product formats work best for it, and what talking points keep the conversation legal and compliant?`,
    expectedFocus: ["micro-dose", "low dose", "2.5mg", "format"],
    mustNotContain: ["helps with", "relieves", "treats", "symptom", "condition", "medical", "therapeutic", "anxiety", "pain"],
    mustReference: ["2.5", "format"]
  },
  {
    id: "smokey-full-spectrum-vs-isolate",
    title: "Full-spectrum vs. broad-spectrum vs. isolate",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    prompt: `A customer is looking at CBD tinctures and is confused about full-spectrum vs. broad-spectrum vs. isolate. How does Smokey explain the three clearly and help the customer figure out which fits them \u2014 without making any health or medical claims?`,
    expectedFocus: ["full-spectrum", "broad-spectrum", "isolate", "cannabinoid"],
    mustNotContain: ["helps with", "relieves", "treats", "symptom", "condition", "medical", "therapeutic"]
  },
  {
    id: "smokey-customer-says-product-made-sick",
    title: "Customer says product made them sick \u2014 budtender protocol",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    prompt: `A customer comes in and says the edible they bought last week "made them sick." How does the budtender respond? What is the protocol for documenting the complaint, what we can and cannot say, and when to escalate to the manager?`,
    expectedFocus: ["document", "manager", "complaint", "protocol"],
    mustNotContain: ["medical", "doctor", "treatment", "symptom", "diagnosis"]
  },
  {
    id: "smokey-hash-rosin-vs-flower-rosin",
    title: "Hash rosin vs. flower rosin \u2014 the difference",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    toolContext: `[Hash rosin vs. flower rosin \u2014 technical talking points: Both are solventless (heat + pressure), but the input material differs. Flower rosin: pressed directly from cured or fresh-frozen flower. Yields are typically 10\u201325% of input weight. The result retains the strain's terpene profile and full spectrum of cannabinoids. Hash rosin: made by first creating ice water hash (bubble hash) or dry sift hash from the trichome heads, THEN pressing that hash with heat. Yields per pound of original flower are lower (~5\u201315%), but the concentrate is more refined \u2014 higher terpene concentration per gram, lighter color, cleaner flavor. Why collectors prefer hash rosin: the extra refinement step creates a more expressive terpene profile and smoother dab. Why it costs more: double the labor and skill required, lower overall yield from starting material. Budtender comparison script: "Both are solventless and made the same basic way \u2014 heat and pressure. The difference is flower rosin starts with the whole flower bud, while hash rosin starts with just the trichomes \u2014 the tiny resin glands that were separated off the bud first. You get a more refined, expressive concentrate with hash rosin, which is why it costs more. Think of it like making coffee vs. espresso \u2014 similar process, but one is a more concentrated extraction."]`,
    prompt: `A customer is comparing a hash rosin and a flower rosin product and wants to know if the price difference is real. How does Smokey explain what sets hash rosin apart from flower rosin \u2014 process, input material, yield, and why collectors prefer one over the other?`,
    expectedFocus: ["hash rosin", "flower rosin", "input", "yield"],
    mustReference: ["yield", "terpene", "trichome"]
  },
  {
    id: "smokey-thca-flower",
    title: "THCA flower \u2014 what is it and how does it differ?",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    toolContext: `[THCA vs. THC \u2014 customer talking points: THCA (tetrahydrocannabinolic acid) is the raw, acidic form of THC found in the living plant. It is non-intoxicating in its raw form. When cannabis is smoked, vaped, or heated (decarboxylation), THCA converts to THC \u2014 the compound responsible for psychoactive effects. At a licensed NY dispensary, "THCA flower" is just dispensary flower labeled with its THCA content before decarboxylation. The THCA percentage on the label is effectively telling you the potential THC content when the product is heated. Budtender script: "THCA is what THC looks like before you heat it. The plant doesn't actually make THC directly \u2014 it makes THCA. When you smoke or vape it, the heat instantly converts THCA to THC. So when you see a flower with 25% THCA, that means it converts to close to 25% THC when you smoke it. At our dispensary, all the flower is lab-tested and licensed \u2014 THCA flower is just regular cannabis with the chemistry explained more accurately on the label. The experience when you consume it is the same as flower labeled by THC." Note: in the context of non-dispensary or hemp-derived "THCA flower" sold online, the legal status is different \u2014 but at a licensed dispensary, all flower is regulated cannabis.]`,
    prompt: `A customer picks up a THCA flower product and asks how it is different from regular dispensary flower. How does Smokey explain THCA vs. THC, decarboxylation, and what this means for the customer experience \u2014 without medical claims?`,
    expectedFocus: ["THCA", "decarboxylation", "heat", "THC"],
    mustReference: ["THCA", "heat", "convert"]
  },
  {
    id: "smokey-distillate-vs-live-resin-cart",
    title: "Distillate vs. live resin cart \u2014 which is better?",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    toolContext: `[Distillate vs. live resin carts \u2014 objective comparison for customer: Distillate: highly purified THC oil (often 85-95% THC), terpenes are stripped out during distillation and then re-added (often botanically-derived terpenes, not from the original plant). Consistent, clean, and usually the lowest price per mg THC. Live resin: made from fresh-frozen cannabis, preserving the original terpene profile of the live plant before drying changes it. Lower THC by percentage but more complex and authentic flavor. Higher price because of more complex extraction. Budtender script: "Distillate is the straightforward choice \u2014 it's consistent, clean, and the most affordable. Live resin costs more but brings along the natural terpene profile from the original plant, which gives it a more complex flavor. For customers who care about the flavor experience and want something closer to flower, live resin is worth the premium. For customers who want consistent, predictable THC at a good price, distillate gets the job done." Neither is objectively 'better' \u2014 it's about what the customer values: price, flavor complexity, or consistency.]`,
    prompt: `Customer asks: "My budtender recommended a live resin cart but distillate is cheaper \u2014 which is actually better for me?" How does Smokey walk through the differences objectively so the customer can choose based on their preferences and budget?`,
    expectedFocus: ["distillate", "live resin", "terpene", "price"],
    mustReference: ["distillate", "live resin", "terpene"]
  },
  {
    id: "smokey-topicals-transdermal",
    title: "Topicals and transdermal patches \u2014 explain without medical language",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    prompt: `We have topicals and transdermal patches in stock but budtenders struggle to explain them without drifting into medical claims. What is the budtender's talking-point script for explaining topicals vs. transdermal patches \u2014 what they are, how they work, and who might enjoy them \u2014 staying fully compliant?`,
    expectedFocus: ["topical", "transdermal", "absorption", "localized"],
    mustNotContain: ["helps with", "relieves", "treats", "symptom", "condition", "medical", "therapeutic", "pain", "inflammation"]
  },
  {
    id: "smokey-product-return-replacement",
    title: "Customer returning a product they did not like \u2014 replacement guidance",
    kind: "non_data",
    threadType: "general",
    primaryAgent: "smokey",
    prompt: `A customer returns with a vape cartridge they bought two days ago and says "I just didn't like it \u2014 the taste was off and it didn't do anything for me." How does Smokey handle the return conversation and guide them toward a better-fit replacement without dismissing their experience or making medical claims?`,
    expectedFocus: ["return", "replacement", "taste", "preference"],
    mustNotContain: ["helps with", "relieves", "treats", "symptom", "condition", "medical", "therapeutic"]
  },
  {
    id: "smokey-indica-to-social-multi-turn",
    title: "Multi-turn: customer loved indica, wants something more social",
    kind: "multi_turn",
    threadType: "general",
    primaryAgent: "smokey",
    toolContext: `[Compliant recommendations for "social" occasion: For a customer transitioning from an indica they loved to something with a more social/daytime character, recommend hybrids with a limonene or pinene terpene profile \u2014 these strains tend to have brighter citrus/pine aroma associated with daytime and social occasions. Avoid purely myrcene-dominant strains (earthy/herbal, often evening-associated). Specific framing: (a) Hybrid flower with caryophyllene + limonene terpene profile \u2014 bridges familiar smoothness with a brighter character; (b) Low-dose pre-roll (1g or less) for social settings \u2014 manageable and familiar format; (c) 2:1 CBD:THC tincture for customers who want a lighter, more controlled experience at social events. Compliant talking points: "For gatherings, a lot of customers like to go with a hybrid that has a lighter, citrusy aroma profile \u2014 it tends to pair well with social settings. We have a few options that should feel familiar to what you liked before but with a different character. I'd also suggest starting with a smaller amount if it's a new strain for you, especially at an event." NEVER say "more energizing" or "more social" in a causal sense \u2014 say "often preferred for daytime or social occasions."]`,
    history: [
      { role: "user", content: "A regular customer says they bought an indica last week and absolutely loved it \u2014 they said it was smooth and easy." },
      { role: "assistant", content: "Good to hear \u2014 knowing they enjoyed the indica gives us a solid baseline. We can look at hybrids with a similar terpene base that lean a bit more uplifting without losing that smoothness." }
    ],
    prompt: `They just came back and said they want "something similar but a little more social \u2014 like something I could use at a gathering." What strains or product types does Smokey recommend, and what talking points keep this compliant?`,
    expectedFocus: ["hybrid", "social", "terpene", "uplifting"],
    mustNotContain: ["helps with", "relieves", "treats", "symptom", "condition", "medical", "therapeutic", "anxiety", "depression"],
    mustReference: ["terpene", "occasion"]
  },
  // ─── MRS. PARKER — RETENTION & CRM (20 CASES) ──────────────────────────────
  {
    id: "parker-winback-sms-sandra",
    title: "Win-back SMS draft for Sandra T. \u2014 67 days inactive",
    kind: "data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `I need a win-back SMS for Sandra T. \u2014 67 days inactive, LTV $412, last purchase was Blue Dream flower. She opted in to SMS. Draft a compliant, personalized win-back message under 160 characters that references her buying history and gives her a reason to come back.`,
    expectedFocus: ["win-back", "SMS", "compliant", "personalized"]
  },
  {
    id: "parker-loyalty-tier-structure",
    title: "Loyalty tier structure \u2014 how many tiers and thresholds?",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `We are building a loyalty program and I am not sure how many tiers to have or what the visit/spend thresholds should be. What tier structure do dispensaries typically use that drives repeat visits without giving away too much margin?`,
    expectedFocus: ["tier", "threshold", "visit", "margin"]
  },
  {
    id: "parker-vip-churn-triage",
    title: "VIP churn triage \u2014 3 VIPs gone 45+ days",
    kind: "data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `Three of our top VIP customers have not been in for 45+ days. Here is their data:

| Name | Last Visit | LTV | Avg Monthly Spend | Preferred Category |
| --- | --- | ---: | ---: | --- |
| Marcus B. | 46 days ago | $2,840 | $380 | Concentrate |
| Priya K. | 51 days ago | $1,920 | $240 | Edible |
| David L. | 63 days ago | $3,100 | $410 | Flower |

Prioritize outreach order and draft a unique first-touch for each \u2014 SMS or call?`,
    expectedFocus: ["prioritize", "outreach", "LTV", "first-touch"]
  },
  {
    id: "parker-birthday-marketing-compliance",
    title: "Birthday discount \u2014 should we and is it compliant in NY?",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `We want to send customers a birthday discount offer. Is this a good retention tactic, and is it compliant under New York cannabis marketing rules? What is the right offer amount and communication channel?`,
    expectedFocus: ["birthday", "NY", "compliant", "discount"]
  },
  {
    id: "parker-segment-focus-spend",
    title: "Active 218 vs at-risk 44 vs dormant 31 \u2014 where to spend retention budget?",
    kind: "data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `Our CRM breaks down to: 218 active customers, 44 at-risk (30\u201360 days since last visit), 31 dormant (60+ days). We have a $300 retention budget this month. Where does Mrs. Parker recommend we focus \u2014 win-back, prevention, or VIP nurture \u2014 and what is the expected ROI logic?`,
    expectedFocus: ["at-risk", "segment", "budget", "prevention"]
  },
  {
    id: "parker-whale-three-months-inactive",
    title: "Whale customer $8,400 LTV \u2014 3 months inactive",
    kind: "data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `Our highest-LTV customer \u2014 James W., LTV $8,400, avg spend $700/month \u2014 has not been in for 3 months. No response to our standard SMS win-back. What is the white-glove outreach plan to re-engage someone at this value level, and at what point do we accept the churn?`,
    expectedFocus: ["white glove", "outreach", "LTV", "personal"]
  },
  {
    id: "parker-repeat-returner-risk",
    title: "Customer with 4 returns in 3 months \u2014 loyalty risk or theft risk?",
    kind: "data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `Customer Dina R. has returned 4 products in the last 3 months \u2014 gummy bag (half empty), vape cart (claimed defective), flower (said it smelled wrong), and a tincture (unopened, said wrong product). Total return value: $112. She still makes purchases. Is this a loyalty signal we should support or a risk flag?`,
    expectedFocus: ["returns", "pattern", "flag", "loyalty"]
  },
  {
    id: "parker-new-customer-nurture",
    title: "New customer \u2014 3 purchases in 2 weeks \u2014 nurture sequence",
    kind: "data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `A new customer Alex T. has visited 3 times in 2 weeks \u2014 spent $44, $67, and $89 on those visits, buying edibles both times then adding a vape. This is strong early engagement. What is the right nurture sequence to convert this early momentum into a long-term loyal customer?`,
    expectedFocus: ["nurture", "sequence", "loyalty", "early"]
  },
  {
    id: "parker-loyalty-points-expiration",
    title: "Should loyalty points expire? Pros and cons",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `We are deciding whether to put an expiration on loyalty points. Some of our customers have been accumulating for months. What are the business pros and cons of points expiration, and what is the best practice for communicating it if we do implement it?`,
    expectedFocus: ["expiration", "pros", "cons", "communicate"]
  },
  {
    id: "parker-angry-customer-loyalty-reward",
    title: "Customer angry about missing loyalty reward \u2014 response",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `A customer emailed us angry: "I was told I'd get a free pre-roll after my 10th visit and nobody gave it to me at visit #11. I feel cheated." How does Mrs. Parker recommend we respond and resolve this in a way that turns the complaint into retention?`,
    expectedFocus: ["resolve", "retention", "response", "trust"]
  },
  {
    id: "parker-churn-rate-multi-turn",
    title: "Multi-turn: churn rate question + industry benchmark",
    kind: "multi_turn",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    history: [
      { role: "user", content: "We have 293 total customers who visited in the last 90 days. Of those, 31 have not returned in 60+ days." },
      { role: "assistant", content: "That gives you roughly a 10.6% dormant rate among your recent customer base \u2014 about 1 in 10 customers who came in during the 90-day window went quiet in the back half." }
    ],
    prompt: `How does that 10.6% dormant rate compare to industry benchmarks for dispensaries, and is it a number we should be worried about?`,
    expectedFocus: ["benchmark", "industry", "dormant", "compare"]
  },
  {
    id: "parker-dormant-offer-strategy",
    title: "Dormant 31 customers \u2014 what offer drives return visits?",
    kind: "data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `We have 31 dormant customers (60+ days inactive). Their average LTV is $284 and they averaged 2.4 visits/month when active. We have tried a standard "We miss you" SMS once already with no results. What offer or message type has the best chance of bringing them back, and should we treat all 31 the same or segment them further?`,
    expectedFocus: ["dormant", "offer", "segment", "LTV"]
  },
  {
    id: "parker-referral-program-ny-compliance",
    title: 'Referral program "bring a friend" \u2014 NY compliant?',
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `We want to run a "bring a friend, both get 10% off" referral promo. Is this compliant under New York OCM cannabis marketing rules? If not, what is a version that would be?`,
    expectedFocus: ["referral", "NY", "OCM", "compliant"]
  },
  {
    id: "parker-ltv-at-risk-analysis",
    title: "LTV table \u2014 top 10 customers, who is at risk?",
    kind: "data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `Here are our top 10 customers by LTV and their recent activity:

| Name | LTV | Last Visit | Avg Monthly Spend | Visits Last 90d |
| --- | ---: | --- | ---: | ---: |
| James W. | $8,400 | 91 days ago | $700 | 0 |
| Keisha M. | $4,210 | 8 days ago | $350 | 5 |
| Marcus B. | $3,100 | 46 days ago | $410 | 1 |
| Sandra T. | $2,840 | 67 days ago | $380 | 0 |
| Priya K. | $1,920 | 51 days ago | $240 | 1 |
| Tony R. | $1,740 | 3 days ago | $290 | 6 |
| Nina P. | $1,620 | 14 days ago | $270 | 4 |
| Alex T. | $1,200 | 2 days ago | $200 | 7 |
| David L. | $980 | 22 days ago | $163 | 3 |
| Carmen V. | $860 | 48 days ago | $144 | 1 |

Flag who is at risk and give an outreach priority order.`,
    expectedFocus: ["at risk", "priority", "LTV", "outreach"]
  },
  {
    id: "parker-post-visit-survey-strategy",
    title: "Post-visit survey \u2014 when and how to ask for feedback",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `We want to start collecting post-visit feedback. What is the best timing and format for a dispensary survey \u2014 how soon after the visit, what channel, how many questions \u2014 to maximize response rates and get actionable feedback?`,
    expectedFocus: ["timing", "survey", "channel", "response rate"]
  },
  {
    id: "parker-lost-cause-threshold",
    title: "At what point do we stop trying to win back a customer?",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `We have customers who have been dormant for 6+ months and have not responded to two win-back attempts. At what point do we mark them lost and stop spending resources on outreach? What is the framework for making that call?`,
    expectedFocus: ["threshold", "dormant", "framework", "lost"]
  },
  {
    id: "parker-data-deletion-request",
    title: "Customer requests data deletion \u2014 what is the process?",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `A customer emailed asking us to delete all their personal data \u2014 name, phone, purchase history, loyalty points. What is the process for handling a data deletion request, what can and cannot be deleted under NY cannabis compliance requirements, and who owns this?`,
    expectedFocus: ["deletion", "process", "compliance", "records"]
  },
  {
    id: "parker-frequency-drop-signal",
    title: "Customer visit frequency drop \u2014 early churn signal?",
    kind: "data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `Customer Tasha P. was visiting every 7 days on average for 4 months. Her last 3 visit gaps were 11 days, 16 days, 22 days. She is still coming in but the interval is growing. Is this an early churn signal and what should we do right now \u2014 before she goes fully dormant?`,
    expectedFocus: ["frequency", "signal", "churn", "early"]
  },
  {
    id: "parker-negative-google-review",
    title: "Negative Google review \u2014 response strategy",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `A customer left a 1-star Google review: "Waited 20 minutes, budtender seemed annoyed, my order was wrong. Will not be back." It has been up for 2 days. How does Mrs. Parker recommend we respond publicly and privately to turn this into a retention opportunity?`,
    expectedFocus: ["response", "public", "private", "review"]
  },
  {
    id: "parker-vip-preview-invite",
    title: "VIP preview night \u2014 invite top 50 customers?",
    kind: "data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `We are planning a VIP product preview night next month. Should we invite our top 50 customers by LTV, our most frequent visitors, or a mix? How should we select the list, what should the invite say, and what is the expected attendance rate for a cannabis VIP event invite?`,
    expectedFocus: ["VIP", "invite", "selection", "attendance"]
  },
  // ─── POPS — REVENUE ANALYTICS (20 CASES) ───────────────────────────────────
  {
    id: "pops-weekly-day-pattern",
    title: "Weekly revenue by day \u2014 what is the pattern?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Here is last week's daily revenue:

| Day | Revenue |
| --- | ---: |
| Monday | $2,104 |
| Tuesday | $1,847 |
| Wednesday | $2,340 |
| Thursday | $1,910 |
| Friday | $3,120 |
| Saturday | $3,890 |
| Sunday | $2,650 |

Total: $17,861. What is the pattern, what do the low days tell us, and what is actionable here?`,
    expectedFocus: ["Tuesday", "Saturday", "pattern", "weekly"]
  },
  {
    id: "pops-yoy-comparison",
    title: "Year-over-year April comparison \u2014 are we growing?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Year-over-year April comparison:

| Week | April 2025 Revenue | April 2026 Revenue | Change |
| --- | ---: | ---: | ---: |
| Week 1 | $14,200 | $16,840 | +18.6% |
| Week 2 | $13,800 | $17,210 | +24.7% |
| Week 3 | $15,100 | $16,900 | +11.9% |
| Week 4 | $14,600 | $17,861 | +22.3% |

Are we growing meaningfully or just tracking inflation? What story does Pops tell from this data?`,
    expectedFocus: ["YoY", "growth", "+18", "trend"]
  },
  {
    id: "pops-avg-ticket-decline",
    title: "Average ticket fell $52.10 \u2192 $44.54 \u2014 what is driving it?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Average transaction value was $52.10 last month. This week it is $44.54. That is a $7.56 drop. We have not run any major promotions this week and foot traffic is flat. What are the most likely causes and what data should I pull to narrow it down?`,
    expectedFocus: ["$44.54", "$7.56", "cause", "data"]
  },
  {
    id: "pops-category-mix-health",
    title: "Category mix \u2014 is this breakdown healthy?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Our revenue category breakdown this month:
- Flower: 42%
- Edibles: 28%
- Vapes: 18%
- Pre-rolls: 8%
- Other: 4%

Is this a healthy mix for a New York dispensary, and what category shifts would indicate trouble or opportunity?`,
    expectedFocus: ["Flower", "category", "mix", "healthy"]
  },
  {
    id: "pops-time-of-day-staffing",
    title: "Time-of-day revenue split \u2014 staffing implications",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Revenue by time window (average weekday):
- 10 AM \u2013 2 PM: $840 (24% of daily)
- 2 PM \u2013 6 PM: $1,460 (42% of daily)
- 6 PM \u2013 10 PM: $1,100 (31% of daily)

Total daily average: $3,400. What are the staffing and operational implications, and which window is most underpowered relative to its revenue weight?`,
    expectedFocus: ["staffing", "2 PM", "peak", "window"]
  },
  {
    id: "pops-revenue-per-transaction-vs-count",
    title: "Revenue per transaction vs. transaction count \u2014 which to grow?",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `We can either focus on increasing transaction count (more customers) or increasing revenue per transaction (upsell, bundles, higher-margin items). From a financial perspective, which lever is higher-impact for a dispensary at our stage, and how do we measure progress on each?`,
    expectedFocus: ["AOV", "transaction", "upsell", "measure"]
  },
  {
    id: "pops-promo-lift-analysis",
    title: "Flash sale ROI \u2014 was it worth it?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `We ran a 3-hour flash sale last Saturday: 20% off all edibles. Results:
- Revenue during sale window: $1,200 (baseline for that window on a normal Saturday: estimated $620)
- Discount value given: $180 in total
- Net revenue lift: $580 vs baseline

Was this flash sale worth it from a margin and revenue perspective, and should we repeat it?`,
    expectedFocus: ["lift", "$580", "margin", "ROI"]
  },
  {
    id: "pops-cohort-ltv-comparison",
    title: "Jan 2026 vs Jan 2025 cohort LTV \u2014 how do they compare?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Cohort LTV at 90-day mark:
- Jan 2025 cohort (42 customers): avg LTV $187 at 90 days
- Jan 2026 cohort (58 customers): avg LTV $214 at 90 days

What does this tell us about retention improvement, and what are the caveats before we celebrate?`,
    expectedFocus: ["cohort", "LTV", "$214", "improvement"]
  },
  {
    id: "pops-breakeven-marketing-spend",
    title: "Break-even on $500 marketing spend",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `We are considering a $500 marketing spend on local Instagram ads. Our average transaction is $44 and our gross margin is approximately 42%. How many new transactions do we need to break even on this spend, and how does Pops frame this for a weekly owner decision?`,
    expectedFocus: ["break-even", "$500", "transactions", "margin"]
  },
  {
    id: "pops-slow-day-rescue-tuesday",
    title: "Tuesday averages $1,400 vs Saturday $3,890 \u2014 playbook",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Our Tuesday average revenue is $1,400 vs Saturday $3,890. That is a 64% gap. We have the same operating hours and similar staffing. What is the operational and marketing playbook for moving Tuesday revenue closer to $2,000 without cannibalizing weekend revenue?`,
    expectedFocus: ["Tuesday", "playbook", "gap", "$2,000"]
  },
  {
    id: "pops-seasonal-trend-forecast",
    title: "Monthly revenue Jan-Apr \u2014 what to expect in May-June?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Monthly revenue this year:
- January: $58,200
- February: $61,400
- March: $67,800
- April (projected full month): $71,400

Is there a seasonal pattern here, and what should we expect for May and June based on this trajectory and cannabis seasonality?`,
    expectedFocus: ["seasonal", "May", "trajectory", "projection"]
  },
  {
    id: "pops-contribution-margin",
    title: "Contribution margin \u2014 $38 avg retail, 40% COGS",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Our average retail per unit is $38 and our cost of goods sold is approximately 40%. What is our contribution margin per unit, what does that mean for covering operating costs, and how does it compare to what a well-run dispensary should target?`,
    expectedFocus: ["contribution margin", "$38", "40%", "COGS"]
  },
  {
    id: "pops-inventory-turn-rate",
    title: "Inventory turn rate \u2014 $45k COGS, $18k avg inventory",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Last month we had $45,000 in COGS and an average inventory value of $18,000. What is our inventory turn rate and is it healthy for a cannabis dispensary? What does a low vs. high turn rate signal about the business?`,
    expectedFocus: ["inventory turn", "$45,000", "COGS", "healthy"]
  },
  {
    id: "pops-transaction-count-vs-revenue-growth",
    title: "Transactions +12% but revenue only +3% \u2014 what does this mean?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `This month vs. last month: transaction count is up 12% but revenue is only up 3%. That means revenue per transaction is falling. What are the most likely explanations for this divergence and what should we investigate first?`,
    expectedFocus: ["divergence", "AOV", "investigate", "transaction"]
  },
  {
    id: "pops-tuesday-slump-multi-turn",
    title: "Multi-turn: weekly snapshot \u2192 Tuesday slump root cause",
    kind: "multi_turn",
    threadType: "performance",
    primaryAgent: "pops",
    history: [
      { role: "user", content: "Here is our weekly snapshot: Mon $2,104, Tue $1,847, Wed $2,340, Thu $1,910, Fri $3,120, Sat $3,890, Sun $2,650." },
      { role: "assistant", content: "Tuesday and Thursday are your soft spots \u2014 $1,847 and $1,910 respectively against a weekly average of $2,551. The weekend is carrying the week. Tuesday is especially worth diagnosing." }
    ],
    prompt: `Is the Tuesday slump something unique to our store or is this an industry-wide pattern for cannabis dispensaries?`,
    expectedFocus: ["Tuesday", "industry", "pattern", "dispensary"]
  },
  {
    id: "pops-wednesday-discount-modeling",
    title: "Wednesday 15% off \u2014 how many extra transactions to break even?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `We want to run a 15% discount on all products every Wednesday. Our current Wednesday average is $2,340 revenue across approximately 53 transactions at $44.15 avg ticket. With the 15% discount, how many additional transactions would we need to maintain the same dollar revenue, and is this a smart margin trade-off?`,
    expectedFocus: ["break-even", "Wednesday", "transactions", "discount"]
  },
  {
    id: "pops-visit-frequency-benchmark",
    title: "Customers average 2.1 visits/month \u2014 industry benchmark?",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Our customers average 2.1 visits per month. Is that above or below industry benchmarks for a cannabis dispensary, and what does best-in-class visit frequency look like? What drives the gap and how do we improve it?`,
    expectedFocus: ["benchmark", "visits", "frequency", "industry"]
  },
  {
    id: "pops-revenue-concentration-risk",
    title: "Top 10% of customers = 38% of revenue \u2014 risk?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Our top 10% of customers by spend account for 38% of total revenue. That is a meaningful concentration. Is this level of revenue concentration a risk for a dispensary, what is typical, and what would it mean for our business if we lost half of those top-tier customers?`,
    expectedFocus: ["concentration", "38%", "risk", "top"]
  },
  {
    id: "pops-q2-forecast",
    title: "Q1 actuals \u2014 project Q2 range",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Q1 2026 actuals:
- January: $58,200
- February: $61,400
- March: $67,800
- Q1 Total: $187,400

Based on this trajectory and typical cannabis seasonality (spring pickup, 4/20 lift in April), what is a realistic Q2 revenue range \u2014 conservative, base, and optimistic \u2014 and what assumptions drive each scenario?`,
    expectedFocus: ["Q2", "forecast", "conservative", "optimistic"]
  },
  {
    id: "pops-420-flash-sale-roi",
    title: "4/20 flash sale \u2014 repeat or not?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Last 4/20 we did $8,400 in revenue vs our daily average of $2,800. That is a 3x day. We ran a storewide 15% discount that cost us approximately $1,260 in margin. Net revenue lift over a normal day was $5,600. Should we plan the same this year, and what would Pops change to capture more of the demand without giving away as much margin?`,
    expectedFocus: ["4/20", "$5,600", "margin", "repeat"]
  },
  // ── Multi-Location / Brand Management (10 cases) ─────────────────────
  {
    id: "multi-loc-performance-gap",
    title: "Location A $3,800/day vs Location B $1,200/day \u2014 gap diagnosis",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Location A is doing $3,800/day on average. Location B is doing $1,200/day. Both opened within 3 months of each other, same brand, similar product mix.

What are the most likely drivers of that 3x gap and what data should I pull to diagnose the root cause?`,
    expectedFocus: ["gap", "driver", "diagnose", "data"]
  },
  {
    id: "multi-loc-inventory-transfer",
    title: "Slow-moving SKU transfer from Location A to Location B",
    kind: "non_data",
    threadType: "inventory_promo",
    primaryAgent: "money_mike",
    toolContext: `[NY METRC Transfer Protocol: In New York, licensed retail locations CANNOT directly transfer inventory between retail locations \u2014 transfers must flow through a licensed distributor or the brand's licensed processor/distributor entity. The retail licensee must: (1) create a METRC "Package Transfer" under the correct license type, (2) the transfer must be accompanied by a METRC manifest, (3) both locations must be on the same METRC license or a new wholesale transfer transaction is required. Without a distributor license, a retail-to-retail transfer is a compliance violation. The operator should consult their OCM compliance contact or licensed distributor before proceeding.]`,
    prompt: `We have 30 units of a slow-moving SKU sitting at Location A \u2014 it has not moved in 45 days. Location B is selling that same SKU at twice the velocity. Can we physically transfer those 30 units from Location A to Location B? What does that process look like in NY from a Metrc and compliance standpoint?`,
    expectedFocus: ["transfer", "Metrc", "compliance", "NY"],
    mustReference: ["METRC", "manifest", "distributor"]
  },
  {
    id: "multi-loc-staff-sharing",
    title: "Location A short-staffed Friday \u2014 pull from Location B?",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Location A is short a budtender this Friday \u2014 one called out sick. Location B is fully staffed. Can we move a budtender from Location B to cover Location A for the day? Are there any NY cannabis labor or staffing compliance issues with moving staff between licensed locations under the same brand?`,
    expectedFocus: ["staff", "cover", "compliance", "Friday"]
  },
  {
    id: "multi-loc-pricing-consistency",
    title: "Should both locations price identically or can Location B run different promos?",
    kind: "non_data",
    threadType: "marketing",
    primaryAgent: "craig",
    prompt: `We run two dispensary locations under the same brand. Should our pricing and promotions be identical at both locations, or can Location B run its own deals independently? What are the brand consistency risks of having different promo strategies, and what is the competitive case for letting each location adapt to its local market?`,
    expectedFocus: ["brand", "promo", "consistency", "local"]
  },
  {
    id: "multi-loc-consolidated-report",
    title: "Combined weekly revenue $28,400 across 2 locations \u2014 owner presentation",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    toolContext: `[Data grounding rule: Only use the numbers provided \u2014 $28,400 total, Location A $18,600 (418 tx, avg $44.50), Location B $9,800 (198 tx, avg $49.49). Do NOT invent comparison data, YoY growth percentages, or benchmarks not provided. Location B has higher avg ticket ($49.49 vs $44.50) despite lower volume \u2014 this is a notable narrative point. Ownership questions will likely focus on: why Location B volume is lower, whether avg ticket advantage at B is sustainable, and what the combined trajectory looks like.]`,
    prompt: `This week we did $28,400 combined across 2 locations:
- Location A: $18,600 (418 transactions, avg ticket $44.50)
- Location B: $9,800 (198 transactions, avg ticket $49.49)

I need to present this to ownership tomorrow. How do I frame it \u2014 what is the headline number, what is the narrative, and what three questions should I expect from ownership?`,
    expectedFocus: ["$28,400", "ownership", "narrative", "headline"],
    mustReference: ["$18,600", "$9,800", "$44.50"],
    mustNotContain: ["15.2%"]
  },
  {
    id: "multi-loc-ticket-gap",
    title: "Location A 30% higher average ticket \u2014 what can Location B learn?",
    kind: "data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Location A averages $62 per ticket. Location B averages $47 per ticket. Same brand, similar product mix, similar price points. The 30% gap has been consistent for 8 weeks.

What are the most likely explanations \u2014 upsell training, floor layout, budtender quality, product placement? What would you change at Location B first?`,
    expectedFocus: ["$62", "$47", "upsell", "Location B"]
  },
  {
    id: "multi-loc-seed-location-c",
    title: "Grand opening of Location C \u2014 seed inventory from Location A/B history",
    kind: "data",
    threadType: "inventory_promo",
    primaryAgent: "money_mike",
    toolContext: `[Location A/B performance data: Location A weekly revenue $18,600, avg ticket $44.50, top categories by revenue: Flower 42%, Vape 28%, Edibles 18%, Concentrate 8%, Pre-Roll 4%. Location B weekly revenue $9,800, avg ticket $49.49, top categories: Concentrate 31%, Flower 38%, Vape 22%, Edibles 7%, Pre-Roll 2%. Location B has higher concentrate mix, suggesting premium/concentrate-forward customer base. New location opening inventory benchmark: 60\u201380 active SKUs, $25\u201340K in opening inventory, 30-day buffer at expected 50% of Location A volume ($9,300/week = $37,200/month).]`,
    prompt: `We are opening Location C next month. Based on what we know from Location A and Location B, what product mix should we open with? Specifically: how many SKUs, which categories to over-index on, how much opening inventory in dollars, and what does a 30-day sell-through buffer look like for a new location?`,
    expectedFocus: ["opening", "SKU", "inventory", "buffer"],
    mustReference: ["Location A", "Location B"]
  },
  {
    id: "multi-loc-loyalty-cross-location",
    title: "Loyalty points cross-location \u2014 can Location A customer redeem at Location B?",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `A customer earned loyalty points at Location A and wants to redeem them at Location B. Our loyalty program is branded under the same company name. Is this cross-location redemption technically possible? What are the POS and CRM requirements, and what is the customer experience risk if we say no?`,
    expectedFocus: ["loyalty", "redeem", "cross-location", "customer"]
  },
  {
    id: "multi-loc-metrc-discrepancy-one-location",
    title: "Metrc discrepancy at Location A only \u2014 does it affect Location B compliance?",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    prompt: `Location A has a Metrc discrepancy \u2014 4 units unaccounted for from a transfer. Location B is clean. Both operate under the same OCM license umbrella. Does Location A's discrepancy create any compliance risk or reporting obligation for Location B, or are they treated as independent entities under NY law?`,
    expectedFocus: ["Metrc", "compliance", "Location B", "license"]
  },
  {
    id: "multi-loc-brand-consistency-budtender",
    title: "Budtender at Location B doing their own thing \u2014 brand alignment",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `A budtender at Location B has developed their own recommendation style that differs from our brand guidelines \u2014 they are suggesting products in ways that do not align with our positioning and are using unapproved language. How do I address this while keeping them motivated? What is the right mix of retraining, coaching, and accountability?`,
    expectedFocus: ["budtender", "brand", "coaching", "retraining"]
  },
  // ── Ecstatic Brand Cases (10 cases) ──────────────────────────────────
  {
    id: "ecstatic-nyc-vs-syracuse-market",
    title: "Ecstatic NYC competitive landscape vs upstate Thrive",
    kind: "non_data",
    threadType: "competitor_intel",
    primaryAgent: "ezal",
    prompt: `Ecstatic is our NYC brand. Thrive is our Syracuse brand. How does the competitive landscape differ? NYC has dozens of dispensaries within walking distance \u2014 upstate it is more spread out. What are the strategic differences in how we compete on price, experience, and brand in NYC versus Syracuse?`,
    expectedFocus: ["NYC", "Syracuse", "competitive", "strategy"]
  },
  {
    id: "ecstatic-tourist-possession-limits",
    title: "Ecstatic NYC tourist customers \u2014 NY possession limits guidance",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    prompt: `Ecstatic gets a lot of out-of-state visitors \u2014 tourists who are flying home after buying. What do they need to know about NY possession limits, and can we tell them about taking product across state lines? How do our budtenders handle the "can I take this on the plane?" question compliantly without giving legal advice?`,
    expectedFocus: ["tourist", "possession", "state lines", "budtender"]
  },
  {
    id: "ecstatic-premium-positioning",
    title: "Ecstatic premium menu curation \u2014 $80+ average ticket strategy",
    kind: "non_data",
    threadType: "inventory_promo",
    primaryAgent: "money_mike",
    prompt: `Ecstatic targets high-end customers and we want to get to an $80+ average ticket \u2014 we are currently at $62. What menu curation strategy gets us there? Should we reduce low-price SKUs, add premium concentrates, or focus on bundle offers that lift basket size? What does a premium NYC dispensary menu look like at $80+ avg ticket?`,
    expectedFocus: ["premium", "$80", "menu", "basket"]
  },
  {
    id: "ecstatic-nyc-density-differentiation",
    title: "NYC dispensary density \u2014 differentiate on experience vs price",
    kind: "non_data",
    threadType: "competitor_intel",
    primaryAgent: "ezal",
    prompt: `There are multiple dispensaries within a 5-block radius of Ecstatic. We have chosen a premium positioning rather than competing on price. What does "competing on experience" actually mean in a NYC cannabis retail context \u2014 design, service model, product curation, events? What specifically sets Ecstatic apart when customers can walk one block and pay less?`,
    expectedFocus: ["experience", "NYC", "differentiate", "premium"]
  },
  {
    id: "ecstatic-nyc-advertising-channels",
    title: "Ecstatic NYC advertising channels \u2014 what works for a premium brand",
    kind: "non_data",
    threadType: "marketing",
    primaryAgent: "craig",
    prompt: `What advertising and marketing channels work best for a premium NYC cannabis dispensary? We are not competing on price so we cannot just run discount ads. Think about channels that reach affluent NYC consumers \u2014 what mix of digital, out-of-home, events, influencers, and PR makes sense for Ecstatic, and which channels are off-limits under NY OCM rules?`,
    expectedFocus: ["channel", "NYC", "OCM", "premium"]
  },
  {
    id: "ecstatic-nyc-delivery-viability",
    title: "Cannabis delivery in Manhattan \u2014 viability and logistics",
    kind: "non_data",
    threadType: "compliance",
    primaryAgent: "deebo",
    toolContext: `[NY cannabis delivery for an NYC dispensary: (1) Licensed NY retailers can deliver under their existing retail license \u2014 no separate delivery license required. (2) All deliveries must be tracked in METRC with a delivery manifest; drivers must have OCM background checks; delivery vehicles must be registered on the license; signature required at delivery. (3) Manhattan logistics are more complex than suburban delivery: parking enforcement, doorman buildings, elevator time \u2014 average 20\u201345 min per delivery vs. 5\u201310 min suburban. (4) Commercially viable for an NYC dispensary with dedicated delivery staff and vehicles \u2014 minimum 2 vehicles and 3 drivers for meaningful Manhattan coverage.]`,
    prompt: `Customers are asking if Ecstatic delivers in Manhattan. Is cannabis delivery actually viable in a dense urban market like Manhattan? What are the specific logistical challenges \u2014 traffic, building access, doorman buildings, elevator time? And what does the NY delivery license process look like for an NYC location?`,
    expectedFocus: ["delivery", "Manhattan", "METRC", "license", "driver"],
    mustReference: ["METRC", "manifest", "viable"]
  },
  {
    id: "ecstatic-instagram-strategy",
    title: "Ecstatic Instagram strategy for a premium NYC brand",
    kind: "non_data",
    threadType: "marketing",
    primaryAgent: "craig",
    prompt: `Design an Instagram content strategy for Ecstatic, our premium NYC cannabis brand. Given NY OCM advertising restrictions, what content is allowed? What aesthetic, content mix (product shots, lifestyle, education, behind-the-scenes), and engagement approach works for building a premium brand on Instagram without violating advertising rules?`,
    expectedFocus: ["Instagram", "OCM", "content", "premium"]
  },
  {
    id: "ecstatic-tourist-vs-local-loyalty",
    title: "Ecstatic loyalty strategy \u2014 tourist vs local customer base",
    kind: "non_data",
    threadType: "customer_mgmt",
    primaryAgent: "mrs_parker",
    prompt: `Ecstatic has two very different customer types: NYC locals who come regularly and tourists who may only visit once. How do we build loyalty with both? A traditional points program rewards repeat visits but does not help with tourists. What is the right loyalty or retention strategy for a brand that serves a mixed resident/tourist market?`,
    expectedFocus: ["tourist", "local", "loyalty", "retention"]
  },
  {
    id: "ecstatic-holiday-event-inventory",
    title: "Ecstatic NYC holiday and event season \u2014 NYE and fashion week inventory",
    kind: "non_data",
    threadType: "inventory_promo",
    primaryAgent: "money_mike",
    toolContext: `[Event context: NYC key tourist spikes \u2014 NYE (Dec 28\u2013Jan 2), NY Fashion Week (Feb 7\u201312 and Sept 4\u201311), NYC Pride (June, week of parade), and summer tourist season (July\u2013August). Tourist traffic tends to skew toward premium SKUs, gifting-friendly packaging, and convenience formats (pre-rolls, edibles). Lead times: most NY cannabis distributors are 5\u201314 days. For events, order 3 weeks before event window with a 30\u201340% volume buffer and a firm cancel/credit policy with vendor if traffic underdelivers.]`,
    prompt: `NYC has massive tourist spikes around NYE, Fashion Week, Pride, and other events. How should Ecstatic plan inventory around these windows? Which product categories spike most with tourist/event traffic? What lead time do we need for extra stock and how do we avoid over-ordering for an event that may not deliver the expected traffic?`,
    expectedFocus: ["NYE", "Fashion Week", "Pride", "lead time"],
    mustReference: ["NYE", "Fashion Week", "Pride"]
  },
  {
    id: "ecstatic-price-point-strategy",
    title: "Ecstatic flower pricing \u2014 $50+/3.5g premium vs competitive $38",
    kind: "non_data",
    threadType: "performance",
    primaryAgent: "pops",
    prompt: `Should Ecstatic price flower at $50+ per 3.5g to reinforce premium brand positioning, or stay competitive at $38 like most NYC dispensaries? We have tested both and at $50+ volume drops 30% but gross margin is significantly better. Walk me through the unit economics and which approach maximizes total gross profit at our current traffic levels.`,
    expectedFocus: ["$50", "premium", "margin", "volume"]
  },
  // CATEGORY A: Regulator Visit (8 cases)
  {
    id: "regulator-unannounced-inspection",
    title: "Unannounced state compliance inspection",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `A New York OCM compliance officer just walked in unannounced and is asking to inspect our premises, inventory records, and employee certifications. Manager is panicking. What do we do RIGHT NOW \u2014 what are our rights, what must we provide, what can we refuse, and what common mistakes do dispensaries make during unannounced inspections?`,
    expectedFocus: ["rights", "cooperate", "inspection", "OCM", "inventory", "records", "certification"]
  },
  {
    id: "regulator-advertising-noc-response",
    title: "OCM Notice of Non-Compliance \u2014 advertising violation response",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    toolContext: `[NY OCM NOC response protocol: Notices of Non-Compliance (NOC) require a written response within the stated timeframe (typically 15 days). Response must include: (1) acknowledgment of the notice, (2) explanation of the circumstances, (3) documentation of immediate remediation taken (e.g., post removed within X hours), (4) a corrective action plan with specific timeline. First-offense advertising violations typically result in a Warning or a civil penalty of $500\u2013$5,000 depending on severity. A discount post showing a price ("20% off") may violate OCM's rules against advertising that could be interpreted as inducing consumption or making price-based appeals \u2014 though it depends on the exact content and whether age-gating was in place. A cannabis attorney should review the NOC text before responding. Proactive steps: remove the post immediately, document when it was removed, screenshot the OCM notice, and engage a cannabis attorney within 48 hours.]`,
    prompt: `We received an OCM Notice of Non-Compliance today. It cites our Instagram post from last week showing a product discount ("Purple Punch 20% off") as a violation of NY advertising rules. We have 15 days to respond. What should our response include, do we need a lawyer, what remediation steps do we take immediately, and what are the likely penalty ranges for a first offense?`,
    expectedFocus: ["OCM", "advertising", "response", "violation", "penalty", "remediation", "attorney"],
    mustReference: ["OCM", "attorney", "corrective"]
  },
  {
    id: "regulator-metrc-physical-audit",
    title: "METRC physical inventory audit by inspector",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `State inspector wants to reconcile our METRC records against physical inventory right now. Our last physical count was 3 days ago. We have 4 known small discrepancies we have not yet reported (all under 1g). Should we disclose the known discrepancies proactively before the audit begins? What does the audit process look like, and what happens if variances are found?`,
    expectedFocus: ["METRC", "audit", "discrepancy", "proactive", "disclosure", "variance", "reporting"]
  },
  {
    id: "regulator-age-verification-failure-response",
    title: "Failed mystery shopper \u2014 immediate response plan",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `A state investigator posing as a customer (who showed a valid ID but was 20 years old) just successfully purchased cannabis from us without being ID checked. The investigator identified themselves after the sale and issued a notice of violation. What do we do in the next 24 hours, what is the likely penalty for a first offense, and what training and operational changes prevent recurrence?`,
    expectedFocus: ["age verification", "ID", "penalty", "violation", "training", "corrective action", "first offense"]
  },
  {
    id: "regulator-employee-records-request",
    title: "Inspector requests employee training certifications",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `During an inspection, the OCM officer is asking for proof that all our cannabis handlers have completed the required responsible vendor training program. We have 12 employees. Three of them may be overdue for renewal. What records must we produce, what happens if some are expired, and can we get an extension to produce records we cannot find on the spot?`,
    expectedFocus: ["OCM", "training", "certification", "responsible vendor", "records", "expired", "extension"]
  },
  {
    id: "regulator-fine-appeal-process",
    title: "Disputing a $7,500 OCM fine \u2014 appeal process",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `We received a $7,500 fine from OCM for an advertising violation we believe was mischaracterized. The fine seems disproportionate and we believe we have a strong defense. Walk us through the OCM appeal process: what are the timelines, do we need to pay the fine while appealing, what grounds support a successful appeal, and when is it worth fighting vs paying?`,
    expectedFocus: ["OCM", "appeal", "fine", "dispute", "timeline", "defense", "hearing"]
  },
  {
    id: "regulator-license-condition-violation",
    title: "Operating outside license conditions",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `Our OCM license has a condition that says we must close by 9 PM. Last Saturday a manager let a customer stay until 9:23 PM during a busy period. No inspector was present, but we logged the transaction in METRC at 9:18 PM. Do we have a self-disclosure obligation, how serious is a first-time license condition violation, and what proactive steps minimize our exposure?`,
    expectedFocus: ["OCM", "license condition", "self-disclosure", "violation", "hours", "METRC", "exposure"]
  },
  {
    id: "regulator-competitor-complaint-response",
    title: "Competitor filed regulatory complaint against us",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    toolContext: `[NY OCM "appealing to minors" standard: Under NY Cannabis Law \xA7128 and OCM advertising regulations, content "appeals to minors" if it uses cartoon-like imagery, bright colors or designs with youth appeal, characters or imagery associated with child products, or depictions suggesting cannabis is fun/desirable for youth. Abstract cannabis leaf graphics in a branded adult design generally do not meet this standard \u2014 the test is whether a reasonable person would believe the imagery targets youth. OCM complaint process: OCM will notify the licensee of the complaint and provide an opportunity to respond. Response should: (1) include documentation of the signage (photos, design files), (2) explain the adult-oriented branding rationale, (3) provide comparables showing this is standard adult cannabis branding. Proactive modification: while not legally required, voluntarily modifying signage while the inquiry is open shows good faith and can reduce penalty risk. Consult a cannabis attorney before making formal commitments in any OCM response.]`,
    prompt: `A competitor dispensary filed a complaint with OCM claiming our window signage contains product images that appeal to minors. OCM has opened an inquiry. Our signage shows stylized cannabis leaf graphics in a branded design. What is the standard for "appealing to minors" in NY, how do we prepare our response, and should we proactively modify the signage during the inquiry?`,
    expectedFocus: ["OCM", "minors", "signage", "inquiry", "response", "standard"],
    mustReference: ["OCM", "minors", "attorney"]
  },
  // CATEGORY B: Financial Compliance (8 cases)
  {
    id: "finance-280e-explained",
    title: "280E tax burden explanation for owner",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `Our owner is furious \u2014 the accountant just told them we owe $420,000 in federal taxes on $1.2M in gross profit. The owner cannot understand why we pay taxes on money we did not take home after rent, salaries, and overhead. Can you explain IRS Section 280E in plain terms, why it applies to us, what we can legitimately deduct (COGS), and what our accountant should be doing to minimize our exposure?`,
    expectedFocus: ["280E", "IRS", "COGS", "deductions", "cannabis", "federal", "tax"]
  },
  {
    id: "finance-currency-transaction-report",
    title: "Customer paying $12,000 cash \u2014 CTR obligations",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `A wholesale buyer wants to purchase $12,000 worth of product for cash. Our bookkeeper says we need to file something. Do we need to file a Currency Transaction Report (CTR), what information must we collect from the customer, does the customer have to comply, and what is structuring and how do we avoid any implication that we encouraged it?`,
    expectedFocus: ["CTR", "Bank Secrecy Act", "cash", "$10,000", "structuring", "FinCEN", "customer information"]
  },
  {
    id: "finance-bank-account-closed",
    title: "Bank closed our account \u2014 cash management options",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    toolContext: `[Cannabis banking alternatives in NY: (1) Cannabis-friendly credit unions: SAFE Banking Act advocacy has led some credit unions and state-chartered banks to serve cannabis licensees \u2014 NY examples include Partner Colorado Credit Union, Canna-Hub Financial, and some community banks willing to work with licensed NY operators. (2) Cash management processors: companies like Hypur, PaySign, and CanPay offer point-of-sale cashless debit or ACH solutions that some vendors accept. (3) The $340,000 cash requires: daily reconciliation logs, armored car pickup schedule, vault insurance review, and CTR filings for any cash transactions over $10,000. (4) Regulatory reporting: no specific NY OCM reporting requirement for unbanked cash, but all cash transactions must be documented in METRC and tax records. Vendor payments over $10k in cash require IRS Form 8300 filing within 15 days.]`,
    prompt: `Our bank just closed our business account with 30 days notice, citing "reputational risk." This is our second closure in 18 months. We have $340,000 in vault cash and weekly vendor payments to make. What legitimate banking alternatives exist for cannabis retailers, what cash management protocols are required, and what regulatory reporting applies to our cash-intensive operation?`,
    expectedFocus: ["banking", "cash", "alternatives", "vault", "compliance", "reporting"],
    mustReference: ["$340,000", "cash", "alternative"]
  },
  {
    id: "finance-cogs-allocation-strategy",
    title: "Maximizing COGS under 280E \u2014 what qualifies",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `Our CPA says we can fight 280E by maximizing our COGS allocation. He wants to classify budtender wages, security costs, and part of our rent as COGS. The IRS has challenged aggressive COGS allocations in cannabis audits. What expenses legitimately qualify as COGS for a cannabis retailer, what allocation methods survive IRS scrutiny, and what documentation do we need to defend our position?`,
    expectedFocus: ["280E", "COGS", "IRS", "allocation", "wages", "documentation", "audit"]
  },
  {
    id: "finance-vendor-cash-only",
    title: "Vendor insists on cash payment \u2014 compliance risks",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `One of our cannabis vendors refuses to accept anything but cash payment and wants us to pay $85,000 for a large order in cash. They claim they cannot accept bank transfers due to banking issues. What are the compliance and legal risks of making a large cash payment to a vendor, what documentation must we maintain, and are there any FinCEN reporting requirements on our side?`,
    expectedFocus: ["cash", "vendor", "compliance", "FinCEN", "documentation", "risk", "BSA"]
  },
  {
    id: "finance-armored-car-vault-limit",
    title: "Vault at capacity \u2014 insurance and security protocols",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `Our vault is holding $480,000 in cash and the armored car service is not coming until Friday (4 days away). Our insurance policy covers up to $250,000 in vault cash. We are significantly over coverage. What are the security protocol requirements for holding large cash amounts, what is our insurance liability exposure, and are there any regulatory reporting requirements for vault holdings above certain thresholds?`,
    expectedFocus: ["vault", "cash", "insurance", "security", "protocol", "coverage", "regulatory"]
  },
  {
    id: "finance-investor-financial-disclosure",
    title: "Investor due diligence \u2014 what financial data is protected",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `A potential investor is requesting full financial disclosure as part of due diligence: customer sales data, supplier costs, margin by product category, and employee salaries. What financial information do we have an obligation to provide in a due diligence process, what should we protect with an NDA before sharing, and are there any OCM disclosure rules about who can have access to our financial records?`,
    expectedFocus: ["investor", "due diligence", "NDA", "financial", "disclosure", "OCM", "protect"]
  },
  {
    id: "finance-quarterly-tax-estimate",
    title: "Quarterly estimated tax calculation under 280E",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    toolContext: `[IRS underpayment penalty structure (280E context): Under IRC \xA76654, the underpayment penalty is calculated at the federal short-term rate + 3% (currently ~8% annualized) on the amount underpaid, prorated for the days late. At 60 days overdue, this is approximately 8% \xD7 (60/365) \xD7 tax owed \u2248 1.3% of the overdue amount. Making the Q2 payment today stops further penalty accrual from today. Safe harbor calculation: cannabis businesses under 280E can use the "100% of prior year tax" safe harbor \u2014 pay at least 100% of last year's total tax liability in quarterly installments (25% each quarter) to avoid underpayment penalties. If gross revenue exceeds $1M, the threshold is 110% of prior year tax. A cannabis CPA should calculate the exact Q2 underpayment based on actual tax liability, not gross profit, since 280E allows COGS deduction which reduces the taxable base below gross profit.]`,
    prompt: `We missed our Q2 federal estimated tax payment and it is now 60 days overdue. Under 280E, our effective federal tax rate is around 70% of gross profit. The IRS has underpayment penalties. What is the penalty for missing a quarterly estimated payment as a cannabis business, can we pay the overdue amount now to limit penalties, and what is the safe harbor calculation to avoid underpayment penalties going forward?`,
    expectedFocus: ["280E", "estimated tax", "penalty", "quarterly", "IRS", "safe harbor", "underpayment"],
    mustReference: ["safe harbor", "CPA", "penalty"]
  },
  // CATEGORY C: Crisis Management (8 cases)
  {
    id: "crisis-pesticide-recall-active",
    title: "Pesticide contamination \u2014 product already sold to customers",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `We just got a call from our cultivator: a batch of flower we received and have been selling for 2 weeks tested positive for bifenazate (a banned pesticide). We have sold approximately 180 units from this batch to real customers. What must we do in the next 24 hours, how do we notify customers, what do we say to avoid creating panic, and what are our regulatory reporting obligations to OCM?`,
    expectedFocus: ["recall", "OCM", "pesticide", "notify customers", "quarantine", "report", "24 hours"]
  },
  {
    id: "crisis-robbery-reporting",
    title: "Armed robbery \u2014 regulatory reporting obligations",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `Our dispensary was robbed at gunpoint last night. Two armed individuals took approximately $45,000 in cash from the vault and 15 packages of product from the display case. Police have been called. What are our regulatory reporting obligations to OCM and in what timeframe, what METRC adjustments must be made for the stolen product, and does our license have any additional notification requirements?`,
    expectedFocus: ["OCM", "reporting", "METRC", "robbery", "stolen", "timeframe", "notification"]
  },
  {
    id: "crisis-customer-medical-emergency",
    title: "Customer overconsumption medical emergency in store",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `A customer collapsed in our waiting room. Staff called 911. The customer had purchased an edible 20 minutes earlier and appears to be experiencing an adverse reaction. Paramedics are on the way. What should our manager say and NOT say to the paramedics about what the customer consumed, what documentation must we create, and what is our liability exposure if the customer or their family pursues legal action?`,
    expectedFocus: ["emergency", "liability", "documentation", "medical", "customer", "adverse reaction", "legal"]
  },
  {
    id: "crisis-employee-theft-metrc",
    title: "Suspected employee theft \u2014 METRC investigation",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `We have two months of METRC data showing consistent 2-4g discrepancies in flower packages opened by a specific budtender. The discrepancies started right after they were hired and have occurred 18 times. What is the internal investigation procedure, at what point do we have an obligation to report to OCM, and how do we terminate the employee while preserving our ability to pursue legal action and regulatory cooperation?`,
    expectedFocus: ["METRC", "theft", "investigation", "OCM", "reporting", "termination", "legal"]
  },
  {
    id: "crisis-license-suspension-72hr",
    title: "72-hour emergency license suspension notice received",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `We just received an emergency 72-hour license suspension notice from OCM citing a pattern of METRC reporting violations. We must cease sales in 72 hours unless we successfully request a stay. What emergency legal options do we have, what grounds support a stay request, can we continue operating while pursuing an administrative hearing, and what customer and staff communications should we prepare?`,
    expectedFocus: ["OCM", "suspension", "stay", "administrative", "hearing", "cease", "operations"]
  },
  {
    id: "crisis-social-media-viral-incident",
    title: "Viral social media post exposing internal operations",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    toolContext: `[4-hour response protocol for viral regulatory exposure: (1) Immediate (0\u201330 min): screenshot and preserve the TikTok post with URL and view count. Lock the METRC terminal immediately \u2014 unattended unlocked METRC terminals are an OCM compliance violation. Identify who was in the video and place them on administrative leave pending investigation. (2) 30\u201360 min: contact your cannabis attorney. Do NOT post any public response without legal review. (3) 1\u20132 hours: assess the two regulatory exposures shown \u2014 unlocked METRC terminal (reportable process failure) and smoking on premises (OCM personnel policies violation). Prepare an internal incident report documenting: what happened, when, remediation steps taken. (4) 2\u20134 hours: proactive OCM contact \u2014 YES, proactively contact OCM before they contact you. Call the OCM compliance hotline and report you are aware of the video and have taken immediate remediation steps. Proactive self-disclosure shows good faith and typically reduces penalty severity. (5) Legal action against former employee: potential claims are defamation (if false statements made), trade secret theft (if internal operational footage is proprietary), and tortious interference. However, NY Labor Law \xA7215 whistleblower protections apply if the employee was reporting a genuine legal violation \u2014 evaluate this carefully with counsel before pursuing any legal action.]`,
    prompt: `A disgruntled former employee posted a TikTok video (now at 200,000 views) showing our back-of-house operations including what appears to be an unlocked METRC terminal and staff smoking on the premises. OCM has been tagged in replies. What do we do in the next 4 hours, do we need to proactively contact OCM before they contact us, and what legal action can we take against the former employee?`,
    expectedFocus: ["social media", "OCM", "proactive", "response", "legal", "former employee", "reputation"],
    mustReference: ["OCM", "proactive", "attorney"]
  },
  {
    id: "crisis-data-breach-customer-pos",
    title: "POS customer data breach \u2014 notification requirements",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `Our POS vendor just notified us that a security breach may have exposed transaction data for approximately 8,400 customers over the past 6 months. Data exposed may include names, email addresses, phone numbers, and purchase histories. What are our legal notification obligations under NY data breach laws, is cannabis purchase history specially protected, and what is the timeline for customer notification?`,
    expectedFocus: ["data breach", "notification", "NY law", "customer", "purchase history", "privacy", "timeline"]
  },
  {
    id: "crisis-power-outage-temperature",
    title: "Extended power outage \u2014 temperature excursion on inventory",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `We had a 9-hour power outage and our temperature-controlled storage area reached 94\xB0F for approximately 6 hours. We have 300 units of edibles (chocolate products) and 50 vape cartridges that may have been compromised. The edibles show melting/re-solidification. What are our testing obligations for temperature-excursion products, can we continue to sell them, and what METRC and OCM reporting applies to product we must destroy?`,
    expectedFocus: ["temperature", "excursion", "testing", "destroy", "METRC", "OCM", "edibles", "quality"]
  },
  // CATEGORY D: Operational Deep Dives — Regulator Traps (6 cases)
  {
    id: "ops-expired-product-on-shelf",
    title: "Expired products discovered on retail shelf",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `During a routine shelf audit, a manager found 22 units of edibles with best-by dates from 3 weeks ago still in our retail display case. These have potentially been sold to customers since expiry. What are our immediate obligations, do we have a reporting obligation to OCM for having sold expired cannabis products, what documentation is required for the destruction of the remaining units, and what process prevents recurrence?`,
    expectedFocus: ["expired", "destroy", "METRC", "OCM", "reporting", "documentation", "retail"]
  },
  {
    id: "ops-vendor-sample-policy",
    title: "Vendor leaving product samples \u2014 compliance rules",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `A licensed cannabis vendor wants to leave 5 sample units of their new concentrate line for our staff to try so we can give informed recommendations. Under NY OCM rules, what are the compliance requirements for receiving cannabis product samples, must samples be entered into METRC, does this count as a transfer under our license, and can staff consume samples at the workplace?`,
    expectedFocus: ["OCM", "sample", "METRC", "transfer", "staff", "consumption", "workplace"]
  },
  {
    id: "ops-large-cash-purchase-protocol",
    title: "Customer paying $9,500 cash \u2014 structuring concerns",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `A regular customer wants to pay $9,500 in cash for a bulk purchase. This is just under the $10,000 CTR threshold. We have never seen them make a purchase this large before. One of our staff mentioned the customer specifically said they wanted to stay under $10,000. This sounds like structuring. What do we do: refuse the sale, file a Suspicious Activity Report (SAR), or proceed normally?`,
    expectedFocus: ["structuring", "CTR", "SAR", "FinCEN", "cash", "suspicious", "BSA"]
  },
  {
    id: "ops-gift-card-escheatment",
    title: "Unredeemed gift cards \u2014 escheatment law",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    toolContext: `[NY Abandoned Property Law (NYABL) \u2014 gift card escheatment: (1) NY Abandoned Property Law \xA7\xA7501-502 applies to unredeemed gift cards issued by NY businesses \u2014 cannabis dispensaries are covered as retail businesses. (2) Dormancy period: gift card balances are considered abandoned after 5 years of inactivity (no redemption, no customer contact). The 5-year clock typically starts from the last transaction or card issuance, whichever is later. (3) Reporting and remittance: annually by March 10, businesses must file an abandoned property report with the NYS Office of the State Comptroller (OSC) and remit the funds. Failure to report carries penalties of up to $500/day per unreported item. (4) Dormancy fees: NY Cannabis Law does not address gift card dormancy fees, but NYS Banking Law and the NYABL generally permit dormancy fees ONLY if disclosed at time of sale and after 12 months of inactivity \u2014 fees cannot reduce balance to zero. (5) Practical exposure for $95K balance: the 3-year-old cards are not yet escheat-eligible (need 5 years), but you should identify which cards are approaching 4\u20135 years and begin outreach to customers. (6) Record keeping: maintain purchase date, last redemption date, and customer contact info for every card \u2014 this is required for the annual report.]`,
    prompt: `We have $95,000 in unredeemed gift card balances on our books from the past 3 years. Our accountant mentioned something about "escheatment" \u2014 turning unclaimed property over to the state. Does New York's unclaimed property law apply to cannabis dispensary gift cards, what is the dormancy period before funds must be remitted to the state, and can we charge dormancy fees to reduce the liability?`,
    expectedFocus: ["gift card", "escheatment", "unclaimed property", "NY", "dormancy", "state", "liability"],
    mustReference: ["5 year", "Comptroller", "report"]
  },
  {
    id: "ops-employee-cannabis-use-positive-test",
    title: "Budtender tests positive for THC \u2014 termination rules",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `A drug test we conducted after a workplace incident came back positive for THC for one of our budtenders. Under New York's cannabis employee protection laws (MRTA), can we discipline or terminate an employee for testing positive for THC on a drug test? Does it matter that they are in a safety-sensitive role, what accommodations are required, and what documentation protects us from a wrongful termination claim?`,
    expectedFocus: ["MRTA", "employee", "drug test", "THC", "termination", "protection", "safety-sensitive"]
  },
  {
    id: "ops-out-of-state-id-verification",
    title: "Out-of-state ID verification \u2014 acceptance rules",
    kind: "non_data",
    threadType: "operator",
    primaryAgent: "deebo",
    prompt: `We have customers regularly presenting out-of-state IDs from Florida, Texas, and international passports. Some staff are refusing international customers due to uncertainty. What forms of ID are OCM-approved for age verification in New York, are foreign passports acceptable, what do we do if an ID appears to be altered, and does accepting out-of-state IDs create any additional compliance risk?`,
    expectedFocus: ["OCM", "ID", "out-of-state", "passport", "age verification", "international", "staff training"]
  }
];
function getArg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}
function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}
function clip(value, max = 240) {
  const normalized = normalizeWhitespace(value);
  return normalized.length > max ? `${normalized.slice(0, max - 1)}...` : normalized;
}
function ensureFirebaseApp() {
  if ((0, import_app3.getApps)().length > 0) {
    return;
  }
  const localServiceAccountPath = import_path.default.resolve(process.cwd(), "service-account.json");
  if (import_fs.default.existsSync(localServiceAccountPath)) {
    const serviceAccount = JSON.parse(import_fs.default.readFileSync(localServiceAccountPath, "utf-8"));
    (0, import_app3.initializeApp)({
      credential: (0, import_app3.cert)(serviceAccount),
      projectId: serviceAccount.project_id
    });
    return;
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    const parsed = raw.startsWith("{") ? JSON.parse(raw) : JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    (0, import_app3.initializeApp)({
      credential: (0, import_app3.cert)(parsed),
      projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || "studio-567050101-bc6e8"
    });
    return;
  }
  (0, import_app3.initializeApp)({
    credential: (0, import_app3.applicationDefault)(),
    projectId: process.env.FIREBASE_PROJECT_ID || "studio-567050101-bc6e8"
  });
}
function makeHistoryMessages(history) {
  const baseTime = (/* @__PURE__ */ new Date("2026-04-18T07:30:00.000Z")).getTime();
  return (history ?? []).map((message, index) => ({
    id: `hist-${index + 1}`,
    type: message.role === "user" ? "user" : "agent",
    content: message.content,
    timestamp: new Date(baseTime + index * 6e4)
  }));
}
function buildThread(testCase, orgId) {
  const messages = makeHistoryMessages(testCase.history);
  return {
    id: `stress-${testCase.id}`,
    orgId,
    userId: DEFAULT_USER_ID,
    type: testCase.threadType,
    status: "active",
    title: testCase.title,
    preview: clip(testCase.prompt, 80),
    primaryAgent: testCase.primaryAgent,
    assignedAgents: [testCase.primaryAgent],
    artifactIds: [],
    messages,
    dispensaryId: orgId,
    createdAt: /* @__PURE__ */ new Date("2026-04-18T07:30:00.000Z"),
    updatedAt: /* @__PURE__ */ new Date("2026-04-18T07:30:00.000Z"),
    lastActivityAt: /* @__PURE__ */ new Date("2026-04-18T07:30:00.000Z")
  };
}
function resolvePersona(testCase) {
  const matchedAgent = testCase.primaryAgent === "auto" ? resolveInboxAgent(testCase.prompt, "auto") : testCase.primaryAgent;
  const resolvedAgent = matchedAgent === "auto" ? "puff" : matchedAgent;
  const personaId = matchedAgent === "auto" ? "puff" : PERSONA_MAP[matchedAgent] ?? "puff";
  return { resolvedAgent, personaId };
}
function extractPromptNumbers(prompt) {
  return Array.from(new Set(prompt.match(/\b\d+(?:\.\d+)?%?\b/g) ?? [])).slice(0, 16);
}
function inferGradeFromScore(score) {
  if (score >= 93) return "great";
  if (score >= 84) return "good";
  if (score >= 72) return "acceptable";
  if (score >= 55) return "poor";
  return "fail";
}
function heuristicGrade(testCase, response, error) {
  const text = response.trim();
  const lower = text.toLowerCase();
  const issues = [];
  const strengths = [];
  const suggestedFixes = [];
  let grounding = testCase.kind === "data" ? 78 : 84;
  let actionability = text.length > 240 ? 84 : 68;
  let completeness = text.length > 260 ? 82 : 62;
  let compliance = 96;
  let tone = 88;
  let launchReadiness = 80;
  if (error) {
    return {
      grade: "fail",
      score: 10,
      responseReady: false,
      summary: "The case failed before a usable inbox response was generated.",
      strengths: [],
      issues: [error],
      suggestedFixes: ["Fix the runtime error and rerun the case before launch."],
      dimensions: {
        grounding: 0,
        actionability: 0,
        completeness: 0,
        compliance: 0,
        tone: 0,
        launchReadiness: 0
      }
    };
  }
  if (!text) {
    return {
      grade: "fail",
      score: 0,
      responseReady: false,
      summary: "The agent returned an empty response.",
      strengths: [],
      issues: ["Empty response"],
      suggestedFixes: ["Ensure the agent always returns a non-empty answer or a graceful fallback."],
      dimensions: {
        grounding: 0,
        actionability: 0,
        completeness: 0,
        compliance: 0,
        tone: 0,
        launchReadiness: 0
      }
    };
  }
  const bannedCompliance = /\b(cure|treat|guaranteed|clinically proven|prescribe)\b/i;
  if (bannedCompliance.test(text)) {
    compliance = 10;
    launchReadiness = 10;
    issues.push("Potential compliance risk or medical-claim language detected.");
    suggestedFixes.push("Remove medical-claim language and reframe with compliant operational guidance.");
  } else {
    strengths.push("No obvious medical-claim language showed up in the response.");
  }
  if (testCase.kind === "data") {
    const promptNumbers = extractPromptNumbers(testCase.prompt);
    const numericMatches = promptNumbers.filter((token) => text.includes(token)).length;
    if (/i (do not|don't) have|no data|cannot see|can't see|need pos/i.test(lower)) {
      grounding -= 40;
      launchReadiness -= 28;
      issues.push("The answer behaved as if data was missing even though the prompt included operator data.");
      suggestedFixes.push("Use the visible prompt data first and only ask for missing fields after analyzing what is already there.");
    } else if (numericMatches === 0) {
      grounding -= 28;
      issues.push("The response did not reference the supplied numbers.");
      suggestedFixes.push("Reference the provided metrics directly so the owner can trust the recommendation.");
    } else {
      strengths.push(`The answer referenced ${numericMatches} prompt value(s), which suggests some grounding.`);
    }
  }
  const matchedFocus = testCase.expectedFocus.filter((focus) => lower.includes(focus.toLowerCase())).length;
  if (matchedFocus >= 2) {
    actionability += 6;
    completeness += 4;
    strengths.push("The response covered multiple expected focus areas.");
  } else {
    actionability -= 10;
    completeness -= 8;
    issues.push("The response missed one or more of the main requested angles.");
    suggestedFixes.push(`Cover these operator needs more explicitly: ${testCase.expectedFocus.join(", ")}.`);
  }
  if (text.length < 140) {
    completeness -= 20;
    launchReadiness -= 12;
    issues.push("The response is short for an operational inbox question.");
    suggestedFixes.push("Expand the answer with specific actions, rationale, and next steps.");
  }
  if (!/(\b1\.|\b2\.|^- |\n- )/m.test(text) && !/next step|recommend|priority|do this/i.test(lower)) {
    actionability -= 8;
    issues.push("The response does not clearly structure next steps.");
    suggestedFixes.push("Use a short ranked list or action plan when the owner needs decisions.");
  }
  if (testCase.mustNotContain?.some((s) => lower.includes(s.toLowerCase()))) {
    const hit = testCase.mustNotContain.find((s) => lower.includes(s.toLowerCase()));
    compliance = Math.min(compliance, 10);
    launchReadiness = Math.min(launchReadiness, 10);
    issues.push(`Response contained forbidden string: "${hit}"`);
    suggestedFixes.push(`Remove or rephrase the forbidden content.`);
  }
  if (testCase.mustReference && testCase.mustReference.every((s) => !lower.includes(s.toLowerCase()))) {
    actionability -= 20;
    launchReadiness -= 15;
    issues.push(`Response did not reference required content: ${testCase.mustReference.join(", ")}`);
    suggestedFixes.push(`Explicitly reference: ${testCase.mustReference.join(", ")}`);
  }
  const average = Math.round((grounding + actionability + completeness + compliance + tone + launchReadiness) / 6);
  const grade = inferGradeFromScore(average);
  const responseReady = average >= 80 && compliance >= 70;
  if (issues.length === 0) {
    strengths.push("The response appears broadly launch-safe under heuristic checks.");
  }
  return {
    grade,
    score: average,
    responseReady,
    summary: responseReady ? "The response looks usable for launch under heuristic grading." : "The response needs refinement before launch.",
    strengths,
    issues,
    suggestedFixes,
    dimensions: {
      grounding: Math.max(0, Math.min(100, Math.round(grounding))),
      actionability: Math.max(0, Math.min(100, Math.round(actionability))),
      completeness: Math.max(0, Math.min(100, Math.round(completeness))),
      compliance: Math.max(0, Math.min(100, Math.round(compliance))),
      tone: Math.max(0, Math.min(100, Math.round(tone))),
      launchReadiness: Math.max(0, Math.min(100, Math.round(launchReadiness)))
    }
  };
}
function parseGradeJson(raw) {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    return null;
  }
  try {
    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    if (!parsed || typeof parsed.score !== "number" || !parsed.dimensions) {
      return null;
    }
    return {
      grade: parsed.grade ?? inferGradeFromScore(parsed.score),
      score: parsed.score,
      responseReady: parsed.responseReady ?? parsed.score >= 80,
      summary: parsed.summary ?? "",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      suggestedFixes: Array.isArray(parsed.suggestedFixes) ? parsed.suggestedFixes : [],
      dimensions: {
        grounding: parsed.dimensions.grounding,
        actionability: parsed.dimensions.actionability,
        completeness: parsed.dimensions.completeness,
        compliance: parsed.dimensions.compliance,
        tone: parsed.dimensions.tone,
        launchReadiness: parsed.dimensions.launchReadiness
      }
    };
  } catch {
    return null;
  }
}
async function callModelText({
  systemPrompt,
  userMessage,
  maxTokens,
  model = DEFAULT_CLAUDE_MODEL
}) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (anthropicKey) {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    });
    return response.content.filter((block) => block.type === "text").map((block) => block.text).join("\n").trim();
  }
  const client = getGeminiClient();
  const geminiModel = client.getGenerativeModel({
    model: model === DEFAULT_CLAUDE_MODEL ? DEFAULT_GEMINI_MODEL : model,
    systemInstruction: systemPrompt
  });
  const result = await geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.2
    }
  });
  return result.response.text().trim();
}
async function gradeWithModel(testCase, response) {
  const gradingPrompt = `Stress case:
- id: ${testCase.id}
- title: ${testCase.title}
- kind: ${testCase.kind}
- threadType: ${testCase.threadType}
- expectedFocus: ${testCase.expectedFocus.join(", ")}

Conversation history:
${(testCase.history ?? []).map((message) => `${message.role}: ${message.content}`).join("\n") || "none"}

User prompt:
${testCase.prompt}

Agent response:
${response}`;
  try {
    const raw = await callModelText({
      systemPrompt: GRADER_SYSTEM_PROMPT,
      userMessage: gradingPrompt,
      maxTokens: 1200
    });
    return parseGradeJson(raw);
  } catch {
    return null;
  }
}
async function gradeCase(testCase, response, error) {
  if (error) {
    return heuristicGrade(testCase, response, error);
  }
  const graded = await gradeWithModel(testCase, response);
  return graded ?? heuristicGrade(testCase, response);
}
function buildConversationHistoryBlock(messages) {
  if (messages.length === 0) {
    return "";
  }
  const history = messages.slice(-6).map((message) => `${message.type === "user" ? "User" : "Assistant"}: ${message.content}`).join("\n");
  return `<conversation_history>
${history}
</conversation_history>

`;
}
async function generateInboxResponse(threadContext, personaId, prompt, history) {
  const persona = PERSONAS[personaId in PERSONAS ? personaId : "puff"] ?? PERSONAS.puff;
  const operatorOverride = `

OPERATOR CONTEXT (MANDATORY \u2014 overrides all other instructions):
- You are responding to an authenticated dispensary owner/manager inside their private operator inbox.
- Role: owner/operator. NOT a demo. NOT interview mode. Full guidance required.
- TONE REQUIREMENT: Professional, clear, and actionable. Never condescending, threatening, or sarcastic. No rhetorical questions. No scolding openers.
- SELF-PROMOTION BANNED: Never suggest the operator hire you, upgrade tiers, or purchase services.
- GROUNDING REQUIREMENT: Base all advice on the context provided. Do not invent statistics, benchmarks, or regulatory citations not present in the context.
- FORMAT: Lead with the most important action. Be specific. Be direct.`;
  const systemPrompt = `${persona.systemPrompt}${operatorOverride}

${threadContext}

Respond as if you are inside the Thrive Syracuse operator inbox. Be grounded, specific, and launch-ready.`;
  const userMessage = `${buildConversationHistoryBlock(history)}Current user message: ${prompt}`;
  return callModelText({
    systemPrompt,
    userMessage,
    maxTokens: 1400
  });
}
async function runCase(testCase, orgId) {
  const thread = buildThread(testCase, orgId);
  const { resolvedAgent, personaId } = resolvePersona(testCase);
  const threadContext = await buildInboxThreadContext(thread);
  const startedAt = Date.now();
  try {
    const response = await generateInboxResponse(threadContext, personaId, testCase.prompt, thread.messages);
    const grade = await gradeCase(testCase, response);
    return {
      id: testCase.id,
      title: testCase.title,
      kind: testCase.kind,
      threadType: testCase.threadType,
      configuredAgent: testCase.primaryAgent,
      resolvedAgent,
      personaId,
      durationMs: Date.now() - startedAt,
      response,
      responsePreview: clip(response, 220),
      toolCalls: [],
      grade
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fallbackResponse = `ERROR: ${message}`;
    const grade = await gradeCase(testCase, fallbackResponse, message);
    return {
      id: testCase.id,
      title: testCase.title,
      kind: testCase.kind,
      threadType: testCase.threadType,
      configuredAgent: testCase.primaryAgent,
      resolvedAgent,
      personaId,
      durationMs: Date.now() - startedAt,
      response: fallbackResponse,
      responsePreview: clip(fallbackResponse, 220),
      toolCalls: [],
      grade,
      error: message
    };
  }
}
function toMarkdown(orgId, results, generatedAt) {
  const average = results.length > 0 ? (results.reduce((sum, result) => sum + result.grade.score, 0) / results.length).toFixed(1) : "0.0";
  const readyCount = results.filter((result) => result.grade.responseReady).length;
  const critical = results.filter((result) => result.grade.grade === "fail").length;
  const poor = results.filter((result) => result.grade.grade === "poor").length;
  const failingCases = results.filter((result) => result.grade.grade === "fail" || result.grade.grade === "poor").map((result) => `- ${result.id} (${result.grade.grade.toUpperCase()} ${result.grade.score}): ${result.grade.summary} ${result.grade.issues[0] ? `Issue: ${result.grade.issues[0]}` : ""}`).join("\n");
  const rows = results.map((result) => {
    const ready = result.grade.responseReady ? "yes" : "no";
    const issue = result.grade.issues[0] ? clip(result.grade.issues[0], 90) : "none";
    return `| ${result.id} | ${result.kind} | ${result.resolvedAgent} | ${result.grade.grade} | ${result.grade.score} | ${ready} | ${issue} |`;
  }).join("\n");
  return `# Thrive Syracuse Inbox Stress Report

- Generated: ${generatedAt}
- Org: ${orgId}
- Cases run: ${results.length}
- Average score: ${average}
- Response-ready cases: ${readyCount}/${results.length}
- Poor or fail: ${poor + critical}
- Failures: ${critical}

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
${rows}

## Launch blockers
${failingCases || "- None"}

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
`;
}
async function main() {
  ensureFirebaseApp();
  const orgId = getArg("orgId") ?? DEFAULT_ORG_ID;
  const limitArg = getArg("limit");
  const agentFilter = getArg("agent");
  const filteredCases = agentFilter ? STRESS_CASES.filter((c) => c.primaryAgent === agentFilter) : STRESS_CASES;
  const limit = limitArg ? Math.max(1, Math.min(filteredCases.length, Number(limitArg))) : filteredCases.length;
  const cases = filteredCases.slice(0, limit);
  const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  console.log(`Running inbox stress for ${orgId} with ${cases.length} case(s)...`);
  const results = [];
  for (const [index, testCase] of cases.entries()) {
    console.log(`[${index + 1}/${cases.length}] ${testCase.id} -> ${testCase.primaryAgent}/${testCase.threadType}`);
    const result = await runCase(testCase, orgId);
    console.log(`  grade=${result.grade.grade} score=${result.grade.score} ready=${result.grade.responseReady ? "yes" : "no"} duration=${result.durationMs}ms`);
    results.push(result);
  }
  const outputDir = import_path.default.resolve(process.cwd(), "reports", "inbox");
  import_fs.default.mkdirSync(outputDir, { recursive: true });
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const baseName = `thrive-syracuse-inbox-stress-${stamp}`;
  const jsonPath = import_path.default.join(outputDir, `${baseName}.json`);
  const mdPath = import_path.default.join(outputDir, `${baseName}.md`);
  const report = {
    orgId,
    generatedAt,
    totalCases: results.length,
    averageScore: results.length > 0 ? Number((results.reduce((sum, result) => sum + result.grade.score, 0) / results.length).toFixed(1)) : 0,
    readyCount: results.filter((result) => result.grade.responseReady).length,
    results
  };
  import_fs.default.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  import_fs.default.writeFileSync(mdPath, toMarkdown(orgId, results, generatedAt));
  console.log(`Saved JSON report: ${jsonPath}`);
  console.log(`Saved Markdown report: ${mdPath}`);
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
