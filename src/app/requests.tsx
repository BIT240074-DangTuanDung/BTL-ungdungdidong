import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { Text } from '@/components/Themed';
import { Card, PrimaryButton } from '@/components/ui';
import { hub } from '@/components/RoomHub';
import { useRental } from '@/context/RentalContext';
import { formatDate } from '@/lib/format';
import type { InquiryStatus } from '@/lib/types';
const labels: Record<InquiryStatus,string>={new:'Chờ xử lý',contacted:'Đã liên hệ',accepted:'Đã chấp nhận',rejected:'Đã từ chối',cancelled:'Đã hủy'};
export default function Requests(){
 const store=useRental(); const host=store.userRole==='host';
 const requests=store.inquiries.filter(i=>host||i.userId===store.currentUser?.id && !!store.currentUser);
 return <ScrollView contentContainerStyle={hub.page}><Text style={hub.title}>{host?'Quản lý yêu cầu thuê':'Yêu cầu của tôi'}</Text><Text style={hub.subtitle}>Yêu cầu được chủ trọ xét duyệt trước khi hai bên lập hợp đồng.</Text>
 {!store.currentUser&&<PrimaryButton title="Đăng nhập" onPress={()=>router.push('/auth/login')}/>}
 {!requests.length&&<Card><Text>Chưa có yêu cầu thuê.</Text><PrimaryButton title="Tìm phòng phù hợp" tone="ghost" onPress={()=>router.push('/explore')}/></Card>}
 {requests.map(i=><Card key={i.id}><Text style={hub.section}>Phòng {store.roomById(i.roomId)?.code}</Text><Text style={hub.price}>{labels[i.status]}</Text><Text>{i.name} · {i.phone}</Text><Text style={hub.subtitle}>{i.message}</Text><Text style={hub.subtitle}>{formatDate(i.createdAt)}</Text>
 {['new','contacted'].includes(i.status)&&(host?<><PrimaryButton title="Chấp nhận & giữ phòng" disabled={store.roomById(i.roomId)?.status!=='vacant'} onPress={()=>store.resolveInquiry(i.id,'accepted')}/><PrimaryButton title="Từ chối" tone="ghost" onPress={()=>store.resolveInquiry(i.id,'rejected')}/></>:<PrimaryButton title="Hủy yêu cầu" tone="ghost" onPress={()=>store.resolveInquiry(i.id,'cancelled')}/>)}
 {host&&i.status==='accepted'&&!store.activeContractForRoom(i.roomId)&&<PrimaryButton title="Lập hợp đồng" onPress={()=>router.push({pathname:'/contract/new',params:{roomId:i.roomId,tenantId:i.userId ? `tenant_${i.userId}` : undefined}})}/>}
 </Card>)}
 </ScrollView>;
}
