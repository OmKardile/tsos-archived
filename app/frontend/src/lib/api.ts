const API_BASE = '/api';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('tsos_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('tsos_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  get: <T = any>(path: string) => request(path) as Promise<T>,
  post: <T = any>(path: string, body: any) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }) as Promise<T>,
  patch: <T = any>(path: string, body: any) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body) }) as Promise<T>,
  delete: <T = any>(path: string) =>
    request(path, { method: 'DELETE' }) as Promise<T>,
};
