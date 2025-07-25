// src/App.js
import React from 'react';

import {
  BrowserRouter as Router,
  Link,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import Counter from './components/Counter';
import History from './components/History';
import Login from './components/Login';
import {
  AuthProvider,
  useAuth,
} from './context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" />;
};

function AppRoutes() {
  const { user, logout } = useAuth();

  return (
    <Router>
      <nav>
        {user && (
          <>
            <Link to="/counter">Counter</Link> | <Link to="/history">History</Link> |{' '}
            <button onClick={logout}>Logout</button>
          </>
        )}
      </nav>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/counter" element={<PrivateRoute><Counter /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
