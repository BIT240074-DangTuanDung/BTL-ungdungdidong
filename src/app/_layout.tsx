import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { RentalProvider, useRental } from '@/context/RentalContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <RentalProvider>
      <RootLayoutNav />
    </RentalProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const store = useRental();
  const segments = useSegments();
  const welcomed = useRef(false);

  useEffect(() => {
    if (!store.ready) return;

    const inAuthGroup = segments[0] === 'auth';
    if (!welcomed.current) {
      welcomed.current = true;
      if (!store.currentUser && segments[0] === '(tabs)' && segments.length === 1) {
        router.replace('/auth/welcome');
        return;
      }
    }

    // Nếu chưa đăng nhập và không phải đang xem trọ (viewer)
    // Thực tế: Người xem trọ (viewer) không cần đăng nhập.
    // Nhưng yêu cầu là Người thuê phải đăng ký/đăng nhập.

    if (!store.currentUser && store.userRole !== 'viewer' && !inAuthGroup) {
      router.replace('/auth/login');
    }
  }, [store.currentUser, store.userRole, store.ready, segments]);

  return (
    <ThemeProvider value={{ ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme), colors: { ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors), background: Colors[colorScheme].background, card: Colors[colorScheme].card, text: Colors[colorScheme].text, primary: Colors[colorScheme].tint, border: Colors[colorScheme].border } }}>
      <Stack screenOptions={{ headerShadowVisible: false, headerTintColor: Colors[colorScheme].text }}>
        <Stack.Screen name="auth/welcome" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{title:"Nhắc việc"}} />
        <Stack.Screen name="requests" options={{title:"Yêu cầu thuê phòng"}} />
        <Stack.Screen name="contracts" options={{ title: 'Hợp đồng thuê' }} />
        <Stack.Screen name="revenue" options={{ title: 'Thống kê doanh thu' }} />
        <Stack.Screen name="auth/role" options={{ title: 'Chọn vai trò' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: 'Đăng nhập', headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ title: 'Đăng ký', presentation: 'modal' }} />
        <Stack.Screen name="auth/host-verify" options={{ title: 'Xác thực Chủ trọ', headerShown: false }} />
        <Stack.Screen name="auth/deposit" options={{ title: 'Đóng tiền cọc', headerShown: false }} />
        <Stack.Screen name="room/[id]" options={{ title: 'Chi tiết phòng' }} />
        <Stack.Screen name="room/new" options={{ title: 'Thêm phòng', presentation: 'modal' }} />
        <Stack.Screen name="tenant/[id]" options={{ title: 'Khách thuê' }} />
        <Stack.Screen name="tenant/new" options={{ title: 'Thêm khách thuê', presentation: 'modal' }} />
        <Stack.Screen name="contract/new" options={{ title: 'Lập hợp đồng thuê', presentation: 'modal' }} />
        <Stack.Screen name="invoice/new" options={{ title: 'Tạo hóa đơn', presentation: 'modal' }} />
        <Stack.Screen name="invoice/[id]" options={{ title: 'Hóa đơn' }} />
      </Stack>
    </ThemeProvider>
  );
}

