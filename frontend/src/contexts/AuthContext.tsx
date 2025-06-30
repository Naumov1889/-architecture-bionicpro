import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  keycloak, 
  initKeycloak, 
  loginWithPKCE, 
  logout, 
  isLoggedIn, 
  getUserInfo, 
  hasRole 
} from '../services/keycloakService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: () => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const authenticated = await initKeycloak();
        setIsAuthenticated(authenticated);
        
        if (authenticated) {
          setUser(getUserInfo());
        }
      } catch (error) {
        console.error('Failed to initialize Keycloak:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for token updates
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).then((refreshed) => {
        if (refreshed) {
          console.log('Token refreshed');
        } else {
          console.log('Token not refreshed, will expire in', keycloak.tokenParsed?.exp);
        }
      }).catch(() => {
        console.log('Failed to refresh token');
        handleLogout();
      });
    };

    keycloak.onAuthSuccess = () => {
      setIsAuthenticated(true);
      setUser(getUserInfo());
    };

    keycloak.onAuthLogout = () => {
      setIsAuthenticated(false);
      setUser(null);
    };
  }, []);

  const handleLogin = () => {
    loginWithPKCE();
  };

  const handleLogout = () => {
    logout();
  };

  const checkRole = (role: string): boolean => {
    return hasRole(role);
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    login: handleLogin,
    logout: handleLogout,
    hasRole: checkRole,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
