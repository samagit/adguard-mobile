import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  RefreshControl,
  TextInput,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClientsWithStatus, blockClient } from "../services/adguard";

export default function DevicesScreen() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["clients"],
    queryFn: getClientsWithStatus,
  });

  const { mutate: toggleBlock } = useMutation({
    mutationFn: async (client: { identifier: string; disallowed: boolean }) => {
      return await blockClient(client.identifier, client.disallowed);
    },
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

  const clients = data?.clients ?? [];
  const filtered = clients.filter(
    (c: any) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.ids?.some((id: string) => id.includes(search)),
  );

  const renderClient = ({ item }: { item: any }) => (
    <View
      style={{
        backgroundColor: "#1e293b",
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ color: "#f1f5f9", fontSize: 15, fontWeight: "600" }}>
          {item.name}
        </Text>
        <Text style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
          {item.ids?.[0] ?? "Unknown"}
        </Text>
        {item.disallowed && (
          <View
            style={{
              backgroundColor: "#450a0a",
              borderRadius: 4,
              paddingHorizontal: 6,
              paddingVertical: 2,
              alignSelf: "flex-start",
              marginTop: 4,
            }}
          >
            <Text style={{ color: "#ef4444", fontSize: 10 }}>BLOCKED</Text>
          </View>
        )}
      </View>
      <Switch
        value={!item.disallowed}
        onValueChange={(val) =>
          toggleBlock({
            identifier: item.ids?.[0] ?? item.name,
            disallowed: !val,
          })
        }
        trackColor={{ false: "#450a0a", true: "#052e16" }}
        thumbColor={item.disallowed ? "#ef4444" : "#22c55e"}
      />
    </View>
  );

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
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "#334155",
          fontSize: 14,
        }}
      />

      <Text style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>
        {filtered.length} DEVICES
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.name}
        renderItem={renderClient}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          <Text
            style={{ color: "#64748b", textAlign: "center", marginTop: 32 }}
          >
            No devices found
          </Text>
        }
      />
    </View>
  );
}
