import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { Card, PrimaryButton, StatusBadge } from '@/components/ui';
import { useRental } from '@/context/RentalContext';
import { formatDate, formatVnd } from '@/lib/format';

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useRental();
  const room = store.roomById(id);
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const [picking, setPicking] = useState(false);
  const [inquiry, setInquiry] = useState({ name: '', phone: '', message: '' });

  if (!room) {
    return (
      <View style={styles.container}>
        <Text>Không tìm thấy phòng.</Text>
      </View>
    );
  }

  const contract = store.activeContractForRoom(room.id);
  const tenant = contract ? store.tenantById(contract.tenantId) : undefined;
  const freeTenants = store.tenants.filter(
    (item) => !store.contracts.some((c) => c.tenantId === item.id && c.active)
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.head}>
        <Text style={styles.code}>{room.code}</Text>
        <StatusBadge kind="room" status={room.status} />
      </View>
      <Text style={{ color: muted }}>{store.property?.address}</Text>
      <Card>
        <Text>Giá thuê: {formatVnd(room.price)}/tháng</Text>
        <Text>Cọc: {formatVnd(room.deposit)}</Text>
        <Text>
          Diện tích: {room.area} m² · Tầng {room.floor}
        </Text>
        <Text>
          Điện {formatVnd(room.electricityRate)}/kWh · Nước {formatVnd(room.waterRate)}/m³
        </Text>
        <Text>{room.description}</Text>
        <Text style={{ color: muted }}>{room.amenities.join(' · ')}</Text>
      </Card>

      {tenant && contract ? (
        <Card>
          <Text style={styles.section}>Khách đang thuê</Text>
          <Text style={styles.strong}>{tenant.fullName}</Text>
          <Text>{tenant.phone}</Text>
          <Text style={{ color: muted }}>Từ {formatDate(contract.startDate)}</Text>
          <PrimaryButton
            title="Xem khách thuê"
            tone="ghost"
            onPress={() => router.push({ pathname: '/tenant/[id]', params: { id: tenant.id } })}
          />
          <PrimaryButton
            title="Tạo hóa đơn"
            onPress={() => router.push({ pathname: '/invoice/new', params: { roomId: room.id } })}
          />
          <PrimaryButton
            title="Trả phòng"
            tone="danger"
            onPress={() =>
              Alert.alert('Trả phòng?', `${tenant.fullName} sẽ rời ${room.code}.`, [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Trả phòng', style: 'destructive', onPress: () => store.vacateRoom(room.id) },
              ])
            }
          />
        </Card>
      ) : (
        <Card>
          <Text style={styles.section}>Cho thuê phòng này</Text>
          {picking ? (
            <>
              {freeTenants.map((item) => (
                <PrimaryButton
                  key={item.id}
                  title={item.fullName}
                  tone="ghost"
                  onPress={() => {
                    store.rentOut(room.id, item.id, new Date().toISOString().slice(0, 10));
                    setPicking(false);
                  }}
                />
              ))}
              {freeTenants.length === 0 ? (
                <Text style={{ color: muted }}>Chưa có khách trống. Hãy thêm khách mới.</Text>
              ) : null}
              <PrimaryButton title="Thêm khách mới" onPress={() => router.push({ pathname: '/tenant/new', params: { roomId: room.id } })} />
              <PrimaryButton title="Đóng" tone="ghost" onPress={() => setPicking(false)} />
            </>
          ) : (
            <>
              <PrimaryButton title="Gắn khách thuê" onPress={() => setPicking(true)} />
              <PrimaryButton
                title={room.listed ? 'Gỡ tin đăng' : 'Đăng tin cho thuê'}
                tone="ghost"
                onPress={() => store.updateRoom(room.id, { listed: !room.listed, status: room.status === 'maintenance' ? room.status : 'vacant' })}
              />
              {room.status !== 'maintenance' ? (
                <PrimaryButton
                  title="Đánh dấu sửa chữa"
                  tone="ghost"
                  onPress={() => store.setRoomStatus(room.id, 'maintenance', false)}
                />
              ) : (
                <PrimaryButton title="Hoàn tất sửa chữa" tone="ghost" onPress={() => store.setRoomStatus(room.id, 'vacant', true)} />
              )}
            </>
          )}
        </Card>
      )}

      {room.listed && room.status !== 'occupied' ? (
        <Card>
          <Text style={styles.section}>Đặt giữ chỗ / liên hệ</Text>
          <TextInput
            placeholder="Họ tên"
            placeholderTextColor={muted}
            value={inquiry.name}
            onChangeText={(name) => setInquiry((prev) => ({ ...prev, name }))}
            style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
          />
          <TextInput
            placeholder="Số điện thoại"
            placeholderTextColor={muted}
            keyboardType="phone-pad"
            value={inquiry.phone}
            onChangeText={(phone) => setInquiry((prev) => ({ ...prev, phone }))}
            style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
          />
          <TextInput
            placeholder="Lời nhắn, giờ muốn xem phòng..."
            placeholderTextColor={muted}
            multiline
            value={inquiry.message}
            onChangeText={(message) => setInquiry((prev) => ({ ...prev, message }))}
            style={[styles.input, styles.area, { backgroundColor: card, borderColor: border, color: text }]}
          />
          <PrimaryButton
            title="Gửi yêu cầu giữ chỗ"
            onPress={() => {
              if (!inquiry.name.trim() || !inquiry.phone.trim()) {
                Alert.alert('Thiếu thông tin', 'Nhập họ tên và số điện thoại.');
                return;
              }
              store.addInquiry({
                roomId: room.id,
                name: inquiry.name.trim(),
                phone: inquiry.phone.trim(),
                message: inquiry.message.trim() || 'Muốn xem và giữ chỗ phòng này.',
              });
              setInquiry({ name: '', phone: '', message: '' });
              Alert.alert('Đã gửi', 'Chủ nhà sẽ liên hệ lại. Phòng được đánh dấu giữ chỗ.');
            }}
          />
        </Card>
      ) : null}

      {tenant ? (
        <PrimaryButton title="Gọi khách thuê" tone="ghost" onPress={() => Linking.openURL(`tel:${tenant.phone}`)} />
      ) : null}
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
  },
  code: {
    fontSize: 28,
    fontWeight: '800',
  },
  section: {
    fontSize: 16,
    fontWeight: '800',
  },
  strong: {
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  area: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
