import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AlertModalProvider } from "./GlobalComponents/AlertModal.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AlertModalProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AlertModalProvider>
    </BrowserRouter>
  </StrictMode>,
);
