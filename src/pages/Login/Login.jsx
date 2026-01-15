import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import "./Login.css";
import logo from "../../assets/sct-logo2.png";

const login = async () => {
  const nav = useNavigate();
  return nav("/home");
};

function Login() {
  const nav = useNavigate();
  const [isInvalid, setIsInvalid] = useState(false);
  const [accID, setAccID] = useState("");
  const [pin, setPin] = useState("");

  return (
    <>
      <div className="main_content">
        <div className="banner" />
        <div className="login">
          <div className="header-login">
            <img src={logo} alt="SCT Logo" />
            <h1>Welcome Back!</h1>
          </div>
          <div className="credentials">
            <input
              type="text"
              placeholder="Account ID"
              value={accID}
              onChange={(e) => {
                setAccID(e.target.value);
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
              }}
            />
            <button
              className="btn"
              onClick={() => {
                nav("/home");
                login();
              }}
            >
              LOGIN
            </button>
            <div className="tAndC">
              <h4>
                By logging in, you agree with our <a>Terms and Conditions</a>
              </h4>
            </div>
            {isInvalid && (
              <div className="center">
                <h3 className="invalid">INVALID CREDENTIALS!</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
