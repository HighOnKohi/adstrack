import { useState } from "react";
import { Route, Routes } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Homepage from "./pages/Homepage.jsx";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Homepage />} />

      {/* <Route path="/unauthorized" element={<Unauthorized />} /> */}

      <Route />
    </Routes>
  );
}

export default App;
