import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  // AdGuard Home
  host: string;
  username: string;
  password: string;
  isConnected: boolean;

  // OPNsense (optional)
  opnsenseEnabled: boolean;
  opnsenseHost: string;
  opnsenseKey: string;
  opnsenseSecret: string;

  setCredentials: (
    host: string,
    username: string,
    password: string,
    opnsense?: { host: string; key: string; secret: string } | null
  ) => Promise<void>;
  clearCredentials: () => Promise<void>;
  loadCredentials: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  host: '',
  username: '',
  password: '',
  isConnected: false,
  opnsenseEnabled: false,
  opnsenseHost: '',
  opnsenseKey: '',
  opnsenseSecret: '',

  setCredentials: async (host, username, password, opnsense = null) => {
    await SecureStore.setItemAsync('agh_host', host);
    await SecureStore.setItemAsync('agh_username', username);
    await SecureStore.setItemAsync('agh_password', password);

    if (opnsense) {
      await SecureStore.setItemAsync('opn_host', opnsense.host);
      await SecureStore.setItemAsync('opn_key', opnsense.key);
      await SecureStore.setItemAsync('opn_secret', opnsense.secret);
      set({
        host, username, password,
        opnsenseEnabled: true,
        opnsenseHost: opnsense.host,
        opnsenseKey: opnsense.key,
        opnsenseSecret: opnsense.secret,
      });
    } else {
      // Clear any previously saved OPNsense credentials
      await SecureStore.deleteItemAsync('opn_host');
      await SecureStore.deleteItemAsync('opn_key');
      await SecureStore.deleteItemAsync('opn_secret');
      set({
        host, username, password,
        opnsenseEnabled: false,
        opnsenseHost: '',
        opnsenseKey: '',
        opnsenseSecret: '',
      });
    }
  },

  clearCredentials: async () => {
    await SecureStore.deleteItemAsync('agh_host');
    await SecureStore.deleteItemAsync('agh_username');
    await SecureStore.deleteItemAsync('agh_password');
    await SecureStore.deleteItemAsync('opn_host');
    await SecureStore.deleteItemAsync('opn_key');
    await SecureStore.deleteItemAsync('opn_secret');
    set({
      host: '', username: '', password: '', isConnected: false,
      opnsenseEnabled: false, opnsenseHost: '', opnsenseKey: '', opnsenseSecret: '',
    });
  },

  loadCredentials: async () => {
    try {
      const host     = await SecureStore.getItemAsync('agh_host');
      const username = await SecureStore.getItemAsync('agh_username');
      const password = await SecureStore.getItemAsync('agh_password');

      if (host && username && password) {
        const opnHost   = await SecureStore.getItemAsync('opn_host');
        const opnKey    = await SecureStore.getItemAsync('opn_key');
        const opnSecret = await SecureStore.getItemAsync('opn_secret');

        set({
          host, username, password, isConnected: true,
          opnsenseEnabled: !!(opnHost && opnKey && opnSecret),
          opnsenseHost:   opnHost   ?? '',
          opnsenseKey:    opnKey    ?? '',
          opnsenseSecret: opnSecret ?? '',
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));