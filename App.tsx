import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./stores/auth";
import LoginScreen from "./app/screens/login";
import DashboardScreen from "./app/screens/dashboard";
import DevicesScreen from "./app/screens/devices";
import QueryLogScreen from "./app/screens/querylog";

type Tab = "dashboard" | "devices" | "querylog";

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "devices", label: "Devices", icon: "📱" },
  { key: "querylog", label: "Queries", icon: "📋" },
];

function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const { clearCredentials } = useAuthStore();

  const renderScreen = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardScreen />;
      case "devices":
        return <DevicesScreen />;
      case "querylog":
        return <QueryLogScreen />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 44,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#1e293b",
        }}
      >
        <Text style={{ color: "#f1f5f9", fontSize: 18, fontWeight: "bold" }}>
          🛡️ AdGuard Home
        </Text>
        <TouchableOpacity onPress={clearCredentials}>
          <Text style={{ color: "#64748b", fontSize: 13 }}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {/* Screen content */}
      <View style={{ flex: 1 }}>{renderScreen()}</View>

      {/* Bottom tab bar */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#1e293b",
          borderTopWidth: 1,
          borderTopColor: "#334155",
          paddingBottom: 8,
          paddingTop: 8,
        }}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}
          >
            <Text style={{ fontSize: 20 }}>{tab.icon}</Text>
            <Text
              style={{
                fontSize: 11,
                marginTop: 2,
                color: activeTab === tab.key ? "#3b82f6" : "#64748b",
                fontWeight: activeTab === tab.key ? "600" : "400",
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const { isConnected, loadCredentials } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // ✅ QueryClient lives inside the component so it resets cleanly on reconnect.
  // Key fix: throwOnError: false so query errors NEVER crash the component tree.
  // onError is handled per-query (show empty state) not globally (don't log out).
  const queryClientRef = useRef<QueryClient>();
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 2,
          staleTime: 10_000,
          throwOnError: false, // ← prevents React render crashes on query failure
        },
        mutations: {
          throwOnError: false,
        },
      },
    });
  }

  useEffect(() => {
    loadCredentials().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0f172a",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 48 }}>🛡️</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      {isConnected ? (
        <MainApp />
      ) : (
        <LoginScreen
          onLogin={() => useAuthStore.setState({ isConnected: true })}
        />
      )}
    </QueryClientProvider>
  );
}
