import { env } from '../lib/env.js';

async function request(path, options = {}) {
  const response = await fetch(`${env.RUNPOD_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.RUNPOD_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error || body?.message || `RunPod API returned ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return body;
}

export const runpod = {
  listPods: () => request('/pods'),
  getPod: (id) => request(`/pods/${encodeURIComponent(id)}`),
  startPod: (id) => request(`/pods/${encodeURIComponent(id)}/action`, {
    method: 'POST', body: JSON.stringify({ action: 'start' })
  }),
  stopPod: (id) => request(`/pods/${encodeURIComponent(id)}/action`, {
    method: 'POST', body: JSON.stringify({ action: 'stop' })
  }),
  terminatePod: (id) => request(`/pods/${encodeURIComponent(id)}`, { method: 'DELETE' })
};
