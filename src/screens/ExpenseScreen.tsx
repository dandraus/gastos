// src/screens/ExpenseScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import dayjs from 'dayjs';

export default function ExpenseScreen() {
  const [expenses, setExpenses] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (data) setExpenses(data);
  };

  const handleAddExpense = async () => {
    if (!description || !amount) return;
    await supabase.from('expenses').insert([
      {
        description,
        amount: parseFloat(amount),
        date: new Date().toISOString(),
      },
    ]);
    setDescription('');
    setAmount('');
    fetchExpenses();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agregar Gasto</Text>
      <TextInput
        placeholder="Descripción"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
      />
      <TextInput
        placeholder="Monto"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={styles.input}
      />
      <Button title="Agregar Gasto" onPress={handleAddExpense} />
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text>
            {item.description}  ${item.amount} ({dayjs(item.date).format('DD/MM/YYYY')})
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    padding: 8,
    marginBottom: 12,
    borderRadius: 4,
  },
});
