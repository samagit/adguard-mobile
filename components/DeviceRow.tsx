/**
 * components/DeviceRow.tsx
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deviceTypeIcon, inferDeviceType } from './DeviceDetailSheet';
import { useDeviceType } from '../hooks/useDeviceType';

interface DeviceRowProps {
  name: string;
  ids: string[];
  disallowed: boolean;
  onToggleBlock: (val: boolean) => void;
  onPressDetail: () => void;
}

export default function DeviceRow({
  name,
  ids,
  disallowed,
  onToggleBlock,
  onPressDetail,
}: DeviceRowProps) {
  const identifier = ids?.[0] ?? name;
  const { deviceType } = useDeviceType(identifier, name);
  const icon = deviceTypeIcon(deviceType);

  const isGeneric = name.startsWith('Device ') || name.startsWith('Device-');
  const primaryId = ids?.[0] ?? 'Unknown';

  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={icon as any}
          size={20}
          color={disallowed ? '#475569' : '#3b82f6'}
        />
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, disallowed && styles.nameBlocked]} numberOfLines={1}>
            {name}
          </Text>
          {isGeneric && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={styles.id} numberOfLines={1}>{primaryId}</Text>
        {disallowed && (
          <View style={styles.blockedBadge}>
            <Text style={styles.blockedBadgeText}>BLOCKED</Text>
          </View>
        )}
      </View>

      <Switch
        value={!disallowed}
        onValueChange={onToggleBlock}
        trackColor={{ false: '#450a0a', true: '#052e16' }}
        thumbColor={disallowed ? '#ef4444' : '#22c55e'}
      />

      <TouchableOpacity
        style={styles.chevron}
        onPress={onPressDetail}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-forward" size={18} color="#475569" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { color: '#f1f5f9', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  nameBlocked: { color: '#64748b' },
  id: { color: '#64748b', fontSize: 12, marginTop: 2 },
  newBadge: {
    backgroundColor: '#1e3a5f', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  newBadgeText: { color: '#60a5fa', fontSize: 10 },
  blockedBadge: {
    backgroundColor: '#450a0a', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    alignSelf: 'flex-start', marginTop: 4,
  },
  blockedBadgeText: { color: '#ef4444', fontSize: 10 },
  chevron: { paddingLeft: 4 },
});
