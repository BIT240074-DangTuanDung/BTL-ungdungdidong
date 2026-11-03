import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { Card, FieldLabel, PrimaryButton } from '@/components/ui';
import { useRental } from '@/context/RentalContext';
import { formatVnd } from '@/lib/format';

// Màn hình lập hợp đồng thuê phòng, dùng được cho cả chủ trọ và người thuê.
export default function NewContractScreen() {
  const { roomId, tenantId } = useLocalSearchParams<{ roomId?: string; tenantId?: string }>();
  const store = useRental();
  const room = roomId ? store.roomById(roomId) : undefined;

  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');

  const isHost = store.userRole === 'host';
  const isViewer = store.userRole !== 'host';
  const freeTenants = store.tenants.filter(
    (item) => !store.contracts.some((c) => c.tenantId === item.id && c.active)
  );

  const [mode, setMode] = useState<'existing' | 'new'>(() =>
    tenantId || (isHost && freeTenants.length > 0) ? 'existing' : 'new'
  );
  const [selectedTenantId, setSelectedTenantId] = useState(tenantId ?? freeTenants[0]?.id ?? '');
  const [person, setPerson] = useState({
    fullName: isHost ? '' : store.currentUser?.fullName ?? '',
    phone: isHost ? '' : store.currentUser?.phone ?? '',
    idNumber: '',
  });
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState(String(room?.price ?? 0));
  const [deposit, setDeposit] = useState(String(room?.deposit ?? 0));

  if (!room) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Không tìm thấy phòng.</Text>
        <PrimaryButton title="Quay lại" onPress={() => router.back()} />
      </View>
    );
  }

  if (isViewer) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Bạn cần đăng nhập để lập hợp đồng thuê phòng.</Text>
        <PrimaryButton title="Đăng ký / Đăng nhập" onPress={() => router.push('/auth/login')} />
      </View>
    );
  }

  const handleSave = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(Date.parse(startDate)) || (endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !Number.isFinite(Date.parse(endDate)) || endDate<=startDate)) || !Number.isFinite(Number(monthlyRent)) || Number(monthlyRent)<=0 || !Number.isFinite(Number(deposit)) || Number(deposit)<0) {
      Alert.alert('Thông tin chưa hợp lệ', 'Kiểm tra ngày bắt đầu, kết thúc và giá thuê, tiền cọc.'); return;
    }
    if (store.activeContractForRoom(room.id)) { Alert.alert('Phòng đã có hợp đồng', 'Hãy kết thúc hợp đồng cũ trước khi tạo mới.'); return; }
    let finalTenantId = selectedTenantId;

    if (mode === 'new') {
      if (!person.fullName.trim() || !person.phone.trim()) {
        Alert.alert('Thiếu thông tin', 'Cần họ tên và số điện thoại của khách thuê.');
        return;
      }
      finalTenantId = store.addTenant({
        fullName: person.fullName.trim(),
        phone: person.phone.trim(),
        idNumber: person.idNumber.trim(),
        note: '',
      });
    } else if (!finalTenantId) {
      Alert.alert('Chưa chọn khách', 'Vui lòng chọn một khách thuê.');
      return;
    }

    store.createContract({
      roomId: room.id,
      tenantId: finalTenantId,
      startDate,
      endDate: endDate.trim() || undefined,
      monthlyRent: Number(monthlyRent) || room.price,
      deposit: Number(deposit),
    });

    Alert.alert('Đã lập hợp đồng', `Phòng ${room.code} đã được cho thuê.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Card>
          <Text style={styles.section}>Phòng {room.code}</Text>
          <Text style={{ color: muted }}>
            Giá niêm yết: {formatVnd(room.price)}/tháng · Cọc {formatVnd(room.deposit)}
          </Text>
        </Card>

        <Card>
          <Text style={styles.section}>Khách thuê</Text>

          {isHost ? (
            <View style={styles.modeRow}>
              {(['existing', 'new'] as const).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setMode(item)}
                  style={[
                    styles.chip,
                    { borderColor: border, backgroundColor: mode === item ? tint : card },
                  ]}>
                  <Text style={{ color: mode === item ? '#fff' : text, fontWeight: '600' }}>
                    {item === 'existing' ? 'Khách có sẵn' : 'Khách mới'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {isHost && mode === 'existing' ? (
            freeTenants.length > 0 ? (
              freeTenants.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedTenantId(item.id)}
                  style={[
                    styles.tenantRow,
                    {
                      borderColor: selectedTenantId === item.id ? tint : border,
                      backgroundColor: selectedTenantId === item.id ? tint + '22' : card,
                    },
                  ]}>
                  <Text style={{ fontWeight: '700' }}>{item.fullName}</Text>
                  <Text style={{ color: muted }}>{item.phone}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={{ color: muted }}>Chưa có khách trống. Chuyển sang “Khách mới”.</Text>
            )
          ) : (
            <>
              <FieldLabel>Họ và tên</FieldLabel>
              <TextInput
                value={person.fullName}
                onChangeText={(fullName) => setPerson((p) => ({ ...p, fullName }))}
                placeholder="Nguyễn Văn A"
                placeholderTextColor={muted}
                style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
              />
              <FieldLabel>Số điện thoại</FieldLabel>
              <TextInput
                value={person.phone}
                onChangeText={(phone) => setPerson((p) => ({ ...p, phone }))}
                keyboardType="phone-pad"
                placeholder="09..."
                placeholderTextColor={muted}
                style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
              />
              <FieldLabel>CCCD / CMND</FieldLabel>
              <TextInput
                value={person.idNumber}
                onChangeText={(idNumber) => setPerson((p) => ({ ...p, idNumber }))}
                placeholder="012345678901"
                placeholderTextColor={muted}
                style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
              />
            </>
          )}
        </Card>

        <Card>
          <Text style={styles.section}>Điều khoản thuê</Text>
          <FieldLabel>Ngày bắt đầu (YYYY-MM-DD)</FieldLabel>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-01-01"
            placeholderTextColor={muted}
            autoCapitalize="none"
            style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
          />

          <FieldLabel>Ngày kết thúc (YYYY-MM-DD - Tùy chọn)</FieldLabel>
          <TextInput
            value={endDate}
            onChangeText={setEndDate}
            placeholder="2027-01-01"
            placeholderTextColor={muted}
            autoCapitalize="none"
            style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
          />

          {isHost ? (
            <>
              <FieldLabel>Tiền thuê (đ/tháng)</FieldLabel>
              <TextInput
                value={monthlyRent}
                onChangeText={setMonthlyRent}
                keyboardType="number-pad"
                style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
              />
              <FieldLabel>Tiền cọc (đ)</FieldLabel>
              <TextInput
                value={deposit}
                onChangeText={setDeposit}
                keyboardType="number-pad"
                style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
              />
            </>
          ) : (
            <>
              <Text>Tiền thuê: {formatVnd(Number(monthlyRent) || room.price)}/tháng</Text>
              <Text>Tiền cọc: {formatVnd(Number(deposit))}</Text>
            </>
          )}
        </Card>

        <PrimaryButton title="Lập hợp đồng" onPress={handleSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  section: {
    fontSize: 16,
    fontWeight: '800',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tenantRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
});
