// src/screens/BudgetScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabaseClient';

export default function BudgetScreen() {
  const [presupuestos, setPresupuestos] = useState([]);
  const [gastos, setGastos] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: presupuestosData } = await supabase.from('presupuestos').select('*');
    const { data: gastosData } = await supabase.from('gastos').select('*');
    setPresupuestos(presupuestosData || []);
    setGastos(gastosData || []);
  };

  const calcularRestante = (categoria: string, total: number) => {
    const totalGastos = gastos
      .filter((g) => g.categoria === categoria)
      .reduce((sum, g) => sum + g.monto, 0);
    return total - totalGastos;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Presupuestos</Text>
      <FlatList
        data={presupuestos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const restante = calcularRestante(item.categoria, item.total);
          return (
            <View style={styles.item}>
              <Text style={styles.categoria}>{item.categoria}</Text>
              <Text>Total: ${item.total}</Text>
              <Text>Disponible: ${restante}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  item: {
    backgroundColor: '#f2f2f2',
    padding: 16,
    marginBottom: 10,
    borderRadius: 8,
  },
  categoria: { fontSize: 18, fontWeight: '600' },
});
