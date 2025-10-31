import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AnimatedBackground from './components/AnimatedBackground';
import PageShell from './components/PageShell';
import AppShell from './components/AppShell';
import AdminShell from './components/AdminShell';
import Profile from './pages/Profile';
import History from './pages/History';
import VideoInterview from './pages/VideoInterview';

function useAuth() {
  // Keep a small tick to re-render when auth changes
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener('storage', onChange);
    window.addEventListener('auth-changed', onChange as EventListener);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener('auth-changed', onChange as EventListener);
    };
  }, []);
  void tick; // suppress unused var; tick only forces re-render
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  return { token, role };
}

export default function App() {
  const { token, role } = useAuth();
  const theme = createTheme({
    primaryColor: 'blue',
    defaultRadius: 'md',
    colors: {
      blue: [
        '#e6f0ff', '#cde0ff', '#9ec2ff', '#70a3ff', '#4184ff', '#1366ff', '#0f51cc', '#0b3ca0', '#072775', '#03134a'
      ]
    }
  });
  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <Notifications />
      <AnimatedBackground />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PageShell><Login /></PageShell>} />
          <Route path="/register" element={<PageShell><Register /></PageShell>} />
          <Route path="/onboarding" element={token && role !== 'admin' ? <PageShell><Onboarding /></PageShell> : <Navigate to={token ? '/' : '/login'} replace />} />
          <Route path="/" element={token ? <AppShell><PageShell><Dashboard /></PageShell></AppShell> : <Navigate to="/login" replace />} />
          <Route path="/admin" element={token && role === 'admin' ? <AdminShell><PageShell><AdminDashboard /></PageShell></AdminShell> : <Navigate to={token ? '/' : '/login'} replace />} />
          <Route path="/profile" element={token ? <AppShell><PageShell><Profile /></PageShell></AppShell> : <Navigate to="/login" replace />} />
          <Route path="/history" element={token ? <AppShell><PageShell><History /></PageShell></AppShell> : <Navigate to="/login" replace />} />
          <Route path="/video-interview" element={token ? <AppShell><PageShell><VideoInterview /></PageShell></AppShell> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to={token ? '/' : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

// Removed Vite template content
