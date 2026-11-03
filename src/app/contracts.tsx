import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Card, PrimaryButton } from '@/components/ui';
import { hub } from '@/components/RoomHub';
import { useRental } from '@/context/RentalContext';
import { formatVnd } from '@/lib/format';
export default function Contracts(){const store=useRental();const [active,setActive]=useState(true);const host=store.userRole==='host';const list=store.contracts.filter(c=>(host||c.tenantId===store.currentTenantId)&&c.active===active);return <ScrollView contentContainerStyle={hub.page}><View style={hub.row}>{[true,false].map(v=><Pressable key={String(v)} onPress={()=>setActive(v)} style={{flex:1,padding:14,borderRadius:10,backgroundColor:active===v?'#0060DF':'#EAF3FF'}}><Text style={{textAlign:'center',color:active===v?'white':'#0060DF'}}>{v?'Đang có hiệu lực':'Đã kết thúc'}</Text></Pressable>)}</View>{list.map(c=><Card key={c.id}><Text style={hub.section}>HĐ · Phòng {store.roomById(c.roomId)?.code}</Text><Text>Người thuê: {store.tenantById(c.tenantId)?.fullName}</Text><Text style={hub.subtitle}>{c.startDate} → {c.endDate??'Không xác định'}</Text><Text style={hub.price}>{formatVnd(c.monthlyRent)}/tháng</Text></Card>)}{!list.length&&<Text style={hub.subtitle}>Chưa có hợp đồng trong mục này.</Text>}{host&&<PrimaryButton title="+ Lập hợp đồng" onPress={()=>router.push('/rooms')}/>}</ScrollView>;}
