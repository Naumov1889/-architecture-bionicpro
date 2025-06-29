import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'reports-realm',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'reports-frontend',
};

const keycloak = new Keycloak(keycloakConfig);

// PKCE configuration
const initOptions = {
  onLoad: 'check-sso',
  silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
  pkceMethod: 'S256', // Enable PKCE with SHA256
  checkLoginIframe: false,
  enableLogging: true,
};

export { keycloak, initOptions };

export const initKeycloak = (): Promise<boolean> => {
  // @ts-ignore
  return keycloak.init(initOptions);
};

export const loginWithPKCE = (): void => {
  keycloak.login({
    redirectUri: window.location.origin,
  });
};

export const logout = (): void => {
  keycloak.logout({
    redirectUri: window.location.origin,
  });
};

export const getToken = (): string | undefined => {
  return keycloak.token;
};

export const isLoggedIn = (): boolean => {
  return !!keycloak.authenticated;
};

export const getUserRoles = (): string[] => {
  return keycloak.realmAccess?.roles || [];
};

export const hasRole = (role: string): boolean => {
  return getUserRoles().includes(role);
};

export const getUserInfo = () => {
  return {
    username: keycloak.tokenParsed?.preferred_username,
    email: keycloak.tokenParsed?.email,
    firstName: keycloak.tokenParsed?.given_name,
    lastName: keycloak.tokenParsed?.family_name,
    roles: getUserRoles(),
  };
};
