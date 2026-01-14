import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import "../css/Homepage.css";
import logo from "../assets/sct-logo2.png";

function Homepage() {
  const [isInvalid, setIsInvalid] = useState(false);
  const [accID, setAccID] = useState("");
  const [pin, setPin] = useState("");

  return (
    <>
      <div className="main_content"></div>
    </>
  );
}

export default Homepage;
