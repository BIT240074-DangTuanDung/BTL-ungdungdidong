import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { Card, PrimaryButton, StatusBadge } from '@/components/ui';
import { useRental } from '@/context/RentalContext';
import { calcInvoiceTotal, formatDate, formatPeriod, formatVnd } from '@/lib/format';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useRental();
  const invoice = store.invoices.find((item) => item.id === id);
  const muted = useThemeColor({}, 'muted');

  if (!invoice) {
    return (
      <View style={styles.container}>
        <Text>Không tìm thấy hóa đơn.</Text>
      </View>
    );
  }

  const room = store.roomById(invoice.roomId);
  const tenant = store.tenantById(invoice.tenantId);
  const kwh = Math.max(0, invoice.electricityNew - invoice.electricityOld);
  const m3 = Math.max(0, invoice.waterNew - invoice.waterOld);
  const elec = kwh * (room?.electricityRate ?? 0);
  const water = m3 * (room?.waterRate ?? 0);
  const total = calcInvoiceTotal(invoice, room?.electricityRate ?? 0, room?.waterRate ?? 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.head}>
        <Text style={styles.title}>
          {room?.code} · {formatPeriod(invoice.period)}
        </Text>
        <StatusBadge kind="invoice" status={invoice.status} />
      </View>
      <Text style={{ color: muted }}>{tenant?.fullName}</Text>
      <Card>
        <Row label="Tiền phòng" value={formatVnd(invoice.rent)} />
        <Row label={`Điện (${kwh} kWh)`} value={formatVnd(elec)} />
        <Row label={`Nước (${m3} m³)`} value={formatVnd(water)} />
        <Row label={invoice.otherNote || 'Khoản khác'} value={formatVnd(invoice.other)} />
        <Row label="Tổng cộng" value={formatVnd(total)} strong />
      </Card>
      <Text style={{ color: muted }}>Tạo ngày {formatDate(invoice.createdAt)}</Text>
      {invoice.paidAt ? <Text style={{ color: muted }}>Đã thu {formatDate(invoice.paidAt)}</Text> : null}
      {invoice.status !== 'paid' ? (
        <>
          <PrimaryButton title="Đánh dấu đã thu" onPress={() => store.setInvoiceStatus(invoice.id, 'paid')} />
          {invoice.status !== 'overdue' ? (
            <PrimaryButton title="Đánh dấu quá hạn" tone="ghost" onPress={() => store.setInvoiceStatus(invoice.id, 'overdue')} />
          ) : null}
        </>
      ) : (
        <PrimaryButton title="Mở lại chưa thu" tone="ghost" onPress={() => store.setInvoiceStatus(invoice.id, 'unpaid')} />
      )}
    </ScrollView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={strong ? styles.strong : undefined}>{label}</Text>
      <Text style={strong ? styles.strong : undefined}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  strong: {
    fontWeight: '800',
    fontSize: 16,
  },
});
