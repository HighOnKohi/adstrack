/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  reload,
} from "firebase/auth";
import "../config/fbConf.js";
import { SUPER_ADMIN_UID } from "../config/adminConfig.js";
import {
  loginEmailFromUsername,
  verifyAppUserPassword,
} from "../services/appUsers.js";

const DB_SESSION_KEY = "adstrack_db_user";

const AuthContext = createContext(null);
const auth = getAuth();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fu) => {
      if (fu) {
        sessionStorage.removeItem(DB_SESSION_KEY);
        setUser({
          source: "firebase",
          id: fu.uid,
          email: fu.email || "",
          displayName: fu.displayName?.trim() || "",
        });
      } else {
        const raw = sessionStorage.getItem(DB_SESSION_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.source === "db" && parsed.id && parsed.email) {
              setUser(parsed);
            } else {
              sessionStorage.removeItem(DB_SESSION_KEY);
              setUser(null);
            }
          } catch {
            sessionStorage.removeItem(DB_SESSION_KEY);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = Boolean(
    user?.source === "firebase" && user.id === SUPER_ADMIN_UID,
  );

  const login = useCallback(async ({ username, password }) => {
    const loginEmail = loginEmailFromUsername(username);
    if (!loginEmail || !password) {
      return { ok: false, error: "Missing credentials." };
    }

    try {
      await signInWithEmailAndPassword(auth, loginEmail, password);
      return { ok: true };
    } catch {
      try {
        const dbUser = await verifyAppUserPassword(loginEmail, password);
        if (dbUser) {
          sessionStorage.setItem(DB_SESSION_KEY, JSON.stringify(dbUser));
          setUser(dbUser);
          return { ok: true };
        }
      } catch (e) {
        console.error("Database login check failed:", e);
      }
      return { ok: false, error: "Invalid credentials." };
    }
  }, []);

  const logout = useCallback(async () => {
    sessionStorage.removeItem(DB_SESSION_KEY);
    setUser(null);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    await reload(u);
    setUser({
      source: "firebase",
      id: u.uid,
      email: u.email || "",
      displayName: u.displayName?.trim() || "",
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshProfile,
      isAdmin,
    }),
    [user, loading, login, logout, refreshProfile, isAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/" state={{ from: location }} replace />;

  return children;
}

export function RequireAdmin({ children }) {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) navigate("/home", { replace: true });
  }, [isAdmin, loading, navigate]);

  if (loading) return null;
  if (!isAdmin) return null;

  return children;
}
