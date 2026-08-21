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
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/auth";
import axios from "axios";

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  // AdGuard Home
  const [host, setHost] = useState("192.168.1.1:3000");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // OPNsense
  const [opnsenseEnabled, setOpnsenseEnabled] = useState(false);
  const [opnsenseHost, setOpnsenseHost] = useState("192.168.1.1");
  const [opnsenseKey, setOpnsenseKey] = useState("");
  const [opnsenseSecret, setOpnsenseSecret] = useState("");

  const [loading, setLoading] = useState(false);
  const { setCredentials } = useAuthStore();

  const handleConnect = async () => {
    if (!host || !username || !password) {
      Alert.alert("Error", "Please fill in all AdGuard Home fields");
      return;
    }
    if (opnsenseEnabled && (!opnsenseHost || !opnsenseKey || !opnsenseSecret)) {
      Alert.alert("Error", "Please fill in all OPNsense fields or disable OPNsense");
      return;
    }

    setLoading(true);
    try {
      // Test AdGuard Home connection first
      await axios.get(`http://${host}/control/status`, {
        auth: { username, password },
        timeout: 5000,
      });

      // Save credentials and navigate
      // OPNsense credentials are saved but NOT tested here —
      // the connection is attempted silently during device discovery.
      // This avoids SSL cert issues with self-signed OPNsense certificates.
      await setCredentials(
        host, username, password,
        opnsenseEnabled
          ? { host: opnsenseHost, key: opnsenseKey, secret: opnsenseSecret }
          : null
      );
      onLogin();
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        Alert.alert("Connection failed", "Invalid username or password");
      } else if (e?.code === "ECONNREFUSED" || e?.code === "ENOTFOUND") {
        Alert.alert("Connection failed", "Could not reach host — check the IP and port");
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
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 16,
            backgroundColor: "#1e293b", alignItems: "center",
            justifyContent: "center", marginBottom: 16,
          }}>
            <Text style={{ fontSize: 36 }}>🛡️</Text>
          </View>
          <Text style={{ color: "#f1f5f9", fontSize: 24, fontWeight: "bold" }}>
            AdGuard Home
          </Text>
          <Text style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
            Connect to your instance
          </Text>
        </View>

        {/* ── AdGuard Home fields ── */}
        <View style={{ gap: 14 }}>
          <Field label="HOST (IP:PORT)" value={host} onChangeText={setHost}
            placeholder="192.168.1.1:3000" keyboardType="url" />
          <Field label="USERNAME" value={username} onChangeText={setUsername}
            placeholder="admin" />
          <Field label="PASSWORD" value={password} onChangeText={setPassword}
            placeholder="••••••••" secureTextEntry />

          {/* ── OPNsense toggle ── */}
          <TouchableOpacity
            style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              backgroundColor: "#1e293b", borderRadius: 10,
              padding: 14, borderWidth: 1,
              borderColor: opnsenseEnabled ? "#3b82f6" : "#334155",
            }}
            onPress={() => setOpnsenseEnabled((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={{
              width: 22, height: 22, borderRadius: 6, borderWidth: 2,
              borderColor: opnsenseEnabled ? "#3b82f6" : "#475569",
              backgroundColor: opnsenseEnabled ? "#3b82f6" : "transparent",
              alignItems: "center", justifyContent: "center",
            }}>
              {opnsenseEnabled && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#f1f5f9", fontSize: 14, fontWeight: "600" }}>
                Enable OPNsense Integration
              </Text>
              <Text style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                Enables MAC-based device detection via DHCP leases
              </Text>
            </View>
            <Ionicons
              name="hardware-chip-outline"
              size={20}
              color={opnsenseEnabled ? "#3b82f6" : "#475569"}
            />
          </TouchableOpacity>

          {/* ── OPNsense fields (expanded when enabled) ── */}
          {opnsenseEnabled && (
            <View style={{
              gap: 14, backgroundColor: "#1e293b", borderRadius: 12,
              padding: 14, borderWidth: 1, borderColor: "#3b82f6",
            }}>
              <Text style={{ color: "#3b82f6", fontSize: 12, fontWeight: "600", letterSpacing: 0.5 }}>
                OPNSENSE SETTINGS
              </Text>

              <Field
                label="OPNSENSE HOST"
                value={opnsenseHost}
                onChangeText={setOpnsenseHost}
                placeholder="192.168.1.1"
                keyboardType="url"
              />
              <Field
                label="API KEY"
                value={opnsenseKey}
                onChangeText={setOpnsenseKey}
                placeholder="your-api-key"
                secureTextEntry
              />
              <Field
                label="API SECRET"
                value={opnsenseSecret}
                onChangeText={setOpnsenseSecret}
                placeholder="your-api-secret"
                secureTextEntry
              />

              <Text style={{ color: "#475569", fontSize: 11, lineHeight: 16 }}>
                Generate API credentials in OPNsense → System → Access → Users → your user → API keys
              </Text>
            </View>
          )}

          {/* ── Connect button ── */}
          <TouchableOpacity
            onPress={handleConnect}
            disabled={loading}
            style={{
              backgroundColor: "#3b82f6", padding: 16,
              borderRadius: 10, alignItems: "center", marginTop: 4,
            }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                  Connect
                </Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Reusable field component ───────────────────────────────────────────────────
function Field({
  label, value, onChangeText, placeholder, secureTextEntry, keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
}) {
  return (
    <View>
      <Text style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#475569"
        autoCapitalize="none"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType ?? "default"}
        style={{
          backgroundColor: "#0f172a", color: "#f1f5f9",
          padding: 14, borderRadius: 10, fontSize: 15,
          borderWidth: 1, borderColor: "#334155",
        }}
      />
    </View>
  );
}