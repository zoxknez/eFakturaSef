// src/services/settingsService.ts

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Create authorization headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

export interface SettingsData {
  apiKey: string;
  companyName: string;
  pib: string;
  address: string;
  city: string;
  postalCode: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  desktopNotifications: boolean;
  autoSend: boolean;
  retryAttempts: number;
  retryDelay: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

/**
 * Settings API service
 */
export const settingsService = {
  /**
   * Get current settings
   */
  async getSettings(): Promise<ApiResponse<SettingsData>> {
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get settings');
    }

    return result;
  },

  /**
   * Update settings
   */
  async updateSettings(data: Partial<SettingsData>): Promise<ApiResponse<SettingsData>> {
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to update settings');
    }

    return result;
  },

  /**
   * Test SEF API connection
   */
  async testSEFConnection(): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/settings/test-sef`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to test SEF connection');
    }

    return result;
  },

  /**
   * Sync with SEF system
   */
  async syncWithSEF(): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/settings/sync-sef`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to sync with SEF');
    }

    return result;
  },

  /**
   * Export configuration
   */
  async exportSettings(): Promise<void> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/settings/export`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error('Failed to export settings');
    }

    // Download the file
    const blob = await response.blob();
    const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'config.json';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  /**
   * Import configuration
   */
  async importSettings(config: any): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/settings/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ config })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to import settings');
    }

    return result;
  }
};
