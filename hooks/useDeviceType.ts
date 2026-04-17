/**
 * hooks/useDeviceType.ts
 *
 * Persists device type using expo-secure-store (already a project dependency).
 * Both DeviceRow and DeviceDetailSheet use this hook so the icon stays in sync.
 */
import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { DeviceType, inferDeviceType } from "../components/DeviceDetailSheet";

// SecureStore keys must be alphanumeric + dots/dashes, no colons or slashes
// Sanitize: "192.168.1.105" → "dt_192_168_1_105"
function storageKey(identifier: string): string {
  return "dt_" + identifier.replace(/[^a-zA-Z0-9]/g, "_");
}

export function useDeviceType(identifier: string, deviceName: string) {
  const [deviceType, setDeviceTypeState] = useState<DeviceType>(() =>
    inferDeviceType(deviceName),
  );

  // Load persisted type on mount / identifier change
  useEffect(() => {
    if (!identifier) return;
    SecureStore.getItemAsync(storageKey(identifier)).then((stored) => {
      if (stored) setDeviceTypeState(stored as DeviceType);
      else setDeviceTypeState(inferDeviceType(deviceName));
    });
  }, [identifier]);

  // Re-infer from name if no persisted type (e.g. after a rename)
  useEffect(() => {
    if (!identifier) return;
    SecureStore.getItemAsync(storageKey(identifier)).then((stored) => {
      if (!stored) setDeviceTypeState(inferDeviceType(deviceName));
    });
  }, [deviceName]);

  const setDeviceType = async (type: DeviceType) => {
    setDeviceTypeState(type);
    await SecureStore.setItemAsync(storageKey(identifier), type);
  };

  return { deviceType, setDeviceType };
}
