import { router, type Href } from 'expo-router';
import { Image, Pressable, StyleSheet } from 'react-native';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Card } from '@/components/ui';
import { useRental } from '@/context/RentalContext';
import { formatVnd } from '@/lib/format';
import type { Room } from '@/lib/types';

export const hub = StyleSheet.create({
  page: { padding: 20, gap: 18, paddingBottom: 36, width: '100%', maxWidth: 720, alignSelf: 'center' },
  title: { fontSize: 23, fontWeight: '700' },
  subtitle: { fontSize: 13, color: '#67758F', lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: 'transparent' },
  section: { fontSize: 18, fontWeight: '700' },
  price: { color: '#0060DF', fontSize: 17, fontWeight: '700' },
});

export function MenuRow({ title, icon, href, onPress }: {title: string; icon: string; href?: Href; onPress?: () => void}) {
  return <Pressable accessibilityRole="button" onPress={onPress ?? (() => href && router.push(href))}>
    <Card style={{ padding: 16, borderRadius: 13 }}><View style={hub.row}><Text style={{ color: '#0060DF', fontSize: 24 }}>{icon}</Text><Text style={{ flex: 1, fontWeight: '600' }}>{title}</Text><Text style={hub.subtitle}>›</Text></View></Card>
  </Pressable>;
}

export function RoomTile({ room }: { room: Room }) {
  const store = useRental();
  const chip = useThemeColor({}, 'chip');
  const saved = store.currentUser?.favorites?.includes(room.id);
  return <Card style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem phòng ${room.code}`} onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}>
      {room.images[0] ? <Image source={{ uri: room.images[0] }} style={{ width: '100%', height: 195 }} resizeMode="cover" /> : <View style={{ height: 170, backgroundColor: chip, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 52, color: '#0060DF' }}>⌂</Text><Text style={hub.subtitle}>Phòng {room.code}</Text></View>}
      <View style={{ padding: 14, gap: 8 }}><Text style={hub.section}>Phòng {room.code}</Text><Text style={hub.subtitle}>⌖ {store.property?.address}</Text><View style={hub.row}><Text style={hub.price}>{formatVnd(room.price)}/tháng</Text><Text style={hub.subtitle}>{room.area} m²</Text></View></View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Bỏ lưu phòng' : 'Lưu phòng'} onPress={() => store.currentUser ? store.toggleFavorite(room.id) : router.push('/auth/login')} style={{ position: 'absolute', right: 12, top: 12, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 10 }}><Text style={{ color: '#0060DF', fontSize: 22 }}>{saved ? '♥' : '♡'}</Text></Pressable>
  </Card>;
}
