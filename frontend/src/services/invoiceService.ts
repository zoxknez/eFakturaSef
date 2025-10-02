import { CreateInvoiceRequest, Invoice, ApiResponse } from '../types/invoice';

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

/**
 * Invoice API service
 */
export const invoiceService = {
  /**
   * Create new invoice
   */
  async createInvoice(data: CreateInvoiceRequest): Promise<ApiResponse<Invoice>> {
    const response = await fetch(`${API_BASE_URL}/api/invoices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create invoice');
    }

    return result;
  },

  /**
   * Get all invoices
   */
  async getInvoices(): Promise<ApiResponse<Invoice[]>> {
    const response = await fetch(`${API_BASE_URL}/api/invoices`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch invoices');
    }

    return result;
  },

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id: string): Promise<ApiResponse<Invoice>> {
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch invoice');
    }

    return result;
  },

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(id: string, status: string): Promise<ApiResponse<Invoice>> {
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to update invoice status');
    }

    return result;
  },

  /**
   * Delete invoice
   */
  async deleteInvoice(id: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete invoice');
    }

    return result;
  },

  /**
   * Send invoice to SEF system
   */
  async sendInvoiceToSEF(id: string): Promise<ApiResponse<{ sefId: string; status: string }>> {
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}/send-to-sef`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send invoice to SEF');
    }

    return result;
  },

  /**
   * Import UBL file
   */
  async importUBL(file: File): Promise<ApiResponse<Invoice>> {
    const formData = new FormData();
    formData.append('ublFile', file);

    const response = await fetch(`${API_BASE_URL}/api/invoices/import-ubl`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        // Remove Content-Type header to let browser set it with boundary
      },
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to import UBL file');
    }

    return result;
  }
};
