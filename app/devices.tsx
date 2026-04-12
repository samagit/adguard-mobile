import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Switch,
  RefreshControl, TextInput, ActivityIndicator
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClientsWithStatus, blockClient, autoAddDiscoveredDevices } from '../services/adguard';

export default function DevicesScreen() {
  const [search, setSearch] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: getClientsWithStatus,
  });

  const { mutate: toggleBlock } = useMutation({
    mutationFn: async (client: { identifier: string; disallowed: boolean }) => {
      return await blockClient(client.identifier, client.disallowed);
    },
    onMutate: async (newClient) => {
      await queryClient.cancelQueries({ queryKey: ['clients'] });
      const previous = queryClient.getQueryData(['clients']);
      queryClient.setQueryData(['clients'], (old: any) => ({
        ...old,
        clients: old?.clients?.map((c: any) =>
          c.ids?.includes(newClient.identifier)
            ? { ...c, disallowed: newClient.disallowed }
            : c
        ),
      }));
      return { previous };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['clients'], context?.previous);
    },
    onSettled: async () => {
      await new Promise(r => setTimeout(r, 1000));
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  // Auto-discover devices on mount
  useEffect(() => {
    handleDiscover();
  }, []);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      // Fetch fresh data directly
      const fresh = await getClientsWithStatus();
      const clients = fresh?.clients ?? [];
      console.log("Registered clients:", clients.length);
      const registeredIds = clients.flatMap((c: any) => c.ids ?? []);
      console.log("Registered IDs:", JSON.stringify(registeredIds));
      const added = await autoAddDiscoveredDevices(registeredIds);
      console.log("Discovered and added:", added);
      if (added > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        // Check what AdGuard returns now
        const afterAdd = await getClientsWithStatus();
        console.log("Clients after add:", afterAdd?.clients?.length);
        console.log(
          "Client names:",
          afterAdd?.clients?.map((c: any) => c.name),
        );
        queryClient.removeQueries({ queryKey: ["clients"] });
        await refetch();
      }
    } catch (e) {
      console.log("Discovery error:", e);
    } finally {
      setDiscovering(false);
    }
  };

  const onRefresh = async () => {
    await handleDiscover();
    refetch();
  };

  const clients = data?.clients ?? [];
  const filtered = clients.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.ids?.some((id: string) => id.includes(search))
  );

  const renderClient = ({ item }: { item: any }) => {
    const isGeneric = item.name.startsWith('Device-');
    return (
      <View style={{
        backgroundColor: '#1e293b', borderRadius: 12,
        padding: 16, marginBottom: 8,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#f1f5f9', fontSize: 15, fontWeight: '600' }}>
              {item.name}
            </Text>
            {isGeneric && (
              <View style={{
                backgroundColor: '#1e3a5f', borderRadius: 4,
                paddingHorizontal: 6, paddingVertical: 2,
              }}>
                <Text style={{ color: '#60a5fa', fontSize: 10 }}>NEW</Text>
              </View>
            )}
          </View>
          <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
            {item.ids?.[0] ?? 'Unknown'}
          </Text>
          {item.disallowed && (
            <View style={{
              backgroundColor: '#450a0a', borderRadius: 4,
              paddingHorizontal: 6, paddingVertical: 2,
              alignSelf: 'flex-start', marginTop: 4
            }}>
              <Text style={{ color: '#ef4444', fontSize: 10 }}>BLOCKED</Text>
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
          trackColor={{ false: '#450a0a', true: '#052e16' }}
          thumbColor={item.disallowed ? '#ef4444' : '#22c55e'}
        />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a', padding: 16 }}>
      {/* Search */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search devices..."
        placeholderTextColor="#475569"
        style={{
          backgroundColor: '#1e293b', color: '#f1f5f9',
          padding: 12, borderRadius: 10, marginBottom: 12,
          borderWidth: 1, borderColor: '#334155', fontSize: 14
        }}
      />

      {/* Status bar */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 8
      }}>
        <Text style={{ color: '#64748b', fontSize: 12 }}>
          {filtered.length} DEVICES
        </Text>
        {discovering && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={{ color: '#3b82f6', fontSize: 12 }}>
              Discovering...
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.name}
        renderItem={renderClient}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 32 }}>
            {discovering ? 'Discovering devices...' : 'No devices found'}
          </Text>
        }
      />
    </View>
  );
}