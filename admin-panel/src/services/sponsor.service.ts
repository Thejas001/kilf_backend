import { api } from './api';
import { ApiItemResponse, ApiListResponse, Sponsor, SponsorStatus, SponsorshipLevel } from '@/types';

export interface SponsorListParams {
  page?: number;
  limit?: number;
  status?: SponsorStatus;
  sponsorshipLevel?: SponsorshipLevel;
  festivalId?: string;
  search?: string;
}

export async function listSponsors(params: SponsorListParams): Promise<ApiListResponse<Sponsor>> {
  const res = await api.get('/api/admin/sponsors', { params });
  return res.data;
}

export async function getSponsor(id: string): Promise<Sponsor> {
  const res = await api.get<ApiItemResponse<Sponsor>>(`/api/admin/sponsors/${id}`);
  return res.data.data;
}

export type SponsorInput = Omit<Sponsor, 'id' | 'createdAt' | 'updatedAt'>;

export async function createSponsor(input: Partial<SponsorInput>): Promise<Sponsor> {
  const res = await api.post<ApiItemResponse<Sponsor>>('/api/admin/sponsors', input);
  return res.data.data;
}

export async function updateSponsor(id: string, input: Partial<SponsorInput>): Promise<Sponsor> {
  const res = await api.put<ApiItemResponse<Sponsor>>(`/api/admin/sponsors/${id}`, input);
  return res.data.data;
}

export async function deleteSponsor(id: string): Promise<void> {
  await api.delete(`/api/admin/sponsors/${id}`);
}

export async function updateSponsorStatus(id: string, status: SponsorStatus): Promise<Sponsor> {
  const res = await api.patch<ApiItemResponse<Sponsor>>(`/api/admin/sponsors/${id}/status`, { status });
  return res.data.data;
}

export async function uploadSponsorLogo(id: string, file: File): Promise<Sponsor> {
  const formData = new FormData();
  formData.append('logo', file);
  const res = await api.post<ApiItemResponse<Sponsor>>(`/api/admin/sponsors/${id}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}
