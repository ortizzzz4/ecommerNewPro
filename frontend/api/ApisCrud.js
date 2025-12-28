import api from './axios';

export const getProduct = () => api.get('productos/v1/product/');
export const obtenerProduct = (id) => api.get(`productos/v1/product/${id}/`);
export const createProduct = (product) => api.post('productos/v1/product/', product);
export const deleteProduct = (id) => api.delete(`productos/v1/product/${id}/`);
export const updateProduct = (id, product) => api.put(`productos/v1/product/${id}/`, product);




// Usuarios
export const registerUser = (userData) => api.post('users/users/register/', userData);
export const loginUser = (credentials) => api.post('users/users/login/', credentials);
export const refreshToken = (token) => api.post('users/users/refresh/', { refresh: token });

export const getCurrentUser = () => api.get('users/users/current/');
