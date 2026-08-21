/**
 * services/opnsense.ts
 *
 * OPNsense REST API integration.
 * Fetches DHCP lease table from Dnsmasq to provide MAC ↔ IP mappings.
 *
 * Auth: API key + secret (Basic auth)
 * Endpoint: GET /api/dnsmasq/leases/search
 *
 * OPNsense uses HTTPS with a self-signed certificate by default.
 * We use a fetch-based approach with SSL verification disabled for local network.
 */
import { useAuthStore } from '../stores/auth';

export interface DhcpLease {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
}

/**
 * Make an authenticated GET request to OPNsense API using axios Basic auth.
 * Uses HTTP (OPNsense is configured to allow HTTP on local network).
 */
async function opnsenseGet(host: string, key: string, secret: string, path: string) {
  const axios = require('axios').default;
  const params = { current: 1, rowCount: 1000, searchPhrase: '' };

  const { data } = await axios.get(`http://${host}${path}`, {
    params,
    auth: { username: key, password: secret },
    timeout: 8000,
  });
  return data;
}

/**
 * Fetch DHCP leases from OPNsense Dnsmasq.
 * Returns empty array if OPNsense is not configured or request fails.
 */
export async function fetchDhcpLeases(): Promise<DhcpLease[]> {
  const { opnsenseEnabled, opnsenseHost, opnsenseKey, opnsenseSecret } =
    useAuthStore.getState();

  if (!opnsenseEnabled || !opnsenseHost || !opnsenseKey || !opnsenseSecret) {
    return [];
  }

  try {
    const data = await opnsenseGet(
      opnsenseHost, opnsenseKey, opnsenseSecret,
      '/api/dnsmasq/leases/search'
    );

    const rows: any[] = data?.rows ?? [];
    return rows
      .filter((r) => r.address && r.hwaddr)
      .map((r) => ({
        ip:       r.address.trim(),
        mac:      r.hwaddr.trim().toLowerCase(),
        hostname: r.hostname?.trim() === '*' ? '' : (r.hostname?.trim() ?? ''),
        vendor:   r.mac_info?.trim() ?? '',
      }));
  } catch (e: any) {
    console.log('OPNsense DHCP fetch failed:', e?.message);
    return [];
  }
}

/**
 * Build an IP → MAC lookup map from DHCP leases.
 */
export async function buildIpMacMap(): Promise<Record<string, string>> {
  const leases = await fetchDhcpLeases();
  const map: Record<string, string> = {};
  for (const lease of leases) {
    map[lease.ip] = lease.mac;
  }
  return map;
}

/**
 * Build a MAC → vendor map from DHCP leases.
 */
export async function buildMacVendorMap(): Promise<Record<string, string>> {
  const leases = await fetchDhcpLeases();
  const map: Record<string, string> = {};
  for (const lease of leases) {
    if (lease.vendor) map[lease.mac] = lease.vendor;
  }
  return map;
}

/**
 * Test OPNsense connection with given credentials.
 * Throws on failure with a descriptive error.
 */
export async function testOpnsenseConnection(
  host: string,
  key: string,
  secret: string
): Promise<void> {
  try {
    await opnsenseGet(host, key, secret, '/api/dnsmasq/leases/search');
  } catch (e: any) {
    const status = e?.status ?? e?.response?.status;
    if (status === 401 || status === 403) {
      throw new Error('Invalid API key or secret');
    } else {
      throw new Error(e?.message ?? 'Connection failed');
    }
  }
}