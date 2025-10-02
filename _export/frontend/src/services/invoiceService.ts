// Reference of API base URL usage from app
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';

export async function ping() {
  const res = await fetch(`${API_BASE_URL}/health`);
  return res.json();
}
