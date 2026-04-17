import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useAuthStore } from "../../stores/auth";
import axios from "axios";

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [host, setHost] = useState("192.168.1.1:3000");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setCredentials } = useAuthStore();

  const handleConnect = async () => {
    if (!host || !username || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      // ✅ Test the connection FIRST before touching auth state.
      // This prevents the flash: isConnected stays false until we're sure it works.
      await axios.get(`http://${host}/control/status`, {
        auth: { username, password },
        timeout: 5000,
      });

      // Connection succeeded — now save credentials and navigate
      await setCredentials(host, username, password);
      onLogin();
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        Alert.alert("Connection failed", "Invalid username or password");
      } else if (e?.code === "ECONNREFUSED" || e?.code === "ENOTFOUND") {
        Alert.alert(
          "Connection failed",
          "Could not reach host — check the IP and port",
        );
      } else {
        Alert.alert("Connection failed", "Check your host and credentials");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#0f172a" }}
    >
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        {/* Logo */}
        <View style={{ alignItems: "center", marginBottom: 48 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              backgroundColor: "#1e293b",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 36 }}>🛡️</Text>
          </View>
          <Text style={{ color: "#f1f5f9", fontSize: 24, fontWeight: "bold" }}>
            AdGuard Home
          </Text>
          <Text style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
            Connect to your instance
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
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
                backgroundColor: "#1e293b",
                color: "#f1f5f9",
                padding: 14,
                borderRadius: 10,
                fontSize: 15,
                borderWidth: 1,
                borderColor: "#334155",
              }}
            />
          </View>

          <View>
            <Text style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
              USERNAME
            </Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="admin"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              style={{
                backgroundColor: "#1e293b",
                color: "#f1f5f9",
                padding: 14,
                borderRadius: 10,
                fontSize: 15,
                borderWidth: 1,
                borderColor: "#334155",
              }}
            />
          </View>

          <View>
            <Text style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
              PASSWORD
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#475569"
              secureTextEntry
              style={{
                backgroundColor: "#1e293b",
                color: "#f1f5f9",
                padding: 14,
                borderRadius: 10,
                fontSize: 15,
                borderWidth: 1,
                borderColor: "#334155",
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleConnect}
            disabled={loading}
            style={{
              backgroundColor: "#3b82f6",
              padding: 16,
              borderRadius: 10,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                Connect
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
