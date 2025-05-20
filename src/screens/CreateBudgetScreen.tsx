import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../hooks/useUser';

export default function CreateBudgetScreen() {
  const { user } = useUser();
  const [categoria, setCategoria] = useState('');
  const [monto, setMonto] = useState('');

  const handleGuardar = async () => {
    if (!categoria || !monto) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      Alert.alert('Error', 'El monto debe ser un número válido y mayor a cero.');
      return;
    }

    const { error } = await supabase.from('presupuestos').insert({
      usuario_id: user.id,
      categoria,
      monto: montoNum,
    });

    if (error) {
      Alert.alert('Error', 'No se pudo guardar el presupuesto.');
      console.error(error);
    } else {
      Alert.alert('Éxito', 'Presupuesto guardado correctamente.');
      setCategoria('');
      setMonto('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Categoría</Text>
      <TextInput
        value={categoria}
        onChangeText={setCategoria}
        placeholder="Ej: Mercado"
        style={styles.input}
      />

      <Text style={styles.label}>Monto</Text>
      <TextInput
        value={monto}
        onChangeText={setMonto}
        placeholder="Ej: 200000"
        keyboardType="numeric"
        style={styles.input}
      />

      <Button title="Guardar presupuesto" onPress={handleGuardar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontSize: 16, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
});
