/**
 * app/screens/devices.tsx
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getClientsWithStatus,
  blockClient,
  autoAddDiscoveredDevices,
  getQueryLog,
} from "../../services/adguard";
import DeviceRow from "../../components/DeviceRow";
import DeviceDetailSheet, {
  DeviceInfo,
} from "../../components/DeviceDetailSheet";

const DISCOVERY_COOLDOWN_MS = 5 * 60 * 1000;
const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;

export default function DevicesScreen() {
  const [search, setSearch] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [offlineExpanded, setOfflineExpanded] = useState(false);
  const discoveringRef = useRef(false);
  const lastDiscoveryRef = useRef<number>(0);
  const queryClient = useQueryClient();

  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["clients"],
    queryFn: getClientsWithStatus,
    staleTime: 30_000,
  });

  // Fetch recent query log to determine online status
  const { data: queryLogData } = useQuery({
    queryKey: ["querylog-recent"],
    queryFn: () => getQueryLog(500),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // Build IP → last seen timestamp map
  const lastSeenMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of queryLogData?.data ?? []) {
      const ip = entry.client;
      if (!ip) continue;
      const ts = new Date(entry.time).getTime();
      if (!map[ip] || ts > map[ip]) map[ip] = ts;
    }
    return map;
  }, [queryLogData]);

  const isOnline = useCallback(
    (ids: string[]): boolean => {
      const now = Date.now();
      return ids.some(
        (id) => lastSeenMap[id] && now - lastSeenMap[id] < ONLINE_THRESHOLD_MS,
      );
    },
    [lastSeenMap],
  );

  const { mutate: toggleBlock } = useMutation({
    mutationFn: async (client: { identifier: string; disallowed: boolean }) =>
      blockClient(client.identifier, client.disallowed),
    onMutate: async (newClient) => {
      await queryClient.cancelQueries({ queryKey: ["clients"] });
      const previous = queryClient.getQueryData(["clients"]);
      queryClient.setQueryData(["clients"], (old: any) => ({
        ...old,
        clients: old?.clients?.map((c: any) =>
          c.ids?.includes(newClient.identifier)
            ? { ...c, disallowed: newClient.disallowed }
            : c,
        ),
      }));
      setSelectedDevice((prev) =>
        prev?.identifier === newClient.identifier
          ? { ...prev, disallowed: newClient.disallowed }
          : prev,
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous)
        queryClient.setQueryData(["clients"], context.previous);
    },
    onSuccess: () => {
      setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
        1500,
      );
    },
  });

  const runDiscovery = useCallback(
    async (force = false) => {
      if (discoveringRef.current) return;
      const now = Date.now();
      if (!force && now - lastDiscoveryRef.current < DISCOVERY_COOLDOWN_MS)
        return;
      discoveringRef.current = true;
      lastDiscoveryRef.current = now;
      setIsDiscovering(true);
      try {
        const fresh = await getClientsWithStatus();
        const clients = fresh?.clients ?? [];
        const registeredIds = clients.flatMap((c: any) => c.ids ?? []);
        const added = await autoAddDiscoveredDevices(registeredIds);
        if (added > 0) {
          await new Promise((r) => setTimeout(r, 1000));
          await refetch();
        }
      } catch (e) {
        console.log("Discovery error:", e);
      } finally {
        discoveringRef.current = false;
        setIsDiscovering(false);
      }
    },
    [refetch],
  );

  useEffect(() => {
    runDiscovery();
  }, []);

  function openDetail(item: any) {
    setSelectedDevice({
      name: item.name,
      identifier: item.ids?.[0] ?? item.name,
      ids: item.ids ?? [],
      disallowed: item.disallowed,
    });
    setSheetVisible(true);
  }

  function handleRename(identifier: string, newName: string) {
    queryClient.setQueryData(["clients"], (old: any) => ({
      ...old,
      clients: old?.clients?.map((c: any) =>
        c.ids?.includes(identifier) ? { ...c, name: newName } : c,
      ),
    }));
  }

  async function handleDelete(identifier: string) {
    queryClient.setQueryData(["clients"], (old: any) => ({
      ...old,
      clients:
        old?.clients?.filter((c: any) => !c.ids?.includes(identifier)) ?? [],
    }));
    await runDiscovery(true);
  }

  // ── Split into online / offline ────────────────────────────────────────────
  const allClients = data?.clients ?? [];
  const filtered = allClients.filter(
    (c: any) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.ids?.some((id: string) => id.includes(search)),
  );

  const onlineClients = filtered.filter((c: any) => isOnline(c.ids ?? []));
  const offlineClients = filtered.filter((c: any) => !isOnline(c.ids ?? []));

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a", padding: 16 }}>
      {/* Search */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search devices..."
        placeholderTextColor="#475569"
        style={{
          backgroundColor: "#1e293b",
          color: "#f1f5f9",
          padding: 12,
          borderRadius: 10,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: "#334155",
          fontSize: 14,
        }}
      />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text style={{ color: "#64748b", fontSize: 12 }}>
          {onlineClients.length} ONLINE · {offlineClients.length} OFFLINE
        </Text>
        {isDiscovering && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={{ color: "#3b82f6", fontSize: 12 }}>
              Discovering...
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => "placeholder"}
        renderItem={null}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              setOfflineExpanded(false);
              runDiscovery(true);
              refetch();
              queryClient.invalidateQueries({ queryKey: ["querylog-recent"] });
            }}
            tintColor="#3b82f6"
          />
        }
        ListHeaderComponent={
          <View>
            {/* ── ONLINE ── */}
            {onlineClients.length > 0 && (
              <View>
                <Text style={sectionHeaderStyle}>
                  ONLINE ({onlineClients.length})
                </Text>
                {onlineClients.map((item: any) => (
                  <DeviceRow
                    key={item.ids?.[0] ?? item.name}
                    name={item.name}
                    ids={item.ids ?? []}
                    disallowed={item.disallowed}
                    offline={false}
                    onToggleBlock={(val) =>
                      toggleBlock({
                        identifier: item.ids?.[0] ?? item.name,
                        disallowed: !val,
                      })
                    }
                    onPressDetail={() => openDetail(item)}
                  />
                ))}
              </View>
            )}

            {/* ── OFFLINE ── */}
            {offlineClients.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 4,
                    marginBottom: 4,
                  }}
                  onPress={() => setOfflineExpanded((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Text style={sectionHeaderStyle}>
                    OFFLINE ({offlineClients.length})
                  </Text>
                  <Ionicons
                    name={offlineExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#475569"
                  />
                </TouchableOpacity>

                {offlineExpanded &&
                  offlineClients.map((item: any) => (
                    <DeviceRow
                      key={item.ids?.[0] ?? item.name}
                      name={item.name}
                      ids={item.ids ?? []}
                      disallowed={item.disallowed}
                      offline={true}
                      onToggleBlock={(val) =>
                        toggleBlock({
                          identifier: item.ids?.[0] ?? item.name,
                          disallowed: !val,
                        })
                      }
                      onPressDetail={() => openDetail(item)}
                    />
                  ))}
              </View>
            )}

            {/* Empty state */}
            {onlineClients.length === 0 && offlineClients.length === 0 && (
              <Text
                style={{ color: "#64748b", textAlign: "center", marginTop: 32 }}
              >
                {isDiscovering ? "Discovering devices..." : "No devices found"}
              </Text>
            )}
          </View>
        }
      />

      <DeviceDetailSheet
        visible={sheetVisible}
        device={selectedDevice}
        onClose={() => setSheetVisible(false)}
        onToggleBlock={(dev, blocked) =>
          toggleBlock({ identifier: dev.identifier, disallowed: blocked })
        }
        onRename={handleRename}
        onDelete={handleDelete}
      />
    </View>
  );
}

const sectionHeaderStyle = {
  color: "#475569",
  fontSize: 11,
  fontWeight: "600" as const,
  letterSpacing: 0.5,
  marginBottom: 6,
};