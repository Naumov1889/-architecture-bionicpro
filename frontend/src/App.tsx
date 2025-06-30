import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ReportPage from './components/ReportPage';

const LoginButton: React.FC = () => {
  const { login } = useAuth();
  
  return (
    <button onClick={login} className="login-btn">
      Login with PKCE
    </button>
  );
};

// const UserProfile: React.FC = () => {
//   const { user, logout, hasRole } = useAuth();
//
//   return (
//     <div className="user-profile">
//       <h2>Welcome, {user?.firstName} {user?.lastName}!</h2>
//       <p>Email: {user?.email}</p>
//       <p>Username: {user?.username}</p>
//       <p>Roles: {user?.roles?.join(', ')}</p>
//
//       {hasRole('administrator') && (
//         <p style={{ color: 'red' }}>🔑 Administrator Access</p>
//       )}
//
//       {hasRole('prothetic_user') && (
//         <p style={{ color: 'blue' }}>📊 Report Access</p>
//       )}
//
//       <button onClick={logout} className="logout-btn">
//         Logout
//       </button>
//     </div>
//   );
// };

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading authentication...</div>;
  }
  
  return (
    <div className="App">
      <header className="App-header">
        {isAuthenticated ? <ReportPage /> : <LoginButton />}
      </header>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
