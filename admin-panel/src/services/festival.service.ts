import { api } from './api';
import { ApiItemResponse, ApiListResponse, Festival, FestivalStatus } from '@/types';

export interface FestivalListParams {
  page?: number;
  limit?: number;
  status?: FestivalStatus;
  search?: string;
}

export async function listFestivals(params: FestivalListParams): Promise<ApiListResponse<Festival>> {
  const res = await api.get('/api/admin/festivals', { params });
  return res.data;
}

export async function getFestival(id: string): Promise<Festival> {
  const res = await api.get<ApiItemResponse<Festival>>(`/api/admin/festivals/${id}`);
  return res.data.data;
}

export type FestivalInput = Omit<Festival, 'id' | 'createdAt' | 'updatedAt' | '_count'>;

export async function createFestival(input: Partial<FestivalInput>): Promise<Festival> {
  const res = await api.post<ApiItemResponse<Festival>>('/api/admin/festivals', input);
  return res.data.data;
}

export async function updateFestival(id: string, input: Partial<FestivalInput>): Promise<Festival> {
  const res = await api.put<ApiItemResponse<Festival>>(`/api/admin/festivals/${id}`, input);
  return res.data.data;
}

export async function deleteFestival(id: string): Promise<void> {
  await api.delete(`/api/admin/festivals/${id}`);
}

export async function updateFestivalStatus(id: string, status: FestivalStatus): Promise<Festival> {
  const res = await api.patch<ApiItemResponse<Festival>>(`/api/admin/festivals/${id}/status`, { status });
  return res.data.data;
}
