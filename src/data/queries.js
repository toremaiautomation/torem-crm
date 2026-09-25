import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './index';

const rangeKey = (range) => (range ? [range.from?.toISOString() ?? null, range.to?.toISOString() ?? null] : null);

export const useClients = (enabled = true) =>
  useQuery({ queryKey: ['clients'], queryFn: api.listClients, enabled });

export const useClient = (clientId) =>
  useQuery({ queryKey: ['client', clientId], queryFn: () => api.getClient(clientId), enabled: !!clientId });

export const useMessages = (clientId, range) =>
  useQuery({ queryKey: ['messages', clientId ?? 'all', rangeKey(range)], queryFn: () => api.listMessages(clientId, range) });

export const useLeads = (clientId, range) =>
  useQuery({ queryKey: ['leads', clientId ?? 'all', rangeKey(range)], queryFn: () => api.listLeads(clientId, range) });

export const useBookings = (clientId, range, by = 'appointment_time') =>
  useQuery({
    queryKey: ['bookings', clientId ?? 'all', by, rangeKey(range)],
    queryFn: () => api.listBookings(clientId, range, by),
  });

export const useReviewRequests = (clientId) =>
  useQuery({ queryKey: ['reviews', clientId ?? 'all'], queryFn: () => api.listReviewRequests(clientId) });

export const useIntegrations = (clientId) =>
  useQuery({ queryKey: ['integrations', clientId ?? 'all'], queryFn: () => api.listIntegrations(clientId), enabled: !!clientId });

function useInvalidating(fn, keys) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export const useUpdateClient = () => useInvalidating(({ clientId, patch }) => api.updateClient(clientId, patch), ['client', 'clients']);
export const useUpdateClientConfig = () =>
  useInvalidating(({ clientId, patch }) => api.updateClientConfig(clientId, patch), ['client']);
export const useSetAddon = () =>
  useInvalidating(({ clientId, addonName, enabled, monthlyPrice }) => api.setAddon(clientId, addonName, enabled, monthlyPrice), ['client']);
export const useUpdateBookingStatus = () =>
  useInvalidating(({ bookingId, status }) => api.updateBookingStatus(bookingId, status), ['bookings']);
export const useMarkJobComplete = () => useInvalidating((booking) => api.markJobComplete(booking), ['bookings', 'reviews']);
