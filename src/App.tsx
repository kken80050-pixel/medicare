import {useEffect} from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BranchProvider } from './BranchProvide';
import { AuthProvider, useAuth } from './AuthContext';
import { RequireAuth } from './RequireAuth';
import { Appointment } from './Appointment';
import { Branches } from './Branches';
import { Booking } from './Booking';
import { Login } from './Login';
import { Register } from './Register';
import { Dashboard } from './Dashboard';
import { AppointmentDetails } from './AppointmentDetails';

const openedOnHome = window.location.pathname === '/';
let redirected = false;

function HomeRoute() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const loggingOut = (location.state as { logout?: boolean } | null)?.logout === true;

  useEffect(() => {
    if (loggingOut) logout();
    redirected = true;
  }, [loggingOut]);

  if (loggingOut) return <Appointment />;
  if (user && openedOnHome && !redirected) return <Navigate to="/dashboard" replace />;
  return <Appointment />;
}

export default function App() {
  return (
    <AuthProvider>
      <BranchProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/book" element={<RequireAuth><Booking /></RequireAuth>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/appointment/:reference" element={<RequireAuth><AppointmentDetails /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </BranchProvider>
    </AuthProvider>
  );
}