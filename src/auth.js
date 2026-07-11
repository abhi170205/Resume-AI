import { appConfig } from "./config.js";

const SESSION_KEY = "resume-ai-auth-session";

let authContext = null;

export async function initializeAuth({ onSignedIn, onSignedOut, onError }) {
  const savedSession = readSavedSession();

  if (savedSession) {
    authContext = savedSession;
    onSignedIn(authContext);
  } else {
    onSignedOut();
  }

  return {
    signIn: (credentials) => signInWithPassword({ credentials, onSignedIn, onError }),
    signUp: (details) => signUpWithBackend({ details, onSignedIn, onError }),
    signOut: () => signOut({ onSignedOut, onError })
  };
}

export function getAuthContext() {
  if (!authContext) {
    throw new Error("No authenticated HR user. Sign in before requesting company data.");
  }

  return authContext;
}

export function getCompanyId() {
  return getAuthContext().company.id;
}

export async function companyScopedFetch(path, options = {}) {
  const context = getAuthContext();
  const headers = new Headers(options.headers || {});

  headers.set("Authorization", `Bearer ${context.accessToken}`);
  headers.set("X-Company-ID", context.companyId);

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${appConfig.apiBaseUrl}${path}`, { ...options, headers });
}
async function signInWithPassword({ credentials, onSignedIn, onError }) {
  try {
    const session = await postAuth(appConfig.endpoints.login, {
      username: credentials.username,
      password: credentials.password
    });

    setSession(session);
    onSignedIn(authContext);
  } catch (error) {
    onError(error);
  }
}

async function signUpWithBackend({ details, onSignedIn, onError }) {
  try {
    if (details.password !== details.confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const session = await postAuth(appConfig.endpoints.signup, {
      companyName: details.companyName,
      username: details.username,
      password: details.password
    });

    setSession(session);
    onSignedIn(authContext);
  } catch (error) {
    onError(error);
    throw error;
  }
}

async function signOut({ onSignedOut, onError }) {
  try {
    if (authContext?.accessToken) {
      await companyScopedFetch(appConfig.endpoints.logout, { method: "POST" }).catch(() => {});
    }
  } catch (error) {
    onError(error);
  } finally {
    clearSession();
    onSignedOut();
  }
}

async function postAuth(path, body) {
  const response = await fetch(toApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await parseJsonResponse(response, "Authentication failed.");
  return normalizeSession(payload, body.username);
}

function normalizeSession(payload, fallbackUsername) {
  const session = {
    accessToken: payload.accessToken || payload.idToken || payload.token,
    user: payload.user || {
      id: payload.uid || payload.userId,
      name: payload.name || "HR user",
      email: payload.email || fallbackUsername
    },
    company: payload.company || {
      id: payload.companyId,
      name: payload.companyName || payload.companyId
    }
  };

  assertValidSession(session);
  return session;
}

function setSession(session) {
  authContext = session;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function assertValidSession(session) {
  if (!session?.accessToken || !session?.user?.email || !session?.company?.id) {
    throw new Error("Backend auth response must include accessToken, user.email, and company.id.");
  }
}

async function parseJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload;
}

function readSavedSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    assertValidSession(session);
    return session;
  } catch {
    clearSession();
    return null;
  }
}

function clearSession() {
  authContext = null;
  localStorage.removeItem(SESSION_KEY);
}

function toApiUrl(path) {
  return new URL(path, appConfig.apiBaseUrl).toString();
}
