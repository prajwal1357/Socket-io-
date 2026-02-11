import axios from "axios";
import { getToken, logout } from "../utils/auth"; // Import logout helper

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🛡️ ADD THIS: The Response Interceptor
api.interceptors.response.use(
  (response) => response, 
  (error) => {
    // If backend sends 401 (Unauthorized) or 403 (Forbidden)
    if (error.response && (error.response.status === 401)) {
      logout(); // Clear the local token
      window.location.href = "/login"; // Force redirect to login
    }
    return Promise.reject(error);
  }
);

export default api;