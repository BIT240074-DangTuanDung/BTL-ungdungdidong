import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';

import { useThemeColor } from '@/components/Themed';
import { FieldLabel, PrimaryButton } from '@/components/ui';
import { useRental } from '@/context/RentalContext';

export default function NewTenantScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const store = useRental();
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    idNumber: '',
    note: '',
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <FieldLabel>Họ và tên</FieldLabel>
        <TextInput
          value={form.fullName}
          onChangeText={(fullName) => setForm((p) => ({ ...p, fullName }))}
          placeholder="Nguyễn Văn A"
          placeholderTextColor={muted}
          style={input(card, border, text)}
        />
        <FieldLabel>Số điện thoại</FieldLabel>
        <TextInput
          value={form.phone}
          onChangeText={(phone) => setForm((p) => ({ ...p, phone }))}
          keyboardType="phone-pad"
          placeholder="09..."
          placeholderTextColor={muted}
          style={input(card, border, text)}
        />
        <FieldLabel>CCCD / CMND</FieldLabel>
        <TextInput
          value={form.idNumber}
          onChangeText={(idNumber) => setForm((p) => ({ ...p, idNumber }))}
          placeholder="012345678901"
          placeholderTextColor={muted}
          style={input(card, border, text)}
        />
        <FieldLabel>Ghi chú</FieldLabel>
        <TextInput
          value={form.note}
          onChangeText={(note) => setForm((p) => ({ ...p, note }))}
          multiline
          style={[input(card, border, text), { minHeight: 80, textAlignVertical: 'top' }]}
        />
        <PrimaryButton
          title={roomId ? 'Lưu và cho thuê phòng' : 'Lưu khách thuê'}
          onPress={() => {
            if (!form.fullName.trim() || !form.phone.trim()) {
              Alert.alert('Thiếu thông tin', 'Cần họ tên và số điện thoại.');
              return;
            }
            const id = store.addTenant({
              fullName: form.fullName.trim(),
              phone: form.phone.trim(),
              idNumber: form.idNumber.trim(),
              note: form.note.trim(),
            });
            if (roomId) {
              store.rentOut(roomId, id, new Date().toISOString().slice(0, 10));
            }
            router.back();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function input(backgroundColor: string, borderColor: string, color: string) {
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
});
