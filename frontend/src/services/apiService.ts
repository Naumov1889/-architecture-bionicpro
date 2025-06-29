import { getToken } from './keycloakService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
}

export const apiRequest = async (
  endpoint: string, 
  options: RequestOptions = {}
): Promise<Response> => {
  const { requireAuth = true, ...fetchOptions } = options;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };
  
  if (requireAuth) {
    const token = getToken();
    if (token) {
      // @ts-ignore
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  const config: RequestInit = {
    ...fetchOptions,
    headers,
  };
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response;
};

// Example API functions
export const getReports = async () => {
  const response = await apiRequest('/api/reports');
  return response.json();
};

export const getUserProfile = async () => {
  const response = await apiRequest('/api/user/profile');
  return response.json();
};
