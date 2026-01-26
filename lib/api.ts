import * as FileSystem from 'expo-file-system';

const API_BASE_URL = 'https://htgicpllf2.execute-api.ap-south-1.amazonaws.com/default';

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

// User API
export const userAPI = {
  /**
   * Register FCM token for push notifications
   */
  registerFCMToken: async (phone: string, fcmToken: string): Promise<{ message: string }> => {
    console.log(`[API] Registering FCM token for: ${phone}`);
    return api.post(`/api/v1/users/${phone}/fcm-token`, { fcmToken });
  },
};

// Helper function to upload image to S3 via backend (simpler and more reliable)
async function uploadImageToS3(base64Image: string, fileType: 'aadhar' | 'pan', phone: string): Promise<string> {
  try {
    console.log(`[S3] Uploading ${fileType} image via backend...`);
    
    // Backend handles the S3 upload - much simpler!
    const response = await api.post<{ fileUrl: string }>(
      '/api/v1/riders/documents/upload',
      {
        phone,
        documentType: fileType,
        imageBase64: base64Image,
      }
    );

    console.log(`[S3] ${fileType} image uploaded successfully:`, response.fileUrl);
    return response.fileUrl;
  } catch (error) {
    console.error(`[S3] Failed to upload ${fileType} image:`, error);
    throw error;
  }
}

// Rider Authentication APIs
export const riderAuthAPI = {
  signup: async (data: {
    phone: string;
    firstName: string;
    lastName: string;
    address: string;
    aadharNumber: string;
    aadharImageBase64: string;
    panNumber: string;
    panImageBase64: string;
  }) => {
    // Upload images to S3 first
    console.log('[API] Uploading Aadhar image to S3...');
    const aadharImageUrl = await uploadImageToS3(data.aadharImageBase64, 'aadhar', data.phone);
    
    console.log('[API] Uploading PAN image to S3...');
    const panImageUrl = await uploadImageToS3(data.panImageBase64, 'pan', data.phone);

    // Submit signup with S3 URLs instead of base64
    return api.post<{ phone: string; riderId: string; status: string; message: string }>('/api/v1/riders/signup', {
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      address: data.address,
      aadharNumber: data.aadharNumber,
      aadharImageUrl,  // S3 URL instead of base64
      panNumber: data.panNumber,
      panImageUrl,     // S3 URL instead of base64
    });
  },

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

  toggleStatus: (riderId: string, isActive: boolean, lat?: number, lng?: number) =>
    api.put<any>(`/api/v1/riders/${riderId}/status`, { isActive, lat, lng }),
};

// Rider Earnings APIs
export const riderEarningsAPI = {
  getEarnings: (riderId: string, period: 'today' | 'week' | 'month' = 'today') =>
    api.get<any>(`/api/v1/riders/${riderId}/earnings?period=${period}`),

  getHistory: (riderId: string, startDate: string, endDate: string) =>
    api.get<any>(`/api/v1/riders/${riderId}/earnings/history?startDate=${startDate}&endDate=${endDate}`),
};
