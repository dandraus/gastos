// src/screens/CreateExpenseScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, ActivityIndicator } from 'react-native'; // Añadido ActivityIndicator
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabaseClient';

interface Presupuesto {
  id: string;
  categoria: string;
  monto: number;
  usuario_id: string;
}

export default function CreateExpenseScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  // Tipado explícito y estado inicial correcto
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [selectedPresupuestoId, setSelectedPresupuestoId] = useState<string | null>(null); // Permitir null
  // Usar null para indicar que no se ha calculado o no aplica
  const [restante, setRestante] = useState<number | null>(null);
  const [isLoadingPresupuestos, setIsLoadingPresupuestos] = useState(true); // Para indicar carga de presupuestos
  const [isCalculatingRestante, setIsCalculatingRestante] = useState(false); // Para indicar cálculo
  const [isSaving, setIsSaving] = useState(false); // Para deshabilitar botón al guardar

  // Eliminado el estado 'monto' que no se usaba

  useEffect(() => {
    fetchPresupuestos();
  }, []);

  const fetchPresupuestos = async () => {
    setIsLoadingPresupuestos(true); // Inicia carga
    setPresupuestos([]); // Limpia antes de cargar
    const { data, error } = await supabase
      .from('presupuestos')
      .select('*');

    setIsLoadingPresupuestos(false); // Termina carga

    if (error) {
      Alert.alert('Error', 'No se pudieron cargar los presupuestos.');
      console.error('Error fetching presupuestos:', error);
    } else {
      setPresupuestos(data || []); // Asegura que sea un array
    }
  };

  // --- Función corregida ---
  const calcularRestante = async (presupuestoId: string | null) => {
    // Si no hay ID seleccionado (o es el placeholder), resetea el restante
    if (!presupuestoId) {
      setRestante(null);
      return;
    }

    const presupuestoSeleccionado = presupuestos.find(p => p.id === presupuestoId);
    if (!presupuestoSeleccionado) {
      setRestante(null); // Presupuesto no encontrado
      return;
    }

    setIsCalculatingRestante(true); // Inicia cálculo
    setRestante(null); // Resetea mientras calcula

    try {
      // 1. Obtener el monto total del presupuesto seleccionado
      const montoPresupuesto = presupuestoSeleccionado.monto;

      // 2. Obtener la suma de todos los gastos para ese presupuesto_id
      const { data: gastosData, error: gastosError } = await supabase
        .from('gastos') // Asegúrate que la tabla se llame 'gastos'
        .select('monto')
        .eq('presupuesto_id', presupuestoId); // Filtra por el ID del presupuesto

      if (gastosError) {
        throw gastosError; // Lanza el error para ser capturado por el catch
      }

      // 3. Calcular el total gastado
      const totalGastado = gastosData.reduce((sum, gasto) => sum + gasto.monto, 0);

      // 4. Calcular y establecer el restante
      setRestante(montoPresupuesto - totalGastado);

    } catch (error) {
      Alert.alert('Error', 'No se pudo calcular el monto restante.');
      console.error('Error calculating restante:', error);
      setRestante(null); // Resetea en caso de error
    } finally {
      setIsCalculatingRestante(false); // Termina cálculo
    }
  };

  const handleSave = async () => {
    // Validaciones iniciales
    if (!amount || !description || !selectedPresupuestoId) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
       Alert.alert('Error', 'El monto debe ser un número positivo.');
       return;
    }

    // Verifica si el gasto excede el presupuesto restante (opcional pero recomendado)
    if (restante !== null && numericAmount > restante) {
        Alert.alert('Advertencia', `El monto ingresado ($${numericAmount.toFixed(2)}) excede el presupuesto restante ($${restante.toFixed(2)}). ¿Desea continuar?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Continuar', onPress: () => proceedWithSave(numericAmount) } // Llama a otra función para guardar
        ]);
        return; // Detiene la ejecución aquí hasta que el usuario decida
    }

    // Si no excede o no se pudo calcular el restante, procede directamente
    proceedWithSave(numericAmount);
  };


  // Función separada para proceder con el guardado
  const proceedWithSave = async (numericAmount: number) => {
    setIsSaving(true); // Inicia guardado

    const selectedPresupuesto = presupuestos.find(p => p.id === selectedPresupuestoId);
    if (!selectedPresupuesto) {
      Alert.alert('Error', 'Presupuesto seleccionado no válido.');
      setIsSaving(false);
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      Alert.alert('Error', 'Usuario no autenticado.');
      console.error('Error getting user:', userError);
      setIsSaving(false);
      return;
    }

    try {
      const { error: insertError } = await supabase.from('gastos').insert([
        {
          monto: numericAmount,
          descripcion: description,
          presupuesto_id: selectedPresupuestoId, // Correcto: ID de relación
          // --- Corregido: obtener el nombre de la categoría del objeto ---
          categoria: selectedPresupuesto.categoria,
          usuario_id: user.id,
        },
      ]);

      if (insertError) {
        throw insertError; // Lanza para el catch
      }

      Alert.alert('Éxito', 'Gasto registrado correctamente.');
      // Opcional: Refrescar datos en la pantalla anterior si es necesario antes de volver
      navigation.goBack();

    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el gasto.');
      console.error('Error saving expense:', error);
    } finally {
      setIsSaving(false); // Termina guardado (en éxito o error)
    }
  };

  // --- Renderizado ---
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Monto</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        placeholder="Ingresa el monto"
        editable={!isSaving} // No editable mientras guarda
      />

      <Text style={styles.label}>Descripción</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Descripción del gasto"
        editable={!isSaving}
      />

      <Text style={styles.label}>Categoría (Presupuesto)</Text>
      {isLoadingPresupuestos ? (
        <ActivityIndicator size="small" color="#0000ff" style={styles.indicator} />
      ) : (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedPresupuestoId}
            // Llama a calcularRestante cuando cambia el valor
            onValueChange={(itemValue) => {
              setSelectedPresupuestoId(itemValue);
              calcularRestante(itemValue); // Llama a la función corregida
            }}
            enabled={!isSaving} // No habilitado mientras guarda
          >
            {/* Valor null para el placeholder */}
            <Picker.Item label="-- Selecciona un presupuesto --" value={null} />
            {presupuestos.map((presupuesto) => (
              <Picker.Item key={presupuesto.id} label={`${presupuesto.categoria} ($${presupuesto.monto})`} value={presupuesto.id} />
            ))}
          </Picker>
        </View>
      )}

      {/* --- Muestra el restante calculado --- */}
      {isCalculatingRestante && (
        <ActivityIndicator size="small" color="#0000ff" style={styles.indicator} />
      )}
      {/* Muestra solo si hay un ID seleccionado y el cálculo terminó */}
      {selectedPresupuestoId && !isCalculatingRestante && restante !== null && (
         <Text style={[styles.restanteText, restante < 0 ? styles.restanteNegativo : null]}>
           Presupuesto Restante: ${restante.toFixed(2)}
         </Text>
      )}
       {selectedPresupuestoId && !isCalculatingRestante && restante === null && (
         <Text style={styles.errorText}>
           No se pudo calcular el restante.
         </Text>
      )}


      <Button
        title={isSaving ? "Guardando..." : "Guardar gasto"}
        onPress={handleSave}
        disabled={isSaving || isLoadingPresupuestos || isCalculatingRestante} // Deshabilitado si está ocupado
      />
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa', // Fondo un poco más suave
  },
  label: {
    marginTop: 16,
    marginBottom: 4, // Espacio antes del input/picker
    fontWeight: 'bold',
    fontSize: 16, // Ligeramente más grande
    color: '#495057', // Color de texto más oscuro
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da', // Borde más suave
    backgroundColor: '#ffffff', // Fondo blanco
    paddingHorizontal: 12, // Padding horizontal
    paddingVertical: 10, // Padding vertical
    marginTop: 4,
    borderRadius: 8,
    fontSize: 16,
  },
  pickerContainer: { // Contenedor para el borde del Picker
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#ffffff',
  },
  indicator: {
    marginTop: 10,
    alignSelf: 'center', // Centrar indicador
  },
  restanteText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745', // Verde para positivo
    textAlign: 'center', // Centrado
  },
  restanteNegativo: {
     color: '#dc3545', // Rojo para negativo
  },
  errorText: {
    marginTop: 15,
    fontSize: 14,
    color: '#6c757d', // Gris para mensajes informativos/error leve
    textAlign: 'center',
  },
  // Estilos adicionales para el botón (opcional)
  button: {
    marginTop: 24,
    backgroundColor: '#007bff', // Azul primario
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  }
});