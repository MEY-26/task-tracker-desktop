/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';

function AppWithTheme() {
  const { user } = useAuth();
  return (
    <ThemeProvider user={user}>
      <App />
    </ThemeProvider>
  );
}

function AppWithProviders() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppWithTheme />
      </NotificationProvider>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWithProviders />
  </React.StrictMode>
);
