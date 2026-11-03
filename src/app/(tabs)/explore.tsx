import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { Card, StatusBadge } from '@/components/ui';
import { useRental } from '@/context/RentalContext';
import { formatVnd } from '@/lib/format';

export default function ExploreScreen() {
  const store = useRental();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    occupants: '',
    onlyFavorites: false,
  });

  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');

  const listings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.rooms.filter((room) => {
      if (!room.listed || room.status !== 'vacant') return false;
      
      // Filter by search query
      if (q && !(
        room.code.toLowerCase().includes(q) ||
        (store.properties.find(p=>p.id===room.propertyId)?.address.toLowerCase().includes(q) ?? false) ||
        room.description.toLowerCase().includes(q) ||
        room.amenities.some((item) => item.toLowerCase().includes(q))
      )) return false;

      // Filter by price
      if (filters.minPrice && room.price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && room.price > Number(filters.maxPrice)) return false;

      // Filter by area
      if (filters.minArea && room.area < Number(filters.minArea)) return false;
      if (filters.maxArea && room.area > Number(filters.maxArea)) return false;

      // Filter by occupants
      if (filters.occupants && room.maxOccupants < Number(filters.occupants)) return false;

      // Filter by favorites
      if (filters.onlyFavorites && !store.currentUser?.favorites?.includes(room.id)) return false;

      return true;
    });
  }, [query, store.rooms, store.properties, filters, store.currentUser?.favorites]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Phòng đang cho thuê</Text>
      <Text style={{ color: muted }}>{store.property?.address}</Text>
      <View style={{ flexDirection: 'row', gap: 8, backgroundColor: 'transparent' }}>
        <TextInput
          placeholder="Tìm theo mã phòng, tiện nghi..."
          placeholderTextColor={muted}
          value={query}
          onChangeText={setQuery}
          style={[styles.search, { flex: 1, backgroundColor: card, borderColor: border, color: text }]}
        />
        <Pressable
          onPress={() => setShowFilters(!showFilters)}
          style={[styles.filterBtn, { backgroundColor: showFilters ? tint : card, borderColor: border }]}>
          <SymbolView
            name={{ ios: 'line.3.horizontal.decrease.circle', android: 'filter_list', web: 'filter_list' }}
            tintColor={showFilters ? '#fff' : text}
            size={24}
          />
        </Pressable>
      </View>

      {showFilters && (
        <Card style={styles.filterBox}>
          <View style={styles.filterRow}>
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <Text style={styles.label}>Giá tối thiểu</Text>
              <TextInput
                value={filters.minPrice}
                onChangeText={(v) => setFilters((f) => ({ ...f, minPrice: v }))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={muted}
                style={[styles.filterInput, { backgroundColor: card, borderColor: border, color: text }]}
              />
            </View>
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <Text style={styles.label}>Giá tối đa</Text>
              <TextInput
                value={filters.maxPrice}
                onChangeText={(v) => setFilters((f) => ({ ...f, maxPrice: v }))}
                keyboardType="number-pad"
                placeholder="10tr"
                placeholderTextColor={muted}
                style={[styles.filterInput, { backgroundColor: card, borderColor: border, color: text }]}
              />
            </View>
          </View>
          <View style={styles.filterRow}>
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <Text style={styles.label}>Diện tích từ (m²)</Text>
              <TextInput
                value={filters.minArea}
                onChangeText={(v) => setFilters((f) => ({ ...f, minArea: v }))}
                keyboardType="number-pad"
                placeholder="15"
                placeholderTextColor={muted}
                style={[styles.filterInput, { backgroundColor: card, borderColor: border, color: text }]}
              />
            </View>
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <Text style={styles.label}>Số người ở tối đa</Text>
              <TextInput
                value={filters.occupants}
                onChangeText={(v) => setFilters((f) => ({ ...f, occupants: v }))}
                keyboardType="number-pad"
                placeholder="2"
                placeholderTextColor={muted}
                style={[styles.filterInput, { backgroundColor: card, borderColor: border, color: text }]}
              />
            </View>
          </View>
          {store.currentUser && (
            <Pressable
              onPress={() => setFilters((f) => ({ ...f, onlyFavorites: !f.onlyFavorites }))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'transparent' }}>
              <SymbolView
                name={{
                  ios: filters.onlyFavorites ? 'heart.fill' : 'heart',
                  android: filters.onlyFavorites ? 'favorite' : 'favorite_border',
                  web: filters.onlyFavorites ? 'favorite' : 'favorite_border',
                }}
                tintColor={filters.onlyFavorites ? '#ff4d4f' : muted}
                size={20}
              />
              <Text style={{ fontWeight: '600' }}>Chỉ hiện phòng yêu thích</Text>
            </Pressable>
          )}
          <Pressable
              onPress={() => setFilters({ minPrice: '', maxPrice: '', minArea: '', maxArea: '', occupants: '', onlyFavorites: false })}
              style={{ alignSelf: 'flex-end', backgroundColor: 'transparent' }}>
              <Text style={{ color: tint, fontWeight: '600' }}>Xoá bộ lọc</Text>
            </Pressable>
        </Card>
      )}
      {listings.map((room) => (
        <Pressable key={room.id} onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}>
          <Card>
            {room.images?.[0] ? (
              <Image source={{ uri: room.images[0] }} style={styles.thumb} resizeMode="cover" />
            ) : null}
            <View style={styles.head}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'transparent' }}>
                <Text style={styles.code}>{room.code}</Text>
                {store.currentUser?.favorites?.includes(room.id) && (
                  <SymbolView
                    name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
                    tintColor="#ff4d4f"
                    size={18}
                  />
                )}
              </View>
              <StatusBadge kind="room" status={room.status} />
            </View>
            <Text style={styles.price}>{formatVnd(room.price)}/tháng</Text>
            <Text style={{ color: muted }}>
              {room.area} m² · Cọc {formatVnd(room.deposit)}
            </Text>
            <Text>{room.description}</Text>
            <Text style={{ color: muted }}>{room.amenities.join(' · ')}</Text>
          </Card>
        </Pressable>
      ))}
      {listings.length === 0 ? (
        <Text style={{ color: muted }}>Không còn phòng trống đang đăng tin.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBox: {
    gap: 12,
    padding: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
  },
  thumb: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  code: {
    fontSize: 18,
    fontWeight: '800',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
});
