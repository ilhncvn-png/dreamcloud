import type { NotificationPreferences, NotificationsPage } from '@/types/notification.types';
import { apiClient } from './client';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getNotifications(page = 1): Promise<NotificationsPage> {
  return extract(
    await apiClient.get<{ data: NotificationsPage }>('/notifications', {
      params: { page, limit: 20 },
    }),
  );
}

export async function getUnreadCount(): Promise<number> {
  const res = extract(
    await apiClient.get<{ data: { count: number } }>('/notifications/unread-count'),
  );
  return res.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return extract(
    await apiClient.get<{ data: NotificationPreferences }>('/notifications/preferences'),
  );
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return extract(
    await apiClient.patch<{ data: NotificationPreferences }>('/notifications/preferences', prefs),
  );
}
