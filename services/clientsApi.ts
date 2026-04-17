/**
 * services/clientsApi.ts
 */
import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const getClient = () => {
  const { host, username, password } = useAuthStore.getState();
  return axios.create({
    baseURL: `http://${host}/control`,
    auth: { username, password },
    timeout: 5000,
  });
};

export interface AdGuardClient {
  name: string;
  ids: string[];
  tags: string[];
  use_global_settings: boolean;
  filtering_enabled: boolean;
  parental_enabled: boolean;
  safebrowsing_enabled: boolean;
  safesearch_enabled: boolean;
  use_global_blocked_services: boolean;
  blocked_services: string[];
  upstreams: string[];
  disallowed?: boolean;
}

/**
 * Rename a persistent client without losing any of its other settings.
 */
export const renameClient = async (
  currentName: string,
  newName: string
): Promise<void> => {
  const { data } = await getClient().get('/clients');
  const existing: AdGuardClient | undefined = (data.clients ?? []).find(
    (c: AdGuardClient) => c.name === currentName
  );
  if (!existing) throw new Error(`Client "${currentName}" not found`);
  const { disallowed: _drop, ...clean } = existing;
  await getClient().post('/clients/update', {
    name: currentName,
    data: { ...clean, name: newName },
  });
};

/**
 * Delete a persistent client by name.
 * The device itself is NOT lost — it will reappear from query log on next discovery.
 */
export const deleteClient = async (name: string): Promise<void> => {
  await getClient().post('/clients/delete', { name });
};

/**
 * Find a persistent client by any identifier (IP or MAC).
 */
export const findClientByIdentifier = (
  clients: AdGuardClient[],
  identifier: string
): AdGuardClient | undefined =>
  clients.find((c) =>
    c.ids.some((id) => id.toLowerCase() === identifier.toLowerCase())
  );
