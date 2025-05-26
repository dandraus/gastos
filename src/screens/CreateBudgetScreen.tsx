import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../hooks/useUser';
import { PeriodoContext } from '../context/PeriodoContext';

interface BudgetItem {
  id: string;
  categoria: string;
  monto: number;
  periodo: string;
}

// Formatear número con puntos de miles y millones
const formatNumber = (value: number): string => {
  const parts = value.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join('.');
};

export default function CreateBudgetScreen() {
  const { user } = useUser();
  const { periodo, setPeriodo } = useContext(PeriodoContext); // YYYY-MM

  const [categoria, setCategoria] = useState('');
  const [monto, setMonto] = useState('');
  const [saving, setSaving] = useState(false);
  const [duplicatingOne, setDuplicatingOne] = useState(false);
  const [duplicatingAll, setDuplicatingAll] = useState(false);
  const [budgetsList, setBudgetsList] = useState<BudgetItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch budgets list for current period
  const fetchList = async () => {
    setLoadingList(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) { setLoadingList(false); return; }
    const mesInicio = `${periodo}-01`;
    const { data, error } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('usuario_id', userId)
      .eq('periodo', mesInicio)
      .order('categoria', { ascending: true });
    if (!error) setBudgetsList(data || []);
    setLoadingList(false);
  };

  useEffect(() => { fetchList(); }, [periodo]);

  // Populate form for editing
  const editBudget = (item: BudgetItem) => {
    setCategoria(item.categoria);
    setMonto(item.monto.toString());
    setSelectedId(item.id);
  };

  // Validate inputs
  const validar = () => {
    if (!categoria || !monto) { Alert.alert('Error', 'Completa todos los campos.'); return false; }
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) { Alert.alert('Error', 'Monto debe ser > 0.'); return false; }
    return true;
  };

  // Reset form
  const resetForm = () => { setCategoria(''); setMonto(''); setSelectedId(null); };

  // Calculate next period string
  const getNextPeriodo = () => {
    const [year, month] = periodo.split('-').map(n=>parseInt(n,10));
    const d = new Date(year, month, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  };

  // Save or update budget
  const handleGuardar = async () => {
    if (!validar()) return;
    setSaving(true);
    try {
      const m = parseFloat(monto);
      const periodoFecha = `${periodo}-01`;
      if (selectedId) {
        const { error } = await supabase.from('presupuestos').update({ categoria, monto: m, periodo: periodoFecha }).eq('id', selectedId);
        if (error) throw error;
        Alert.alert('Éxito', 'Presupuesto actualizado.');
      } else {
        const { error } = await supabase.from('presupuestos').insert({ usuario_id: user.id, categoria, monto: m, periodo: periodoFecha });
        if (error) throw error;
        Alert.alert('Éxito', 'Presupuesto creado.');
      }
      await fetchList(); resetForm();
    } catch (e) { console.error(e); Alert.alert('Error', 'No se guardó.'); }
    finally { setSaving(false); }
  };

  // Duplicate single budget
  const handleDuplicarUno = async () => {
    if (!selectedId) return;
    setDuplicatingOne(true);
    try {
      const item = budgetsList.find(b=>b.id===selectedId)!;
      const nextPeriodo = getNextPeriodo();
      const { data: exist } = await supabase.from('presupuestos').select('id').eq('usuario_id',user.id).eq('categoria',item.categoria).eq('periodo',nextPeriodo).single();
      if (exist) Alert.alert('Aviso', `Ya existe "${item.categoria}" para ${nextPeriodo.slice(0,7)}.`);
      else {
        const { error } = await supabase.from('presupuestos').insert({ usuario_id:user.id,categoria:item.categoria,monto:item.monto,periodo:nextPeriodo });
        if (error) throw error;
        Alert.alert('Éxito', `Duplicado para ${nextPeriodo.slice(0,7)}.`);
      }
      await fetchList();
    } catch (e) { console.error(e); Alert.alert('Error','No duplicó.'); }
    finally { setDuplicatingOne(false); }
  };

  // Duplicate all budgets
  const handleDuplicarTodos = async () => {
    setDuplicatingAll(true);
    try {
      const { data: userData } = await supabase.auth.getUser(); const uid=userData?.user?.id; if(!uid) throw new Error();
      const mesInicio = `${periodo}-01`;
      const { data: presData } = await supabase.from('presupuestos').select('*').eq('usuario_id',uid).eq('periodo',mesInicio);
      const nextPeriodo = getNextPeriodo();
      for(const p of presData!){
        const { data: exist } = await supabase.from('presupuestos').select('id').eq('usuario_id',uid).eq('categoria',p.categoria).eq('periodo',nextPeriodo).single();
        if(!exist) await supabase.from('presupuestos').insert({usuario_id:uid,categoria:p.categoria,monto:p.monto,periodo:nextPeriodo});
      }
      Alert.alert('Éxito', `Duplicado de todos para ${nextPeriodo.slice(0,7)}.`);
      await fetchList();
    } catch (e) { console.error(e); Alert.alert('Error','No duplicó todos.'); }
    finally { setDuplicatingAll(false); }
  };

  // Total presupuestos
  const totalPresupuestos = budgetsList.reduce((s,b)=>s+b.monto,0);

  // Month options: next month + last 12 months
  const meses = Array.from({ length: 13 }).map((_,i)=>{
    const d=new Date(); d.setMonth(d.getMonth()+1 - i);
    return d.toISOString().slice(0,7);
  });

  return (
    <View style={styles.container}>
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>Periodo:</Text>
        <Picker selectedValue={periodo} onValueChange={setPeriodo} style={styles.pickerLarge}>
          {meses.map(m=><Picker.Item key={m} label={m} value={m}/>)}
        </Picker>
      </View>

      <Text style={styles.heading}>Presupuestos de {periodo}</Text>
      {loadingList? <ActivityIndicator/> :
        <FlatList data={budgetsList} keyExtractor={i=>i.id}
          renderItem={({item})=>(
            <TouchableOpacity style={styles.listItem} onPress={()=>editBudget(item)}>
              <Text>{item.categoria} - ${formatNumber(item.monto)}</Text>
            </TouchableOpacity>
          )} />
      }
      <Text style={styles.totalText}>Total: ${formatNumber(totalPresupuestos)}</Text>

      <Text style={styles.label}>{selectedId?'Editar Presupuesto':'Nuevo Presupuesto'}</Text>
      <TextInput value={categoria} onChangeText={setCategoria} placeholder="Categoría" style={styles.input} editable={!saving&&!duplicatingOne&&!duplicatingAll}/>
      <TextInput value={monto} onChangeText={setMonto} placeholder="Monto" keyboardType="numeric" style={styles.input} editable={!saving&&!duplicatingOne&&!duplicatingAll}/>

      <Button title={saving?(selectedId?'Actualizando...':'Guardando...'):(selectedId?'Actualizar':'Guardar')} onPress={handleGuardar} disabled={saving||duplicatingOne||duplicatingAll}/>
      {selectedId && (
        <>
          <View style={styles.buttonSpacing}><Button title={duplicatingOne?'Duplicando...':'Duplicar uno'} onPress={handleDuplicarUno} disabled={saving||duplicatingOne||duplicatingAll}/></View>
          <View style={styles.buttonSpacing}><Button title={duplicatingAll?'Duplicando todos...':'Duplicar todos'} onPress={handleDuplicarTodos} disabled={saving||duplicatingOne||duplicatingAll} color="#28a745"/></View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,padding:20,backgroundColor:'#fff'},
  selectorContainer:{flexDirection:'row',alignItems:'center',marginBottom:12},
  selectorLabel:{fontSize:16,fontWeight:'600',marginRight:8},
  pickerLarge:{flex:1,height:50},
  heading:{fontSize:18,fontWeight:'600',marginBottom:10},
  listItem:{padding:10,borderBottomWidth:1,borderColor:'#ccc'},
  totalText:{fontSize:16,fontWeight:'500',marginVertical:12,textAlign:'center'},
  label:{fontSize:16,marginTop:20},
  input:{borderWidth:1,borderColor:'#ccc',borderRadius:8,padding:10,marginTop:8,marginBottom:12},
  buttonSpacing:{marginTop:10},
});
