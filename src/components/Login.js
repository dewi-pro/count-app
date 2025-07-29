import './Login.css';

import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login, register, loginWithGoogle } = useAuth(); // include Google login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate('/counter');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/counter');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
            <img src="/abstract-shape.svg" alt="" className="abstract-shape" />

      <form className="login-card" onSubmit={handleSubmit}>
  <div className="login-header">
    <h2>Welcome Back</h2>
  </div>

  <div className="input-group">
    <label>Email</label>
    <input
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      required
    />
  </div>

  <div className="input-group">
    <label>Password</label>
    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      required
    />
  </div>

  <div className="action-row">

<button type="button" className="btn-google" onClick={handleGoogleLogin}>
  <img src="/google-icon.svg" alt="Google" className="google-icon" />
  Continue with Google
</button>
    <button type="submit" className="submit-circle">
      <span>&rarr;</span>
    </button>
    <span className="sign-in-text">Sign in</span>
  </div>

  {/* <div className="link-row">
    <p onClick={() => setIsRegister(!isRegister)}>Sign up</p>
    <p>Forgot Password</p>
  </div> */}

  {error && <p className="error">{error}</p>}
</form>

    </div>
  );
};

export default Login;
