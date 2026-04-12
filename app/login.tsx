import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useAuthStore } from '../stores/auth';
import { getStatus } from '../services/adguard';

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [host, setHost] = useState('192.168.1.1:3000');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setCredentials } = useAuthStore();

  const handleConnect = async () => {
    if (!host || !username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await setCredentials(host, username, password);
      await getStatus();
      onLogin();
    } catch {
      Alert.alert('Connection failed', 'Check your host and credentials');
      useAuthStore.getState().clearCredentials();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#0f172a' }}
    >
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 16,
            backgroundColor: '#1e293b', alignItems: 'center',
            justifyContent: 'center', marginBottom: 16
          }}>
            <Text style={{ fontSize: 36 }}>🛡️</Text>
          </View>
          <Text style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 'bold' }}>
            AdGuard Home
          </Text>
          <Text style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
            Connect to your instance
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>
              HOST (IP:PORT)
            </Text>
            <TextInput
              value={host}
              onChangeText={setHost}
              placeholder="192.168.1.1:3000"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              keyboardType="url"
              style={{
                backgroundColor: '#1e293b', color: '#f1f5f9',
                padding: 14, borderRadius: 10, fontSize: 15,
                borderWidth: 1, borderColor: '#334155'
              }}
            />
          </View>

          <View>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>
              USERNAME
            </Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="admin"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              style={{
                backgroundColor: '#1e293b', color: '#f1f5f9',
                padding: 14, borderRadius: 10, fontSize: 15,
                borderWidth: 1, borderColor: '#334155'
              }}
            />
          </View>

          <View>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>
              PASSWORD
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#475569"
              secureTextEntry
              style={{
                backgroundColor: '#1e293b', color: '#f1f5f9',
                padding: 14, borderRadius: 10, fontSize: 15,
                borderWidth: 1, borderColor: '#334155'
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleConnect}
            disabled={loading}
            style={{
              backgroundColor: '#3b82f6', padding: 16,
              borderRadius: 10, alignItems: 'center', marginTop: 8
            }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                  Connect
                </Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
