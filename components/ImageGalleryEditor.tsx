import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemeColor } from '@/components/Themed';
import { useRental } from '@/context/RentalContext';
import { pickImagesFromLibrary } from '@/lib/images';

// Thành phần quản lý ảnh phòng: chọn ảnh từ thư viện thiết bị và xoá ảnh khỏi danh sách.
export function ImageGalleryEditor({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const store = useRental();
  const canEdit = store.currentUser?.role === 'host' && store.userRole === 'host';
  const [busy, setBusy] = useState(false);
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const danger = useThemeColor({}, 'danger');

  const handleAdd = useCallback(async () => {
    if (!canEdit || busy) return;
    setBusy(true);
    try {
      const picked = await pickImagesFromLibrary();
      if (picked.length) onChange([...new Set([...images, ...picked])]);
    } catch {
      Alert.alert('Không thể chọn ảnh', 'Vui lòng thử lại hoặc kiểm tra quyền truy cập ảnh.');
    } finally {
      setBusy(false);
    }
  }, [images, onChange, canEdit, busy]);

  const handleRemove = useCallback(
    (index: number) => {
      Alert.alert('Xoá ảnh?', 'Ảnh này sẽ bị xoá khỏi phòng.', [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Xoá', style: 'destructive', onPress: () => onChange(images.filter((_, i) => i !== index)) },
      ]);
    },
    [images, onChange]
  );

  if (!canEdit) return null;

  return (
    <View style={styles.container}>
      {images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
          {images.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
              <Pressable
                onPress={() => handleRemove(index)}
                style={[styles.remove, { backgroundColor: danger }]}
                hitSlop={8}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={{ color: muted, fontSize: 13 }}>Chưa có ảnh nào cho phòng này.</Text>
      )}

      <Pressable accessibilityRole="button" accessibilityLabel="Thêm ảnh phòng từ thư viện" disabled={busy} onPress={handleAdd} style={[styles.addButton, { backgroundColor: card, borderColor: border }]}>
        <Text style={{ color: muted, fontSize: 40 }}>+</Text>
        <Text style={{ color: muted, fontWeight: '600' }}>{busy ? 'Đang chọn ảnh…' : 'Thêm ảnh'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  gallery: {
    gap: 8,
    paddingVertical: 4,
  },
  thumbWrap: {
    width: 140,
    height: 100,
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  addButton: {
    width: 140,
    minHeight: 110,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
