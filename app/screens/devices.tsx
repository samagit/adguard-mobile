/**
 * app/screens/devices.tsx
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getClientsWithStatus,
  blockClient,
  autoAddDiscoveredDevices,
} from "../../services/adguard";
import DeviceRow from "../../components/DeviceRow";
import DeviceDetailSheet, { DeviceInfo } from "../../components/DeviceDetailSheet";

export default function DevicesScreen() {
  const [search, setSearch] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const discoveringRef = useRef(false);
  const queryClient = useQueryClient();

  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["clients"],
    queryFn: getClientsWithStatus,
  });

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
            : c
        ),
      }));
      setSelectedDevice((prev) =>
        prev?.identifier === newClient.identifier
          ? { ...prev, disallowed: newClient.disallowed }
          : prev
      );
      return { previous };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(["clients"], context?.previous);
    },
    onSettled: async () => {
      await new Promise((r) => setTimeout(r, 1000));
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  useEffect(() => { runDiscovery(); }, []);

  const runDiscovery = async () => {
    if (discoveringRef.current) return;
    discoveringRef.current = true;
    setIsDiscovering(true);
    try {
      const fresh = await getClientsWithStatus();
      const clients = fresh?.clients ?? [];
      const registeredIds = clients.flatMap((c: any) => c.ids ?? []);
      const added = await autoAddDiscoveredDevices(registeredIds);
      if (added > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        queryClient.removeQueries({ queryKey: ["clients"] });
        await refetch();
      }
    } catch (e) {
      console.log("Discovery error:", e);
    } finally {
      discoveringRef.current = false;
      setIsDiscovering(false);
    }
  };

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
        c.ids?.includes(identifier) ? { ...c, name: newName } : c
      ),
    }));
  }

  // After delete: remove from cache immediately, then rediscover so it
  // gets a clean auto-name on the next pass
  async function handleDelete(identifier: string) {
    // Remove from list immediately
    queryClient.setQueryData(["clients"], (old: any) => ({
      ...old,
      clients: old?.clients?.filter(
        (c: any) => !c.ids?.includes(identifier)
      ) ?? [],
    }));
    // Trigger rediscovery so it comes back with a fresh name
    await runDiscovery();
  }

  const clients = data?.clients ?? [];
  const filtered = clients.filter(
    (c: any) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.ids?.some((id: string) => id.includes(search))
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a", padding: 16 }}>
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

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Text style={{ color: "#64748b", fontSize: 12 }}>{filtered.length} DEVICES</Text>
        {isDiscovering && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={{ color: "#3b82f6", fontSize: 12 }}>Discovering...</Text>
          </View>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <DeviceRow
            name={item.name}
            ids={item.ids ?? []}
            disallowed={item.disallowed}
            onToggleBlock={(val) =>
              toggleBlock({ identifier: item.ids?.[0] ?? item.name, disallowed: !val })
            }
            onPressDetail={() => openDetail(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => { runDiscovery(); refetch(); }}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          <Text style={{ color: "#64748b", textAlign: "center", marginTop: 32 }}>
            {isDiscovering ? "Discovering devices..." : "No devices found"}
          </Text>
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
