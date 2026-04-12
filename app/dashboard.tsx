import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getStats, getStatus, setProtection } from '../services/adguard';

const StatCard = ({ label, value, color }: {
  label: string; value: string | number; color: string
}) => (
  <View style={{
    flex: 1, backgroundColor: '#1e293b', borderRadius: 12,
    padding: 16, margin: 4
  }}>
    <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>
      {label}
    </Text>
    <Text style={{ color, fontSize: 22, fontWeight: 'bold' }}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </Text>
  </View>
);

export default function DashboardScreen() {
  const { data: stats, refetch: refetchStats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 30000,
  });

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['status'],
    queryFn: getStatus,
    refetchInterval: 30000,
  });

  const handleToggleProtection = async () => {
    await setProtection(!status?.protection_enabled);
    refetchStatus();
  };

  const onRefresh = () => {
    refetchStats();
    refetchStatus();
  };

  const blockRate = stats?.num_dns_queries > 0
    ? Math.round((stats.num_blocked_filtering / stats.num_dns_queries) * 100)
    : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0f172a' }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#3b82f6" />
      }
    >
      <View style={{ padding: 16 }}>

        {/* Protection toggle */}
        <TouchableOpacity
          onPress={handleToggleProtection}
          style={{
            backgroundColor: status?.protection_enabled ? '#052e16' : '#450a0a',
            borderRadius: 12, padding: 20, marginBottom: 16,
            borderWidth: 1,
            borderColor: status?.protection_enabled ? '#16a34a' : '#dc2626',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
          }}
        >
          <View>
            <Text style={{ color: '#f1f5f9', fontSize: 16, fontWeight: '600' }}>
              Protection {status?.protection_enabled ? 'Enabled' : 'Disabled'}
            </Text>
            <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
              Tap to toggle
            </Text>
          </View>
          <Text style={{ fontSize: 32 }}>
            {status?.protection_enabled ? '🛡️' : '⚠️'}
          </Text>
        </TouchableOpacity>

        {/* Stats grid */}
        <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
          LAST 24 HOURS
        </Text>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <StatCard
            label="DNS QUERIES"
            value={stats?.num_dns_queries ?? 0}
            color="#f1f5f9"
          />
          <StatCard
            label="BLOCKED"
            value={stats?.num_blocked_filtering ?? 0}
            color="#ef4444"
          />
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          <StatCard
            label="BLOCK RATE"
            value={`${blockRate}%`}
            color="#f59e0b"
          />
          <StatCard
            label="MALWARE BLOCKED"
            value={stats?.num_replaced_safebrowsing ?? 0}
            color="#a855f7"
          />
        </View>

        {/* Top blocked domains */}
        {stats?.top_blocked_domains?.length > 0 && (
          <View>
            <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
              TOP BLOCKED DOMAINS
            </Text>
            <View style={{ backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
              {stats.top_blocked_domains.slice(0, 5).map((item: any, i: number) => {
                const domain = Object.keys(item)[0];
                const count = Object.values(item)[0] as number;
                return (
                  <View key={i} style={{
                    flexDirection: 'row', justifyContent: 'space-between',
                    padding: 14, borderBottomWidth: i < 4 ? 1 : 0,
                    borderBottomColor: '#334155'
                  }}>
                    <Text style={{ color: '#f1f5f9', flex: 1 }} numberOfLines={1}>
                      {domain}
                    </Text>
                    <Text style={{ color: '#ef4444', marginLeft: 8 }}>
                      {count}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
