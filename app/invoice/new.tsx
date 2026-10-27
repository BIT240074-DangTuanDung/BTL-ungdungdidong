import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { Card, FieldLabel, PrimaryButton } from '@/components/ui';
import { useRental } from '@/context/RentalContext';
import { calcInvoiceTotal, currentPeriod, formatVnd } from '@/lib/format';

export default function NewInvoiceScreen() {
  const { roomId: preselect } = useLocalSearchParams<{ roomId?: string }>();
  const store = useRental();
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const occupiedRooms = store.rooms.filter((room) => room.status === 'occupied');
  const [roomId, setRoomId] = useState(preselect ?? occupiedRooms[0]?.id ?? '');
  const [period, setPeriod] = useState(currentPeriod());
  const [electricityOld, setElectricityOld] = useState('0');
  const [electricityNew, setElectricityNew] = useState('0');
  const [waterOld, setWaterOld] = useState('0');
  const [waterNew, setWaterNew] = useState('0');
  const [other, setOther] = useState('0');
  const [otherNote, setOtherNote] = useState('');

  const room = store.roomById(roomId);
  const contract = room ? store.activeContractForRoom(room.id) : undefined;
  const tenant = contract ? store.tenantById(contract.tenantId) : undefined;

  const draft = useMemo(
    () => ({
      rent: contract?.monthlyRent ?? room?.price ?? 0,
      electricityOld: Number(electricityOld) || 0,
      electricityNew: Number(electricityNew) || 0,
      waterOld: Number(waterOld) || 0,
      waterNew: Number(waterNew) || 0,
      other: Number(other) || 0,
    }),
    [contract?.monthlyRent, electricityNew, electricityOld, other, room?.price, waterNew, waterOld]
  );

  const total = calcInvoiceTotal(draft, room?.electricityRate ?? 0, room?.waterRate ?? 0);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <FieldLabel>Chọn phòng đang thuê</FieldLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {occupiedRooms.map((item) => {
            const active = item.id === roomId;
            return (
              <Pressable
                key={item.id}
                onPress={() => setRoomId(item.id)}
                style={[styles.chip, { borderColor: border, backgroundColor: active ? tint : card }]}>
                <Text style={{ color: active ? '#fff' : text, fontWeight: '700' }}>{item.code}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {tenant ? (
          <Text style={{ color: muted, marginBottom: 8 }}>
            Khách: {tenant.fullName} · Tiền phòng {formatVnd(draft.rent)}
          </Text>
        ) : (
          <Text style={{ color: muted }}>Chưa có phòng đang thuê.</Text>
        )}

        <FieldLabel>Kỳ thanh toán (YYYY-MM)</FieldLabel>
        <TextInput value={period} onChangeText={setPeriod} style={input(card, border, text)} />
        <FieldLabel>Số điện cũ / mới</FieldLabel>
        <TextInput value={electricityOld} onChangeText={setElectricityOld} keyboardType="number-pad" style={input(card, border, text)} />
        <TextInput value={electricityNew} onChangeText={setElectricityNew} keyboardType="number-pad" style={input(card, border, text)} />
        <FieldLabel>Số nước cũ / mới</FieldLabel>
        <TextInput value={waterOld} onChangeText={setWaterOld} keyboardType="number-pad" style={input(card, border, text)} />
        <TextInput value={waterNew} onChangeText={setWaterNew} keyboardType="number-pad" style={input(card, border, text)} />
        <FieldLabel>Khoản khác</FieldLabel>
        <TextInput value={other} onChangeText={setOther} keyboardType="number-pad" style={input(card, border, text)} />
        <TextInput
          value={otherNote}
          onChangeText={setOtherNote}
          placeholder="Internet, gửi xe..."
          placeholderTextColor={muted}
          style={input(card, border, text)}
        />

        <Card>
          <Text style={styles.total}>{formatVnd(total)}</Text>
          <Text style={{ color: muted }}>Tổng hóa đơn (phòng + điện + nước + khác)</Text>
        </Card>

        <PrimaryButton
          title="Lưu hóa đơn chưa thu"
          onPress={() => {
            if (!room || !contract || !tenant) {
              Alert.alert('Không tạo được', 'Cần phòng đang có khách thuê.');
              return;
            }
            store.addInvoice({
              roomId: room.id,
              tenantId: tenant.id,
              period,
              rent: draft.rent,
              electricityOld: draft.electricityOld,
              electricityNew: draft.electricityNew,
              waterOld: draft.waterOld,
              waterNew: draft.waterNew,
              other: draft.other,
              otherNote,
              status: 'unpaid',
            });
            router.back();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function input(backgroundColor: string, borderColor: string, color: string) {
  return {
    backgroundColor,
    borderColor,
    color,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  };
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  chips: {
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  total: {
    fontSize: 24,
    fontWeight: '800',
  },
});
