/**
 * hooks/useClientName.ts
 *
 * Provides the custom (persistent) name for a device and a mutation to rename it.
 * Uses AdGuard Home /clients API via adguard.ts + clientsApi.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addClient, getClients } from '../services/adguard';
import { renameClient, findClientByIdentifier } from '../services/clientsApi';

export function useClientName(identifier: string | undefined) {
  const queryClient = useQueryClient();

  const clientsQuery = useQuery({
    queryKey: ['clients'],          // same key as DevicesScreen → shared cache
    queryFn: getClients,
    staleTime: 30_000,
    enabled: !!identifier,
  });

  const existingClient = identifier && clientsQuery.data?.clients
    ? findClientByIdentifier(clientsQuery.data.clients, identifier)
    : undefined;

  const renameMutation = useMutation({
    mutationFn: async ({ newName, ids }: { newName: string; ids: string[] }) => {
      if (!identifier) throw new Error('No identifier provided');

      if (existingClient) {
        await renameClient(existingClient.name, newName);
      } else {
        // Device exists in query log but not as a persistent client yet — create it
        await addClient({ name: newName, ids });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  return {
    customName: existingClient?.name,
    isLoading: clientsQuery.isLoading,
    rename: renameMutation.mutateAsync,
    isRenaming: renameMutation.isPending,
    renameError: renameMutation.error,
  };
}