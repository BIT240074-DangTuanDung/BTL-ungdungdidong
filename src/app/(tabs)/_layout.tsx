import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useColorScheme } from '@/components/useColorScheme';
import { useRental } from '@/context/RentalContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { userRole } = useRental();
  const isHost = userRole === 'host';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: { backgroundColor: Colors[colorScheme].card, borderTopColor: Colors[colorScheme].border,  paddingTop: 8 },
        tabBarActiveBackgroundColor: Colors[colorScheme].chip,
        tabBarItemStyle: { borderRadius: 16, marginHorizontal: 3 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800' },
        headerStyle: { backgroundColor: Colors[colorScheme].card },
        headerTintColor: Colors[colorScheme].text,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Phòng trọ',
          href: isHost ? undefined : null,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'door.left.hand.closed', android: 'meeting_room', web: 'meeting_room' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Tìm kiếm',
          href: isHost ? null : undefined,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          href: isHost || userRole === 'tenant' ? undefined : null,
          title: 'Hóa đơn',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen name="favorites" options={{ title: "Yêu thích", href: isHost ? null : undefined, tabBarIcon: ({color}) => <SymbolView name={{ios:"heart",android:"favorite",web:"favorite"}} tintColor={color} size={24}/> }} />
      <Tabs.Screen name="profile" options={{ title: "Cá nhân", tabBarIcon: ({color}) => <SymbolView name={{ios:"person",android:"person",web:"person"}} tintColor={color} size={24}/> }} />
      <Tabs.Screen
        name="tenants"
        options={{
          href: null,
          title: 'Khách thuê',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
    </Tabs>
  );
}
