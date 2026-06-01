import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert, Switch, Linking, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { API_BASE as API } from '../../api';

const TYPE_ICONS  = { link:'🔗', video:'🎥', pdf:'📄', doc:'📝', github:'🐙', tool:'🛠️' };
const TYPE_COLORS = { link:'#3b82f6', video:'#a78bfa', pdf:'#ef4444', doc:'#10b981', github:'#24292e', tool:'#f59e0b' };

export default function TrainerResourcesScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const headers = { Authorization: `Bearer ${token}` };
  const courseId = user?.enrolledCourse || user?.courseId || '';

  const [resources,  setResources]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [title,      setTitle]      = useState('');
  const [url,        setUrl]        = useState('');
  const [type,       setType]       = useState('link');
  const [desc,       setDesc]       = useState('');
  const [shared,     setShared]     = useState(false);
  const [showForm,   setShowForm]   = useState(true);

  const load = useCallback(async () => {
    try {
      const params = courseId ? `?courseId=${courseId}` : '';
      const res = await api.get(`${API}/api/resources${params}`, { headers });
      setResources(res.data || []);
    } catch(e) {}
    setLoading(false);
    setRefreshing(false);
  }, [courseId, token]);

  useEffect(() => { load(); }, [load]);

  const addResource = async () => {
    if (!title.trim() || !url.trim()) return Alert.alert('⚠️', 'Title and URL required');
    setSaving(true);
    try {
      const res = await api.post(`${API}/api/resources`, { title: title.trim(), url: url.trim(), type, desc: desc.trim(), sharedWithStudents: shared, courseId }, { headers });
      setResources(prev => [res.data, ...prev]);
      setTitle(''); setUrl(''); setDesc(''); setShared(false); setType('link');
      Alert.alert('✅', 'Resource added!');
    } catch(e) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    setSaving(false);
  };

  const toggleShare = async (r) => {
    try {
      const res = await api.patch(`${API}/api/resources/${r._id}`, { sharedWithStudents: !r.sharedWithStudents }, { headers });
      setResources(prev => prev.map(x => x._id === r._id ? res.data : x));
    } catch(e) { Alert.alert('Error', 'Failed to update'); }
  };

  const deleteRes = (id) => {
    Alert.alert('Delete', 'Delete this resource?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`${API}/api/resources/${id}`, { headers });
          setResources(prev => prev.filter(r => r._id !== id));
        } catch(e) { Alert.alert('Error', 'Delete failed'); }
      }}
    ]);
  };

  const TYPES = Object.keys(TYPE_ICONS);

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.pageBg }}>
      <View style={[s.header, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Text style={{ fontSize:20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>📎 Resources</Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); load(); }}>
          <Text style={{ color: theme.accent, fontSize:18 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.accent} />}
      >
        {/* Add Form Toggle */}
        <TouchableOpacity style={[s.formToggle, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => setShowForm(v => !v)}>
          <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'700' }}>➕ Add Resource</Text>
          <Text style={{ color: theme.textMuted }}>{showForm ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {/* Form */}
        {showForm && (
          <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <TextInput style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="Title (e.g. React Docs)" placeholderTextColor={theme.textMuted}
              value={title} onChangeText={setTitle} />
            <TextInput style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="URL / Link" placeholderTextColor={theme.textMuted}
              value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" />
            <TextInput style={[s.input, { backgroundColor: theme.pageBg, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="Short description (optional)" placeholderTextColor={theme.textMuted}
              value={desc} onChangeText={setDesc} />

            {/* Type selector */}
            <Text style={{ color: theme.textMuted, fontSize:12, marginBottom:8 }}>Type:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, flexDirection:'row', marginBottom:12 }}>
              {TYPES.map(t => (
                <TouchableOpacity key={t} style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:8, backgroundColor: type === t ? (TYPE_COLORS[t] || '#7c6af5') : theme.pageBg, borderWidth:1, borderColor: type === t ? (TYPE_COLORS[t] || '#7c6af5') : theme.border }} onPress={() => setType(t)}>
                  <Text style={{ color: type === t ? '#fff' : theme.textMuted, fontSize:12, fontWeight:'600' }}>{TYPE_ICONS[t]} {t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <Text style={{ color: theme.textPrimary, fontSize:13 }}>👁️ Share with students</Text>
              <Switch value={shared} onValueChange={setShared} trackColor={{ true:'#10b981', false: theme.border }} />
            </View>

            <TouchableOpacity style={[s.btn, { backgroundColor: saving ? '#64748b' : '#3b82f6' }]} onPress={addResource} disabled={saving}>
              <Text style={{ color:'#fff', fontWeight:'700' }}>{saving ? '💾 Saving…' : '➕ Add Resource'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Resources List */}
        {loading ? <ActivityIndicator color={theme.accent} style={{ padding:20 }} /> :
        resources.length === 0 ? (
          <View style={{ alignItems:'center', padding:40, gap:8 }}>
            <Text style={{ fontSize:32 }}>📭</Text>
            <Text style={{ color: theme.textMuted }}>No resources yet</Text>
          </View>
        ) : resources.map(r => {
          const color = TYPE_COLORS[r.type] || '#64748b';
          return (
            <View key={r._id} style={[s.resourceCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={{ height:3, backgroundColor: r.sharedWithStudents ? '#10b981' : '#8e44ad', borderRadius:3 }} />
              <View style={{ padding:14 }}>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <Text style={{ fontSize:22 }}>{TYPE_ICONS[r.type] || '📎'}</Text>
                  <Text style={{ color: r.sharedWithStudents ? '#10b981' : '#64748b', fontSize:11, fontWeight:'700' }}>
                    {r.sharedWithStudents ? '👁️ Shared' : '🔒 Private'}
                  </Text>
                </View>
                <Text style={{ color: theme.textPrimary, fontSize:14, fontWeight:'700', marginBottom:4 }}>{r.title}</Text>
                {(r.desc || r.description) && <Text style={{ color: theme.textMuted, fontSize:12, marginBottom:8, lineHeight:18 }}>{r.desc || r.description}</Text>}
                <TouchableOpacity onPress={() => Linking.openURL(r.url)} style={{ marginBottom:10 }}>
                  <Text style={{ color:'#3b82f6', fontSize:12 }} numberOfLines={1}>{r.url}</Text>
                </TouchableOpacity>
                <View style={{ flexDirection:'row', gap:8 }}>
                  <TouchableOpacity style={[s.smallBtn, { backgroundColor: r.sharedWithStudents ? '#10b981' : '#8e44ad', flex:1 }]} onPress={() => toggleShare(r)}>
                    <Text style={{ color:'#fff', fontSize:12, fontWeight:'700' }}>{r.sharedWithStudents ? '🔒 Make Private' : '👁️ Share'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.smallBtn, { backgroundColor:'#ef4444' }]} onPress={() => deleteRes(r._id)}>
                    <Text style={{ color:'#fff', fontSize:12 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1 },
  headerTitle: { fontSize:17, fontWeight:'700' },
  formToggle:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:14, borderRadius:14, borderWidth:1 },
  card:        { borderRadius:14, padding:16, borderWidth:1 },
  input:       { borderWidth:1, borderRadius:10, padding:12, fontSize:13, marginBottom:10 },
  btn:         { borderRadius:10, padding:12, alignItems:'center' },
  resourceCard:{ borderRadius:12, borderWidth:1, overflow:'hidden' },
  smallBtn:    { borderRadius:8, paddingHorizontal:12, paddingVertical:8, alignItems:'center' },
});
