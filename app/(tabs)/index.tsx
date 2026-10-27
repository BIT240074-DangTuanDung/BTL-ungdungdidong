import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { Card, PrimaryButton, StatusBadge } from '@/components/ui';
import { useRental } from '@/context/RentalContext';
import { calcInvoiceTotal, formatVnd } from '@/lib/format';

export default function DashboardScreen() {
  const store = useRental();
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');

  const occupied = store.rooms.filter((room) => room.status === 'occupied').length;
  const vacant = store.rooms.filter((room) => room.status === 'vacant').length;
  const reserved = store.rooms.filter((room) => room.status === 'reserved').length;
  const monthlyRent = store.contracts
    .filter((contract) => contract.active)
    .reduce((sum, contract) => sum + contract.monthlyRent, 0);
  const unpaid = store.invoices.filter((invoice) => invoice.status !== 'paid');
  const unpaidTotal = unpaid.reduce((sum, invoice) => {
    const room = store.roomById(invoice.roomId);
    return sum + calcInvoiceTotal(invoice, room?.electricityRate ?? 0, room?.waterRate ?? 0);
  }, 0);
  const newInquiries = store.inquiries.filter((inquiry) => inquiry.status === 'new');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Chủ nhà</Text>
      <Text style={styles.title}>{store.property?.name ?? 'Nhà trọ'}</Text>
      <Text style={[styles.address, { color: muted }]}>{store.property?.address}</Text>

      <View style={styles.stats}>
        <Stat label="Đang thuê" value={String(occupied)} />
        <Stat label="Còn trống" value={String(vacant)} />
        <Stat label="Giữ chỗ" value={String(reserved)} />
      </View>

      <Card>
        <Text style={[styles.cardLabel, { color: muted }]}>Doanh thu hợp đồng / tháng</Text>
        <Text style={[styles.money, { color: tint }]}>{formatVnd(monthlyRent)}</Text>
        <Text style={[styles.cardLabel, { color: muted, marginTop: 12 }]}>Công nợ chưa thu</Text>
        <Text style={styles.money}>{formatVnd(unpaidTotal)}</Text>
      </Card>

      <View style={styles.row}>
        <View style={styles.flex}>
          <PrimaryButton title="Thêm phòng" onPress={() => router.push('/room/new')} />
        </View>
        <View style={styles.flex}>
          <PrimaryButton title="Tạo hóa đơn" tone="ghost" onPress={() => router.push('/invoice/new')} />
        </View>
      </View>

      <Text style={styles.section}>Hóa đơn cần xử lý</Text>
      {unpaid.slice(0, 4).map((invoice) => {
        const room = store.roomById(invoice.roomId);
        const tenant = store.tenantById(invoice.tenantId);
        return (
          <Pressable
            key={invoice.id}
            onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: invoice.id } })}>
            <Card>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>
                    {room?.code} · {tenant?.fullName}
                  </Text>
                  <StatusBadge kind="invoice" status={invoice.status} />
                </View>
                <Text style={{ color: muted }}>{invoice.period}</Text>
              </Card>
          </Pressable>
        );
      })}
      {unpaid.length === 0 ? <Text style={{ color: muted }}>Không còn hóa đơn chưa thu.</Text> : null}

      <Text style={styles.section}>Liên hệ xem phòng</Text>
      {newInquiries.map((inquiry) => {
        const room = store.roomById(inquiry.roomId);
        return (
          <Card key={inquiry.id}>
            <Text style={styles.cardTitle}>
              {inquiry.name} · {room?.code}
            </Text>
            <Text style={{ color: muted }}>{inquiry.message}</Text>
            <Text>{inquiry.phone}</Text>
            <PrimaryButton title="Đã liên hệ" tone="ghost" onPress={() => store.markInquiryContacted(inquiry.id)} />
          </Card>
        );
      })}
      {newInquiries.length === 0 ? <Text style={{ color: muted }}>Chưa có yêu cầu mới.</Text> : null}

      <PrimaryButton
        title="Khôi phục dữ liệu mẫu"
        tone="ghost"
        onPress={() =>
          Alert.alert('Khôi phục dữ liệu mẫu?', 'Mọi thay đổi trên máy sẽ bị ghi đè.', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Khôi phục', style: 'destructive', onPress: store.resetDemo },
          ])
        }
      />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  address: {
    fontSize: 14,
    marginBottom: 4,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  money: {
    fontSize: 22,
    fontWeight: '800',
  },
  cardLabel: {
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  section: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '800',
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
});
