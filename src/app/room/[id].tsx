import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ImageGalleryEditor } from '@/components/ImageGalleryEditor';
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
  const tint = useThemeColor({}, 'tint');
  const [picking, setPicking] = useState(false);
  const [inquiry, setInquiry] = useState({ name: '', phone: '', message: '' });
  const [occupants, setOccupants] = useState(String(room?.currentOccupantsCount || 1));
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [repairDesc, setRepairDesc] = useState('');

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

  const { userRole, currentTenantId, currentUser } = store;
  const isHost = userRole === 'host' && currentUser?.role === 'host';
  const isTenant = userRole === 'tenant';
  const isMyRoom = isTenant && tenant?.id === currentTenantId;
  const canSeeTenantInfo = isHost;
  const isFavorite = store.currentUser?.favorites?.includes(room.id);

  const handleConfirmRental = () => {
    if (!currentUser) { router.push('/auth/login'); return; }
    if (store.inquiries.some(i => i.userId === currentUser.id && i.roomId === room.id && ['new','contacted','accepted'].includes(i.status))) {
      Alert.alert('Đã gửi yêu cầu', 'Bạn có thể theo dõi trong mục Yêu cầu thuê.'); return;
    }
    store.addInquiry({roomId:room.id,name:currentUser.fullName,phone:currentUser.phone,message:'Tôi muốn xem và thuê phòng này.'});
    router.push('/requests');
  };

  const handleUpdateOccupants = () => {
    const count = parseInt(occupants);
    if (isNaN(count) || count < 1) {
      Alert.alert('Lỗi', 'Số lượng người ở không hợp lệ');
      return;
    }
    store.updateRoom(room.id, { currentOccupantsCount: count });
    Alert.alert('Thành công', 'Đã cập nhật số lượng người ở');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.head}>
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent' }}>
            <Text style={styles.code}>{room.code}</Text>
            {!isHost && store.currentUser && (
              <Pressable onPress={() => store.toggleFavorite(room.id)}>
                <SymbolView
                  name={{
                    ios: isFavorite ? 'heart.fill' : 'heart',
                    android: isFavorite ? 'favorite' : 'favorite_border',
                    web: isFavorite ? 'favorite' : 'favorite_border',
                  }}
                  tintColor={isFavorite ? '#ff4d4f' : muted}
                  size={24}
                />
              </Pressable>
            )}
          </View>
          <Text style={{ color: tint, fontWeight: '700' }}>
            Phòng {room.type === 'premium' ? 'Cao cấp' : 'Thường'}
          </Text>
        </View>
        <StatusBadge kind="room" status={room.status} />
      </View>
      <Text style={{ color: muted }}>{store.property?.address}</Text>

      {isHost || (room.images && room.images.length > 0) ? (
        <View style={styles.galleryWrap}>
          <Text style={styles.section}>Hình ảnh phòng</Text>
          {isHost ? (
            // Chủ trọ có thể thêm/xoá ảnh phòng trực tiếp từ thư viện thiết bị.
            <ImageGalleryEditor
              images={room.images ?? []}
              onChange={(images) => store.updateRoom(room.id, { images })}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gallery}>
              {room.images.map((uri, index) => (
                <Image
                  key={`${room.id}-${index}`}
                  source={{ uri }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}

      <Card>
        <Text style={styles.section}>Thông tin phòng</Text>
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

      {(isHost || isMyRoom) && (
        <Card>
          <Text style={styles.section}>Hợp đồng của bạn</Text>
          {contract ? (
            <>
              <Text>Ngày bắt đầu: {formatDate(contract.startDate)}</Text>
              <Text>Tiền thuê: {formatVnd(contract.monthlyRent)}/tháng</Text>
              <Text>Tiền cọc: {formatVnd(contract.deposit)}</Text>
            </>
          ) : (
            <Text style={{ color: muted }}>Chưa có hợp đồng.</Text>
          )}
        </Card>
      )}

      {(isHost || isMyRoom) && (
        <Card>
          <Text style={styles.section}>Số lượng người ở</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <TextInput
              value={occupants}
              onChangeText={setOccupants}
              keyboardType="number-pad"
              style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: card, borderColor: border, color: text }]}
            />
            <PrimaryButton title="Cập nhật" onPress={handleUpdateOccupants} />
          </View>
        </Card>
      )}

      {isMyRoom && (
        <Card>
          <Text style={styles.section}>Yêu cầu sửa chữa</Text>
          {showRepairForm ? (
            <View style={{ gap: 8, backgroundColor: 'transparent' }}>
              <TextInput
                placeholder="Mô tả hỏng hóc..."
                placeholderTextColor={muted}
                multiline
                value={repairDesc}
                onChangeText={setRepairDesc}
                style={[styles.input, styles.area, { backgroundColor: card, borderColor: border, color: text }]}
              />
              <View style={{ flexDirection: 'row', gap: 8, backgroundColor: 'transparent' }}>
                <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                  <PrimaryButton
                    title="Gửi yêu cầu"
                    onPress={() => {
                      if (!repairDesc.trim()) return;
                      store.addRepairRequest({
                        roomId: room.id,
                        tenantId: store.currentTenantId!,
                        description: repairDesc.trim(),
                      });
                      setRepairDesc('');
                      setShowRepairForm(false);
                      Alert.alert('Đã gửi', 'Chủ nhà đã nhận được yêu cầu sửa chữa.');
                    }}
                  />
                </View>
                <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                  <PrimaryButton title="Huỷ" tone="ghost" onPress={() => setShowRepairForm(false)} />
                </View>
              </View>
            </View>
          ) : (
            <PrimaryButton title="Gửi yêu cầu mới" tone="ghost" onPress={() => setShowRepairForm(true)} />
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, backgroundColor: 'transparent' }}>
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <PrimaryButton
                title="Gia hạn hợp đồng"
                tone="ghost"
                onPress={() =>
                  Alert.alert('Gia hạn?', 'Bạn muốn gửi yêu cầu gia hạn hợp đồng cho phòng này?', [
                    { text: 'Huỷ', style: 'cancel' },
                    {
                      text: 'Gửi',
                      onPress: () => {
                        store.addInquiry({
                          roomId: room.id,
                          name: store.currentUser?.fullName ?? 'Khách thuê',
                          phone: store.currentUser?.phone ?? '',
                          message: 'Yêu cầu GIA HẠN hợp đồng.',
                        });
                        Alert.alert('Đã gửi', 'Yêu cầu gia hạn của bạn đã được gửi tới chủ nhà.');
                      },
                    },
                  ])
                }
              />
            </View>
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <PrimaryButton
                title="Trả phòng"
                tone="danger"
                onPress={() =>
                  Alert.alert('Trả phòng?', 'Bạn muốn gửi yêu cầu trả phòng (kết thúc hợp đồng)?', [
                    { text: 'Huỷ', style: 'cancel' },
                    {
                      text: 'Gửi',
                      style: 'destructive',
                      onPress: () => {
                        store.addInquiry({
                          roomId: room.id,
                          name: store.currentUser?.fullName ?? 'Khách thuê',
                          phone: store.currentUser?.phone ?? '',
                          message: 'Yêu cầu TRẢ PHÒNG.',
                        });
                        Alert.alert('Đã gửi', 'Yêu cầu trả phòng của bạn đã được gửi tới chủ nhà.');
                      },
                    },
                  ])
                }
              />
            </View>
          </View>

          {store.repairRequests
            .filter((r) => r.roomId === room.id)
            .map((r) => (
              <View
                key={r.id}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: card,
                  borderWidth: 1,
                  borderColor: border,
                  marginTop: 8,
                }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'transparent' }}>
                  <Text style={{ fontSize: 12, color: muted }}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: r.status === 'completed' ? '#52c41a' : '#faad14',
                    }}>
                    {r.status === 'pending'
                      ? 'Chờ xử lý'
                      : r.status === 'in_progress'
                      ? 'Đang sửa'
                      : r.status === 'completed'
                      ? 'Đã xong'
                      : 'Đã huỷ'}
                  </Text>
                </View>
                <Text>{r.description}</Text>
              </View>
            ))}
        </Card>
      )}

      {tenant && contract ? (
        <Card>
          <Text style={styles.section}>Thông tin khách thuê</Text>
          {canSeeTenantInfo ? (
            <>
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
            </>
          ) : (
            <Text style={{ color: muted }}>Phòng đã được thuê.</Text>
          )}
        </Card>
      ) : isHost ? (
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
              <PrimaryButton
                title="Làm hợp đồng thuê"
                onPress={() => router.push({ pathname: '/contract/new', params: { roomId: room.id } })}
              />
              <PrimaryButton title="Gắn khách thuê nhanh" tone="ghost" onPress={() => setPicking(true)} />
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
      ) : null}

      {(isHost || userRole === 'viewer' || userRole === 'tenant') && room.listed && room.status !== 'occupied' ? (
        <Card>
          <Text style={styles.section}>{isHost ? 'Đặt giữ chỗ / liên hệ' : 'Gửi yêu cầu thuê'}</Text>
          {isHost ? (
            <>
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
            </>
          ) : (
            <>
              <Text style={{ marginBottom: 12, color: muted }}>
                Ấn nút bên dưới để tiến hành các bước thuê phòng và đóng cọc.
              </Text>
              <PrimaryButton title="Tiến hành thuê phòng" onPress={handleConfirmRental} />
            </>
          )}
        </Card>
      ) : null}

      {isHost && tenant ? (
        <PrimaryButton title="Gọi khách thuê" tone="ghost" onPress={() => Linking.openURL(`tel:${tenant.phone}`)} />
      ) : null}

      {isHost && (
        <PrimaryButton
          title="Xóa phòng"
          tone="danger"
          onPress={() =>
            Alert.alert('Xóa phòng?', `Hành động này không thể hoàn tác. Phòng ${room.code} sẽ bị xóa vĩnh viễn.`, [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Xóa',
                style: 'destructive',
                onPress: () => {
                  store.deleteRoom(room.id);
                  router.back();
                },
              },
            ])
          }
        />
      )}
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
  galleryWrap: {
    backgroundColor: 'transparent',
    gap: 8,
  },
  gallery: {
    gap: 8,
    paddingVertical: 4,
  },
  photo: {
    width: 260,
    height: 180,
    borderRadius: 12,
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