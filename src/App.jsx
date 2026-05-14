//Library and css imports
import { Route, Routes } from "react-router-dom";
import "./App.css";

//Page imports
import Login from "./pages/Login/Login.jsx";
import Homepage from "./pages/Homepage/Homepage.jsx";
import Schedules from "./pages/Schedules/Schedules.jsx";
import Calendar from "./pages/Calendar/Calendar.jsx";
import Inventory from "./pages/Inventory/Inventory.jsx";
import Analytics from "./pages/Analytics/Analytics.jsx";

import Schools from "./pages/Schools/Schools.jsx";

//Global imports
import Layout from "./GlobalComponents/Layout.jsx";

// Auth
import { RequireAuth } from "./context/AuthContext.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/home" element={<Homepage />} />
        <Route path="/schedules" element={<Schedules />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/analytics" element={<Analytics />} />

        <Route path="/schools" element={<Schools />} />
      </Route>
    </Routes>
  );
}

export default App;

