import api from './axios';

export const getProduct = () => api.get('productos/api/v1/product/');
export const obtenerProduct = (id) => api.get(`productos/api/v1/product/${id}/`);
export const createProduct = (product) => api.post('productos/api/v1/product/', product);
export const deleteProduct = (id) => api.delete(`productos/api/v1/product/${id}/`);
export const updateProduct = (id, product) => api.put(`productos/api/v1/product/${id}/`, product);




// Usuarios
export const registerUser = (userData) => api.post('users/api/users/register/', userData);
export const loginUser = (credentials) => api.post('users/api/users/login/', credentials);
export const refreshToken = (token) => api.post('users/api/users/refresh/', { refresh: token });

export const getCurrentUser = () => api.get('users/api/users/current/');
