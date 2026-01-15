import { useState } from "react";
import { Route, Routes } from "react-router-dom";

import Login from "./pages/Login/Login.jsx";
import Homepage from "./pages/Hompage/Homepage.jsx";
import Sidebar from "./GlobalComponents/Sidebar";
import Header from "./GlobalComponents/Header";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/home"
        element={
          <div className="layout">
            <Sidebar />

            <main className="main">
              <Header />
              <Homepage />
            </main>
          </div>
        }
      />

      {/* <Route path="/unauthorized" element={<Unauthorized />} /> */}

      <Route />
    </Routes>
  );
}

export default App;
