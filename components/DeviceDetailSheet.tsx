/**
 * components/DeviceDetailSheet.tsx
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClientName } from '../hooks/useClientName';
import { useDeviceType } from '../hooks/useDeviceType';
import { deleteClient } from '../services/clientsApi';

// ─── Device types ──────────────────────────────────────────────────────────────

export type DeviceType =
  | 'phone' | 'tablet' | 'laptop' | 'desktop'
  | 'tv' | 'router' | 'iot' | 'console' | 'camera' | 'printer' | 'unknown';

const DEVICE_TYPES: { type: DeviceType; label: string; icon: string }[] = [
  { type: 'phone',   label: 'Phone',   icon: 'phone-portrait-outline' },
  { type: 'tablet',  label: 'Tablet',  icon: 'tablet-portrait-outline' },
  { type: 'laptop',  label: 'Laptop',  icon: 'laptop-outline' },
  { type: 'desktop', label: 'Desktop', icon: 'desktop-outline' },
  { type: 'tv',      label: 'TV',      icon: 'tv-outline' },
  { type: 'router',  label: 'Router',  icon: 'wifi-outline' },
  { type: 'camera',  label: 'Camera',  icon: 'videocam-outline' },
  { type: 'iot',     label: 'IoT',     icon: 'bulb-outline' },
  { type: 'console', label: 'Console', icon: 'game-controller-outline' },
  { type: 'printer', label: 'Printer', icon: 'print-outline' },
  { type: 'unknown', label: 'Other',   icon: 'help-circle-outline' },
];

export function deviceTypeIcon(type: DeviceType): string {
  return DEVICE_TYPES.find((d) => d.type === type)?.icon ?? 'help-circle-outline';
}

export function inferDeviceType(name: string): DeviceType {
  const n = name.toLowerCase();
  if (/phone|iphone|android|pixel|galaxy|oneplus|xiaomi|realme/.test(n)) return 'phone';
  if (/ipad|tablet/.test(n)) return 'tablet';
  if (/macbook|laptop|thinkpad|notebook/.test(n)) return 'laptop';
  if (/desktop|imac|tower|pc|windows/.test(n)) return 'desktop';
  if (/tv|appletv|firetv|roku|chromecast|shield|webostv/.test(n)) return 'tv';
  if (/router|gateway|opnsense|pfsense|unifi|mikrotik|tp-link|archer/.test(n)) return 'router';
  if (/cam|camera|reolink|hikvision|dahua|wyze|arlo|eufy|ring|doorbell|nvr|dvr/.test(n)) return 'camera';
  if (/print|printer|canon|epson|brother|hp.*print/.test(n)) return 'printer';
  if (/esp|arduino|sonoff|tasmota|shelly|nest|echo|alexa|thermostat|ecobee/.test(n)) return 'iot';
  if (/playstation|xbox|nintendo|switch/.test(n)) return 'console';
  return 'unknown';
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface DeviceInfo {
  name: string;
  identifier: string;
  ids: string[];
  disallowed: boolean;
}

interface DeviceDetailSheetProps {
  visible: boolean;
  device: DeviceInfo | null;
  onClose: () => void;
  onToggleBlock: (device: DeviceInfo, blocked: boolean) => void;
  onRename?: (identifier: string, newName: string) => void;
  onDelete?: (identifier: string) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function DeviceDetailSheet({
  visible,
  device,
  onClose,
  onToggleBlock,
  onRename,
  onDelete,
}: DeviceDetailSheetProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const { customName, isLoading, rename, isRenaming } = useClientName(device?.identifier);
  const { deviceType, setDeviceType } = useDeviceType(device?.identifier ?? '', device?.name ?? '');

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [localName, setLocalName] = useState<string | null>(null);
  const displayName = localName ?? customName ?? device?.name ?? 'Unknown Device';

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible]);

  useEffect(() => {
    if (device) {
      setIsEditingName(false);
      setNameInput('');
      setShowTypePicker(false);
      setLocalName(null);
    }
  }, [device?.identifier]);

  function startEditing() {
    setNameInput(displayName);
    setIsEditingName(true);
  }

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed || !device) return;
    try {
      await rename({ newName: trimmed, ids: device.ids });
      setLocalName(trimmed);
      setIsEditingName(false);
      onRename?.(device.identifier, trimmed);
    } catch (e: any) {
      Alert.alert('Could not save name', e?.message ?? 'Unknown error');
    }
  }

  function confirmDelete() {
    if (!device) return;
    Alert.alert(
      'Reset Device Record',
      `This will delete the persistent record for "${displayName}" (${device.identifier}).\n\nThe device itself is safe — it will reappear automatically on the next discovery run, with a fresh auto-detected name.\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Record', style: 'destructive', onPress: handleDelete },
      ]
    );
  }

  async function handleDelete() {
    if (!device) return;
    setIsDeleting(true);
    try {
      await deleteClient(displayName);
      onClose();
      onDelete?.(device.identifier);
    } catch (e: any) {
      Alert.alert('Could not delete', e?.message ?? 'Unknown error');
    } finally {
      setIsDeleting(false);
    }
  }

  if (!device) return null;

  const currentType = DEVICE_TYPES.find((d) => d.type === deviceType) ?? DEVICE_TYPES[DEVICE_TYPES.length - 1];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {/* Icon + type picker */}
          <TouchableOpacity
            style={styles.iconSection}
            onPress={() => setShowTypePicker((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Ionicons name={currentType.icon as any} size={40} color="#3b82f6" />
            </View>
            <View style={styles.typeRow}>
              <Text style={styles.typeLabel}>{currentType.label}</Text>
              <Ionicons
                name={showTypePicker ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#64748b"
              />
            </View>
          </TouchableOpacity>

          {/* Type picker grid — 4 per row, wraps naturally */}
          {showTypePicker && (
            <View style={styles.typePicker}>
              {DEVICE_TYPES.map(({ type, label, icon }) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typePickerItem, deviceType === type && styles.typePickerItemActive]}
                  onPress={() => { setDeviceType(type); setShowTypePicker(false); }}
                >
                  <Ionicons
                    name={icon as any}
                    size={20}
                    color={deviceType === type ? '#3b82f6' : '#64748b'}
                  />
                  <Text style={[styles.typePickerLabel, deviceType === type && styles.typePickerLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Name */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DEVICE NAME</Text>
            {isEditingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                  placeholderTextColor="#475569"
                  selectionColor="#3b82f6"
                />
                <TouchableOpacity onPress={saveName} style={styles.nameBtn} disabled={isRenaming}>
                  {isRenaming
                    ? <ActivityIndicator size="small" color="#3b82f6" />
                    : <Ionicons name="checkmark-circle" size={26} color="#22c55e" />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditingName(false)} style={styles.nameBtn}>
                  <Ionicons name="close-circle" size={26} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.nameDisplayRow} onPress={startEditing}>
                {isLoading && <ActivityIndicator size="small" color="#64748b" style={{ marginRight: 8 }} />}
                <Text style={styles.nameText} numberOfLines={1}>{displayName}</Text>
                <Ionicons name="pencil-outline" size={17} color="#3b82f6" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            )}
          </View>

          {/* Identifiers */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>IDENTIFIERS</Text>
            {device.ids.map((id, i) => (
              <InfoRow
                key={id}
                icon={id.includes(':') ? 'hardware-chip-outline' : 'globe-outline'}
                label={id.includes(':') ? 'MAC' : `IP${i > 0 ? ` ${i + 1}` : ''}`}
                value={id}
                last={i === device.ids.length - 1}
              />
            ))}
          </View>

          {/* Block toggle */}
          <View style={styles.card}>
            <View style={styles.blockRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons
                  name={device.disallowed ? 'lock-closed' : 'lock-open-outline'}
                  size={20}
                  color={device.disallowed ? '#ef4444' : '#22c55e'}
                />
                <View>
                  <Text style={styles.blockLabel}>
                    {device.disallowed ? 'Device Blocked' : 'Device Allowed'}
                  </Text>
                  <Text style={styles.blockSub}>
                    {device.disallowed ? 'DNS queries are being blocked' : 'DNS queries are passing through'}
                  </Text>
                </View>
              </View>
              <Switch
                value={!device.disallowed}
                onValueChange={(val) => onToggleBlock(device, !val)}
                trackColor={{ false: '#450a0a', true: '#052e16' }}
                thumbColor={device.disallowed ? '#ef4444' : '#22c55e'}
              />
            </View>
          </View>

          {/* Delete record */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={confirmDelete}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <View>
                  <Text style={styles.deleteButtonText}>Reset Device Record</Text>
                  <Text style={styles.deleteButtonSub}>
                    Removes name &amp; settings — device will be rediscovered
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function InfoRow({ icon, label, value, last }: {
  icon: string; label: string; value: string; last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon as any} size={16} color="#64748b" style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1, borderTopColor: '#1e293b',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  content: { paddingHorizontal: 16, paddingBottom: 8 },
  iconSection: { alignItems: 'center', paddingVertical: 20 },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  typeLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  typePicker: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 12,
  },
  typePickerItem: {
    width: '22%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    gap: 4, borderRadius: 10, backgroundColor: '#0f172a',
    borderWidth: 1, borderColor: '#334155',
  },
  typePickerItemActive: { borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)' },
  typePickerLabel: { fontSize: 10, color: '#64748b' },
  typePickerLabelActive: { color: '#3b82f6' },
  card: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  cardLabel: { fontSize: 11, fontWeight: '600', color: '#475569', letterSpacing: 0.6, marginBottom: 10 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameInput: {
    flex: 1, fontSize: 17, fontWeight: '600', color: '#f1f5f9',
    backgroundColor: '#0f172a', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: '#3b82f6',
  },
  nameBtn: { padding: 2 },
  nameDisplayRow: { flexDirection: 'row', alignItems: 'center' },
  nameText: { flex: 1, fontSize: 17, fontWeight: '600', color: '#f1f5f9' },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#334155',
  },
  infoIcon: { marginRight: 10, width: 20 },
  infoLabel: { fontSize: 13, color: '#64748b', width: 80 },
  infoValue: { flex: 1, fontSize: 13, color: '#f1f5f9', textAlign: 'right', fontVariant: ['tabular-nums'] },
  blockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockLabel: { fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  blockSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  deleteButton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#450a0a', borderRadius: 12,
    padding: 14, marginTop: 4, marginBottom: 8,
    backgroundColor: 'rgba(239,68,68,0.05)',
  },
  deleteButtonText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  deleteButtonSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
});
