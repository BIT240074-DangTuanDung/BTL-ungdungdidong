import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { FieldLabel, PrimaryButton } from '@/components/ui';
import { useRental } from '@/context/RentalContext';

export default function HostVerifyScreen() {
  const store = useRental();
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  
  const [code, setCode] = useState('');

  const handleVerify = () => {
    if (store.verifyHostCode(code)) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Lỗi', 'Mã xác thực không chính xác');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Xác thực Chủ trọ</Text>
        <Text style={{ color: muted, marginBottom: 24 }}>
          Vui lòng nhập mã bảo mật dành riêng cho Chủ trọ để tiếp tục.
        </Text>

        <FieldLabel>Mã xác thực</FieldLabel>
        <TextInput
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          placeholder="NHAP MA TAI DAY"
          placeholderTextColor={muted}
          style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
        />

        <PrimaryButton title="Xác thực & Vào hệ thống" onPress={handleVerify} />
        
        <PrimaryButton title="Quay lại đăng nhập" tone="ghost" onPress={() => {
          store.logout();
          router.replace('/auth/login');
        }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 80,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 24,
  },
});
