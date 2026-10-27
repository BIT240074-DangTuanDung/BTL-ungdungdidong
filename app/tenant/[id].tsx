import { router, useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { Card, PrimaryButton } from '@/components/ui';
import { useRental } from '@/context/RentalContext';
import { formatDate, formatVnd } from '@/lib/format';

export default function TenantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useRental();
  const tenant = store.tenantById(id);
  const muted = useThemeColor({}, 'muted');

  if (!tenant) {
    return (
      <View style={styles.container}>
        <Text>Không tìm thấy khách thuê.</Text>
      </View>
    );
  }

  const contracts = store.contracts.filter((item) => item.tenantId === tenant.id);
  const active = contracts.find((item) => item.active);
  const room = active ? store.roomById(active.roomId) : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.name}>{tenant.fullName}</Text>
      <Card>
        <Text>Điện thoại: {tenant.phone}</Text>
        <Text>CCCD: {tenant.idNumber || '—'}</Text>
        {tenant.note ? <Text style={{ color: muted }}>{tenant.note}</Text> : null}
        <PrimaryButton title="Gọi điện" onPress={() => Linking.openURL(`tel:${tenant.phone}`)} />
      </Card>
      {active && room ? (
        <Card>
          <Text style={styles.section}>Hợp đồng hiện tại</Text>
          <Text>
            Phòng {room.code} · {formatVnd(active.monthlyRent)}/tháng
          </Text>
          <Text style={{ color: muted }}>Bắt đầu {formatDate(active.startDate)}</Text>
          <PrimaryButton
            title="Mở phòng"
            tone="ghost"
            onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}
          />
        </Card>
      ) : (
        <Text style={{ color: muted }}>Khách chưa được gắn phòng.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
  },
  section: {
    fontSize: 16,
    fontWeight: '800',
  },
});
