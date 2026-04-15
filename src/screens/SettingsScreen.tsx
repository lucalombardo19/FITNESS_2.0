import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, DEFAULT_API_URL, DEFAULT_USER_ID, STORAGE_KEYS } from '../constants';
import { GradientCard } from '../components/GradientCard';
import { SectionHeader } from '../components/SectionHeader';
import fitnessAPI from '../services/api';

const SETUP_STEPS = [
  { title: 'Clona il repository', code: 'git clone https://github.com/zen-apps/ai-fitness-planner' },
  { title: 'Configura le variabili d\'ambiente', code: 'cp .env.example .env\n# Aggiungi OPENAI_API_KEY e LANGCHAIN_API_KEY' },
  { title: 'Avvia con Docker', code: 'make setup-demo', desc: 'Backend su porta 1015' },
  { title: 'Trova il tuo IP locale', code: 'ipconfig (Windows)\nifconfig (Mac/Linux)', desc: 'Inseriscilo nel campo URL qui sopra' },
];

export const SettingsScreen: React.FC = () => {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [testing, setTesting] = useState(false);
  const [connStatus, setConnStatus] = useState<'idle'|'ok'|'error'>('idle');
  const [connMsg, setConnMsg] = useState('');
  const [saved, setSaved] = useState(false);
  const [dbStatus, setDbStatus] = useState<Record<string, unknown> | null>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => { const s = await fitnessAPI.loadSettings2(); setApiUrl(s.apiBaseUrl); setUserId(s.userId); };

  const handleTest = async () => {
    setTesting(true); setConnStatus('idle'); fitnessAPI.setBaseUrl(apiUrl);
    const r = await fitnessAPI.testConnection();
    setConnStatus(r.ok ? 'ok' : 'error'); setConnMsg(r.message); setTesting(false);
    if (r.ok) { try { setDbStatus(await fitnessAPI.getDatabaseAvailability()); } catch { /* ignore */ } }
  };

  const handleSave = async () => { await fitnessAPI.saveSettings({ apiBaseUrl: apiUrl, userId }); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const handleClearData = () => Alert.alert('Cancella dati', 'Cancellare profilo e piani salvati?', [
    { text: 'Annulla', style: 'cancel' },
    { text: 'Cancella', style: 'destructive', onPress: async () => { await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE); await AsyncStorage.removeItem(STORAGE_KEYS.LAST_PLAN); await AsyncStorage.removeItem(STORAGE_KEYS.NUTRITION_TARGETS); Alert.alert('Fatto', 'Dati cancellati.'); } },
  ]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <GradientCard style={styles.card}>
        <SectionHeader title="Configurazione Backend" icon="\ud83d\udd27" />
        <Text style={styles.label}>URL Base API</Text>
        <TextInput style={styles.input} value={apiUrl} onChangeText={setApiUrl} placeholder="http://192.168.x.x:1015" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <Text style={styles.hint}>LAN: http://192.168.x.x:1015{`\n`}Android Emulator: http://10.0.2.2:1015</Text>
        <Text style={styles.label}>User ID</Text>
        <TextInput style={styles.input} value={userId} onChangeText={setUserId} placeholder="mobile_user_001" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" autoCorrect={false} />
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.testBtn, connStatus === 'ok' && { borderColor: COLORS.success }, connStatus === 'error' && { borderColor: COLORS.error }]} onPress={handleTest} disabled={testing}>
            {testing ? <ActivityIndicator color={COLORS.primary} size="small" /> : <Text style={[styles.testBtnText, connStatus === 'ok' && { color: COLORS.success }, connStatus === 'error' && { color: COLORS.error }]}>{connStatus === 'ok' ? '\u2713 Connesso' : connStatus === 'error' ? '\u2717 Errore' : 'Testa connessione'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, saved && { backgroundColor: COLORS.success }]} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{saved ? '\u2713 Salvato' : 'Salva'}</Text>
          </TouchableOpacity>
        </View>
        {connMsg ? <Text style={[styles.connMsg, { color: connStatus === 'ok' ? COLORS.success : COLORS.error }]}>{connMsg}</Text> : null}
      </GradientCard>

      {dbStatus && (
        <GradientCard variant="accent" style={styles.card}>
          <SectionHeader title="Stato Database" icon="\ud83d\uddc4\ufe0f" />
          <Text style={styles.dbText}>{JSON.stringify(dbStatus, null, 2)}</Text>
        </GradientCard>
      )}

      <GradientCard style={styles.card}>
        <SectionHeader title="Come avviare il backend" icon="\ud83d\udcd6" />
        {SETUP_STEPS.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              {step.code && <View style={styles.codeBox}><Text style={styles.code}>{step.code}</Text></View>}
              {step.desc && <Text style={styles.stepDesc}>{step.desc}</Text>}
            </View>
          </View>
        ))}
      </GradientCard>

      <GradientCard style={styles.card}>
        <SectionHeader title="Informazioni App" icon="\u2139\ufe0f" />
        {[['Versione','1.0.0'],['Framework','React Native + Expo'],['AI Backend','LangGraph + GPT-4'],['Database','5000 alimenti USDA'],['Ricerca','FAISS Vector Search']].map(([k,v]) => (
          <View key={k} style={styles.infoRow}><Text style={styles.infoLabel}>{k}</Text><Text style={styles.infoValue}>{v}</Text></View>
        ))}
      </GradientCard>

      <GradientCard variant="danger" style={styles.card}>
        <SectionHeader title="Zona Pericolosa" icon="\u26a0\ufe0f" />
        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
          <Text style={styles.dangerBtnText}>\ud83d\uddd1\ufe0f  Cancella dati locali</Text>
        </TouchableOpacity>
      </GradientCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.background},scroll:{padding:16,paddingTop:20,paddingBottom:40},card:{marginBottom:14},
  label:{color:COLORS.textSecondary,fontSize:13,marginBottom:6,marginTop:4},
  input:{backgroundColor:COLORS.surface,borderRadius:10,paddingHorizontal:14,paddingVertical:12,color:COLORS.text,fontSize:14,borderWidth:1,borderColor:COLORS.border,marginBottom:4},
  hint:{color:COLORS.textMuted,fontSize:11,marginBottom:12,lineHeight:17},
  btnRow:{flexDirection:'row',gap:10,marginTop:8},
  testBtn:{flex:1,paddingVertical:12,borderRadius:10,borderWidth:1,borderColor:COLORS.primary,alignItems:'center'},
  testBtnText:{color:COLORS.primary,fontWeight:'700',fontSize:13},
  saveBtn:{flex:1,paddingVertical:12,borderRadius:10,backgroundColor:COLORS.primary,alignItems:'center'},
  saveBtnText:{color:'#fff',fontWeight:'700',fontSize:13},
  connMsg:{fontSize:12,marginTop:8,textAlign:'center'},
  dbText:{color:COLORS.textSecondary,fontSize:11,fontFamily:'monospace'},
  stepRow:{flexDirection:'row',marginBottom:16},
  stepNum:{width:28,height:28,borderRadius:14,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center',marginRight:12,marginTop:2},
  stepNumText:{color:'#fff',fontWeight:'800',fontSize:13},
  stepContent:{flex:1},stepTitle:{color:COLORS.text,fontSize:14,fontWeight:'600',marginBottom:6},
  codeBox:{backgroundColor:'#0A0A14',borderRadius:8,padding:10,marginBottom:4,borderWidth:1,borderColor:COLORS.border},
  code:{color:COLORS.accent,fontSize:12,fontFamily:'monospace'},
  stepDesc:{color:COLORS.textSecondary,fontSize:12},
  infoRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:8,borderBottomWidth:1,borderBottomColor:COLORS.border},
  infoLabel:{color:COLORS.textSecondary,fontSize:13},infoValue:{color:COLORS.text,fontSize:13,fontWeight:'600'},
  dangerBtn:{borderWidth:1,borderColor:COLORS.error,borderRadius:10,paddingVertical:12,alignItems:'center'},
  dangerBtnText:{color:COLORS.error,fontWeight:'700',fontSize:14},
});
