import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../services/apiService';

const ReportPage: React.FC = () => {
  const { isAuthenticated, loading: authLoading, login, user, hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadReport = async () => {
    if (!isAuthenticated) {
      setError('Not authenticated');
      return;
    }

    // Check if user has required role for reports
    if (!hasRole('prothetic_user') && !hasRole('administrator')) {
      setError('Insufficient permissions to access reports');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Using the apiService which automatically includes the Bearer token
      const response = await apiRequest('/reports');
      
      // Handle the response based on your API
      if (response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        console.log('Report data:', data);
        // Handle JSON response
      } else {
        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while authentication is initializing
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">Reports Access</h1>
          <p className="text-gray-600 mb-6">Please login to access usage reports</p>
          <button
            onClick={login}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Login with PKCE
          </button>
        </div>
      </div>
    );
  }

  // Check if user has permission to view reports
  const canAccessReports = hasRole('prothetic_user') || hasRole('administrator');

  if (!canAccessReports) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access reports.
          </p>
          <p className="text-sm text-gray-500">
            Required roles: prothetic_user or administrator
          </p>
          <p className="text-sm text-gray-500">
            Your roles: {user?.roles?.join(', ') || 'None'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Usage Reports</h1>
          <p className="text-gray-600">
            Welcome, {user?.firstName} {user?.lastName}
          </p>
          <p className="text-sm text-gray-500">
            Role: {user?.roles?.join(', ')}
          </p>
        </div>
        
        <button
          onClick={downloadReport}
          disabled={loading}
          className={`w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating Report...
            </span>
          ) : (
            'Download Report'
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Additional actions for administrators */}
        {hasRole('administrator') && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Administrator Actions</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                Manage Users
              </button>
              <button className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors">
                System Reports
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportPage;
