import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { Card, PrimaryButton } from '@/components/ui';
import { useRental } from '@/context/RentalContext';

export default function TenantsScreen() {
  const store = useRental();
  const muted = useThemeColor({}, 'muted');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <PrimaryButton title="Thêm khách thuê" onPress={() => router.push('/tenant/new')} />
      {store.tenants.map((tenant) => {
        const contract = store.contracts.find(
          (item) => item.tenantId === tenant.id && item.active
        );
        const room = contract ? store.roomById(contract.roomId) : undefined;
        return (
          <Pressable
            key={tenant.id}
            onPress={() => router.push({ pathname: '/tenant/[id]', params: { id: tenant.id } })}>
            <Card>
              <Text style={styles.name}>{tenant.fullName}</Text>
              <Text>{tenant.phone}</Text>
              <Text style={{ color: muted }}>{room ? `Đang ở ${room.code}` : 'Chưa gắn phòng'}</Text>
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
  name: {
    fontSize: 18,
    fontWeight: '800',
  },
});
