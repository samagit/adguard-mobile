/**
 * services/deviceDetection.ts
 *
 * Detects device type and manufacturer from:
 *  1. DNS query patterns (domain signatures)
 *  2. MAC OUI lookup via api.macvendors.com (free, no key required)
 *
 * The OUI lookup result is cached in memory for the app session so each
 * unique MAC is only looked up once. AdGuard Home's persistent client name
 * serves as long-term storage — no local DB needed.
 */

import axios from 'axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeviceInfo {
  manufacturer: string;
  type: string;
  icon: string;
  suggestedName: string;
  confidence: 'high' | 'medium' | 'low';
}

// ── In-memory OUI cache (session only) ───────────────────────────────────────

const ouiCache = new Map<string, string>();

/**
 * Look up MAC vendor via api.macvendors.com.
 * Returns vendor string (e.g. "Apple, Inc.") or null if not found / rate limited.
 * Caches results in memory so each OUI is only fetched once per session.
 */
export const lookupMacVendor = async (mac: string): Promise<string | null> => {
  if (!mac) return null;

  const oui = mac.toLowerCase().slice(0, 8); // "aa:bb:cc"
  if (ouiCache.has(oui)) return ouiCache.get(oui) ?? null;

  // Don't look up randomized MACs (locally administered bit set)
  const firstByte = parseInt(mac.split(':')[0] ?? mac.split('-')[0], 16);
  if ((firstByte & 0x02) !== 0) {
    ouiCache.set(oui, '');
    return null;
  }

  try {
    const { data, status } = await axios.get<string>(
      `https://api.macvendors.com/${encodeURIComponent(mac)}`,
      { timeout: 3000, responseType: 'text' }
    );
    if (status === 200 && data) {
      ouiCache.set(oui, data.trim());
      return data.trim();
    }
  } catch {
    // 404 = not found, 429 = rate limited — both are non-fatal
  }

  ouiCache.set(oui, '');
  return null;
};

