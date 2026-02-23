import axios from "axios";

// This logic automatically switches between local and production URLs
const baseURL = import.meta.env.PROD
  ? "https://backend-lrmm.onrender.com/api/auth"
  : "/api/auth";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export default api;
