import { router } from 'expo-router';
import { Alert, Image, ScrollView, StyleSheet } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { Card, PrimaryButton } from '@/components/ui';
import { useRental } from '@/context/RentalContext';

export default function DepositScreen() {
  const store = useRental();
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');

  const handleConfirmPaid = () => {
    Alert.alert(
      'Xác nhận đã chuyển khoản?',
      'Chủ trọ sẽ kiểm tra và kích hoạt tài khoản của bạn ngay sau khi nhận được tiền.',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đã chuyển', 
          onPress: async () => {
            await store.payDeposit();
            Alert.alert('Thông báo', 'Yêu cầu đã được gửi. Bạn sẽ có quyền Người thuê sau khi được xác nhận.');
            router.replace('/(tabs)');
          } 
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Đóng tiền cọc</Text>
      <Text style={{ color: muted, marginBottom: 20 }}>
        Bạn cần đóng tiền cọc giữ chỗ để kích hoạt đầy đủ quyền hạn của Người thuê trọ.
      </Text>

      <Card style={{ alignItems: 'center', padding: 20 }}>
        <Text style={styles.section}>Quét mã để đóng cọc</Text>
        <Text style={{ marginBottom: 16, fontWeight: '700', color: tint }}>Số tiền: 2,000,000 VND</Text>
        <Image
          source={{ uri: 'https://api.ide.trae.ai/v1/attachments/d2e1329a-2410-4416-8c4d-9f44146f4148' }}
          style={styles.qrCode}
          resizeMode="contain"
        />
        <Text style={{ marginTop: 12, fontWeight: '600' }}>TECHCOMBANK - DANG TUAN DUNG</Text>
        <Text style={{ color: muted, fontSize: 12 }}>Nội dung: DONG COC - [SỐ ĐIỆN THOẠI]</Text>
      </Card>

      <PrimaryButton title="Tôi đã chuyển khoản thành công" onPress={handleConfirmPaid} />
      
      <PrimaryButton title="Để sau (Tiếp tục với quyền Người xem)" tone="ghost" onPress={() => {
        store.setUserRole('viewer');
        router.replace('/(tabs)');
      }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  section: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  qrCode: {
    width: 250,
    height: 250,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
});
