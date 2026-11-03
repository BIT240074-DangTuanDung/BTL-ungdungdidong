import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { hub, MenuRow } from '@/components/RoomHub';
import { useRental } from '@/context/RentalContext';
export default function Profile() {
 const store = useRental();
 return <ScrollView contentContainerStyle={hub.page}>
  <View style={{alignItems:'center',gap:10,paddingVertical:24}}><Text style={{fontSize:64,color:'#9BAEC8'}}>●</Text><Text style={hub.title}>{store.currentUser?.fullName ?? 'Khách ghé thăm'}</Text><Text style={hub.subtitle}>{store.currentUser?.username ?? 'Đăng nhập để quản lý tài khoản'}</Text><Text style={hub.subtitle}>{store.currentUser?.phone}</Text></View>
  <MenuRow title="Yêu cầu thuê phòng" icon="✉" href="/requests"/>
  <MenuRow title="Phòng đã lưu" icon="♡" href="/favorites"/>
  <MenuRow title="Hợp đồng của tôi" icon="▤" href="/contracts"/>
  <MenuRow title="Hóa đơn & thanh toán" icon="▣" href="/invoices"/>
  <MenuRow title="Chọn vai trò / đăng ký" icon="◎" href="/auth/role"/>
  <MenuRow title={store.currentUser?'Đăng xuất':'Đăng nhập'} icon="↪" onPress={()=>{if(store.currentUser)store.logout();router.replace('/auth/login');}}/>
 </ScrollView>;
}
