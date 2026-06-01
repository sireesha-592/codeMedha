// src/screens/student/LeaderboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

export default function LeaderboardScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myRank, setMyRank]     = useState(null);

  useEffect(() => { fetchLeaderboard(); }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get(`${API}/api/attendance/leaderboard`, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data || [];
      setLeaderboard(data);
      const rank = data.findIndex(u => u._id === user?._id);
      if (rank !== -1) setMyRank(rank + 1);
    } catch (e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const medalColor = ['#FFD700', '#C0C0C0', '#CD7F32'];

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:theme.pageBg }}><ActivityIndicator color={theme.accent} size="large" /></View>;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:theme.pageBg }}>
      <View style={[lb.header, { backgroundColor:theme.sidebarBg, borderBottomColor:theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}><Text style={{ fontSize:20 }}>☰</Text></TouchableOpacity>
        <Text style={[lb.headerTitle, { color:theme.textPrimary }]}>🏆 Leaderboard</Text>
        <View style={{ width:32 }} />
      </View>
      {myRank && (
        <View style={[lb.myRankBanner, { backgroundColor: theme.accent+'22', borderBottomColor: theme.accent+'44' }]}>
          <Text style={[{ color:theme.accent, fontWeight:'700', fontSize:14 }]}>Your Rank: #{myRank}</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={{ padding:16, gap:10, paddingBottom:32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLeaderboard(); }} tintColor={theme.accent} />}
      >
        {leaderboard.map((entry, i) => {
          const isMe = entry._id === user?._id;
          return (
            <View key={entry._id || i} style={[lb.row, { backgroundColor: isMe ? theme.accent+'15' : theme.cardBg, borderColor: isMe ? theme.accent : theme.border }]}>
              <Text style={[lb.rank, { color: i < 3 ? medalColor[i] : theme.textMuted }]}>
                {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
              </Text>
              <View style={[lb.avatar, { backgroundColor: theme.accentPurple }]}>
                <Text style={lb.avatarText}>{(entry.name || 'U')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={[{ color:theme.textPrimary, fontWeight:'600', fontSize:14 }]}>{entry.name} {isMe ? '(You)' : ''}</Text>
                <Text style={[{ color:theme.textMuted, fontSize:11, marginTop:1 }]}>{entry.present || 0} days present</Text>
              </View>
              <Text style={[lb.pct, { color: i < 3 ? medalColor[i] : theme.accent }]}>{Math.round(entry.attendancePercentage || 0)}%</Text>
            </View>
          );
        })}
        {leaderboard.length === 0 && <Text style={[{ color:theme.textMuted, textAlign:'center', marginTop:40 }]}>No data yet</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}
const lb = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle: { fontSize:17, fontWeight:'700' },
  myRankBanner: { padding:10, alignItems:'center', borderBottomWidth:1 },
  row: { flexDirection:'row', alignItems:'center', gap:12, padding:14, borderRadius:14, borderWidth:1.5 },
  rank: { width:36, textAlign:'center', fontSize:16, fontWeight:'700' },
  avatar: { width:38, height:38, borderRadius:19, alignItems:'center', justifyContent:'center' },
  avatarText: { color:'#fff', fontWeight:'700', fontSize:15 },
  pct: { fontWeight:'800', fontSize:16 },
});
