//Library and css imports
import { Route, Routes } from "react-router-dom";
import "./App.css";

//Page imports
import Login from "./Pages/Login/Login.jsx";
import Homepage from "./Pages/Homepage/Homepage.jsx";
import Schedules from "./Pages/Schedules/Schedules.jsx";
import Calendar from "./Pages/Calendar/Calendar.jsx";
import Inventory from "./Pages/Inventory/Inventory.jsx";
import Analytics from "./Pages/Analytics/Analytics.jsx";
import Schools from "./Pages/Schools/Schools.jsx";

//Global imports
import Layout from "./GlobalComponents/Layout.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element = { <Layout/> }>
        <Route path = "/home"      element = {<Homepage />} />
        <Route path = "/schedules" element = {<Schedules />} />
        <Route path = "/calendar"  element = {<Calendar />} />
        <Route path = "/inventory" element = {<Inventory/>} />
        <Route path = "/analytics" element = {<Analytics/>} />
        <Route path = "/schools"   element = {<Schools/>} />
      </Route>
    </Routes>
  );
}

export default App;

{/* <Route path="/test" element={<Test />} /> */}