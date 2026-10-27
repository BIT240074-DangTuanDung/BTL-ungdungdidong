import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { Card, PrimaryButton, StatusBadge } from '@/components/ui';
import { useRental } from '@/context/RentalContext';
import { formatVnd } from '@/lib/format';
import type { RoomStatus } from '@/lib/types';

const FILTERS: { id: 'all' | RoomStatus; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'vacant', label: 'Trống' },
  { id: 'occupied', label: 'Đang thuê' },
  { id: 'reserved', label: 'Giữ chỗ' },
  { id: 'maintenance', label: 'Sửa chữa' },
];

export default function RoomsScreen() {
  const store = useRental();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const chip = useThemeColor({}, 'chip');

  const rooms = useMemo(
    () => store.rooms.filter((room) => (filter === 'all' ? true : room.status === filter)),
    [filter, store.rooms]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <PrimaryButton title="Thêm phòng mới" onPress={() => router.push('/room/new')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((item) => {
          const active = item.id === filter;
          return (
            <Pressable
              key={item.id}
              onPress={() => setFilter(item.id)}
              style={[
                styles.chip,
                { borderColor: border, backgroundColor: active ? tint : chip },
              ]}>
              <Text style={{ color: active ? '#fff' : undefined, fontWeight: '700' }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {rooms.map((room) => {
        const contract = store.activeContractForRoom(room.id);
        const tenant = contract ? store.tenantById(contract.tenantId) : undefined;
        return (
          <Pressable key={room.id} onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}>
            <Card>
              <View style={styles.head}>
                <Text style={styles.code}>{room.code}</Text>
                <StatusBadge kind="room" status={room.status} />
              </View>
              <Text style={{ color: muted }}>
                Tầng {room.floor} · {room.area} m²
              </Text>
              <Text style={styles.price}>{formatVnd(room.price)}/tháng</Text>
              {tenant ? <Text>Khách: {tenant.fullName}</Text> : <Text style={{ color: muted }}>Chưa có khách</Text>}
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  filters: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  code: {
    fontSize: 18,
    fontWeight: '800',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
  },
});
