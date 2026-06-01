import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

const medal = (rank) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '#' + rank;
};

export default function LeaderboardScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const [data,      setData]      = useState([]);
  const [myId,      setMyId]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [filter,    setFilter]    = useState('score');

  useEffect(() => { fetchLeaderboard(); }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get(API + '/api/submissions/leaderboard', {
        headers: { Authorization: 'Bearer ' + token },
      });
      setData(res.data.leaderboard || []);
      setMyId(res.data.myId);
    } catch(e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  // Debug: log first item to see field names
  const sorted = [...data].sort((a, b) => {
    if (filter === 'attendance') return b.attPct - a.attPct || b.totalScore - a.totalScore;
    if (filter === 'composite')  return b.composite - a.composite;
    return b.totalScore - a.totalScore || b.attPct - a.attPct;
  });

  const myRank = sorted.findIndex(s => s.userId === myId) + 1;
  const me = sorted.find(s => s.userId === myId);

  const FILTERS = [
    { key:'score',      label:'📝 By Score' },
    { key:'attendance', label:'📅 Attendance' },
    { key:'composite',  label:'⭐ Overall' },
  ];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>🏆 Leaderboard</Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); fetchLeaderboard(); }}>
          <Text style={{ color: theme.accent, fontSize:18 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLeaderboard(); }} tintColor={theme.accent} />}
        >
          {/* My Rank Card */}
          {me && (
            <View style={[s.myCard, { backgroundColor:'#1a2740', borderColor:'#7c6af555' }]}>
              <Text style={{ fontSize:42 }}>{medal(myRank)}</Text>
              <View style={{ flex:1 }}>
                <Text style={{ color:'#a0b4c8', fontSize:11, fontWeight:'600', marginBottom:2 }}>YOUR RANK</Text>
                <Text style={{ color:'#fff', fontSize:24, fontWeight:'800' }}>
                  #{myRank} <Text style={{ fontSize:14, fontWeight:'500', color:'#a0b4c8' }}>of {sorted.length}</Text>
                </Text>
                <Text style={{ color:'#a0b4c8', fontSize:12, marginTop:2 }}>{me.name}</Text>
              </View>
              <View style={{ gap:8 }}>
                <View style={{ alignItems:'center' }}>
                  <Text style={{ color:'#7c6af5', fontSize:18, fontWeight:'800' }}>{me.totalScore}</Text>
                  <Text style={{ color:'#a0b4c8', fontSize:10 }}>Score</Text>
                </View>
                <View style={{ alignItems:'center' }}>
                  <Text style={{ color:'#00d4aa', fontSize:18, fontWeight:'800' }}>{me.attPct}%</Text>
                  <Text style={{ color:'#a0b4c8', fontSize:10 }}>Attend</Text>
                </View>
              </View>
            </View>
          )}

          {/* Subtitle */}
          <Text style={{ color: theme.textMuted, fontSize:12 }}>Rankings based on assignment scores & attendance</Text>

          {/* Filter Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, flexDirection:'row' }}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={{
                  paddingHorizontal:14, paddingVertical:8, borderRadius:20,
                  backgroundColor: filter === f.key ? theme.accent : theme.cardBg,
                  borderWidth:1, borderColor: filter === f.key ? theme.accent : theme.border,
                }}
                onPress={() => setFilter(f.key)}
              >
                <Text style={{ color: filter === f.key ? '#000' : theme.textMuted, fontSize:13, fontWeight:'600' }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Leaderboard List */}
          <View style={[s.table, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            {/* Column Headers */}
            <View style={[s.tableHeader, { backgroundColor: theme.pageBg, borderBottomColor: theme.border }]}>
              <Text style={[s.colHead, { width:44 }]}>Rank</Text>
              <Text style={[s.colHead, { flex:1 }]}>Student</Text>
              <Text style={[s.colHead, { width:64, textAlign:'center' }]}>Score</Text>
              <Text style={[s.colHead, { width:56, textAlign:'center' }]}>Subs</Text>
              <Text style={[s.colHead, { width:56, textAlign:'center' }]}>Att%</Text>
            </View>

            {sorted.length === 0 ? (
              <View style={{ alignItems:'center', padding:40, gap:8 }}>
                <Text style={{ fontSize:32 }}>🏆</Text>
                <Text style={{ color: theme.textMuted, textAlign:'center' }}>No submissions yet. Be the first!</Text>
              </View>
            ) : sorted.map((item, idx) => {
              const rank  = idx + 1;
              const isMe  = item.userId === myId;
              const isTop = rank <= 3;
              return (
                <View key={item.userId} style={{
                  flexDirection:'row', alignItems:'center',
                  paddingHorizontal:16, paddingVertical:12,
                  borderBottomWidth:1, borderBottomColor: theme.border,
                  backgroundColor: isMe ? '#7c6af515' : 'transparent',
                }}>
                  <Text style={{ width:44, fontSize: isTop ? 20 : 13, fontWeight:'700', color: isTop ? undefined : theme.textMuted, textAlign:'center' }}>
                    {medal(rank)}
                  </Text>
                  <View style={{ flex:1 }}>
                    <Text style={{ color: theme.textPrimary, fontSize:13, fontWeight: isMe ? '700' : '500' }} numberOfLines={1}>
                      {item.name}{isMe ? ' (You)' : ''}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize:11 }}>{item.submitted} submitted</Text>
                  </View>
                  <Text style={{ width:56, color:'#7c6af5', fontWeight:'700', fontSize:14, textAlign:'center' }}>{item.totalScore}</Text>
                  <Text style={{ width:48, color:'#00d4aa', fontWeight:'600', fontSize:13, textAlign:'center' }}>{item.submitted}</Text>
                  <Text style={{ width:52, color: item.attPct >= 75 ? '#1D9E75' : '#f5a623', fontWeight:'600', fontSize:13, textAlign:'center' }}>{item.attPct}%</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle:{ fontSize:17, fontWeight:'700' },
  myCard:     { flexDirection:'row', alignItems:'center', gap:16, padding:20, borderRadius:16, borderWidth:1.5 },
  table:      { borderRadius:16, borderWidth:1, overflow:'hidden' },
  tableHeader:{ flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:10, borderBottomWidth:1 },
  colHead:    { fontSize:11, fontWeight:'700', color:'#64748b', textTransform:'uppercase', letterSpacing:0.5 },
  tableRow:   { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
});
