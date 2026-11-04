import { api } from './api';
import { Admin } from '@/types';

export async function listScanners(): Promise<Admin[]> {
  const res = await api.get('/api/admin/scanners');
  return res.data.data;
}

export async function createScanner(input: { name: string; email: string; password: string }): Promise<Admin> {
  const res = await api.post('/api/admin/scanners', input);
  return res.data.data;
}

export async function updateScanner(
  id: string,
  input: { name?: string; isActive?: boolean; password?: string }
): Promise<Admin> {
  const res = await api.patch(`/api/admin/scanners/${id}`, input);
  return res.data.data;
}
