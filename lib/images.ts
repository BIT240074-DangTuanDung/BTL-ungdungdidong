import * as ImagePicker from 'expo-image-picker';

// Mở thư viện ảnh của thiết bị và trả về danh sách URI ảnh người dùng đã chọn.
export async function pickImagesFromLibrary(): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 10,
    quality: 0.7,
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.map((asset) => asset.uri);
}
