import axios from "axios";

const api = axios.create({
  baseURL: ""/"",
});

// 🔒 Interceptor para incluir el token en cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔁 Interceptor de respuesta para manejar expiración del token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      error.response.data.code === "token_not_valid"
    ) {
      // Token expirado, limpiar storage
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      
      // Redirige automáticamente (esto ya recarga la página)
      window.location.href = "/login";
      
      // ❌ NO uses reload() aquí, href ya hace la redirección completa
    }
    return Promise.reject(error);
  }
);

export default api;