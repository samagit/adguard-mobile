import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  host: string;
  username: string;
  password: string;
  isConnected: boolean;
  setCredentials: (host: string, username: string, password: string) => void;
  clearCredentials: () => void;
  loadCredentials: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  host: '',
  username: '',
  password: '',
  isConnected: false,

  setCredentials: async (host, username, password) => {
    await SecureStore.setItemAsync('agh_host', host);
    await SecureStore.setItemAsync('agh_username', username);
    await SecureStore.setItemAsync('agh_password', password);
    set({ host, username, password, isConnected: true });
  },

  clearCredentials: async () => {
    await SecureStore.deleteItemAsync('agh_host');
    await SecureStore.deleteItemAsync('agh_username');
    await SecureStore.deleteItemAsync('agh_password');
    set({ host: '', username: '', password: '', isConnected: false });
  },

  loadCredentials: async () => {
    try {
      const host = await SecureStore.getItemAsync('agh_host');
      const username = await SecureStore.getItemAsync('agh_username');
      const password = await SecureStore.getItemAsync('agh_password');
      if (host && username && password) {
        set({ host, username, password, isConnected: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
