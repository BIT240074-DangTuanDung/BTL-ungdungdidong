import { router } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/ui';
export default function Welcome(){return <SafeAreaView style={s.page}><View style={s.center}><Text style={s.logo}>⌂</Text><Text style={s.title}>TroHome</Text><Text style={s.subtitle}>Tìm và thuê phòng trọ{ '\n' }dễ dàng, an toàn</Text></View><View style={{gap:12,padding:24,width:'100%',maxWidth:480,alignSelf:'center'}}><PrimaryButton title="Bắt đầu" onPress={()=>router.replace('/auth/login')}/><PrimaryButton title="Khám phá phòng trọ" tone="ghost" onPress={()=>router.replace('/(tabs)')}/></View></SafeAreaView>;}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#0054C8'},center:{flex:1,justifyContent:'center',alignItems:'center',gap:16},logo:{fontSize:110,color:'white'},title:{fontSize:40,fontWeight:'800',color:'white'},subtitle:{fontSize:18,color:'white',textAlign:'center',lineHeight:27}});
