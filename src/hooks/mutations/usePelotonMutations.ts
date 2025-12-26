import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnections } from '../../contexts/ConnectionsContext';
import { queryKeys } from '../../lib/queryKeys';

interface ConnectPelotonVariables {
  username: string;
  password: string;
}

/**
 * Mutation hook for connecting to Peloton.
 * Invalidates the profile query on success to trigger a fresh fetch.
 */
export function usePelotonConnect() {
  const queryClient = useQueryClient();
  const { connectPeloton } = useConnections();

  return useMutation({
    mutationFn: async ({ username, password }: ConnectPelotonVariables) => {
      await connectPeloton(username, password);
    },
    onSuccess: () => {
      // Invalidate profile query to trigger a fresh fetch
      queryClient.invalidateQueries({ queryKey: queryKeys.peloton.profile() });
    },
  });
}

/**
 * Mutation hook for disconnecting from Peloton.
 * Clears the profile query cache on success.
 */
export function usePelotonDisconnect() {
  const queryClient = useQueryClient();
  const { disconnectPeloton } = useConnections();

  return useMutation({
    mutationFn: async () => {
      await disconnectPeloton();
    },
    onSuccess: () => {
      // Remove profile data from cache
      queryClient.removeQueries({ queryKey: queryKeys.peloton.profile() });
    },
  });
}

/**
 * Mutation hook for refreshing Peloton token.
 * Invalidates the profile query on success to ensure fresh data with new token.
 */
export function usePelotonRefreshToken() {
  const queryClient = useQueryClient();
  const { refreshPelotonToken } = useConnections();

  return useMutation({
    mutationFn: async () => {
      await refreshPelotonToken();
    },
    onSuccess: () => {
      // Invalidate profile query to refetch with new token
      queryClient.invalidateQueries({ queryKey: queryKeys.peloton.profile() });
    },
  });
}
