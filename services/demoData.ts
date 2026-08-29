/**
 * services/demoData.ts
 *
 * Mock data for Google Play review demo mode.
 * Activated when user enters specific demo credentials.
 *
 * All device names, IPs, and MACs are completely fictional.
 *
 * Demo credentials:
 *   Host: demo.adguard-mobile.app:3000
 *   Username: google-play-tester
 *   Password: SafePassword123!
 */

export const DEMO_HOST     = 'demo.adguard-mobile.app:3000';
export const DEMO_USERNAME = 'google-play-tester';
export const DEMO_PASSWORD = 'SafePassword123!';

export function isDemoMode(host: string, username: string, password: string): boolean {
  return (
    host.trim()     === DEMO_HOST &&
    username.trim() === DEMO_USERNAME &&
    password.trim() === DEMO_PASSWORD
  );
}

// ── Mock Stats ────────────────────────────────────────────────────────────────

export const DEMO_STATS = {
  num_dns_queries:         124830,
  num_blocked_filtering:    9210,
  num_replaced_safebrowsing:   2,
  num_replaced_parental:       0,
  num_replaced_safesearch:     0,
  avg_processing_time:        11.8,
  top_blocked_domains: [
    { 'www.google-analytics.com':        1240 },
    { 'doubleclick.net':                  980 },
    { 'ads.facebook.com':                 742 },
    { 'tracking.tiktok.com':              618 },
    { 'telemetry.microsoft.com':          504 },
  ],
  top_queried_domains: [
    { 'connectivitycheck.gstatic.com':   1890 },
    { 'time.apple.com':                  1102 },
    { 'www.youtube.com':                  874 },
    { 'api.netflix.com':                  643 },
    { 'www.google.com':                   521 },
  ],
  top_clients: [
    { '10.0.0.101': 48200 },
    { '10.0.0.102': 31400 },
    { '10.0.0.103':  8900 },
    { '10.0.0.104':  6300 },
    { '10.0.0.105':  4100 },
  ],
};

// ── Mock Status ───────────────────────────────────────────────────────────────

export const DEMO_STATUS = {
  protection_enabled: true,
  dns_addresses: ['10.0.0.1'],
  dns_port: 53,
  http_port: 3000,
  version: '0.107.48',
  running: true,
};

// ── Mock Clients ──────────────────────────────────────────────────────────────

export const DEMO_CLIENTS = {
  clients: [
    {
      name: 'Alex-MacBook-Pro',
      ids: ['10.0.0.101', 'a4:83:e7:12:cd:91'],
      disallowed: false,
      tags: [],
    },
    {
      name: 'Office-Desktop',
      ids: ['10.0.0.102', 'bc:54:2f:88:3a:07'],
      disallowed: false,
      tags: [],
    },
    {
      name: 'Samsung-Galaxy-S24',
      ids: ['10.0.0.103', 'd2:4a:7e:31:09:bc'],
      disallowed: false,
      tags: [],
    },
    {
      name: 'iPhone-15-Pro',
      ids: ['10.0.0.104', 'f6:11:9c:44:72:d5'],
      disallowed: false,
      tags: [],
    },
    {
      name: 'Kids-iPad',
      ids: ['10.0.0.105', 'e2:78:3b:56:af:19'],
      disallowed: true,
      tags: [],
    },
    {
      name: 'Living-Room-TV',
      ids: ['10.0.0.106', '60:ab:14:77:3c:d2'],
      disallowed: false,
      tags: [],
    },
    {
      name: 'Front-Door-Camera',
      ids: ['10.0.0.107', 'b0:41:1d:22:88:f4'],
      disallowed: false,
      tags: [],
    },
    {
      name: 'Smart-Thermostat',
      ids: ['10.0.0.108', '44:61:32:aa:bb:cc'],
      disallowed: false,
      tags: [],
    },
    {
      name: 'PlayStation-5',
      ids: ['10.0.0.109', '00:d9:d1:55:e3:2a'],
      disallowed: false,
      tags: [],
    },
    {
      name: 'Archer-AX90-Router',
      ids: ['10.0.0.1', '90:9a:4a:ff:12:34'],
      disallowed: false,
      tags: [],
    },
  ],
  auto_clients: [],
  supported_tags: [],
};

