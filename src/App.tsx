import { Routes, Route, Navigate } from "react-router-dom";
import DirectionHandler from "./components/DirectionHandler";
import PlanTripPage from "./features/tripPlanner/pages/PlanTripPage";
import TripResultPage from "./features/tripPlanner/pages/TripResultPage";
import SearchHistoryPage from "./features/tripPlanner/pages/SearchHistoryPage";
import AuthPage from "./features/auth/pages/AuthPage";
import { useAuth } from "./auth/AuthContext";

export default function App() {
  const { token } = useAuth();
  return (
    <>
      <DirectionHandler />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={token ? <PlanTripPage /> : <Navigate to="/auth" replace />} />
        <Route path="/trip/:id" element={token ? <TripResultPage /> : <Navigate to="/auth" replace />} />
        <Route path="/history" element={token ? <SearchHistoryPage /> : <Navigate to="/auth" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
