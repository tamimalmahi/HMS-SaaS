import axios from "axios";

// Create Axios Instance
export const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true // send HTTPOnly refresh token cookies
});

// Request Interceptor: Inject JWT and House Slug
api.interceptors.request.use(
  (config) => {
    // 1. Get access token from memory (stored in localStorage/sessionStorage for client simplicity)
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Resolve house slug from URL path if applicable
    const pathSegments = window.location.pathname.split("/");
    // If URL is /houses/:slug or /:slug/...
    // Let's check if the first path segment is our tenant slug
    const possibleSlug = pathSegments[1];
    const reservedRoutes = ["", "admin", "login", "register", "forgot-password", "reset-password"];
    
    if (possibleSlug && !reservedRoutes.includes(possibleSlug)) {
      config.headers["x-house-slug"] = possibleSlug.toLowerCase();
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Rotate JWT on 401 Unauthorized
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip retry if logout or login failed
    if (originalRequest.url.includes("/auth/login") || originalRequest.url.includes("/auth/logout")) {
      return Promise.reject(error);
    }

    // If unauthorized, attempt token refresh rotation
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post(
          "http://localhost:5000/api/auth/refresh-token",
          {},
          { withCredentials: true }
        );
        const { accessToken } = refreshRes.data;

        localStorage.setItem("accessToken", accessToken);
        api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        
        // Clear auth data and redirect to login if session refresh fails
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        
        const pathSegments = window.location.pathname.split("/");
        const possibleSlug = pathSegments[1];
        const reservedRoutes = ["", "admin", "login", "register"];
        
        if (possibleSlug && !reservedRoutes.includes(possibleSlug)) {
          window.location.href = `/${possibleSlug}/login`;
        } else {
          window.location.href = "/login";
        }
        
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);
