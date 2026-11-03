import { ScrollView } from 'react-native';
import { Text } from '@/components/Themed';
import { hub, RoomTile } from '@/components/RoomHub';
import { useRental } from '@/context/RentalContext';
export default function Favorites(){const store=useRental();const rooms=store.rooms.filter(r=>store.currentUser?.favorites?.includes(r.id));return <ScrollView contentContainerStyle={hub.page}><Text style={hub.title}>Phòng đã lưu</Text>{rooms.map(r=><RoomTile key={r.id} room={r}/>)}{!rooms.length&&<Text style={hub.subtitle}>Nhấn biểu tượng trái tim trên phòng bạn thích để lưu tại đây.</Text>}</ScrollView>;}
