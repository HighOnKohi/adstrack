/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/fbConf";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("adsAuthUser");
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored);
      return parsed?.username ? parsed : null;
    } catch {
      return null;
    }
  });

  const loading = false;

  const login = async ({ username, password }) => {
    const usersRef = collection(db, "Credentials");
    const q = query(usersRef, where("username", "==", username));

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      if (data.password === password) {
        const userData = { id: doc.id, username: data.username };
        setUser(userData);
        localStorage.setItem("adsAuthUser", JSON.stringify(userData));
        return { ok: true, user: userData };
      }
    }

    return { ok: false };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("adsAuthUser");
  };

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading]
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
