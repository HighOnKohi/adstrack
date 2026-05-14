import { createContext, useContext } from "react";

export const AlertModalContext = createContext();

export function useAlert() {
  const context = useContext(AlertModalContext);
  if (!context) {
    throw new Error("useAlert must be used within AlertModalProvider");
  }
  return context;
}
