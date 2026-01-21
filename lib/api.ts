const API_BASE_URL = 'https://htkwxds4wk.execute-api.ap-south-1.amazonaws.com/default';

export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export class APIError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    console.log(`[API] ${options.method || 'GET'} ${url}`);
    if (options.body) {
      console.log('[API] Request body:', options.body);
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log(`[API] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[API] Error response:', errorData);
      const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
      throw new APIError(errorMessage, response.status, errorData);
    }

    const data = await response.json();
    console.log('[API] Response data:', data);
    return data;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new APIClient(API_BASE_URL);

// Rider Authentication APIs
export const riderAuthAPI = {
  signup: (data: {
    phone: string;
    firstName: string;
    lastName: string;
    address: string;
    aadharNumber: string;
    aadharImageBase64: string;
    panNumber: string;
    panImageBase64: string;
  }) => api.post<{ phone: string; riderId: string; status: string; message: string }>('/api/v1/riders/signup', data),

  checkLogin: (phone: string) => 
    api.post<{ status: string; canLogin: boolean; message?: string; riderId?: string; name?: string; reason?: string }>('/api/v1/riders/login/check', { phone }),
};

// Rider Order APIs
export const riderOrderAPI = {
  getOrders: (riderId: string, status?: string) => {
    const query = status ? `?status=${status}` : '';
    return api.get<{ orders: any[]; total: number }>(`/api/v1/riders/${riderId}/orders${query}`);
  },

  acceptOrder: (riderId: string, orderId: string) =>
    api.post<{ message: string; orderId: string }>(`/api/v1/riders/${riderId}/orders/${orderId}/accept`, {}),

  rejectOrder: (riderId: string, orderId: string, reason: string) =>
    api.post<{ message: string; orderId: string }>(`/api/v1/riders/${riderId}/orders/${orderId}/reject`, { reason }),

  updateOrderStatus: (riderId: string, orderId: string, status: string, otp?: string) =>
    api.put<{ message: string; orderId: string; status: string }>(`/api/v1/riders/${riderId}/orders/${orderId}/status`, { status, otp }),
};

// Rider Status APIs
export const riderStatusAPI = {
  updateLocation: (riderId: string, lat: number, lng: number, speed: number, heading: number) =>
    api.put<any>(`/api/v1/riders/${riderId}/location`, { lat, lng, speed, heading }),

  toggleStatus: (riderId: string, isActive: boolean) =>
    api.put<any>(`/api/v1/riders/${riderId}/status`, { isActive }),
};

// Rider Earnings APIs
export const riderEarningsAPI = {
  getEarnings: (riderId: string, period: 'today' | 'week' | 'month' = 'today') =>
    api.get<any>(`/api/v1/riders/${riderId}/earnings?period=${period}`),

  getHistory: (riderId: string, startDate: string, endDate: string) =>
    api.get<any>(`/api/v1/riders/${riderId}/earnings/history?startDate=${startDate}&endDate=${endDate}`),
};