// ── Mock Access List ──────────────────────────────────────────────────────────

export const DEMO_ACCESS = {
  allowed_clients: [],
  disallowed_clients: ['10.0.0.105', 'e2:78:3b:56:af:19'],
  blocked_hosts: [],
};

// ── Mock Query Log ────────────────────────────────────────────────────────────

const now = Date.now();
const mins = (m: number) => new Date(now - m * 60000).toISOString();

export const DEMO_QUERY_LOG = {
  data: [
    { time: mins(0),  client: '10.0.0.101', question: { name: 'www.youtube.com',               type: 'A' }, reason: 'NotFilteredNotFound',  elapsedMs: 8  },
    { time: mins(0),  client: '10.0.0.102', question: { name: 'www.google-analytics.com',       type: 'A' }, reason: 'FilteredBlackList',    elapsedMs: 0  },
    { time: mins(1),  client: '10.0.0.103', question: { name: 'api.snapchat.com',               type: 'A' }, reason: 'NotFilteredNotFound',  elapsedMs: 14 },
    { time: mins(1),  client: '10.0.0.102', question: { name: 'doubleclick.net',                type: 'A' }, reason: 'FilteredBlackList',    elapsedMs: 0  },
    { time: mins(2),  client: '10.0.0.106', question: { name: 'api.netflix.com',               type: 'A' }, reason: 'NotFilteredNotFound',  elapsedMs: 22 },
    { time: mins(2),  client: '10.0.0.101', question: { name: 'connectivitycheck.gstatic.com', type: 'A' }, reason: 'NotFilteredNotFound',  elapsedMs: 6  },
    { time: mins(3),  client: '10.0.0.104', question: { name: 'time.apple.com',                type: 'A' }, reason: 'NotFilteredNotFound',  elapsedMs: 9  },
    { time: mins(3),  client: '10.0.0.102', question: { name: 'ads.facebook.com',              type: 'A' }, reason: 'FilteredBlackList',    elapsedMs: 0  },
    { time: mins(4),  client: '10.0.0.107', question: { name: 'p2p.reolink.com',               type: 'A' }, reason: 'NotFilteredNotFound',  elapsedMs: 18 },
    { time: mins(4),  client: '10.0.0.109', question: { name: 'playstation.net',               type: 'A' }, reason: 'NotFilteredNotFound',  elapsedMs: 11 },
    { time: mins(5),  client: '10.0.0.102', question: { name: 'telemetry.microsoft.com',       type: 'A' }, reason: 'FilteredBlackList',    elapsedMs: 0  },
    { time: mins(6),  client: '10.0.0.108', question: { name: 'auth.ecobee.com',               type: 'A' }, reason: 'NotFilteredNotFound',  elapsedMs: 20 },
    { time: mins(7),  client: '10.0.0.101', question: { name: 'github.com',                    type: 'A' }, reason: 'NotFilteredNotFound',  elapsedMs: 13 },
    { time: mins(8),  client: '10.0.0.103', question: { name: 'tracking.tiktok.com',           type: 'A' }, reason: 'FilteredBlackList',    elapsedMs: 0  },
    { time: mins(9),  client: '10.0.0.104', question: { name: 'push.apple.com',                type: 'A' }, reason: 'NotFilteredNotFound',  elapsedMs: 7  },
    { time: mins(10), client: '10.0.0.106', question: { name: 'lgtvsdx.lge.com',               type: 'A' }, reason: 'NotFilteredNotFound',  elapsedMs: 25 },
    { time: mins(11), client: '10.0.0.102', question: { name: 'www.google-analytics.com',      type: 'A' }, reason: 'FilteredBlackList',    elapsedMs: 0  },
    { time: mins(12), client: '10.0.0.101', question: { name: 'www.google.com',                type: 'A' }, reason: 'NotFilteredNotFound',  elapsedMs: 10 },
  ],
  oldest_logged: mins(60),
  filters: [],
};
