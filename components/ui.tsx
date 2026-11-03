import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import type { InvoiceStatus, RoomStatus } from '@/lib/types';
import { INVOICE_STATUS_LABEL, ROOM_STATUS_LABEL } from '@/lib/format';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const backgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  return (
    <View style={[styles.card, { backgroundColor, borderColor }, style]}>{children}</View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  tone = 'primary',
}: {
  title: string;
  onPress?: PressableProps['onPress'];
  disabled?: boolean;
  tone?: 'primary' | 'danger' | 'ghost';
}) {
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');
  const chip = useThemeColor({}, 'chip');
  const bg = tone === 'danger' ? danger : tone === 'ghost' ? chip : tint;
  const fg = tone === 'ghost' ? text : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: tone === 'ghost' ? border : bg,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}>
      <Text style={[styles.buttonLabel, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function StatusBadge({
  status,
  kind,
}: {
  status: RoomStatus | InvoiceStatus;
  kind: 'room' | 'invoice';
}) {
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const danger = useThemeColor({}, 'danger');
  const muted = useThemeColor({}, 'muted');
  const map =
    kind === 'room'
      ? {
          vacant: success,
          occupied: muted,
          reserved: warning,
          maintenance: danger,
        }
      : {
          unpaid: warning,
          paid: success,
          overdue: danger,
        };
  const color = map[status as keyof typeof map];
  const label = kind === 'room' ? ROOM_STATUS_LABEL[status as RoomStatus] : INVOICE_STATUS_LABEL[status as InvoiceStatus];
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  const muted = useThemeColor({}, 'muted');
  return <Text style={[styles.fieldLabel, { color: muted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonLabel: {
    fontWeight: '700',
    fontSize: 15,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
});
