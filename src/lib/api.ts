import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Important to send/receive cookies (refreshToken)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh automatically
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Skip interceptor for auth routes so we don't end up in an infinite page reload loop
    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/signup')) {
      return Promise.reject(error);
    }

    // If error is 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = res.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);

        // Update the original request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token failed, force logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
