/** Typed wrappers around the API endpoints, grouped by area. */
import type {
  AuthResponse,
  PublicUser,
  ZumbaClassWithBookingState,
  BookingWithClass,
  CrmCustomer,
  CrmNote,
  RosterEntry,
  ZumbaClass,
  RegisterRequest,
  LoginRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  CreateClassRequest,
  PresignUploadResponse,
  AllowedImageType,
  SiteSettings,
  UpdateSettingsRequest,
  ContactRequest,
} from '@grasi/shared';
import { api, uploadToS3 } from './client.js';

export const contactApi = {
  send: (body: ContactRequest) => api.post<{ ok: true }>('/contact', body),
};

export const authApi = {
  me: () => api.get<AuthResponse | null>('/auth/me', { throwOnUnauthorized: false }),
  register: (body: RegisterRequest) => api.post<AuthResponse>('/auth/register', body),
  login: (body: LoginRequest) => api.post<AuthResponse>('/auth/login', body),
  logout: () => api.post<{ ok: true }>('/auth/logout'),
};

export const classesApi = {
  list: () => api.get<{ classes: ZumbaClassWithBookingState[] }>('/classes'),
  get: (id: string) => api.get<{ class: ZumbaClassWithBookingState }>(`/classes/${id}`),
  book: (id: string) => api.post<{ ok: true }>(`/classes/${id}/book`),
  cancel: (id: string) => api.delete<{ ok: true }>(`/classes/${id}/book`),
};

export const meApi = {
  bookings: () => api.get<{ bookings: BookingWithClass[] }>('/me/bookings'),
  updateProfile: (body: UpdateProfileRequest) => api.patch<AuthResponse>('/me', body),
  changePassword: (body: ChangePasswordRequest) => api.post<{ ok: true }>('/me/password', body),
  async uploadAvatar(file: File): Promise<PublicUser> {
    const { uploadUrl, key } = await api.post<PresignUploadResponse>('/me/avatar/presign', {
      contentType: file.type as AllowedImageType,
    });
    await uploadToS3(uploadUrl, file);
    const { user } = await api.post<AuthResponse>('/me/avatar/confirm', { key });
    return user;
  },
};

export const settingsApi = {
  get: () => api.get<{ settings: SiteSettings }>('/settings'),
  update: (body: UpdateSettingsRequest) =>
    api.patch<{ settings: SiteSettings }>('/admin/settings', body),
};

export const adminApi = {
  customers: () => api.get<{ customers: CrmCustomer[] }>('/admin/customers'),
  customer: (id: string) =>
    api.get<{ user: PublicUser; notes: CrmNote[]; bookings: BookingWithClass[] }>(
      `/admin/customers/${id}`,
    ),
  addNote: (id: string, body: string) =>
    api.post<{ note: CrmNote }>(`/admin/customers/${id}/notes`, { body }),
  deleteNote: (customerId: string, noteId: string) =>
    api.delete<{ ok: true }>(`/admin/customers/${customerId}/notes/${noteId}`),
  signups: () => api.get<{ signups: PublicUser[] }>('/admin/signups'),
  createClass: (body: CreateClassRequest) =>
    api.post<{ class: ZumbaClass }>('/admin/classes', body),
  roster: (id: string) =>
    api.get<{ class: ZumbaClass; roster: RosterEntry[] }>(`/admin/classes/${id}/roster`),
};