// ── Domain signatures ─────────────────────────────────────────────────────────
//
// Rules:
//  - Only include domains EXCLUSIVE to that device type
//  - Generic CDN/shopping/cloud domains are banned
//  - Use minMatches >= 2 for any ambiguous signature
//
const DEVICE_SIGNATURES: {
  manufacturer: string;
  type: string;
  icon: string;
  domains: string[];
  minMatches?: number;
}[] = [
  // ── Apple ──────────────────────────────────────────────────────────────────
  { manufacturer: 'Apple', type: 'iPad',     icon: '📱', domains: ['ipad-ld.apple.com', 'ipad.apple.com'] },
  { manufacturer: 'Apple', type: 'iPhone',   icon: '📱', domains: ['iphone-ld.apple.com'] },
  { manufacturer: 'Apple', type: 'MacBook',  icon: '💻', domains: ['swscan.apple.com', 'swcdn.apple.com', 'swdist.apple.com'] },
  { manufacturer: 'Apple', type: 'Apple TV', icon: '📺', domains: ['appletv.apple.com'] },
  { manufacturer: 'Apple', type: 'HomePod',  icon: '🔊', domains: ['homepod.apple.com'] },

  // ── Samsung ────────────────────────────────────────────────────────────────
  { manufacturer: 'Samsung', type: 'Smart TV',     icon: '📺', domains: ['samsungacr.com', 'pavv.samsung.com', 'cdn.samsungcloudsolution.com', 'smcloud.net'], minMatches: 2 },
  { manufacturer: 'Samsung', type: 'Galaxy Phone', icon: '📱', domains: ['bixby-voice.samsung.com', 'push.samsungcloud.com'] },

  // ── LG ─────────────────────────────────────────────────────────────────────
  { manufacturer: 'LG', type: 'Smart TV', icon: '📺', domains: ['lgtvsdx.lge.com', 'lgtvonline.lge.com', 'ibs.lgappstv.com', 'aic-ngfts.lge.com', 'ngfts.lge.com'], minMatches: 2 },

  // ── Google ─────────────────────────────────────────────────────────────────
  { manufacturer: 'Google', type: 'Chromecast',    icon: '📺', domains: ['eureka.gvt1.com', 'cast.google.com'] },
  { manufacturer: 'Google', type: 'Android Phone', icon: '📱', domains: ['android.clients.google.com', 'connectivitycheck.gstatic.com'], minMatches: 2 },
  { manufacturer: 'Google', type: 'Nest',          icon: '🏠', domains: ['home.nest.com', 'nest.com'], minMatches: 2 },

  // ── Amazon ─────────────────────────────────────────────────────────────────
  { manufacturer: 'Amazon', type: 'Echo / Alexa', icon: '🔊', domains: ['avs-alexa-na.amazon.com', 'avs-alexa-eu.amazon.com', 'avs-alexa-fe.amazon.com'] },
  { manufacturer: 'Amazon', type: 'Fire TV',      icon: '📺', domains: ['fireos-updates.amazon.com', 'kindle-time.amazon.com'], minMatches: 2 },

  // ── Microsoft ──────────────────────────────────────────────────────────────
  { manufacturer: 'Microsoft', type: 'Xbox',       icon: '🎮', domains: ['xboxlive.com', 'xsts.auth.xboxlive.com'], minMatches: 2 },
  { manufacturer: 'Microsoft', type: 'Windows PC', icon: '💻', domains: ['settings-win.data.microsoft.com', 'www.msftconnecttest.com', 'msftconnecttest.com', 'dns.msftncsi.com', 'dl.delivery.mp.microsoft.com'], minMatches: 2 },

  // ── Sony ───────────────────────────────────────────────────────────────────
  { manufacturer: 'Sony', type: 'PlayStation', icon: '🎮', domains: ['playstation.net', 'ps4.update.playstation.net', 'telemetry.playstation.com'], minMatches: 2 },
  { manufacturer: 'Sony', type: 'Bravia TV',   icon: '📺', domains: ['bravia.dl.playstation.net'] },

  // ── IP Cameras ─────────────────────────────────────────────────────────────
  { manufacturer: 'Reolink',  type: 'Camera', icon: '📹', domains: ['reolink.com', 'api.reolink.com', 'p2p.reolink.com'] },
  { manufacturer: 'Hikvision',type: 'Camera', icon: '📹', domains: ['hik-online.com', 'hikvision.com', 'hkvcloud.com'], minMatches: 2 },
  { manufacturer: 'Dahua',    type: 'Camera', icon: '📹', domains: ['dahuasecurity.com', 'easy4ip.com'], minMatches: 2 },
  { manufacturer: 'Wyze',     type: 'Camera', icon: '📹', domains: ['wyze.com', 'api.wyzecam.com'] },
  { manufacturer: 'Arlo',     type: 'Camera', icon: '📹', domains: ['arlo.com', 'myarlo.com', 'arloq.com'], minMatches: 2 },
  { manufacturer: 'Eufy',     type: 'Camera', icon: '📹', domains: ['eufylife.com', 'security-app-eu.eufylife.com'], minMatches: 2 },
  { manufacturer: 'Ring',     type: 'Camera', icon: '📹', domains: ['ring.com', 'api.ring.com', 'fw.ring.com'], minMatches: 2 },
  { manufacturer: 'Nest',     type: 'Camera', icon: '📹', domains: ['camera.home.nest.com', 'nexus.dropcam.com'] },
  { manufacturer: 'Amcrest',  type: 'Camera', icon: '📹', domains: ['amcrest.com', 'amcrestcloud.com'] },
  { manufacturer: 'Unifi',    type: 'Camera', icon: '📹', domains: ['protect.ui.com', 'unifi.ui.com'], minMatches: 2 },

  // ── Smart Home ─────────────────────────────────────────────────────────────
  { manufacturer: 'Ecobee',   type: 'Thermostat', icon: '🌡️', domains: ['auth.ecobee.com', 'api.ecobee.com'] },
  { manufacturer: 'Philips',  type: 'Hue Bridge', icon: '💡', domains: ['meethue.com', 'account.meethue.com'] },

  // ── Networking ─────────────────────────────────────────────────────────────
  { manufacturer: 'TP-Link',  type: 'Router', icon: '📡', domains: ['tplinkwifi.net', 'tplinksecurity.com', 'updates.tplinkcloud.com'] },
  { manufacturer: 'Ubiquiti', type: 'Router', icon: '📡', domains: ['ubnt.com', 'unifi.ubnt.com', 'dl.ubnt.com'], minMatches: 2 },

  // ── Other ──────────────────────────────────────────────────────────────────
  { manufacturer: 'Roku',     type: 'Streaming Stick', icon: '📺', domains: ['logs.roku.com', 'scribe.logs.roku.com'], minMatches: 2 },
  { manufacturer: 'Nintendo', type: 'Switch',          icon: '🎮', domains: ['atum.srv.nintendo.net', 'ec.nintendo.com', 'ctest.cdn.nintendo.net'], minMatches: 2 },
  { manufacturer: 'Realme',   type: 'Phone',           icon: '📱', domains: ['log.realme.com', 'push.realme.com', 'stats.coloros.com'], minMatches: 2 },
  { manufacturer: 'Xiaomi',   type: 'Phone',           icon: '📱', domains: ['sdkconfig.ad.intl.xiaomi.com', 'tracking.miui.com'] },
  { manufacturer: 'Canon',    type: 'Printer',         icon: '🖨️', domains: ['gdlp01.c-wss.com', 'ij.start.canon', 'inkjet.register.canon'] },
  { manufacturer: 'HP',       type: 'Printer',         icon: '🖨️', domains: ['hp.com', 'print.hp.com', 'hpeprint.com'], minMatches: 2 },
  { manufacturer: 'Raspberry Pi', type: 'Pi',          icon: '🖥️', domains: ['raspberrypi.org'] },
];

