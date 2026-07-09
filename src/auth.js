const SESSION_KEY = "resume-ai-auth-session";

const firebaseConfig = window.RESUME_AI_FIREBASE_CONFIG || null;

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
    signIn: () => signInWithGoogle({ onSignedIn, onError }),
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

async function signInWithGoogle({ onSignedIn, onError }) {
  try {
    const context = firebaseConfig
      ? await signInWithFirebase()
      : await signInWithLocalDemoSession();

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

async function signInWithFirebase() {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup
  } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await signInWithPopup(auth, provider);
  const tokenResult = await result.user.getIdTokenResult(true);
  const companyId = tokenResult.claims.companyId;

  if (!companyId) {
    throw new Error("This Google account is not assigned to a company workspace.");
  }

  return {
    uid: result.user.uid,
    name: result.user.displayName || "HR user",
    email: result.user.email,
    photoURL: result.user.photoURL,
    companyId,
    companyName: tokenResult.claims.companyName || companyId,
    idToken: tokenResult.token,
    authProvider: "firebase-google"
  };
}

async function signInWithLocalDemoSession() {
  return {
    uid: "demo-hr-user",
    name: "Demo HR",
    email: "hr@demo-company.com",
    photoURL: "",
    companyId: "demo-company",
    companyName: "Demo Company",
    idToken: "local-dev-token",
    authProvider: "local-demo"
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
