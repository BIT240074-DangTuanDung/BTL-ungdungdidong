import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { RentalProvider } from '@/context/RentalContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
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

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="room/[id]" options={{ title: 'Chi tiết phòng' }} />
        <Stack.Screen name="room/new" options={{ title: 'Thêm phòng', presentation: 'modal' }} />
        <Stack.Screen name="tenant/[id]" options={{ title: 'Khách thuê' }} />
        <Stack.Screen name="tenant/new" options={{ title: 'Thêm khách thuê', presentation: 'modal' }} />
        <Stack.Screen name="invoice/new" options={{ title: 'Tạo hóa đơn', presentation: 'modal' }} />
        <Stack.Screen name="invoice/[id]" options={{ title: 'Hóa đơn' }} />
      </Stack>
    </ThemeProvider>
  );
}
