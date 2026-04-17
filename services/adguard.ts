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
  const { data } = await getClient().post('/clients/add', {
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

/**
 * Fetch all unique client IPs from the query log by paginating until
 * we've seen no new IPs for two consecutive pages, or hit the max page limit.
 */
const fetchAllUniqueClients = async (): Promise<Record<string, string[]>> => {
  const PAGE_SIZE = 1000;
  const MAX_PAGES = 10;
  const clientQueries: Record<string, string[]> = {};
  let offset = 0;
  let stablePages = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await getClient().get(`/querylog?limit=${PAGE_SIZE}&offset=${offset}`);
    const entries = data?.data ?? [];
    if (entries.length === 0) break;

    let newIPsThisPage = 0;
    for (const entry of entries) {
      const ip = entry.client;
      if (!ip || ip === '127.0.0.1') continue;
      if (!clientQueries[ip]) {
        clientQueries[ip] = [];
        newIPsThisPage++;
      }
      if (entry.question?.name) clientQueries[ip].push(entry.question.name);
    }

    offset += PAGE_SIZE;

    if (newIPsThisPage === 0) {
      stablePages++;
      if (stablePages >= 2) break;
    } else {
      stablePages = 0;
    }

    if (entries.length < PAGE_SIZE) break;
  }

  return clientQueries;
};

export const autoAddDiscoveredDevices = async (registeredIds: string[]) => {
  const clientQueries = await fetchAllUniqueClients();
  const toAdd = Object.keys(clientQueries).filter(
    (ip) => !registeredIds.includes(ip)
  );

  const { detectDevice, lookupMacVendor } = await import('./deviceDetection');

  let added = 0;
  for (const ip of toAdd) {
    try {
      const domains = clientQueries[ip];

      // Warm the OUI cache before detection — 1 req/device, only for new devices
      // MAC is not available from query log (only IP), so we pass empty string.
      // If you integrate DHCP lease data in future, pass the MAC here.
      await lookupMacVendor('');

      const info = detectDevice(ip, '', domains);
      const parts = ip.split('.');
      const suffix = parts.length === 4 ? `${parts[2]}.${parts[3]}` : ip;
      const name = `${info.suggestedName} ${suffix}`;

      await addClient({ name, ids: [ip], tags: [] });
      console.log(`Added: ${ip} → ${name}`);
      added++;
    } catch (e: any) {
      console.log('Failed:', ip, e?.response?.data ?? e?.message);
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
    getClient().get('/clients'),
    getClient().get('/access/list'),
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
  const { data } = await getClient().get('/access/list');
  return data.disallowed_clients ?? [];
};

export const blockClient = async (identifier: string, block: boolean) => {
  const current = await getDisallowedClients();
  const updated = block
    ? [...new Set([...current, identifier])]
    : current.filter((c) => c !== identifier);

  const { data } = await getClient().post('/access/set', {
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
