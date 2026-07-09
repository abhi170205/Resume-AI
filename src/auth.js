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
    signOut: () => signOut({ onSignedOut })
  };
}

export function getAuthContext() {
  if (!authContext) {
    throw new Error("No authenticated HR user. Sign in before requesting company data.");
  }

  return authContext;
}

export function getCompanyId() {
  return getAuthContext().companyId;
}

export async function companyScopedFetch(path, options = {}) {
  const context = getAuthContext();
  const headers = new Headers(options.headers || {});

  headers.set("Authorization", `Bearer ${context.idToken}`);
  headers.set("X-Company-ID", context.companyId);

  return fetch(path, {
    ...options,
    headers
  });
}

async function signInWithPassword({ credentials, onSignedIn, onError }) {
  try {
    const context = await loginWithBackend(credentials);

    authContext = context;
    localStorage.setItem(SESSION_KEY, JSON.stringify(context));
    onSignedIn(context);
  } catch (error) {
    onError(error);
  }
}

async function signUpWithBackend({ details, onSignedIn, onError }) {
  try {
    if (details.password !== details.confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: details.companyName,
        username: details.username,
        password: details.password
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || "Could not create workspace. Please try again.");
    }

    const data = await response.json();
    const context = toAuthContext(data, details.username);

    authContext = context;
    localStorage.setItem(SESSION_KEY, JSON.stringify(context));
    onSignedIn(context);
  } catch (error) {
    onError(error);
  }
}

async function signOut({ onSignedOut }) {
  authContext = null;
  localStorage.removeItem(SESSION_KEY);
  onSignedOut();
}

async function loginWithBackend({ username, password }) {
  if (!username || !password) {
    throw new Error("Username and password are required.");
  }

  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || "Invalid username or password.");
  }

  const data = await response.json();
  return toAuthContext(data, username);
}

function toAuthContext(data, fallbackUsername) {
  if (!data.companyId) {
    throw new Error("This account is not assigned to a company workspace.");
  }

  return {
    uid: data.uid,
    name: data.name || "HR user",
    email: data.email || fallbackUsername,
    companyId: data.companyId,
    companyName: data.companyName || data.companyId,
    idToken: data.idToken,
    authProvider: "username-password"
  };
}

function readSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}