import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

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
  const { filter: initialFilter } = useLocalSearchParams<{ filter: string }>();
  const store = useRental();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>(
    (initialFilter as any) || 'all'
  );
  const [typeFilter, setTypeFilter] = useState<'all' | 'standard' | 'premium'>('all');

  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const accent = useThemeColor({}, 'accent');
  const chip = useThemeColor({}, 'chip');

  const rooms = useMemo(
    () => store.rooms.filter((room) => {
      const matchStatus = filter === 'all' ? true : room.status === filter;
      const matchType = typeFilter === 'all' ? true : room.type === typeFilter;
      return matchStatus && matchType;
    }),
    [filter, typeFilter, store.rooms]
  );

  const handleTypeChange = (type: 'all' | 'standard' | 'premium') => {
    if (type === 'premium' && !store.isPremiumUser) {
      Alert.alert(
        'Nâng cấp Premium',
        'Bạn cần nâng cấp gói Premium để xem và quản lý phòng cao cấp.',
        [{ text: 'Đóng', style: 'cancel' }]
      );
      return;
    }
    setTypeFilter(type);
  };

  if (store.userRole !== 'host') return <Text style={{padding:24}}>Chỉ chủ trọ được truy cập mục này.</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={{ fontSize: 28, fontWeight: '800' }}>Góc nhỏ, tổ ấm lớn</Text>
      <Text style={{ color: muted }}>Khám phá và quản lý từng không gian sống.</Text>
      {store.userRole === 'host' && (
        <PrimaryButton title="Thêm phòng mới" onPress={() => router.push('/room/new')} />
      )}

      <Text style={styles.sectionTitle}>Loại phòng</Text>
      <View style={styles.typeFilters}>
        {(['all', 'standard', 'premium'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => handleTypeChange(t)}
            style={[
              styles.typeChip,
              {
                borderColor: border,
                backgroundColor: typeFilter === t ? tint : chip,
                opacity: t === 'premium' && !store.isPremiumUser ? 0.6 : 1
              },
            ]}>
            <Text style={{ color: typeFilter === t ? '#fff' : undefined, fontWeight: '700' }}>
              {t === 'all' ? 'Tất cả' : t === 'standard' ? 'Thường' : 'Cao cấp ✨'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Trạng thái</Text>
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
        const showTenant = store.userRole === 'host';

        return (
          <Pressable key={room.id} onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}>
            <Card style={{ borderLeftWidth: 4, borderLeftColor: room.type === 'premium' ? accent : tint }}>
              <View style={styles.head}>
                <View style={{ backgroundColor: 'transparent' }}>
                  <Text style={styles.code}>{room.code}</Text>
                  <Text style={{ color: tint, fontSize: 12, fontWeight: '600' }}>
                    {room.type === 'premium' ? 'Cao cấp' : 'Thường'}
                  </Text>
                </View>
                <StatusBadge kind="room" status={room.status} />
              </View>
              <Text style={{ color: muted }}>
                Tầng {room.floor} · {room.area} m²
              </Text>
              <Text style={[styles.price, { color: tint }]}>{formatVnd(room.price)}/tháng</Text>
              {showTenant && tenant ? (
                <Text>Khách: {tenant.fullName}</Text>
              ) : (
                <Text style={{ color: muted }}>
                  {room.status === 'occupied' ? 'Đã có người ở' : 'Chưa có khách'}
                </Text>
              )}
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  typeFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
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
