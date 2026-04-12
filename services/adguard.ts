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

export const addClient = async (client: {
  name: string;
  ids: string[];
  tags?: string[];
}) => {
  const { data } = await getClient().post("/clients/add", {
    name: client.name,
    ids: client.ids,
    tags: [],
    use_global_settings: true,
    filtering_enabled: true,
    parental_enabled: false,
    safebrowsing_enabled: false,
    safesearch_enabled: false,
    use_global_blocked_services: true,
  });
  return data;
};

export const autoAddDiscoveredDevices = async (registeredIds: string[]) => {
  const { data } = await getClient().get("/querylog?limit=1000");
  const entries = data?.data ?? [];

  const seen = new Set<string>();
  const toAdd: string[] = [];

  for (const entry of entries) {
    const ip = entry.client;
    if (ip && !seen.has(ip) && !registeredIds.includes(ip)) {
      seen.add(ip);
      toAdd.push(ip);
    }
  }

  console.log("IPs to add:", JSON.stringify(toAdd));

  let added = 0;
  for (const ip of toAdd) {
    try {
      await addClient({
        name: `Device-${ip.split(".").pop()}`,
        ids: [ip],
        tags: [],
      });
      added++;
      console.log("Added:", ip);
    } catch (e: any) {
      console.log("Failed to add:", ip, e?.response?.data ?? e?.message);
    }
  }

  return added;
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
