import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { Card, PrimaryButton, StatusBadge } from '@/components/ui';
import { useRental } from '@/context/RentalContext';
import { calcInvoiceTotal, formatPeriod, formatVnd } from '@/lib/format';

export default function InvoicesScreen() {
  const store = useRental();
  const muted = useThemeColor({}, 'muted');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <PrimaryButton title="Tạo hóa đơn tháng" onPress={() => router.push('/invoice/new')} />
      {store.invoices.map((invoice) => {
        const room = store.roomById(invoice.roomId);
        const tenant = store.tenantById(invoice.tenantId);
        const total = calcInvoiceTotal(invoice, room?.electricityRate ?? 0, room?.waterRate ?? 0);
        return (
          <Pressable
            key={invoice.id}
            onPress={() => router.push({ pathname: '/invoice/[id]', params: { id: invoice.id } })}>
            <Card>
              <View style={styles.head}>
                <Text style={styles.title}>
                  {room?.code} · {formatPeriod(invoice.period)}
                </Text>
                <StatusBadge kind="invoice" status={invoice.status} />
              </View>
              <Text style={{ color: muted }}>{tenant?.fullName}</Text>
              <Text style={styles.money}>{formatVnd(total)}</Text>
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
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  money: {
    fontSize: 18,
    fontWeight: '700',
  },
});
