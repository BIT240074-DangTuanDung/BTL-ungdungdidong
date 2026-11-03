import { useState } from 'react';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Card, PrimaryButton } from '@/components/ui';
import { hub } from '@/components/RoomHub';
import { useRental } from '@/context/RentalContext';
export default function Notifications(){
 const [now]=useState(()=>Date.now());
 const store=useRental(); const host=store.userRole==='host';
 const invoices=store.invoices.filter(i=>i.status!=='paid'&&(host||!!store.currentTenantId&&i.tenantId===store.currentTenantId));
 const requests=store.inquiries.filter(i=>host?i.status==='new':!!store.currentUser&&i.userId===store.currentUser.id&&['accepted','rejected'].includes(i.status));
 const contracts=store.contracts.filter(c=>c.active&&c.endDate&&(host||!!store.currentTenantId&&c.tenantId===store.currentTenantId)&&Date.parse(c.endDate)-now<=30*86400000);
 return <ScrollView contentContainerStyle={hub.page}><Text style={hub.title}>Nhắc việc</Text><Text style={hub.subtitle}>Các việc cần chú ý từ dữ liệu hiện tại.</Text>{!invoices.length&&!requests.length&&!contracts.length&&<Text>Không có việc cần xử lý.</Text>}{requests.map(i=><Card key={i.id}><Text style={hub.section}>{host?'Yêu cầu thuê mới':i.status==='accepted'?'Yêu cầu được chấp nhận':'Yêu cầu đã bị từ chối'}</Text><Text>Phòng {store.roomById(i.roomId)?.code}</Text><PrimaryButton title="Xem yêu cầu" tone="ghost" onPress={()=>router.push('/requests')}/></Card>)}{invoices.map(i=><Card key={i.id}><Text style={hub.section}>Hóa đơn chưa thanh toán</Text><Text>Phòng {store.roomById(i.roomId)?.code} · {i.period}</Text><PrimaryButton title="Xem hóa đơn" tone="ghost" onPress={()=>router.push({pathname:'/invoice/[id]',params:{id:i.id}})}/></Card>)}{contracts.map(c=><Card key={c.id}><Text style={hub.section}>Hợp đồng đến hạn</Text><Text>Phòng {store.roomById(c.roomId)?.code} · {c.endDate}</Text><PrimaryButton title="Xem hợp đồng" tone="ghost" onPress={()=>router.push('/contracts')}/></Card>)}</ScrollView>;
}
