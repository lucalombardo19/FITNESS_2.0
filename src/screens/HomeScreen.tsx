import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FITNESS_GOALS } from '../constants';
import { GradientCard } from '../components/GradientCard';
import { StatCard } from '../components/StatCard';
import { MacroBar } from '../components/MacroBar';
import { SectionHeader } from '../components/SectionHeader';
import fitnessAPI from '../services/api';
import { UserProfile, LangGraphFitnessResponse } from '../types';

interface Props {
  navigation: { navigate: (screen: string) => void };
}

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<LangGraphFitnessResponse | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [p, pl, conn] = await Promise.all([fitnessAPI.loadProfile(), fitnessAPI.loadLastPlan(), fitnessAPI.testConnection()]);
    setProfile(p); setPlan(pl); setApiOk(conn.ok);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const goalLabel = FITNESS_GOALS.find((g) => g.value === profile?.fitness_goal);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        <View style={styles.header}>
          <View><Text style={styles.greeting}>Ciao 👋</Text><Text style={styles.headline}>AI Fitness Planner</Text></View>
          <View style={[styles.dot, { backgroundColor: apiOk === null ? COLORS.warning : apiOk ? COLORS.success : COLORS.error }]} />
        </View>

        {apiOk === false && (
          <GradientCard variant="danger" style={styles.card}>
            <Text style={styles.bannerText}>⚠️  Backend non raggiungibile.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.bannerLink}>Vai alle Impostazioni →</Text>
            </TouchableOpacity>
          </GradientCard>
        )}

        {profile ? (
          <>
            <GradientCard variant="primary" style={styles.card}>
              <SectionHeader title="Il tuo profilo" icon={goalLabel?.icon ?? '🏋️'} />
              <Text style={styles.goalLabel}>{goalLabel?.label ?? profile.fitness_goal}</Text>
              <Text style={styles.goalDesc}>{goalLabel?.description}</Text>
              <View style={styles.statsRow}>
                <StatCard label="Peso" value={Math.round(profile.weight_kg)} unit="kg" color={COLORS.primary} />
                <StatCard label="Altezza" value={Math.round(profile.height_cm)} unit="cm" color={COLORS.accent} />
                <StatCard label="Et\u00e0" value={profile.age} unit="anni" color={COLORS.secondary} />
              </View>
            </GradientCard>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={() => navigation.navigate('Plan')}>
                <Text style={styles.actionIcon}>⚡</Text><Text style={styles.actionText}>Genera Piano</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.surfaceVariant }]} onPress={() => navigation.navigate('Search')}>
                <Text style={styles.actionIcon}>🔍</Text><Text style={styles.actionText}>Cerca Alimenti</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <GradientCard variant="primary" style={styles.card}>
            <Text style={styles.emptyTitle}>Benvenuto! 🎯</Text>
            <Text style={styles.emptyText}>Configura il tuo profilo per iniziare a generare piani personalizzati.</Text>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.ctaText}>Configura Profilo →</Text>
            </TouchableOpacity>
          </GradientCard>
        )}

        {plan && (
          <GradientCard variant="accent" style={styles.card}>
            <SectionHeader title="Ultimo Piano" icon="📋" subtitle={plan.timestamp ? new Date(plan.timestamp).toLocaleDateString('it-IT') : undefined} />
            {plan.summary ? <Text style={styles.summaryText} numberOfLines={4}>{plan.summary}</Text> : null}
            <TouchableOpacity style={styles.viewPlanBtn} onPress={() => navigation.navigate('Plan')}>
              <Text style={styles.viewPlanText}>Vedi piano completo →</Text>
            </TouchableOpacity>
          </GradientCard>
        )}

        <GradientCard style={styles.card}>
          <SectionHeader title="Funzionalit\u00e0" icon="✨" />
          {[{icon:'🤖',title:'Multi-Agent AI',desc:'5 agenti coordinati da LangGraph'},{icon:'🥗',title:'Piano Nutrizionale',desc:'5000 alimenti USDA reali'},{icon:'🏋️',title:'Piano Allenamento',desc:'Routine su misura per il tuo equipaggiamento'},{icon:'🔍',title:'Ricerca Semantica',desc:'Trova alimenti con FAISS vector search'}].map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </GradientCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.background},
  scroll:{padding:16,paddingTop:56,paddingBottom:32},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},
  greeting:{color:COLORS.textSecondary,fontSize:14},
  headline:{color:COLORS.text,fontSize:26,fontWeight:'800',marginTop:2},
  dot:{width:12,height:12,borderRadius:6},
  card:{marginBottom:16},
  bannerText:{color:COLORS.warning,fontSize:13},
  bannerLink:{color:COLORS.primary,fontSize:13,marginTop:6,fontWeight:'600'},
  goalLabel:{color:COLORS.primary,fontSize:20,fontWeight:'800',marginBottom:2},
  goalDesc:{color:COLORS.textSecondary,fontSize:13,marginBottom:14},
  statsRow:{flexDirection:'row',marginTop:4},
  actionsRow:{flexDirection:'row',marginBottom:16,gap:10},
  actionBtn:{flex:1,borderRadius:14,padding:16,alignItems:'center',justifyContent:'center'},
  actionIcon:{fontSize:26,marginBottom:4},
  actionText:{color:'#fff',fontSize:13,fontWeight:'700'},
  emptyTitle:{color:COLORS.text,fontSize:20,fontWeight:'800',marginBottom:8},
  emptyText:{color:COLORS.textSecondary,fontSize:14,lineHeight:22,marginBottom:16},
  ctaBtn:{backgroundColor:COLORS.primary,borderRadius:12,paddingVertical:12,paddingHorizontal:20,alignSelf:'flex-start'},
  ctaText:{color:'#fff',fontWeight:'700',fontSize:14},
  summaryText:{color:COLORS.textSecondary,fontSize:13,lineHeight:20,marginBottom:12},
  viewPlanBtn:{alignSelf:'flex-end'},
  viewPlanText:{color:COLORS.accent,fontWeight:'700',fontSize:14},
  featureRow:{flexDirection:'row',alignItems:'flex-start',marginBottom:12},
  featureIcon:{fontSize:22,marginRight:12,marginTop:1},
  featureInfo:{flex:1},
  featureTitle:{color:COLORS.text,fontSize:14,fontWeight:'700'},
  featureDesc:{color:COLORS.textSecondary,fontSize:12,marginTop:2},
});
