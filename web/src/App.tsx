import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BracketListPage from './pages/BracketListPage';
import CreateBracketPage from './pages/CreateBracketPage';
import BracketDetailPage from './pages/BracketDetailPage';
import PoolListPage from './pages/PoolListPage';
import CreatePoolPage from './pages/CreatePoolPage';
import PoolDetailPage from './pages/PoolDetailPage';
import PublicPoolPage from './pages/PublicPoolPage';
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/pools/:id/public" element={<PublicPoolPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brackets"
        element={
          <ProtectedRoute>
            <BracketListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brackets/new"
        element={
          <ProtectedRoute>
            <CreateBracketPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brackets/:id"
        element={
          <ProtectedRoute>
            <BracketDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pools"
        element={
          <ProtectedRoute>
            <PoolListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pools/new"
        element={
          <ProtectedRoute>
            <CreatePoolPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pools/:id"
        element={
          <ProtectedRoute>
            <PoolDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
