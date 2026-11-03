import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { FieldLabel, PrimaryButton } from '@/components/ui';
import { useRental } from '@/context/RentalContext';

export default function LoginScreen() {
  const store = useRental();
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    const user = await store.login(username, password);
    if (!user) {
      Alert.alert('Đăng nhập thất bại', 'Sai tên đăng nhập hoặc mật khẩu.');
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ alignItems: 'center', paddingVertical: 32, marginBottom: 24, gap: 8 }}>
          <Text style={{ color: '#0060DF', fontSize: 70 }}>⌂</Text>
          <Text style={{ color: '#0060DF', fontSize: 30, fontWeight: '800' }}>TroHome</Text>
          <Text style={{ color: muted }}>Tìm và thuê phòng trọ dễ dàng, an toàn</Text>
        </View>
        <Text style={styles.title}>Đăng nhập</Text>
        <Text style={{ color: muted, marginBottom: 24 }}>Chào mừng trở lại!</Text>

        <FieldLabel>Tên đăng nhập</FieldLabel>
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="admin"
          placeholderTextColor={muted}
          style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
        />

        <FieldLabel>Mật khẩu</FieldLabel>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••"
          placeholderTextColor={muted}
          style={[styles.input, { backgroundColor: card, borderColor: border, color: text }]}
        />

        <PrimaryButton title="Đăng nhập" onPress={handleLogin} />
        
        <View style={styles.footer}>
          <Text style={{ color: muted }}>Chưa có tài khoản? </Text>
          <PrimaryButton title="Đăng ký ngay" tone="ghost" onPress={() => router.push('/auth/role')} />
        </View>

        <PrimaryButton title="Xem trọ (Khách vãng lai)" tone="ghost" onPress={() => {
          store.logout();
          router.replace('/(tabs)');
        }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 32,
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
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
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    backgroundColor: 'transparent',
  },
});
