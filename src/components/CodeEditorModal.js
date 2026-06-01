import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  SafeAreaView, ActivityIndicator, Alert, ScrollView,TextInput,
} from 'react-native';
import { WebView } from 'react-native-webview';
import api, { API_BASE as API } from '../api';

const TABS = ['html', 'css', 'javascript', 'react'];
const TAB_META = {
  html:       { label: 'HTML',        icon: '🌐', color: '#e44d26' },
  css:        { label: 'CSS',         icon: '🎨', color: '#264de4' },
  javascript: { label: 'JS',          icon: '⚡', color: '#f7df1e' },
  react:      { label: 'React',       icon: '⚛️', color: '#61dafb' },
};
const STARTER = {
  html: '<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"></head>\n<body>\n\n<!-- Write HTML here -->\n\n</body>\n</html>',
  css:  '/* Write CSS here */\n\nbody {\n  font-family: sans-serif;\n  margin: 0;\n  padding: 20px;\n}\n',
  javascript: '// Write JavaScript here\n\nconsole.log("Hello World!");\n',
  react: '// Write React here\nfunction Answer() {\n  return <div><h1>My Answer</h1></div>;\n}\n',
};

function buildEditorHTML(code, isReadOnly) {
  const escaped = (code || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const readonlyAttr = isReadOnly === true ? 'readonly' : '';

  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">',
    '<style>',
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { background:#1e1e2e; height:100vh; overflow:hidden; }',
    '#editor {',
    '  width:100%; height:100vh;',
    '  padding:14px 16px;',
    '  font-size:14px; line-height:1.7;',
    '  font-family: monospace;',
    '  background:#1e1e2e; color:#cdd6f4;',
    '  border:none; outline:none; resize:none;',
    '  overflow:auto; tab-size:2;',
    '}',
    '</style>',
    '</head>',
    '<body>',
    '<textarea id="editor" spellcheck="false" ' + readonlyAttr + '>' + escaped + '</textarea>',
    '<script>',
    'var ta = document.getElementById("editor");',
    'ta.addEventListener("input", function() {',
    '  window.ReactNativeWebView.postMessage(JSON.stringify({ type:"change", value: ta.value }));',
    '});',
    'ta.addEventListener("keydown", function(e) {',
    '  if (e.key === "Tab") {',
    '    e.preventDefault();',
    '    var s = ta.selectionStart, en = ta.selectionEnd;',
    '    ta.value = ta.value.substring(0,s) + "  " + ta.value.substring(en);',
    '    ta.selectionStart = ta.selectionEnd = s + 2;',
    '    window.ReactNativeWebView.postMessage(JSON.stringify({ type:"change", value: ta.value }));',
    '  }',
    '});',
    '<\/script>',
    '</body>',
    '</html>',
  ].join('\n');
}

function buildPreviewHTML(html, css, js) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + 
    (css || '') + 
    '</style></head><body>' + 
    (html || '<p>Write HTML in the HTML tab</p>') + 
    '</body></html>';
}

