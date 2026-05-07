/**
 * components/DeviceRow.tsx
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { deviceTypeIcon, inferDeviceType } from "./DeviceDetailSheet";
import { useDeviceType } from "../hooks/useDeviceType";

interface DeviceRowProps {
  name: string;
  ids: string[];
  disallowed: boolean;
  offline: boolean;
  onToggleBlock: (val: boolean) => void;
  onPressDetail: () => void;
}

export default function DeviceRow({
  name,
  ids,
  disallowed,
  offline,
  onToggleBlock,
  onPressDetail,
}: DeviceRowProps) {
  const identifier = ids?.[0] ?? name;
  const { deviceType } = useDeviceType(identifier, name);
  const icon = deviceTypeIcon(deviceType);
  const isGeneric = name.startsWith("Device ") || name.startsWith("Device-");
  const primaryId = ids?.[0] ?? "Unknown";

  // ── Toggle appearance ──
  // Online + allowed    → green toggle
  // Online + blocked    → red toggle
  // Offline + allowed   → grey toggle (dimmed, still functional)
  // Offline + blocked   → red toggle (blocked status always visible)
  const toggleValue = !disallowed;
  const thumbColor = disallowed
    ? "#ef4444" // blocked → red
    : offline
      ? "#475569" // offline + allowed → grey
      : "#22c55e"; // online + allowed → green
  const trackColorFalse = "#450a0a"; // blocked track
  const trackColorTrue =
    offline && !disallowed
      ? "#334155" // offline allowed track → dark grey
      : "#052e16"; // online allowed track → dark green

  return (
    <View style={[styles.row, offline && styles.rowOffline]}>
      {/* Device icon */}
      <View style={styles.iconWrap}>
        <Ionicons
          name={icon as any}
          size={20}
          color={offline ? "#475569" : disallowed ? "#475569" : "#3b82f6"}
        />
      </View>

      {/* Name + ID + badges */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, (offline || disallowed) && styles.nameDim]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {isGeneric && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={styles.id} numberOfLines={1}>
          {primaryId}
        </Text>

        {/* Status badges */}
        {disallowed && (
          <View style={styles.blockedBadge}>
            <Text style={styles.blockedBadgeText}>BLOCKED</Text>
          </View>
        )}
        {offline && !disallowed && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>OFFLINE</Text>
          </View>
        )}
      </View>

      {/* Toggle — disabled for offline devices to prevent accidental taps */}
      <Switch
        value={toggleValue}
        onValueChange={offline ? undefined : onToggleBlock}
        disabled={offline}
        trackColor={{ false: trackColorFalse, true: trackColorTrue }}
        thumbColor={thumbColor}
      />

      {/* Detail chevron */}
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
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowOffline: {
    opacity: 0.65,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  info: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  name: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  nameDim: {
    color: "#64748b",
  },
  id: { color: "#64748b", fontSize: 12, marginTop: 2 },
  newBadge: {
    backgroundColor: "#1e3a5f",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: { color: "#60a5fa", fontSize: 10 },
  blockedBadge: {
    backgroundColor: "#450a0a",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  blockedBadgeText: { color: "#ef4444", fontSize: 10 },
  offlineBadge: {
    backgroundColor: "#1e293b",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  offlineBadgeText: { color: "#475569", fontSize: 10 },
  chevron: { paddingLeft: 4 },
});