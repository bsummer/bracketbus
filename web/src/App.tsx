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
import GamesListPage from './pages/GamesListPage';
import EditGamePage from './pages/EditGamePage';
import AdminCreateUserPage from './pages/AdminCreateUserPage';
import AdminAddUserToPoolPage from './pages/AdminAddUserToPoolPage';
import AdminUserListPage from './pages/AdminUserListPage';
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin && window.location.pathname.startsWith('/admin')) {
    return <Navigate to="/dashboard" replace />;
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
        path="/brackets/:id/edit"
        element={
          <ProtectedRoute>
            <CreateBracketPage />
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
      <Route
        path="/admin/games"
        element={
          <ProtectedRoute>
            <GamesListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/games/:id"
        element={
          <ProtectedRoute>
            <EditGamePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminUserListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/new"
        element={
          <ProtectedRoute>
            <AdminCreateUserPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/add-to-pool"
        element={
          <ProtectedRoute>
            <AdminAddUserToPoolPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/:poolName"
        element={
            <PublicPoolPage />
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
