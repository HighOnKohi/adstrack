import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./gray-scrollbars.css";
import "./scrollbar-no-arrows.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AlertModalProvider } from "./GlobalComponents/AlertModal.jsx";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AlertModalProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: "10px",
                background: "#333",
                color: "#fff",
                fontSize: "0.9rem",
              },
              success: { iconTheme: { primary: "#0f9d58", secondary: "#fff" } },
              error: { iconTheme: { primary: "#d93025", secondary: "#fff" } },
            }}
          />
        </AuthProvider>
      </AlertModalProvider>
    </BrowserRouter>
  </StrictMode>,
);