export default function CodeEditorModal({ visible, question, date, courseId, token, isReadOnly, onClose }) {
  const [activeTab,  setActiveTab]  = useState('javascript');
  const [code,       setCode]       = useState({ ...STARTER });
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted,setIsSubmitted]= useState(false);
  const [loading,    setLoading]    = useState(true);
  const [showPreview,setShowPreview]= useState(false);
  const [running,    setRunning]    = useState(false);
  const [output,     setOutput]     = useState('');
  const [outputErr,  setOutputErr]  = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const webviewRef = useRef(null);
  const saveTimer  = useRef(null);
  const questionId = question?._id;
  const headers    = { Authorization: 'Bearer ' + token };

  useEffect(() => {
    if (visible && questionId) loadCodeAnswer();
  }, [visible, questionId]);

  const loadCodeAnswer = async () => {
    setLoading(true);
    try {
      const res = await api.get(API + '/api/code-answers/' + questionId + '/' + date, { headers });
      if (res.data) {
        setCode(prev => ({ ...prev, ...res.data.code }));
        setActiveTab(res.data.activeTab || 'javascript');
        setIsSubmitted(res.data.status === 'submitted');
      }
    } catch(e) {}
    finally { setLoading(false); }
  };

  const doSave = async (codeData, tab) => {
    if (!questionId) return;
    setSaving(true);
    try {
      await api.post(API + '/api/code-answers/save',
        { questionId, courseId, date, code: codeData, activeTab: tab },
        { headers });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch(e) {}
    finally { setSaving(false); }
  };

  const runCode = async () => {
    if (activeTab === 'html' || activeTab === 'css') {
      setShowPreview(true);
      setShowOutput(false);
      return;
    }
    setRunning(true);
    setOutput('');
    setOutputErr(false);
    setShowOutput(true);
    setShowPreview(false);
    try {
      const lang = activeTab === 'react' ? 'javascript' : activeTab;
      // Use backend API to run code - proxy through our own server
      const API_URL = API + '/api/run-code';
      const runRes = await fetch(API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          language: lang,
          code: code[activeTab],
        }),
      });
      const data = await runRes.json();
      const out = data.output || data.stdout || data.result || '';
      const err = data.error || data.stderr || '';
      setOutput((out + err).trim() || '(no output)');
      setOutputErr(!!err && !out);
    } catch(e) {
      setOutput('Network error: ' + e.message);
      setOutputErr(true);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitCode = () => {
    Alert.alert('Submit Code', 'Submit this code? Cannot edit after submitting.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: async () => {
          setSubmitting(true);
          try {
            await doSave(code, activeTab);
            await api.post(API + '/api/code-answers/submit', { questionId, date }, { headers });
            setIsSubmitted(true);
            Alert.alert('✅ Code Submitted!');
          } catch(e) {}
          finally { setSubmitting(false); }
        }}
      ]
    );
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'change') {
        const updated = { ...code, [activeTab]: data.value };
        setCode(updated);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => doSave(updated, activeTab), 1500);
      }
    } catch(e) {}
  };

  const editorReadOnly = isReadOnly === true || isSubmitted === true;
  const editorHTML  = buildEditorHTML(code[activeTab], editorReadOnly);
  const previewHTML = buildPreviewHTML(code.html, code.css, code.javascript);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex:1, backgroundColor:'#1e1e2e' }}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color:'#7c6af5', fontSize:15, fontWeight:'700' }}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={{ color:'#cdd6f4', fontSize:14, fontWeight:'700', flex:1, marginLeft:10 }}>
            💻 Code Editor
          </Text>
          <View style={{ flexDirection:'row', gap:6, alignItems:'center' }}>
            {saving  && <Text style={{ color:'#666', fontSize:11 }}>Saving…</Text>}
            {saved && !saving && <Text style={{ color:'#1D9E75', fontSize:11 }}>✓ Saved</Text>}
            {isSubmitted && <Text style={{ color:'#1D9E75', fontSize:11, fontWeight:'700' }}>✅</Text>}
            <TouchableOpacity
              style={{ backgroundColor: running ? '#444' : '#10b981', borderRadius:8, paddingHorizontal:10, paddingVertical:6 }}
              onPress={runCode}
              disabled={running}
            >
              <Text style={{ color:'#fff', fontSize:12, fontWeight:'700' }}>
                {running ? '⏳' : '▶ Run'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: showPreview ? '#7c6af5' : '#2a2a45', borderRadius:8, paddingHorizontal:10, paddingVertical:6 }}
              onPress={() => { setShowPreview(p => !p); setShowOutput(false); }}
            >
              <Text style={{ color:'#cdd6f4', fontSize:12, fontWeight:'600' }}>
                {showPreview ? '✏️' : '👁️'}
              </Text>
            </TouchableOpacity>
            {!isSubmitted && !isReadOnly && (
              <TouchableOpacity
                style={{ backgroundColor: submitting ? '#444' : '#7c6af5', borderRadius:8, paddingHorizontal:10, paddingVertical:6 }}
                onPress={handleSubmitCode}
                disabled={submitting}
              >
                <Text style={{ color:'#fff', fontSize:12, fontWeight:'700' }}>
                  {submitting ? '⏳' : '🚀'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Question */}
        <View style={{ backgroundColor:'#181825', padding:10, borderBottomWidth:1, borderBottomColor:'#2a2a45' }}>
          <Text style={{ color:'#94a3b8', fontSize:13 }} numberOfLines={2}>
            {(question && (question.text || question.question)) || ''}
          </Text>
        </View>

        {/* Language Tabs */}
        <View style={s.tabRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tabBtn, activeTab === tab && { borderBottomWidth:2.5, borderBottomColor: TAB_META[tab].color }]}
              onPress={() => { setActiveTab(tab); setShowPreview(false); setShowOutput(false); }}
            >
              <Text style={{ color: activeTab === tab ? TAB_META[tab].color : '#555', fontSize:11, fontWeight: activeTab === tab ? '700' : '400' }}>
                {TAB_META[tab].icon} {TAB_META[tab].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Editor / Preview */}
        {loading ? (
          <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
            <ActivityIndicator color="#7c6af5" />
          </View>
        ) : showPreview ? (
          <WebView
            source={{ html: previewHTML }}
            style={{ flex:1, backgroundColor:'#fff' }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            mixedContentMode="always"
          />
        ) : (
          <ScrollView style={{ flex:1, backgroundColor:'#1e1e2e' }} keyboardShouldPersistTaps="handled">
            <TextInput
              key={activeTab}
              style={{
                color:'#cdd6f4',
                backgroundColor:'#1e1e2e',
                fontFamily:'monospace',
                fontSize:14,
                lineHeight:22,
                padding:16,
                minHeight:400,
                textAlignVertical:'top',
              }}
              multiline={true}
              value={code[activeTab] || ''}
              onChangeText={(text) => {
                const updated = { ...code, [activeTab]: text };
                setCode(updated);
                if (saveTimer.current) clearTimeout(saveTimer.current);
                saveTimer.current = setTimeout(() => doSave(updated, activeTab), 1500);
              }}
              editable={isReadOnly !== true}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              autoFocus={true}
              placeholder={activeTab === 'javascript' ? '// Write JavaScript here...' : '// Write code here...'}
              placeholderTextColor="#475569"
            />
          </ScrollView>
        )}

        {/* Output Panel */}
        {showOutput && (
          <View style={{ backgroundColor:'#0a0a14', borderTopWidth:1, borderTopColor:'#2a2a45', maxHeight:200 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:10 }}>
              <Text style={{ color: outputErr ? '#ef4444' : '#10b981', fontSize:12, fontWeight:'700' }}>
                {running ? '⏳ Running...' : outputErr ? '❌ Error' : '✅ Output'}
              </Text>
              <TouchableOpacity onPress={() => setShowOutput(false)}>
                <Text style={{ color:'#555', fontSize:18 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ paddingHorizontal:12, paddingBottom:12 }}>
              <Text style={{ color: outputErr ? '#ef4444' : '#a6e3a1', fontSize:13, fontFamily:'monospace', lineHeight:20 }}>
                {running ? 'Executing...' : output}
              </Text>
            </ScrollView>
          </View>
        )}

        {/* Bottom bar */}
        {!isReadOnly && !isSubmitted && (
          <View style={{ backgroundColor:'#181825', padding:10, borderTopWidth:1, borderTopColor:'#2a2a45', flexDirection:'row', gap:10 }}>
            <TouchableOpacity
              style={{ flex:1, backgroundColor:'#2a2a45', borderRadius:10, padding:12, alignItems:'center' }}
              onPress={() => doSave(code, activeTab)}
            >
              <Text style={{ color:'#cdd6f4', fontWeight:'700' }}>💾 Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex:1, backgroundColor:'#7c6af5', borderRadius:10, padding:12, alignItems:'center' }}
              onPress={() => { doSave(code, activeTab); onClose(); }}
            >
              <Text style={{ color:'#fff', fontWeight:'700' }}>Save & Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  header:  { flexDirection:'row', alignItems:'center', padding:12, backgroundColor:'#181825', borderBottomWidth:1, borderBottomColor:'#2a2a45' },
  tabRow:  { flexDirection:'row', backgroundColor:'#11111b', borderBottomWidth:1, borderBottomColor:'#2a2a45' },
  tabBtn:  { flex:1, alignItems:'center', paddingVertical:10, borderBottomWidth:2.5, borderBottomColor:'transparent' },
});
