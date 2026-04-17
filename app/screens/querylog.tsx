import React from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getQueryLog } from '../../services/adguard';

const getReasonColor = (reason: string) => {
  if (reason?.includes('Block') || reason?.includes('block')) return '#ef4444';
  if (reason?.includes('Safe')) return '#f59e0b';
  return '#22c55e';
};

const getReasonLabel = (reason: string) => {
  if (!reason) return 'OK';
  if (reason.includes('FilteredBlackList')) return 'BLOCKED';
  if (reason.includes('FilteredSafeSearch')) return 'SAFE SEARCH';
  if (reason.includes('FilteredSafeBrowsing')) return 'MALWARE';
  if (reason.includes('NotFilteredWhiteList')) return 'ALLOWED';
  return 'OK';
};

export default function QueryLogScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['querylog'],
    queryFn: () => getQueryLog(100),
    refetchInterval: 15000,
  });

  const entries = data?.data ?? [];

  const renderEntry = ({ item }: { item: any }) => {
    const color = getReasonColor(item.reason);
    const label = getReasonLabel(item.reason);
    const time = new Date(item.time).toLocaleTimeString();

    return (
      <View style={{
        backgroundColor: '#1e293b', borderRadius: 10,
        padding: 12, marginBottom: 6
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: '#f1f5f9', flex: 1, fontSize: 13 }} numberOfLines={1}>
            {item.question?.name ?? 'Unknown'}
          </Text>
          <View style={{
            backgroundColor: `${color}20`, borderRadius: 4,
            paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8
          }}>
            <Text style={{ color, fontSize: 10, fontWeight: '600' }}>{label}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#64748b', fontSize: 11 }}>
            {item.client ?? 'Unknown client'}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 11 }}>{time}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a', padding: 16 }}>
      <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
        {entries.length} RECENT QUERIES
      </Text>
      <FlatList
        data={entries}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderEntry}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 32 }}>
            No queries yet
          </Text>
        }
      />
    </View>
  );
}
