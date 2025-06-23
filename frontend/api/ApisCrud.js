import api from './axios';

export const getProduct = () => api.get('productos/api/v1/product/');
export const obtenerProduct = (id) => api.get(`productos/api/v1/product/${id}/`);
export const createProduct = (product) => api.post('productos/api/v1/product/', product);
export const deleteProduct = (id) => api.delete(`productos/api/v1/product/${id}/`);
export const updateProduct = (id, product) => api.put(`productos/api/v1/product/${id}/`, product);


export const registerUser = (userData) => api.post('users/api/users/v1/users/', userData);

