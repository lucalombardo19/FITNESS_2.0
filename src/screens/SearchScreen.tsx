import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { COLORS, DIETARY_PREFERENCES, DIETARY_LABELS } from '../constants';
import { GradientCard } from '../components/GradientCard';
import { ChipSelect } from '../components/ChipSelect';
import { MacroBar } from '../components/MacroBar';
import fitnessAPI from '../services/api';
import { NutritionResult } from '../types';

type SearchMode = 'semantic' | 'hybrid' | 'basic';
const MODE_LABELS = { semantic: '\ud83e\udde0 Semantica', hybrid: '\ud83d� Ibrida', basic: '\ud83d� Base' };

const SUGGESTIONS = ['colazione proteica','pollo petto alto proteico','carboidrati complessi','snack pre-workout','verdure a basso contenuto calorico','frutta ad alto potassio'];

export const SearchScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('hybrid');
  const [dietary, setDietary] = useState<string[]>([]);
  const [results, setResults] = useState<NutritionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<NutritionResult | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setResults([]); setSelected(null); setSearched(true);
    try {
      let data: NutritionResult[] = [];
      if (mode === 'semantic') { const r = await fitnessAPI.searchNutritionSemantic({ query: query.trim(), dietary_restrictions: dietary.length ? dietary : undefined, limit: 15 }); data = r.results ?? []; }
      else if (mode === 'hybrid') { const r = await fitnessAPI.searchNutritionHybrid(query.trim(), 15, dietary.length ? dietary : undefined); data = r.results ?? []; }
      else { data = await fitnessAPI.searchNutritionBasic(query.trim(), 15); }
      setResults(data);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Ricerca fallita. Verifica la connessione al backend.');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <GradientCard style={styles.card}>
          <Text style={styles.searchLabel}>Cerca alimenti</Text>
          <View style={styles.inputRow}>
            <TextInput ref={inputRef} style={styles.input} value={query} onChangeText={setQuery} placeholder='Es: "colazione proteica"...' placeholderTextColor={COLORS.textMuted} returnKeyType="search" onSubmitEditing={handleSearch} autoCorrect={false} />
            <TouchableOpacity style={[styles.searchBtn, !query.trim() && styles.searchBtnDisabled]} onPress={handleSearch} disabled={!query.trim() || loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchBtnText}>\ud83d\udd0d</Text>}
            </TouchableOpacity>
          </View>
          <Text style={styles.modeLabel}>Modalit\u00e0</Text>
          <View style={styles.modeRow}>
            {(['semantic','hybrid','basic'] as SearchMode[]).map((m) => (
              <TouchableOpacity key={m} style={[styles.modeBtn, mode === m && styles.modeBtnActive]} onPress={() => setMode(m)}>
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>{MODE_LABELS[m]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.modeLabel}>Filtri dietetici</Text>
          <ChipSelect options={DIETARY_PREFERENCES} labels={DIETARY_LABELS} selected={dietary} onChange={setDietary} />
        </GradientCard>

        {!searched && (
          <GradientCard style={styles.card}>
            <Text style={styles.suggestTitle}>\ud83d\udca1 Suggerimenti</Text>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={styles.suggestChip} onPress={() => { setQuery(s); setTimeout(handleSearch, 100); }}>
                <Text style={styles.suggestText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </GradientCard>
        )}

        {error ? <GradientCard variant="danger" style={styles.card}><Text style={styles.errorText}>\u26a0\ufe0f {error}</Text></GradientCard> : null}

        {selected && (
          <GradientCard variant="accent" style={styles.card}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailName}>{selected.name}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}><Text style={styles.closeBtn}>\u2715</Text></TouchableOpacity>
            </View>
            {selected.brand && <Text style={styles.detailBrand}>{selected.brand}</Text>}
            <View style={styles.calorieRow}><Text style={styles.caloriesBig}>{Math.round(selected.calories_per_100g)}</Text><Text style={styles.caloriesUnit}> kcal / 100g</Text></View>
            <MacroBar label="Proteine" value={selected.protein_g} color={COLORS.primary} max={50} />
            <MacroBar label="Carboidrati" value={selected.carbs_g} color={COLORS.accent} max={100} />
            <MacroBar label="Grassi" value={selected.fat_g} color={COLORS.secondary} max={50} />
            {selected.fiber_g != null && <MacroBar label="Fibre" value={selected.fiber_g} color={COLORS.warning} max={20} />}
            {selected.similarity_score != null && <Text style={styles.scoreText}>Rilevanza: {(selected.similarity_score * 100).toFixed(0)}%</Text>}
          </GradientCard>
        )}

        {results.length > 0 && (
          <><Text style={styles.resultCount}>{results.length} risultati trovati</Text>
          {results.map((item, i) => (
            <TouchableOpacity key={i} onPress={() => setSelected(item)}>
              <GradientCard style={styles.resultCard} variant={selected?.name === item.name ? 'accent' : 'default'}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultInfo}><Text style={styles.resultName}>{item.name}</Text>{item.brand && <Text style={styles.resultBrand}>{item.brand}</Text>}</View>
                  <View style={styles.resultMacros}><Text style={styles.resultCal}>{Math.round(item.calories_per_100g)} kcal</Text><Text style={styles.resultPer}>/ 100g</Text></View>
                </View>
                <View style={styles.macroMini}>
                  <Text style={styles.macroMiniText}>P: {item.protein_g.toFixed(1)}g</Text>
                  <Text style={styles.macroMiniText}>C: {item.carbs_g.toFixed(1)}g</Text>
                  <Text style={styles.macroMiniText}>F: {item.fat_g.toFixed(1)}g</Text>
                  {item.similarity_score != null && <Text style={[styles.macroMiniText,{color:COLORS.accent}]}>{(item.similarity_score*100).toFixed(0)}% match</Text>}
                </View>
              </GradientCard>
            </TouchableOpacity>
          ))}</>
        )}

        {searched && !loading && results.length === 0 && !error && (
          <GradientCard style={styles.card}>
            <Text style={styles.emptyText}>Nessun risultato per "{query}"</Text>
            <Text style={styles.emptyHint}>Prova con termini diversi o verifica la connessione.</Text>
          </GradientCard>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.background},scroll:{padding:16,paddingTop:20,paddingBottom:40},card:{marginBottom:14},
  searchLabel:{color:COLORS.text,fontWeight:'700',fontSize:15,marginBottom:10},
  inputRow:{flexDirection:'row',gap:10,marginBottom:14},
  input:{flex:1,backgroundColor:COLORS.surface,borderRadius:12,paddingHorizontal:14,paddingVertical:12,color:COLORS.text,fontSize:14,borderWidth:1,borderColor:COLORS.border},
  searchBtn:{width:50,height:50,borderRadius:12,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center'},
  searchBtnDisabled:{backgroundColor:COLORS.textMuted},searchBtnText:{fontSize:20},
  modeLabel:{color:COLORS.textSecondary,fontSize:12,marginBottom:6,marginTop:4},
  modeRow:{flexDirection:'row',gap:8,marginBottom:4},
  modeBtn:{flex:1,paddingVertical:8,borderRadius:10,backgroundColor:COLORS.surface,alignItems:'center',borderWidth:1,borderColor:COLORS.border},
  modeBtnActive:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  modeBtnText:{color:COLORS.textSecondary,fontSize:11,fontWeight:'600'},modeBtnTextActive:{color:'#fff'},
  suggestTitle:{color:COLORS.textSecondary,fontSize:13,marginBottom:10},
  suggestChip:{paddingVertical:8,paddingHorizontal:4,borderBottomWidth:1,borderBottomColor:COLORS.border},
  suggestText:{color:COLORS.primary,fontSize:13},
  errorText:{color:COLORS.error,fontSize:13},
  detailHeader:{flexDirection:'row',justifyContent:'space-between',marginBottom:4},
  detailName:{color:COLORS.text,fontSize:16,fontWeight:'800',flex:1},
  closeBtn:{color:COLORS.textMuted,fontSize:18,paddingLeft:8},
  detailBrand:{color:COLORS.textSecondary,fontSize:12,marginBottom:12},
  calorieRow:{flexDirection:'row',alignItems:'flex-end',marginBottom:14},
  caloriesBig:{color:COLORS.accent,fontSize:36,fontWeight:'800'},caloriesUnit:{color:COLORS.textSecondary,fontSize:13,marginBottom:5},
  scoreText:{color:COLORS.accent,fontSize:12,marginTop:8,textAlign:'right'},
  resultCount:{color:COLORS.textSecondary,fontSize:12,marginBottom:8},
  resultCard:{marginBottom:8},
  resultHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},
  resultInfo:{flex:1,paddingRight:8},resultName:{color:COLORS.text,fontSize:13,fontWeight:'600'},resultBrand:{color:COLORS.textMuted,fontSize:11},
  resultMacros:{alignItems:'flex-end'},resultCal:{color:COLORS.primary,fontSize:15,fontWeight:'700'},resultPer:{color:COLORS.textMuted,fontSize:10},
  macroMini:{flexDirection:'row',gap:8,marginTop:8},macroMiniText:{color:COLORS.textSecondary,fontSize:11},
  emptyText:{color:COLORS.text,fontSize:15,textAlign:'center',marginBottom:6},emptyHint:{color:COLORS.textSecondary,fontSize:12,textAlign:'center'},
});
