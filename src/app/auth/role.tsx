import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { PrimaryButton } from '@/components/ui';
import { hub } from '@/components/RoomHub';
export default function Role(){const [role,setRole]=useState('tenant');return <ScrollView contentContainerStyle={[hub.page,{flexGrow:1,justifyContent:'center',gap:32}]}><Text style={hub.title}>Bạn là ai?</Text><Text style={hub.subtitle}>Chọn vai trò để bắt đầu cùng TroHome.</Text><View style={hub.row}>{[{id:'tenant',title:'Tôi là người thuê',body:'Tìm và thuê phòng trọ phù hợp',icon:'⌕'},{id:'host',title:'Tôi là chủ trọ',body:'Quản lý phòng và đăng cho thuê',icon:'⌂'}].map(r=><Pressable key={r.id} accessibilityRole="radio" accessibilityState={{checked:role===r.id}} onPress={()=>setRole(r.id)} style={{flex:1,borderWidth:1,borderColor:role===r.id?'#0060DF':'#DCE5F3',borderRadius:16,padding:18,gap:16,backgroundColor:role===r.id?'#EAF3FF':'#FFFFFF'}}><Text style={{fontSize:64,color:'#0060DF',textAlign:'center'}}>{r.icon}</Text><Text style={{fontWeight:'700',color:'#152238'}}>{r.title}</Text><Text style={hub.subtitle}>{r.body}</Text></Pressable>)}</View><PrimaryButton title="Tiếp tục" onPress={()=>router.push({pathname:'/auth/register',params:{role}})}/></ScrollView>;}
