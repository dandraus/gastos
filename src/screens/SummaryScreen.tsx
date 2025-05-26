import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Button
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import { PieChart } from 'react-native-chart-kit';
import { PeriodoContext } from '../context/PeriodoContext';
import { Picker } from '@react-native-picker/picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import XLSX from 'xlsx';

const screenWidth = Dimensions.get('window').width;

// Formatea número con puntos como separadores de miles y millones, con dos decimales
const formatNumber = (value: number): string => {
  const parts = value.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join('.');
};

// Configuración de los charts
const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
};

interface Medio {
  id: string;
  nombre: string;
}

export default function SummaryScreen() {
  const { periodo, setPeriodo } = useContext(PeriodoContext);
  const [presupuestos, setPresupuestos] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [medios, setMedios] = useState<Medio[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMedios, setLoadingMedios] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) { setLoading(false); return; }
      const mesInicio = `${periodo}-01`;
      const [presRes, gastosRes] = await Promise.all([
        supabase
          .from('presupuestos')
          .select('*')
          .eq('usuario_id', userId)
          .eq('periodo', mesInicio),
        supabase
          .from('gastos')
          .select('*')
          .eq('usuario_id', userId)
          .eq('periodo', mesInicio),
      ]);
      setPresupuestos(presRes.data || []);
      setGastos(gastosRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [periodo]);

  useEffect(() => {
    const fetchMedios = async () => {
      setLoadingMedios(true);
      const { data, error } = await supabase.from('medios').select('id,nombre');
      if (!error) setMedios(data || []);
      setLoadingMedios(false);
    };
    fetchMedios();
  }, []);

  const totalGastado = useMemo(() => gastos.reduce((sum, g) => sum + g.monto, 0), [gastos]);
  const totalRestante = useMemo(
    () => presupuestos.reduce((sum, p) => {
      const gastCat = gastos.filter(g => g.categoria === p.categoria).reduce((a, g) => a + g.monto, 0);
      const rem = p.monto - gastCat;
      return sum + (rem > 0 ? rem : 0);
    }, 0),
    [presupuestos, gastos]
  );

  const gastosPorMedio = useMemo(() => {
    const acc: Record<string, number> = {};
    medios.forEach(m => { acc[m.nombre] = 0; });
    gastos.forEach(g => {
      const name = medios.find(m => m.id === g.medio_id)?.nombre || 'Otro';
      acc[name] = (acc[name] || 0) + g.monto;
    });
    return acc;
  }, [gastos, medios]);

  const gastosPorCategoria = useMemo(() => {
    const acc: Record<string, number> = {};
    presupuestos.forEach(p => { acc[p.categoria] = 0; });
    gastos.forEach(g => { acc[g.categoria] = (acc[g.categoria] || 0) + g.monto; });
    return acc;
  }, [gastos, presupuestos]);

  const meses = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i <= 13; i++) {
      const d = new Date(); d.setMonth(d.getMonth() + 1 - i);
      arr.push(d.toISOString().slice(0, 7));
    }
    return arr;
  }, []);

  const onPressCard = (p: any) => navigation.navigate('BudgetDetailScreen', { budget: p });

  const generatePDF = async () => {
    const html = `
      <html><body>
        <h1>Resumen ${periodo}</h1>
        <p>Gastado: ${formatNumber(totalGastado)}</p>
        <p>Restante: ${formatNumber(totalRestante)}</p>
      </body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  };

  const generateExcel = async () => {
    const ws = XLSX.utils.json_to_sheet(gastos.map(g => ({
      Fecha: g.created_at,
      Categoria: g.categoria,
      Monto: g.monto,
      Medio: medios.find(m => m.id === g.medio_id)?.nombre || 'Otro',
      Descripcion: g.descripcion,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const uri = FileSystem.documentDirectory + `gastos_${periodo}.xlsx`;
    await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
    await Sharing.shareAsync(uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => {}} />}>
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>Periodo:</Text>
        <Picker selectedValue={periodo} onValueChange={setPeriodo} style={styles.pickerLarge} itemStyle={styles.pickerItem}>
          {meses.map(m => <Picker.Item key={m} label={m} value={m} />)}
        </Picker>
      </View>
      <View style={styles.buttonRow}>
        <Button title="Exportar PDF" onPress={generatePDF} />
        <Button title="Exportar Excel" onPress={generateExcel} />
      </View>

      <View style={styles.totalsContainer}>
        <Text style={styles.totalText}>Gastado: ${formatNumber(totalGastado)}</Text>
        <Text style={styles.totalText}>Restante: ${formatNumber(totalRestante)}</Text>
      </View>

      <Text style={styles.chartTitle}>Gastos por Medio</Text>
      {loadingMedios ? <ActivityIndicator /> : (
        <PieChart data={Object.entries(gastosPorMedio).map(([name, amt], idx) => ({ name, amount: amt, color: styles.colors[idx % styles.colors.length], legendFontColor: '#7F7F7F', legendFontSize: 12 }))} width={screenWidth} height={180} chartConfig={chartConfig} accessor="amount" backgroundColor="transparent" paddingLeft="15" absolute />
      )}

      <Text style={styles.chartTitle}>Gastos por Presupuesto</Text>
      <PieChart data={Object.entries(gastosPorCategoria).map(([name, amt], idx) => ({ name, amount: amt, color: styles.colors[idx % styles.colors.length], legendFontColor: '#7F7F7F', legendFontSize: 12 }))} width={screenWidth} height={180} chartConfig={chartConfig} accessor="amount" backgroundColor="transparent" paddingLeft="15" absolute />

      {presupuestos.map(p => {
        const gast = gastosPorCategoria[p.categoria] || 0;
        const rem = p.monto - gast;
        return (
          <TouchableOpacity key={p.id} style={styles.card} onPress={() => onPressCard(p)}>
            <Text style={styles.categoryTitle}>{p.categoria}</Text>
            <Text>Asignado: ${formatNumber(p.monto)}</Text>
            <Text>Gastado: ${formatNumber(gast)}</Text>
            <Text style={{ color: rem < 0 ? 'red' : 'green' }}>Restante: ${formatNumber(rem > 0 ? rem : 0)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  selectorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  selectorLabel: { fontSize: 18, fontWeight: '600', marginRight: 8 },
  pickerLarge: { flex: 1, height: 50 },
  pickerItem: { height: 50 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  totalsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  totalText: { fontSize: 16, fontWeight: '500' },
  chartTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginVertical: 8 },
  colors: ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#00C49F','#FFBB28'],
  card: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 12 },
  categoryTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
});
