/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import "../config/fbConf.js";

const AuthContext = createContext(null);
const auth = getAuth();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase automatically handles session persistence
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({ id: currentUser.uid, email: currentUser.email });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async ({ username, password }) => {
    try {
      // Firebase Auth requires an email. If the user just types a username like "admin",
      // we automatically append a domain so Firebase Auth accepts it.
      const loginEmail = username.includes("@")
        ? username
        : `${username}@adstrack.local`;

      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginEmail,
        password,
      );
      const userData = {
        id: userCredential.user.uid,
        email: userCredential.user.email,
      };
      return { ok: true, user: userData };
    } catch (error) {
      console.error("Login failed:", error.message);
      return { ok: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading],
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
