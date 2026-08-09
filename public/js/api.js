const API_BASE = '/api';

async function invoke(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options,
    credentials: 'include'
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  get: (path) => invoke(path, { method: 'GET' }),
  post: (path, body) => invoke(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => invoke(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path, body) => invoke(path, { method: 'DELETE', body: JSON.stringify(body) })
};
