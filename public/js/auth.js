import { api } from './api.js';

export async function login(payload) {
  const response = await api.post('/auth/login', payload);
  return response;
}

export async function register(payload) {
  const response = await api.post('/auth/register', payload);
  return response;
}

export async function logout() {
  return api.post('/auth/logout');
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me');
  return response.user;
}

export function hasRole(user, roleName) {
  return Array.isArray(user?.roles) && user.roles.some((role) => role.name === roleName);
}

export function isAuthenticated(user) {
  return Boolean(user && user.status === 'ACTIVE');
}
