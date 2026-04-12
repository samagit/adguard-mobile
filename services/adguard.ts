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

// ── Status ────────────────────────────────────────────────────────────────────
export const getStatus = async () => {
  const { data } = await getClient().get('/status');
  return data;
};

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats = async () => {
  const { data } = await getClient().get('/stats');
  return data;
};

// ── Clients ───────────────────────────────────────────────────────────────────
export const getClients = async () => {
  const { data } = await getClient().get('/clients');
  return data;
};

export const getClientsWithStatus = async () => {
  const [clientsData, accessData] = await Promise.all([
    getClient().get("/clients"),
    getClient().get("/access/list"),
  ]);
  const disallowed: string[] = accessData.data.disallowed_clients ?? [];
  const clients = clientsData.data.clients ?? [];
  return {
    clients: clients.map((c: any) => ({
      ...c,
      disallowed: c.ids?.some((id: string) => disallowed.includes(id)),
    })),
  };
};

export const getDisallowedClients = async (): Promise<string[]> => {
  const { data } = await getClient().get("/access/list");
  return data.disallowed_clients ?? [];
};

export const blockClient = async (identifier: string, block: boolean) => {
  const current = await getDisallowedClients();
  const updated = block
    ? [...new Set([...current, identifier])]
    : current.filter((c) => c !== identifier);

  const { data } = await getClient().post("/access/set", {
    disallowed_clients: updated,
    allowed_clients: [],
    blocked_hosts: [],
  });
  return data;
};
// ── Query Log ─────────────────────────────────────────────────────────────────
export const getQueryLog = async (limit = 50) => {
  const { data } = await getClient().get(`/querylog?limit=${limit}`);
  return data;
};

// ── Protection ────────────────────────────────────────────────────────────────
export const setProtection = async (enabled: boolean) => {
  const { data } = await getClient().post('/dns_config', {
    protection_enabled: enabled,
  });
  return data;
};

// ── Filtering ─────────────────────────────────────────────────────────────────
export const getFilteringStatus = async () => {
  const { data } = await getClient().get('/filtering/status');
  return data;
};

export const setFiltering = async (enabled: boolean) => {
  const { data } = await getClient().post('/filtering/config', { enabled });
  return data;
};
