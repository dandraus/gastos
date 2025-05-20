import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet, Dimensions, TouchableOpacity
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { formatNumber } from '../utils/format';

const screenWidth = Dimensions.get('window').width;


export default function SummaryScreen() {
  const [presupuestos, setPresupuestos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const fetchData = async () => {
    setLoading(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId || userError) {
      setLoading(false);
      return;
    }
    const { data: presupuestosData } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('usuario_id', userId);
    const { data: gastosData } = await supabase
      .from('gastos')
      .select('*')
      .eq('usuario_id', userId);
    setPresupuestos(presupuestosData || []);
    setGastos(gastosData || []);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // Cálculos resumen con memoización
  const totalGastado = useMemo(
    () => gastos.reduce((sum, g) => sum + g.monto, 0),
    [gastos]
  );
  const totalRestante = useMemo(
    () =>
      presupuestos.reduce((sum, p) => {
        const gastadoCategoria = gastos
          .filter((g) => g.categoria === p.categoria)
          .reduce((acc, g) => acc + g.monto, 0);
        const rem = p.monto - gastadoCategoria;
        return sum + (rem > 0 ? rem : 0);
      }, 0),
    [presupuestos, gastos]
  );

  const calcularGastado = (categoria: string) =>
    gastos.filter((g) => g.categoria === categoria).reduce((acc, g) => acc + g.monto, 0);

  const gastosPorCategoria = gastos.reduce((acc: Record<string, number>, gasto) => {
    acc[gasto.categoria] = (acc[gasto.categoria] || 0) + gasto.monto;
    return acc;
  }, {});

  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#00C49F', '#FFBB28'];

  const handlePress = (presupuesto: any) => {
    navigation.navigate('BudgetDetailScreen', { budget: presupuesto });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
    >
      <Text style={styles.title}>Resumen de Presupuestos</Text>

      {/* Resumen Totales */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Total Gastado: ${formatNumber(totalGastado)}
        </Text>
        <Text style={styles.summaryText}>
          Total Restante: ${formatNumber(totalRestante)}
        </Text>
      </View>

      {gastos.length > 0 && (
        <>
          <Text style={styles.graphTitle}>Distribución de Gastos</Text>
          <PieChart
            data={Object.keys(gastosPorCategoria).map((cat, index) => ({
              name: cat,
              amount: gastosPorCategoria[cat],
              color: colors[index % colors.length],
              legendFontColor: '#7F7F7F',
              legendFontSize: 12,
            }))}
            width={screenWidth}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </>
      )}

      {presupuestos.length > 0 && (
        <>
          <Text style={styles.graphTitle}>Presupuesto vs Gastado</Text>
          <BarChart
            data={{
              labels: presupuestos.map((p) => p.categoria),
              datasets: [
                {
                  data: presupuestos.map((p) => calcularGastado(p.categoria)),
                },
              ],
            }}
            width={screenWidth}
            height={280}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForBackgroundLines: { stroke: '#e3e3e3' },
            }}
            verticalLabelRotation={30}
          />
        </>
      )}

      {presupuestos.map((p) => {
        const gastado = calcularGastado(p.categoria);
        const restante = p.monto - gastado;
        return (
          <TouchableOpacity
            key={p.id}
            style={styles.card}
            onPress={() => handlePress(p)}
          >
            <Text style={styles.categoria}>{p.categoria}</Text>
            <Text>Monto asignado: ${formatNumber(p.monto)}</Text>
            <Text>Gastado: ${formatNumber(gastado)}</Text>
            <Text style={{ color: restante < 0 ? 'red' : 'green' }}>
              Restante: ${formatNumber(Math.max(0, restante))}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  summaryText: { fontSize: 16, fontWeight: '500' },
  card: { backgroundColor: '#f0f0f0', padding: 16, borderRadius: 10, marginBottom: 12 },
  categoria: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  graphTitle: { fontSize: 20, fontWeight: '600', marginVertical: 10, textAlign: 'center' },
});

export default SummaryScreen;
