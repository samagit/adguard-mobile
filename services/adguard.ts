import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { isDemoMode, DEMO_STATS, DEMO_STATUS, DEMO_CLIENTS, DEMO_QUERY_LOG, DEMO_ACCESS } from './demoData';

const getClient = () => {
  const { host, username, password } = useAuthStore.getState();
  return axios.create({
    baseURL: `http://${host}/control`,
    auth: { username, password },
    timeout: 5000,
  });
};

const isDemo = () => {
  const { host, username, password } = useAuthStore.getState();
  return isDemoMode(host, username, password);
};

// ── IPs to always ignore ───────────────────────────────────────────────────────
const IGNORED_IPS = new Set(['127.0.0.1', '::1', '0.0.0.0']);

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
      if (!ip || IGNORED_IPS.has(ip)) continue;
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

  if (toAdd.length === 0) return 0;

  // Fetch full DHCP lease data from OPNsense if configured
  // Leases provide MAC, hostname, and vendor — much better than domain detection alone
  let ipMacMap: Record<string, string> = {};
  let ipHostnameMap: Record<string, string> = {};
  let ipVendorMap: Record<string, string> = {};
  try {
    const { fetchDhcpLeases } = await import('./opnsense');
    const leases = await fetchDhcpLeases();
    for (const lease of leases) {
      ipMacMap[lease.ip] = lease.mac;
      if (lease.hostname) ipHostnameMap[lease.ip] = lease.hostname;
      if (lease.vendor) ipVendorMap[lease.ip] = lease.vendor;
    }
  } catch (opnErr: any) {
    console.log('OPNsense fetch error:', opnErr?.message ?? opnErr);
  }

  const { detectDevice } = await import('./deviceDetection');

  let added = 0;
  for (const ip of toAdd) {
    try {
      const domains = clientQueries[ip];
      const mac = ipMacMap[ip] ?? '';
      const dhcpHostname = ipHostnameMap[ip] ?? '';
      const parts = ip.split('.');
      const suffix = parts.length === 4 ? `${parts[2]}.${parts[3]}` : ip;

      let name: string;

      if (dhcpHostname) {
        // ✅ Use OPNsense DHCP hostname — most reliable, set by device itself
        // e.g. "MagiCam", "GAMINGSTATION", "ArcherAX90"
        name = dhcpHostname;
      } else {
        // Fall back to domain signature + MAC vendor detection
        const info = detectDevice(ip, mac, domains);
        const baseName = info.suggestedName;
        name = baseName.endsWith(suffix) ? baseName : `${baseName} ${suffix}`;
      }

      // Store both IP and MAC in ids[] when MAC is available
      const ids = mac ? [ip, mac] : [ip];

      await addClient({ name, ids, tags: [] });
      console.log(`Added: ${ip} (${mac || 'no MAC'}) → ${name}`);
      added++;
    } catch (e: any) {
      console.log('Failed:', ip, e?.response?.data ?? e?.message);
    }
  }

  return added;
};

// ── Status ────────────────────────────────────────────────────────────────────
export const getStatus = async () => {
  if (isDemo()) return DEMO_STATUS;
  const { data } = await getClient().get('/status');
  return data;
};

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats = async () => {
  if (isDemo()) return DEMO_STATS;
  const { data } = await getClient().get('/stats');
  return data;
};

// ── Clients ───────────────────────────────────────────────────────────────────
export const getClients = async () => {
  if (isDemo()) return DEMO_CLIENTS;
  const { data } = await getClient().get('/clients');
  return data;
};

export const getClientsWithStatus = async () => {
  if (isDemo()) {
    return {
      clients: DEMO_CLIENTS.clients.map((c) => ({
        ...c,
        disallowed: DEMO_ACCESS.disallowed_clients.some((id) => c.ids.includes(id)),
      })),
    };
  }
  const [clientsData, accessData] = await Promise.all([
    getClient().get('/clients'),
    getClient().get('/access/list'),
  ]);
  const disallowed: string[] = accessData.data.disallowed_clients ?? [];
  const clients = clientsData.data.clients ?? [];
  return {
    clients: clients
      .filter((c: any) => !c.ids?.every((id: string) => IGNORED_IPS.has(id)))
      .map((c: any) => ({
        ...c,
        disallowed: c.ids?.some((id: string) => disallowed.includes(id)),
      })),
  };
};

export const getDisallowedClients = async (): Promise<string[]> => {
  if (isDemo()) return DEMO_ACCESS.disallowed_clients;
  const { data } = await getClient().get('/access/list');
  return data.disallowed_clients ?? [];
};

export const blockClient = async (identifier: string, block: boolean) => {
  if (isDemo()) {
    // In demo mode just update the in-memory demo access list
    if (block) {
      if (!DEMO_ACCESS.disallowed_clients.includes(identifier)) {
        DEMO_ACCESS.disallowed_clients.push(identifier);
      }
    } else {
      DEMO_ACCESS.disallowed_clients = DEMO_ACCESS.disallowed_clients.filter(
        (c) => c !== identifier
      );
    }
    return;
  }
  const current = await getDisallowedClients();
  const updated = block
    ? [...new Set([...current, identifier])]
    : current.filter((c) => c !== identifier);

  const { data: accessData } = await getClient().get('/access/list');
  await getClient().post('/access/set', {
    allowed_clients: accessData.allowed_clients ?? [],
    blocked_hosts: accessData.blocked_hosts ?? [],
    disallowed_clients: updated,
  });
};

// ── Query Log ─────────────────────────────────────────────────────────────────
export const getQueryLog = async (limit = 50) => {
  if (isDemo()) return DEMO_QUERY_LOG;
  const { data } = await getClient().get(`/querylog?limit=${limit}`);
  return data;
};

// ── Protection ────────────────────────────────────────────────────────────────
export const setProtection = async (enabled: boolean) => {
  if (isDemo()) {
    DEMO_STATUS.protection_enabled = enabled;
    return DEMO_STATUS;
  }
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
