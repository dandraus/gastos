import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, Button, Alert, FlatList,
  ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import uuid from 'react-native-uuid';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Budget = { id: string; categoria: string; monto: number };
type Transaction = { id: string; presupuesto_id: string; descripcion: string; monto: string; created_at?: string };
type RouteParams = { params: { budget: Budget } };

const BudgetDetailScreen = () => {
  const route = useRoute<RouteProp<RouteParams>>();
  const navigation = useNavigation();
  const { budget } = route.params;

  const [name, setName] = useState<string>(budget.categoria);
  const [amount, setAmount] = useState<string>(budget.monto.toString());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [newDesc, setNewDesc] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .eq('presupuesto_id', budget.id)
        .order('created_at', { ascending: false });
      setLoading(false);
      if (error) {
        Alert.alert('Error', 'No se pudieron cargar las transacciones.');
      } else {
        const mapped = (data as any[]).map(txn => ({ ...txn, monto: txn.monto.toString() }));
        setTransactions(mapped);
      }
    };
    fetchTransactions();
  }, [budget.id]);

  const handleSaveBudget = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase
      .from('presupuestos')
      .update({ categoria: name, monto: parseFloat(amount) })
      .eq('id', budget.id);
    setLoading(false);
    if (error) {
      Alert.alert('Error', 'No se pudo actualizar el presupuesto.');
    } else {
      Alert.alert('Guardado', 'El presupuesto ha sido actualizado.');
      navigation.goBack();
    }
  }, [name, amount, budget.id]);

  const handleAddTransaction = useCallback(async () => {
    if (!newDesc.trim() || isNaN(parseFloat(newAmount)) || parseFloat(newAmount) <= 0) {
      Alert.alert('Error', 'Ingresá una descripción y un monto válido.');
      return;
    }
    const { data, error } = await supabase
      .from('gastos')
      .insert([{ id: uuid.v4() as string, presupuesto_id: budget.id, descripcion: newDesc, monto: parseFloat(newAmount) }]);
    if (error) {
      Alert.alert('Error', 'No se pudo agregar la transacción.');
      return;
    }
    const mapped = (data as any[]).map(txn => ({ ...txn, monto: txn.monto.toString() }));
    setTransactions(prev => [...prev, ...mapped]);
    setNewDesc('');
    setNewAmount('');
  }, [newDesc, newAmount, budget.id]);

  const handleEditTransaction = useCallback(async (id: string, desc: string, monto: string) => {
    const parsed = parseFloat(monto);
    if (isNaN(parsed)) {
      Alert.alert('Error', 'El monto debe ser un número válido.');
      return;
    }
    const { error } = await supabase
      .from('gastos')
      .update({ descripcion: desc, monto: parsed })
      .eq('id', id);
    if (error) {
      Alert.alert('Error', 'No se pudo actualizar la transacción.');
      return;
    }
    setTransactions(prev => {
      const idx = prev.findIndex(txn => txn.id === id);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], descripcion: desc, monto };
      return updated;
    });
    Alert.alert('Guardado', 'Transacción actualizada.');
  }, []);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (error) {
      Alert.alert('Error', 'No se pudo eliminar la transacción.');
      return;
    }
    setTransactions(prev => prev.filter(txn => txn.id !== id));
  }, []);

  const TransactionItem = React.memo(({ item }: { item: Transaction }) => {
    const [desc, setDesc] = useState<string>(item.descripcion);
    const [mon, setMon] = useState<string>(item.monto);
    return (
      <View style={styles.transactionItem}>
        <TextInput
          style={styles.transactionInput}
          value={desc}
          onChangeText={setDesc}
        />
        <TextInput
          style={styles.transactionInput}
          value={mon}
          onChangeText={setMon}
          keyboardType="numeric"
        />
        <TouchableOpacity onPress={() => handleEditTransaction(item.id, desc, mon)}>
          <Icon name="content-save" size={24} color="#007BFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteTransaction(item.id)}>
          <Icon name="trash-can" size={24} color="#FF4D4D" />
        </TouchableOpacity>
      </View>
    );
  }, (prev, next) => prev.item.id === next.item.id && prev.item.descripcion === next.item.descripcion && prev.item.monto === next.item.monto);

  const headerComponent = useMemo(() => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>Editar Presupuesto</Text>
      <Text style={styles.label}>Nombre</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Text style={styles.label}>Monto</Text>
      <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <Button title="Guardar Cambios" onPress={handleSaveBudget} />
      <Text style={styles.sectionTitle}>Agregar Transacción</Text>
      <View style={styles.transactionItem}>
        <TextInput
          style={styles.transactionInput}
          placeholder="Descripción"
          value={newDesc}
          onChangeText={setNewDesc}
        />
        <TextInput
          style={styles.transactionInput}
          placeholder="Monto"
          value={newAmount}
          onChangeText={setNewAmount}
          keyboardType="numeric"
        />
        <TouchableOpacity onPress={handleAddTransaction}>
          <Icon name="plus-circle" size={28} color="#28A745" />
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Transacciones</Text>
    </View>
  ), [name, amount, newDesc, newAmount, handleSaveBudget, handleAddTransaction]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TransactionItem item={item} />}
          ListHeaderComponent={headerComponent}
          extraData={transactions}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          contentContainerStyle={{ paddingBottom: 300 }}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  headerContainer: { paddingHorizontal: 16, marginTop: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 40, marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '500', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginVertical: 16 },
  transactionItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 16 },
  transactionInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 6 },
});

export default BudgetDetailScreen;