// ── Vendor string → device type mapping ──────────────────────────────────────
//
// Maps substrings from the macvendors.com API response to device type + icon.
// Matched case-insensitively, first match wins.
// This is what makes the OUI lookup useful for OSS users with any brand.
//
const VENDOR_TYPE_RULES: {
  match: string | string[];   // substring(s) to look for in vendor name
  type: string;
  icon: string;
}[] = [
  // Cameras first — before generic IoT
  { match: ['Reolink', 'ITTIM', 'Amcrest', 'Hikvision', 'Dahua', 'Wyze', 'Hanwha', 'Axis Communications', 'Vivotek', 'Foscam', 'Zosi'], type: 'Camera',     icon: '📹' },

  // Networking
  { match: ['TP-Link', 'Ubiquiti', 'Netgear', 'Linksys', 'Asus', 'D-Link', 'Cisco', 'MikroTik', 'Synology', 'QNAP', 'Fortinet', 'Aruba', 'Sophos', 'S-Bluetech'], type: 'Router',      icon: '📡' },

  // Smart home
  { match: ['Ecobee', 'Nest Labs', 'Honeywell'],                                    type: 'Thermostat',  icon: '🌡️' },
  { match: ['Signify', 'Philips Lighting'],                                          type: 'Hue Bridge',  icon: '💡' },
  { match: ['Ring', 'Arlo', 'Eufy', 'Anker Innovations'],                           type: 'Camera',      icon: '📹' },

  // TVs and streaming
  { match: ['LG Electronics', 'LG Innotek'],                                         type: 'Smart TV',    icon: '📺' },
  { match: ['Samsung', 'SAMSUNG'],                                                   type: 'Smart TV',    icon: '📺' },
  { match: ['Sony'],                                                                  type: 'Smart TV',    icon: '📺' },
  { match: ['Roku'],                                                                  type: 'Streaming Stick', icon: '📺' },
  { match: ['Amazon Technologies', 'Amazon.com'],                                    type: 'Echo / Alexa',icon: '🔊' },

  // Consoles
  { match: ['Microsoft', 'XBOX'],                                                    type: 'Windows PC',  icon: '💻' },
  { match: ['Nintendo'],                                                              type: 'Console',     icon: '🎮' },
  { match: ['Sony Interactive'],                                                     type: 'PlayStation',  icon: '🎮' },

  // Computers
  { match: ['Apple'],                                                                type: 'Device',      icon: '📱' },
  { match: ['Intel Corporate', 'Intel'],                                             type: 'PC',          icon: '💻' },
  { match: ['Dell', 'Hewlett Packard', 'HP Inc', 'Lenovo', 'ASUSTek', 'Acer', 'Toshiba', 'Gigabyte', 'MSI'],  type: 'PC', icon: '💻' },

  // Printers
  { match: ['Canon', 'Seiko Epson', 'Brother Industries', 'Lexmark'],               type: 'Printer',     icon: '🖨️' },

  // Mobile
  { match: ['Xiaomi', 'Realme', 'OnePlus', 'Oppo', 'Vivo', 'Huawei', 'ZTE'],      type: 'Phone',       icon: '📱' },
  { match: ['Raspberry Pi'],                                                         type: 'Pi',          icon: '🖥️' },
];

