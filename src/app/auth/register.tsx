import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { FieldLabel, PrimaryButton } from '@/components/ui';
import { useRental } from '@/context/RentalContext';
import { UserRole } from '@/lib/types';

export default function RegisterScreen() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const store = useRental();
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');

  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    role: (role === 'host' ? 'host' : 'tenant') as UserRole,
    confirmCode: '',
  });

  const handleRegister = async () => {
    if (!form.username.trim() || !form.password || !form.fullName.trim() || !form.phone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.username.trim()) || form.password.length < 8) {
      Alert.alert('Thông tin chưa hợp lệ', 'Nhập email hợp lệ và mật khẩu tối thiểu 8 ký tự.');
      return;
    }
    const newUser = await store.register({
      username: form.username.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      role: form.role,
    });
    if (!newUser) {
      Alert.alert('Đăng ký thất bại', 'Email này đã được sử dụng. Vui lòng chọn tên khác.');
      return;
    }

    Alert.alert('Đăng ký thành công', `Tài khoản "${newUser.username}" đã được tạo. Hãy đăng nhập để tiếp tục.`, [
      { text: 'Đăng nhập', onPress: () => router.replace('/auth/login') },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Đăng ký tài khoản</Text>
        
        <FieldLabel>Vai trò</FieldLabel>
        <View style={styles.rolePicker}>
          {(['tenant', 'host'] as UserRole[]).map((r) => (
            <Pressable
              key={r}
              onPress={() => setForm(f => ({ ...f, role: r }))}
              style={[
                styles.roleChip,
                { backgroundColor: form.role === r ? tint : card, borderColor: border },
              ]}>
              <Text style={{ color: form.role === r ? '#fff' : text, fontWeight: '600' }}>
                {r === 'host' ? 'Chủ trọ' : 'Người thuê'}
              </Text>
            </Pressable>
          ))}
        </View>

        <FieldLabel>Email</FieldLabel>
        <TextInput
          value={form.username}
          onChangeText={(v) => setForm(f => ({ ...f, username: v }))}
          autoCapitalize="none"
          placeholder="ban@example.com"
          placeholderTextColor={muted}
          style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
        />

        <FieldLabel>Mật khẩu</FieldLabel>
        <TextInput
          value={form.password}
          onChangeText={(v) => setForm(f => ({ ...f, password: v }))}
          secureTextEntry
          placeholder="••••••"
          placeholderTextColor={muted}
          style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
        />

        <FieldLabel>Họ và tên</FieldLabel>
        <TextInput
          value={form.fullName}
          onChangeText={(v) => setForm(f => ({ ...f, fullName: v }))}
          placeholder="Nguyễn Văn A"
          placeholderTextColor={muted}
          style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
        />

        <FieldLabel>Số điện thoại</FieldLabel>
        <TextInput
          value={form.phone}
          onChangeText={(v) => setForm(f => ({ ...f, phone: v }))}
          keyboardType="phone-pad"
          placeholder="0912345678"
          placeholderTextColor={muted}
          style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
        />

        <PrimaryButton title="Đăng ký tài khoản" onPress={handleRegister} />

        <View style={styles.footer}>
          <Text style={{ color: muted }}>Đã có tài khoản? </Text>
          <PrimaryButton title="Đăng nhập" tone="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 24,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 20,
  },
  rolePicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  roleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    backgroundColor: 'transparent',
  },
});
