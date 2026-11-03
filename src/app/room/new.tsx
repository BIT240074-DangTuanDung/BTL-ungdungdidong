import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ImageGalleryEditor } from '@/components/ImageGalleryEditor';
import { Text, useThemeColor } from '@/components/Themed';
import { FieldLabel, PrimaryButton } from '@/components/ui';
import { useRental } from '@/context/RentalContext';
import { RoomType } from '@/lib/types';

export default function NewRoomScreen() {
  const store = useRental();
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');

  const [form, setForm] = useState({
    code: '',
    type: 'standard' as RoomType,
    floor: '1',
    area: '20',
    price: '3000000',
    deposit: '3000000',
    electricityRate: '3800',
    waterRate: '20000',
    amenities: 'Wifi, Nóng lạnh',
    description: '',
    images: [] as string[],
  });

  const set = (key: keyof typeof form, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'type' && value === 'premium' && prev.type !== 'premium') {
        next.price = '19000';
      }
      return next;
    });
  };

  // Chỉ chủ trọ mới được thêm phòng mới
  if (store.userRole !== 'host' || store.currentUser?.role !== 'host') {
    return (
      <View style={[styles.container, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Bạn không có quyền truy cập trang này.</Text>
        <PrimaryButton title="Quay lại" onPress={() => router.back()} />
      </View>
    );
  }

  if (store.userRole !== 'host') return <Text style={{padding:24}}>Chỉ chủ trọ được truy cập mục này.</Text>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <FieldLabel>Mã phòng</FieldLabel>
        <TextInput value={form.code} onChangeText={(v) => set('code', v)} placeholder="P203" placeholderTextColor={muted} style={inputStyle(card, border, text)} />
        
        <FieldLabel>Loại phòng</FieldLabel>
        <View style={styles.typeSelector}>
          {(['standard', 'premium'] as RoomType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => set('type', t)}
              style={[
                styles.typeChip,
                { borderColor: border, backgroundColor: form.type === t ? tint : card },
              ]}>
              <Text style={{ color: form.type === t ? '#fff' : text, fontWeight: '600' }}>
                {t === 'premium' ? 'Cao cấp' : 'Thường'}
              </Text>
            </Pressable>
          ))}
        </View>

        <FieldLabel>Tầng</FieldLabel>
        <TextInput value={form.floor} onChangeText={(v) => set('floor', v)} keyboardType="number-pad" style={inputStyle(card, border, text)} />
        <FieldLabel>Diện tích (m²)</FieldLabel>
        <TextInput value={form.area} onChangeText={(v) => set('area', v)} keyboardType="decimal-pad" style={inputStyle(card, border, text)} />
        <FieldLabel>Giá thuê (đ/tháng)</FieldLabel>
        <TextInput value={form.price} onChangeText={(v) => set('price', v)} keyboardType="number-pad" style={inputStyle(card, border, text)} />
        <FieldLabel>Tiền cọc</FieldLabel>
        <TextInput value={form.deposit} onChangeText={(v) => set('deposit', v)} keyboardType="number-pad" style={inputStyle(card, border, text)} />
        <FieldLabel>Giá điện / kWh</FieldLabel>
        <TextInput value={form.electricityRate} onChangeText={(v) => set('electricityRate', v)} keyboardType="number-pad" style={inputStyle(card, border, text)} />
        <FieldLabel>Giá nước / m³</FieldLabel>
        <TextInput value={form.waterRate} onChangeText={(v) => set('waterRate', v)} keyboardType="number-pad" style={inputStyle(card, border, text)} />
        <FieldLabel>Tiện nghi (cách nhau bởi dấu phẩy)</FieldLabel>
        <TextInput value={form.amenities} onChangeText={(v) => set('amenities', v)} style={inputStyle(card, border, text)} />
        <FieldLabel>Mô tả</FieldLabel>
        <TextInput
          value={form.description}
          onChangeText={(v) => set('description', v)}
          multiline
          placeholder="Phòng thoáng, gần chợ..."
          placeholderTextColor={muted}
          style={[inputStyle(card, border, text), { minHeight: 90, textAlignVertical: 'top' }]}
        />
        <FieldLabel>Ảnh phòng</FieldLabel>
        <ImageGalleryEditor images={form.images} onChange={(images) => set('images', images)} />
        <PrimaryButton
          title="Lưu phòng"
          onPress={() => {
            if (!form.code.trim()) {
              Alert.alert('Thiếu mã phòng');
              return;
            }
            store.addRoom({
              code: form.code.trim().toUpperCase(),
              type: form.type,
              floor: Number(form.floor) || 1,
              area: Number(form.area) || 0,
              price: Number(form.price) || 0,
              deposit: Number(form.deposit) || 0,
              electricityRate: Number(form.electricityRate) || 0,
              waterRate: Number(form.waterRate) || 0,
              status: 'vacant',
              amenities: form.amenities.split(',').map((item) => item.trim()).filter(Boolean),
              description: form.description.trim(),
              listed: true,
              maxOccupants: 4, // Default value
              currentOccupantsCount: 1, // Default value
              images: form.images,
            });
            router.back();
          }}
        />
        <Text style={{ color: muted, textAlign: 'center' }}>Phòng mới sẽ được đăng tin cho thuê.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function inputStyle(backgroundColor: string, borderColor: string, color: string) {
  return {
    backgroundColor,
    borderColor,
    color,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  };
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