/**
 * Given a vendor string from macvendors.com, return the best type + icon.
 */
const vendorToTypeInfo = (vendor: string): { type: string; icon: string } => {
  const v = vendor.toLowerCase();
  for (const rule of VENDOR_TYPE_RULES) {
    const matches = Array.isArray(rule.match) ? rule.match : [rule.match];
    if (matches.some((m) => v.includes(m.toLowerCase()))) {
      return { type: rule.type, icon: rule.icon };
    }
  }
  return { type: 'Device', icon: '📱' };
};

// ── Main detection function ───────────────────────────────────────────────────

/**
 * Detect device info from IP, MAC, and queried domains.
 *
 * NOTE: This function is synchronous — it only uses the in-memory OUI cache.
 * Call lookupMacVendor(mac) BEFORE calling this during the discovery phase
 * so the cache is warm. Discovery already has the MAC from DHCP/query log.
 */
export const detectDevice = (
  ip: string,
  mac: string,
  queriedDomains: string[]
): DeviceInfo => {
  const parts = ip.split('.');
  const suffix = parts.length === 4 ? `${parts[2]}.${parts[3]}` : ip;

  // Step 1: Domain signature matching
  let bestSignature = null;
  let bestMatchCount = 0;

  for (const sig of DEVICE_SIGNATURES) {
    const matchCount = sig.domains.filter((d) =>
      queriedDomains.some((q) => q.includes(d) || d.includes(q))
    ).length;
    const required = sig.minMatches ?? 1;
    if (matchCount >= required && matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      bestSignature = sig;
    }
  }

  if (bestSignature) {
    return {
      manufacturer: bestSignature.manufacturer,
      type: bestSignature.type,
      icon: bestSignature.icon,
      suggestedName: `${bestSignature.manufacturer} ${bestSignature.type}`,
      confidence: bestMatchCount >= 2 ? 'high' : 'medium',
    };
  }

  // Step 2: MAC OUI cache (populated by lookupMacVendor during discovery)
  if (mac) {
    const oui = mac.toLowerCase().slice(0, 8);
    const vendor = ouiCache.get(oui);
    if (vendor) {
      const typeInfo = vendorToTypeInfo(vendor);
      // Shorten verbose vendor names for display (e.g. "Apple, Inc." → "Apple")
      const shortVendor = vendor
        .replace(/,?\s*(Inc\.?|LLC\.?|Ltd\.?|Co\.?|Corp\.?|Technologies|Electronics|Communications).*$/i, '')
        .trim();
      return {
        manufacturer: shortVendor,
        type: typeInfo.type,
        icon: typeInfo.icon,
        suggestedName: `${shortVendor} ${typeInfo.type}`,
        confidence: 'medium',
      };
    }
  }

  // Step 3: Unknown
  return {
    manufacturer: 'Unknown',
    type: 'Device',
    icon: '❓',
    suggestedName: `Device ${suffix}`,
    confidence: 'low',
  };
};
