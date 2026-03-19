import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import "./Login.css";
import logo from "../../assets/sct-logo2.png";
import { useAuth } from "../../context/AuthContext.jsx";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const [isInvalid, setIsInvalid] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const from = location.state?.from?.pathname || "/home";

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, from, navigate]);

  const handleLogin = async () => {
    setIsInvalid(false);

    const result = await login({ username, password });
    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setIsInvalid(true);
    }
  };

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
              placeholder="Username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
            />
            <button className="btn" onClick={handleLogin}>
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
