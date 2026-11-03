import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Card } from '@/components/ui';
import { hub, MenuRow, RoomTile } from '@/components/RoomHub';
import { useRental } from '@/context/RentalContext';

export default function Home() {
  const store = useRental();
  const [cheap, setCheap] = useState(false);
  const host = store.userRole === 'host';
  const rooms = store.rooms.filter(r => r.listed && r.status === 'vacant' && (!cheap || r.price < 3000000));
  return <ScrollView contentContainerStyle={hub.page}>
    <View style={hub.row}><View style={{ gap: 5 }}><Text style={hub.title}>Xin chào, {store.currentUser?.fullName ?? 'bạn'} 👋</Text><Text style={hub.subtitle}>{host ? 'Chủ nhà · TroHome' : 'Tìm một nơi bạn gọi là nhà'}</Text></View><Pressable accessibilityLabel="Cá nhân" onPress={() => router.push('/profile')}><Text style={{ fontSize: 30, color: '#0060DF' }}>◎</Text></Pressable></View>
    <MenuRow title="Thông báo & nhắc việc" icon="♧" href="/notifications" />
    <MenuRow title="Yêu cầu thuê phòng" icon="✉" href="/requests" />
    {host ? <>
      <View style={hub.row}>{[{label:'Tổng phòng',value:store.rooms.length,color:'#EAF3FF'}, {label:'Đang thuê',value:store.rooms.filter(r=>r.status==='occupied').length,color:'#E8F8F1'}, {label:'Còn trống',value:store.rooms.filter(r=>r.status==='vacant').length,color:'#FFF0F2'}].map(s=><Card key={s.label} style={{flex:1,backgroundColor:s.color,borderColor:s.color,alignItems:'center',paddingHorizontal:4}}><Text style={hub.price}>{s.value}</Text><Text style={{color:'#26354B',fontSize:12}}>{s.label}</Text></Card>)}</View>
      <MenuRow title="Quản lý phòng trọ" icon="⌂" href="/rooms" />
      <MenuRow title="Hợp đồng thuê" icon="▤" href="/contracts" />
      <MenuRow title="Hóa đơn & thanh toán" icon="▣" href="/invoices" />
      <MenuRow title="Thống kê doanh thu" icon="▥" href="/revenue" />
      <MenuRow title="Quản lý khách thuê" icon="♙" href="/tenants" />
    </> : <>
      <MenuRow title="Tìm phòng trọ, khu vực..." icon="⌕" href="/explore" />
      <View style={hub.row}>{['Tất cả','Dưới 3 triệu','Đã lưu'].map((label,i)=><Pressable accessibilityRole="button" key={label} onPress={()=>i===2?router.push('/favorites'):setCheap(i===1)} style={{padding:14,borderRadius:12,backgroundColor:(i===1?cheap:i===0&&!cheap)?'#0060DF':'#EAF3FF'}}><Text style={{color:(i===1?cheap:i===0&&!cheap)?'#FFFFFF':'#0060DF',fontWeight:'600'}}>{label}</Text></Pressable>)}</View>
      <View style={hub.row}><Text style={hub.section}>Phòng trọ nổi bật</Text><Pressable onPress={()=>router.push('/explore')}><Text style={{color:'#0060DF'}}>Xem tất cả</Text></Pressable></View>
      {rooms.slice(0,8).map(room=><RoomTile key={room.id} room={room}/>)}
      {!rooms.length && <Text style={hub.subtitle}>Chưa có phòng phù hợp. Hãy thử tìm kiếm khác.</Text>}
    </>}
  </ScrollView>;
}
