import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Animated, Easing } from 'react-native';
import { COLORS } from '../constants';
import { GradientCard } from '../components/GradientCard';
import { SectionHeader } from '../components/SectionHeader';
import { MacroBar } from '../components/MacroBar';
import fitnessAPI from '../services/api';
import { generatePlanWithClaude } from '../services/claudeService';
import { LangGraphFitnessResponse, UserProfile, MealPlan, WorkoutPlan, Meal, WorkoutSession } from '../types';

type Tab = 'overview' | 'meals' | 'workout';

export const PlanScreen: React.FC = () => {
  const [plan, setPlan] = useState<LangGraphFitnessResponse | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [genMeal, setGenMeal] = useState(true);
  const [genWorkout, setGenWorkout] = useState(true);
  const [useO3, setUseO3] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [steps, setSteps] = useState<string[]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (loading) {
      Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })).start();
    } else { spinAnim.stopAnimation(); spinAnim.setValue(0); }
  }, [loading, spinAnim]);

  const loadData = async () => {
    const [p, pl, settings] = await Promise.all([fitnessAPI.loadProfile(), fitnessAPI.loadLastPlan(), fitnessAPI.loadSettings2()]);
    setProfile(p);
    if (pl) setPlan(pl);
    setAnthropicKey(settings.anthropicApiKey ?? null);
  };

  const handleGenerate = async () => {
    if (!profile) { Alert.alert('Profilo mancante', 'Configura prima il tuo profilo.'); return; }
    setLoading(true); setSteps([]); setPlan(null); setGenError(null);

    const addStep = (s: string) => setSteps((prev) => [...prev, s]);

    try {
      let result: LangGraphFitnessResponse;

      if (anthropicKey) {
        // Use Claude API directly
        addStep('\ud83e\udd16 Connessione a Claude AI...');
        addStep('\ud83d\udc64 Analisi profilo e obiettivi...');
        if (genMeal) addStep('\ud83e\udd57 Pianificazione dieta personalizzata...');
        if (genWorkout) addStep('\ud83c\udfcb\ufe0f Progettazione routine di allenamento...');
        result = await generatePlanWithClaude(anthropicKey, profile, genMeal, genWorkout, addStep);
      } else {
        // Fallback: LangGraph backend
        const mockSteps = ['\ud83e\udd16 Avvio workflow LangGraph...', '\ud83d\udc64 Profile Manager: analisi obiettivi...', genMeal ? '\ud83e\udd57 Meal Planner: ricerca alimenti USDA...' : null, genWorkout ? '\ud83c\udfcb\ufe0f Workout Planner: progettazione routine...' : null, '\ud83d\udccb Plan Coordinator: sincronizzazione...', '\ud83d\udcdd Summary Agent: finalizzazione piano...'].filter(Boolean) as string[];
        let stepIdx = 0;
        const interval = setInterval(() => { if (stepIdx < mockSteps.length) { addStep(mockSteps[stepIdx]); stepIdx++; } }, 3500);
        try {
          result = await fitnessAPI.generateFitnessPlan({ user_id: profile.user_id, user_profile: profile, generate_meal_plan: genMeal, generate_workout_plan: genWorkout, use_o3_mini: useO3, use_full_database: false, meal_preferences: { dietary_preferences: profile.dietary_preferences, allergies: profile.allergies }, workout_preferences: { available_equipment: profile.available_equipment, weekly_frequency: profile.weekly_workout_frequency } });
          clearInterval(interval);
        } catch (e) { clearInterval(interval); throw e; }
      }

      setPlan(result); await fitnessAPI.saveLastPlan(result); setSteps([]);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setGenError(err?.message ?? 'Errore sconosciuto'); setSteps([]);
    } finally { setLoading(false); }
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const parsedMeal: MealPlan | null = plan?.meal_plan && typeof plan.meal_plan === 'object' ? plan.meal_plan as MealPlan : null;
  const parsedWorkout: WorkoutPlan | null = plan?.workout_plan && typeof plan.workout_plan === 'object' ? plan.workout_plan as WorkoutPlan : null;
  const mealText = typeof plan?.meal_plan === 'string' ? plan.meal_plan : null;
  const workoutText = typeof plan?.workout_plan === 'string' ? plan.workout_plan : null;

  const Toggle = ({ val, set }: { val: boolean; set: (v: boolean) => void }) => (
    <TouchableOpacity style={[styles.toggle, val && styles.toggleOn]} onPress={() => set(!val)}>
      <View style={[styles.knob, val && styles.knobOn]} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GradientCard variant="primary" style={styles.card}>
          <SectionHeader title="Genera Piano AI" icon="\u26a1" subtitle={anthropicKey ? 'Powered by Claude (Anthropic)' : 'Powered by LangGraph + GPT-4'} />
          {[{ label: 'Piano alimentare', val: genMeal, set: setGenMeal }, { label: 'Piano allenamento', val: genWorkout, set: setGenWorkout }, { label: 'Usa GPT-o3-mini (pi\u00f9 preciso)', val: useO3, set: setUseO3 }].map((o) => (
            <View key={o.label} style={styles.optRow}>
              <Text style={styles.optLabel}>{o.label}</Text>
              <Toggle val={o.val} set={o.set} />
            </View>
          ))}
          <TouchableOpacity style={[styles.genBtn, loading && styles.genBtnDisabled]} onPress={handleGenerate} disabled={loading}>
            {loading ? (<View style={styles.loadingRow}><Animated.Text style={[styles.spinnerIcon, { transform: [{ rotate: spin }] }]}>\u2699\ufe0f</Animated.Text><Text style={styles.genBtnText}>Generazione in corso...</Text></View>) : (<Text style={styles.genBtnText}>\ud83d\ude80  Genera Piano Personalizzato</Text>)}
          </TouchableOpacity>
          {!profile && <Text style={styles.noProfileWarn}>\u26a0\ufe0f Configura prima il tuo profilo</Text>}
        </GradientCard>

        {loading && steps.length > 0 && (
          <GradientCard style={styles.card}>
            <SectionHeader title="Elaborazione..." icon="\ud83d\udd04" />
            {steps.map((s, i) => <Text key={i} style={styles.stepText}>{s}</Text>)}
            <Text style={styles.stepHint}>La generazione pu\u00f2 impiegare 30-90 secondi...</Text>
          </GradientCard>
        )}

        {genError && !loading && (
          <GradientCard variant="danger" style={styles.card}>
            <SectionHeader title="Errore generazione" icon="\ud83d\udea8" />
            <Text style={styles.errorBody}>{genError}</Text>
            {!anthropicKey && (genError.includes('API key') || genError.includes('timeout') || genError.includes('stream')) && (
              <View style={styles.errorSteps}>
                <Text style={styles.errorStepTitle}>Soluzione rapida — usa Claude:</Text>
                <Text style={styles.errorStep}>1. Vai su <Text style={styles.code}>Impostazioni</Text></Text>
                <Text style={styles.errorStep}>2. Inserisci la tua <Text style={styles.code}>Anthropic API Key</Text></Text>
                <Text style={styles.errorStep}>3. Salva e riprova — niente backend!</Text>
              </View>
            )}
            {anthropicKey && (
              <View style={styles.errorSteps}>
                <Text style={styles.errorStepTitle}>Possibili cause:</Text>
                <Text style={styles.errorStep}>\u2022 API key non valida o scaduta</Text>
                <Text style={styles.errorStep}>\u2022 Credito Anthropic esaurito</Text>
                <Text style={styles.errorStep}>\u2022 Connessione internet assente</Text>
              </View>
            )}
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setGenError(null); handleGenerate(); }}>
              <Text style={styles.retryBtnText}>\u21ba Riprova</Text>
            </TouchableOpacity>
          </GradientCard>
        )}

        {plan && !loading && (
          <>
            <View style={styles.tabRow}>
              {(['overview', 'meals', 'workout'] as Tab[]).map((t) => (
                <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'overview' ? '\ud83d\udccb Riepilogo' : t === 'meals' ? '\ud83e\udd57 Pasti' : '\ud83c\udfcb\ufe0f Allenamento'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === 'overview' && (
              <>
                {plan.summary && <GradientCard variant="accent" style={styles.card}><SectionHeader title="Riepilogo" icon="\ud83d\udcdd" /><Text style={styles.summaryText}>{plan.summary}</Text></GradientCard>}
                {plan.execution_steps && plan.execution_steps.length > 0 && <GradientCard style={styles.card}><SectionHeader title="Step Eseguiti" icon="\u2705" />{plan.execution_steps.map((s, i) => <Text key={i} style={styles.stepText}>\u2022 {s}</Text>)}</GradientCard>}
                {plan.errors && plan.errors.length > 0 && <GradientCard variant="danger" style={styles.card}><SectionHeader title="Avvisi" icon="\u26a0\ufe0f" />{plan.errors.map((e, i) => <Text key={i} style={styles.errorText}>{e}</Text>)}</GradientCard>}
              </>
            )}

            {tab === 'meals' && (
              <>
                {parsedMeal ? (<><GradientCard variant="accent" style={styles.card}><SectionHeader title="Target Giornaliero" icon="\ud83c\udfaf" /><View style={styles.calorieRow}><Text style={styles.calBig}>{Math.round(parsedMeal.total_daily_calories)}</Text><Text style={styles.calUnit}> kcal</Text></View><MacroBar label="Proteine" value={parsedMeal.total_protein_g} color={COLORS.primary} max={250} /><MacroBar label="Carboidrati" value={parsedMeal.total_carbs_g} color={COLORS.accent} max={400} /><MacroBar label="Grassi" value={parsedMeal.total_fat_g} color={COLORS.secondary} max={150} /></GradientCard>{parsedMeal.meals?.map((meal: Meal, i: number) => <MealCard key={i} meal={meal} />)}{parsedMeal.notes && <GradientCard style={styles.card}><Text style={styles.notesText}>\ud83d\udca1 {parsedMeal.notes}</Text></GradientCard>}</>) : mealText ? (<GradientCard style={styles.card}><SectionHeader title="Piano Alimentare" icon="\ud83e\udd57" /><Text style={styles.rawText}>{mealText}</Text></GradientCard>) : (<GradientCard style={styles.card}><Text style={styles.emptyText}>Nessun piano alimentare generato.</Text></GradientCard>)}
              </>
            )}

            {tab === 'workout' && (
              <>
                {parsedWorkout ? (<>{parsedWorkout.sessions?.map((s: WorkoutSession, i: number) => <WorkoutCard key={i} session={s} />)}{parsedWorkout.progression_notes && <GradientCard style={styles.card}><SectionHeader title="Progressione" icon="\ud83d\udcc8" /><Text style={styles.notesText}>{parsedWorkout.progression_notes}</Text></GradientCard>}</>) : workoutText ? (<GradientCard style={styles.card}><SectionHeader title="Piano Allenamento" icon="\ud83c\udfcb\ufe0f" /><Text style={styles.rawText}>{workoutText}</Text></GradientCard>) : (<GradientCard style={styles.card}><Text style={styles.emptyText}>Nessun piano di allenamento generato.</Text></GradientCard>)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const MealCard: React.FC<{ meal: Meal }> = ({ meal }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <GradientCard style={styles.card}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.mealHeader}>
        <View><Text style={styles.mealName}>{meal.meal_name}</Text>{meal.time && <Text style={styles.mealTime}>\ud83d\udd50 {meal.time}</Text>}</View>
        <View style={styles.mealCalBox}><Text style={styles.mealCal}>{Math.round(meal.total_calories)} kcal</Text><Text style={styles.expandIcon}>{expanded ? '\u25b2' : '\u25bc'}</Text></View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.mealBody}>
          <View style={styles.macroRow}>
            <Text style={styles.macroChip}>P: {Math.round(meal.total_protein_g)}g</Text>
            <Text style={styles.macroChip}>C: {Math.round(meal.total_carbs_g)}g</Text>
            <Text style={styles.macroChip}>F: {Math.round(meal.total_fat_g)}g</Text>
          </View>
          {meal.foods?.map((food, i) => <View key={i} style={styles.foodRow}><Text style={styles.foodName}>\u2022 {food.name}</Text><Text style={styles.foodDetail}>{food.amount} \u00b7 {food.calories} kcal</Text></View>)}
        </View>
      )}
    </GradientCard>
  );
};

const WorkoutCard: React.FC<{ session: WorkoutSession }> = ({ session }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <GradientCard style={styles.card}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.mealHeader}>
        <View><Text style={styles.mealName}>{session.day}</Text><Text style={styles.mealTime}>{session.focus}</Text></View>
        <View style={styles.mealCalBox}>{session.duration_minutes && <Text style={styles.mealCal}>{session.duration_minutes} min</Text>}<Text style={styles.expandIcon}>{expanded ? '\u25b2' : '\u25bc'}</Text></View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.mealBody}>
          {session.exercises?.map((ex, i) => (
            <View key={i} style={styles.exRow}>
              <Text style={styles.exName}>\ud83d\udcaa {ex.name}</Text>
              <View style={styles.exDetails}>
                {ex.sets && <Text style={styles.exDetail}>{ex.sets} serie</Text>}
                {ex.reps && <Text style={styles.exDetail}>{ex.reps} rip</Text>}
                {ex.duration && <Text style={styles.exDetail}>{ex.duration}</Text>}
                {ex.rest && <Text style={styles.exDetail}>Riposo: {ex.rest}</Text>}
              </View>
              {ex.notes && <Text style={styles.exNotes}>{ex.notes}</Text>}
            </View>
          ))}
          {session.notes && <Text style={styles.notesText}>\ud83d\udca1 {session.notes}</Text>}
        </View>
      )}
    </GradientCard>
  );
};

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.background},scroll:{padding:16,paddingTop:20,paddingBottom:40},card:{marginBottom:14},
  optRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},
  optLabel:{color:COLORS.text,fontSize:14},
  toggle:{width:50,height:28,borderRadius:14,backgroundColor:COLORS.border,padding:3,justifyContent:'center'},
  toggleOn:{backgroundColor:COLORS.primary},
  knob:{width:22,height:22,borderRadius:11,backgroundColor:COLORS.textSecondary,alignSelf:'flex-start'},
  knobOn:{backgroundColor:'#fff',alignSelf:'flex-end'},
  genBtn:{backgroundColor:COLORS.primary,borderRadius:14,paddingVertical:14,alignItems:'center',marginTop:4},
  genBtnDisabled:{backgroundColor:COLORS.textMuted},genBtnText:{color:'#fff',fontSize:15,fontWeight:'800'},
  loadingRow:{flexDirection:'row',alignItems:'center',gap:10},spinnerIcon:{fontSize:20},
  noProfileWarn:{color:COLORS.warning,fontSize:12,marginTop:8,textAlign:'center'},
  stepText:{color:COLORS.textSecondary,fontSize:13,marginBottom:6},
  stepHint:{color:COLORS.textMuted,fontSize:11,marginTop:8,fontStyle:'italic'},
  errorBody:{color:COLORS.text,fontSize:13,lineHeight:22,marginBottom:14},
  errorSteps:{backgroundColor:'#1A0A0F',borderRadius:10,padding:12,marginBottom:14,borderWidth:1,borderColor:COLORS.error+'44'},
  errorStepTitle:{color:COLORS.textSecondary,fontSize:12,fontWeight:'700',marginBottom:6},
  errorStep:{color:COLORS.textSecondary,fontSize:12,marginBottom:4},
  code:{color:COLORS.accent,fontFamily:'monospace',fontSize:12},
  retryBtn:{borderWidth:1,borderColor:COLORS.primary,borderRadius:10,paddingVertical:10,alignItems:'center'},
  retryBtnText:{color:COLORS.primary,fontWeight:'700',fontSize:14},
  tabRow:{flexDirection:'row',marginBottom:14,gap:8},
  tabBtn:{flex:1,paddingVertical:10,borderRadius:12,backgroundColor:COLORS.surfaceVariant,alignItems:'center'},
  tabBtnActive:{backgroundColor:COLORS.primary},tabText:{color:COLORS.textSecondary,fontSize:12,fontWeight:'600'},tabTextActive:{color:'#fff'},
  summaryText:{color:COLORS.text,fontSize:14,lineHeight:22},errorText:{color:COLORS.error,fontSize:13,marginBottom:4},
  calorieRow:{flexDirection:'row',alignItems:'flex-end',marginBottom:14},calBig:{color:COLORS.accent,fontSize:38,fontWeight:'800'},calUnit:{color:COLORS.textSecondary,fontSize:14,marginBottom:6},
  mealHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  mealName:{color:COLORS.text,fontSize:15,fontWeight:'700'},mealTime:{color:COLORS.textSecondary,fontSize:12,marginTop:2},
  mealCalBox:{alignItems:'flex-end'},mealCal:{color:COLORS.primary,fontWeight:'700',fontSize:14},expandIcon:{color:COLORS.textMuted,fontSize:12,marginTop:4},
  mealBody:{marginTop:12,borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:12},
  macroRow:{flexDirection:'row',gap:8,marginBottom:10},
  macroChip:{paddingHorizontal:10,paddingVertical:4,borderRadius:10,backgroundColor:COLORS.surface,color:COLORS.textSecondary,fontSize:12,fontWeight:'600'},
  foodRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:6},foodName:{color:COLORS.text,fontSize:13,flex:1},foodDetail:{color:COLORS.textSecondary,fontSize:12},
  exRow:{marginBottom:12},exName:{color:COLORS.text,fontSize:14,fontWeight:'600'},
  exDetails:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:4},
  exDetail:{color:COLORS.textSecondary,fontSize:12,backgroundColor:COLORS.surface,paddingHorizontal:8,paddingVertical:3,borderRadius:8},
  exNotes:{color:COLORS.textMuted,fontSize:12,marginTop:4,fontStyle:'italic'},
  notesText:{color:COLORS.textSecondary,fontSize:13,fontStyle:'italic'},rawText:{color:COLORS.text,fontSize:13,lineHeight:22},
  emptyText:{color:COLORS.textSecondary,fontSize:14,textAlign:'center',paddingVertical:20},
});
