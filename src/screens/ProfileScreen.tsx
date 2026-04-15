import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS, ACTIVITY_LEVELS, FITNESS_GOALS, ALLERGIES_OPTIONS, DIETARY_PREFERENCES, EQUIPMENT_OPTIONS, EQUIPMENT_LABELS, DIETARY_LABELS, ALLERGY_LABELS, DEFAULT_USER_ID } from '../constants';
import { GradientCard } from '../components/GradientCard';
import { ChipSelect } from '../components/ChipSelect';
import { SectionHeader } from '../components/SectionHeader';
import { MacroBar } from '../components/MacroBar';
import fitnessAPI from '../services/api';
import { UserProfile, ActivityLevel, FitnessGoal } from '../types';

export const ProfileScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({ user_id: DEFAULT_USER_ID, age: 25, weight_kg: 75, height_cm: 175, activity_level: 'moderately_active', fitness_goal: 'maintenance', weekly_workout_frequency: 3, allergies: [], dietary_preferences: [], available_equipment: ['bodyweight'] });
  const [useMetric, setUseMetric] = useState(true);
  const [weightInput, setWeightInput] = useState('75');
  const [heightInput, setHeightInput] = useState('175');
  const [ageInput, setAgeInput] = useState('25');
  const [macros, setMacros] = useState<{ daily_calories: number; protein_g: number; carbs_g: number; fat_g: number } | null>(null);

  useEffect(() => { loadExisting(); }, []);

  const loadExisting = async () => {
    const p = await fitnessAPI.loadProfile();
    if (p) { setProfile(p); setWeightInput(String(Math.round(p.weight_kg))); setHeightInput(String(Math.round(p.height_cm))); setAgeInput(String(p.age)); }
  };

  const updateField = <K extends keyof UserProfile>(key: K, val: UserProfile[K]) => setProfile((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    const age = parseInt(ageInput, 10);
    const weightKg = parseFloat(weightInput) * (useMetric ? 1 : 0.453592);
    const heightCm = parseFloat(heightInput) * (useMetric ? 1 : 2.54);
    if (!age || age < 16 || age > 80) { Alert.alert('Errore', 'Et\u00e0 valida: 16-80'); return; }
    if (!weightKg || weightKg < 30 || weightKg > 300) { Alert.alert('Errore', 'Peso non valido'); return; }
    const finalProfile: UserProfile = { ...profile, age, weight_kg: parseFloat(weightKg.toFixed(1)), height_cm: parseFloat(heightCm.toFixed(1)) };
    setLoading(true);
    try {
      await fitnessAPI.saveProfile(finalProfile);
      const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
      const mult: Record<string, number> = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extra_active: 1.9 };
      let kcal = bmr * (mult[finalProfile.activity_level] ?? 1.55);
      if (finalProfile.fitness_goal === 'cut') kcal -= 400;
      else if (finalProfile.fitness_goal === 'bulk') kcal += 300;
      const protein = weightKg * 2.2;
      const fat = (kcal * 0.25) / 9;
      const carbs = (kcal - protein * 4 - fat * 9) / 4;
      setMacros({ daily_calories: Math.round(kcal), protein_g: Math.round(protein), carbs_g: Math.round(carbs), fat_g: Math.round(fat) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { Alert.alert('Errore', 'Salvataggio fallito'); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <GradientCard style={styles.card}>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggleBtn, useMetric && styles.toggleActive]} onPress={() => setUseMetric(true)}><Text style={[styles.toggleText, useMetric && styles.toggleTextActive]}>Metrico</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, !useMetric && styles.toggleActive]} onPress={() => setUseMetric(false)}><Text style={[styles.toggleText, !useMetric && styles.toggleTextActive]}>Imperiale</Text></TouchableOpacity>
          </View>
        </GradientCard>

        <GradientCard style={styles.card}>
          <SectionHeader title="Dati Fisici" icon="📏" />
          <View style={styles.inputRow}>
            {[{ label: 'Et\u00e0', val: ageInput, set: setAgeInput, kb: 'numeric' as const }, { label: `Peso (${useMetric ? 'kg' : 'lbs'})`, val: weightInput, set: setWeightInput, kb: 'decimal-pad' as const }, { label: `Altezza (${useMetric ? 'cm' : 'in'})`, val: heightInput, set: setHeightInput, kb: 'decimal-pad' as const }].map((f) => (
              <View key={f.label} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <TextInput style={styles.input} value={f.val} onChangeText={f.set} keyboardType={f.kb} placeholderTextColor={COLORS.textMuted} />
              </View>
            ))}
          </View>
        </GradientCard>

        <GradientCard style={styles.card}>
          <SectionHeader title="Obiettivo" icon="🎯" />
          <View style={styles.goalGrid}>
            {FITNESS_GOALS.map((g) => {
              const active = profile.fitness_goal === g.value;
              return (
                <TouchableOpacity key={g.value} style={[styles.goalCard, active && styles.goalCardActive]} onPress={() => updateField('fitness_goal', g.value as FitnessGoal)}>
                  <Text style={styles.goalIcon}>{g.icon}</Text>
                  <Text style={[styles.goalLabel, active && styles.goalLabelActive]}>{g.label}</Text>
                  <Text style={styles.goalDesc}>{g.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GradientCard>

        <GradientCard style={styles.card}>
          <SectionHeader title="Livello di Attivit\u00e0" icon="⚡" />
          {ACTIVITY_LEVELS.map((al) => {
            const active = profile.activity_level === al.value;
            return (
              <TouchableOpacity key={al.value} style={[styles.activityRow, active && styles.activityRowActive]} onPress={() => updateField('activity_level', al.value as ActivityLevel)}>
                <View style={[styles.radioCircle, active && styles.radioActive]} />
                <View><Text style={[styles.activityLabel, active && { color: COLORS.primary }]}>{al.label}</Text><Text style={styles.activityDesc}>{al.description}</Text></View>
              </TouchableOpacity>
            );
          })}
        </GradientCard>

        <GradientCard style={styles.card}>
          <SectionHeader title="Allenamenti / Settimana" icon="📅" />
          <View style={styles.freqRow}>
            {[1,2,3,4,5,6,7].map((n) => {
              const active = profile.weekly_workout_frequency === n;
              return (
                <TouchableOpacity key={n} style={[styles.freqBtn, active && styles.freqBtnActive]} onPress={() => updateField('weekly_workout_frequency', n)}>
                  <Text style={[styles.freqText, active && styles.freqTextActive]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GradientCard>

        <GradientCard style={styles.card}>
          <SectionHeader title="Equipaggiamento" icon="🏋️" />
          <ChipSelect options={EQUIPMENT_OPTIONS} labels={EQUIPMENT_LABELS} selected={profile.available_equipment} onChange={(v) => updateField('available_equipment', v)} />
        </GradientCard>

        <GradientCard style={styles.card}>
          <SectionHeader title="Preferenze Alimentari" icon="🥗" />
          <ChipSelect options={DIETARY_PREFERENCES} labels={DIETARY_LABELS} selected={profile.dietary_preferences} onChange={(v) => updateField('dietary_preferences', v)} />
        </GradientCard>

        <GradientCard style={styles.card}>
          <SectionHeader title="Allergie / Intolleranze" icon="⚠️" />
          <ChipSelect options={ALLERGIES_OPTIONS} labels={ALLERGY_LABELS} selected={profile.allergies} onChange={(v) => updateField('allergies', v)} />
        </GradientCard>

        {macros && (
          <GradientCard variant="accent" style={styles.card}>
            <SectionHeader title="Target Nutrizionali Stimati" icon="📊" />
            <View style={styles.caloriesRow}><Text style={styles.caloriesBig}>{macros.daily_calories}</Text><Text style={styles.caloriesUnit}> kcal/giorno</Text></View>
            <MacroBar label="Proteine" value={macros.protein_g} color={COLORS.primary} max={250} />
            <MacroBar label="Carboidrati" value={macros.carbs_g} color={COLORS.accent} max={400} />
            <MacroBar label="Grassi" value={macros.fat_g} color={COLORS.secondary} max={150} />
          </GradientCard>
        )}

        <TouchableOpacity style={[styles.saveBtn, saved && { backgroundColor: COLORS.success }]} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{saved ? '\u2713 Salvato!' : 'Salva Profilo'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.background},
  scroll:{padding:16,paddingTop:20,paddingBottom:40},
  card:{marginBottom:14},
  toggleRow:{flexDirection:'row',gap:10},
  toggleBtn:{flex:1,paddingVertical:10,borderRadius:10,alignItems:'center',backgroundColor:COLORS.border},
  toggleActive:{backgroundColor:COLORS.primary},
  toggleText:{color:COLORS.textSecondary,fontWeight:'600'},
  toggleTextActive:{color:'#fff'},
  inputRow:{flexDirection:'row',gap:10},
  inputGroup:{flex:1},
  inputLabel:{color:COLORS.textSecondary,fontSize:12,marginBottom:6},
  input:{backgroundColor:COLORS.surface,borderRadius:10,paddingHorizontal:12,paddingVertical:10,color:COLORS.text,fontSize:16,borderWidth:1,borderColor:COLORS.border},
  goalGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  goalCard:{width:'47%',backgroundColor:COLORS.surface,borderRadius:12,padding:14,borderWidth:1,borderColor:COLORS.border},
  goalCardActive:{borderColor:COLORS.primary,backgroundColor:'#1E1A4A'},
  goalIcon:{fontSize:24,marginBottom:6},
  goalLabel:{color:COLORS.text,fontSize:14,fontWeight:'700'},
  goalLabelActive:{color:COLORS.primary},
  goalDesc:{color:COLORS.textSecondary,fontSize:11,marginTop:3},
  activityRow:{flexDirection:'row',alignItems:'center',paddingVertical:10,paddingHorizontal:12,borderRadius:10,marginBottom:6,backgroundColor:COLORS.surface,gap:12},
  activityRowActive:{backgroundColor:'#1A1A3A'},
  radioCircle:{width:18,height:18,borderRadius:9,borderWidth:2,borderColor:COLORS.border},
  radioActive:{borderColor:COLORS.primary,backgroundColor:COLORS.primary},
  activityLabel:{color:COLORS.text,fontSize:14,fontWeight:'600'},
  activityDesc:{color:COLORS.textSecondary,fontSize:12},
  freqRow:{flexDirection:'row',justifyContent:'space-between'},
  freqBtn:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.border},
  freqBtnActive:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  freqText:{color:COLORS.textSecondary,fontWeight:'700'},
  freqTextActive:{color:'#fff'},
  caloriesRow:{flexDirection:'row',alignItems:'flex-end',marginBottom:14},
  caloriesBig:{color:COLORS.accent,fontSize:40,fontWeight:'800'},
  caloriesUnit:{color:COLORS.textSecondary,fontSize:14,marginBottom:6},
  saveBtn:{backgroundColor:COLORS.primary,borderRadius:16,paddingVertical:16,alignItems:'center',marginTop:8},
  saveBtnText:{color:'#fff',fontSize:16,fontWeight:'800'},
});
