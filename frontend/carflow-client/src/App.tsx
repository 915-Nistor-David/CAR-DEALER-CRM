import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Board from "./pages/Board";
import Vehicles from "./pages/Vehicles";
import VehicleDetail from "./pages/VehicleDetail";
import Sales from "./pages/Sales";
import Users from "./pages/Users";
import Stages from "./pages/Stages";
import Activity from "./pages/Activity";
import Agenda from "./pages/Agenda";
import Notifications from "./pages/Notifications";

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/board" element={<Board />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/vehicles/:id" element={<VehicleDetail />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/notificari" element={<Notifications />} />
            <Route path="/sales" element={
              <ProtectedRoute requiredRole={["Owner", "Vanzari"]}><Sales /></ProtectedRoute>
            } />
            <Route path="/utilizatori" element={
              <ProtectedRoute requiredRole={["Owner"]}><Users /></ProtectedRoute>
            } />
            <Route path="/etape" element={
              <ProtectedRoute requiredRole={["Owner"]}><Stages /></ProtectedRoute>
            } />
            <Route path="/activitate" element={
              <ProtectedRoute requiredRole={["Owner"]}><Activity /></ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
