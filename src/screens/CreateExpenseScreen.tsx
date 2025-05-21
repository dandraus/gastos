import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabaseClient';
import { PeriodoContext } from '../context/PeriodoContext';

interface Presupuesto {
  id: string;
  categoria: string;
  monto: number;
  usuario_id: string;
  periodo: string;
}
interface Medio {
  id: string;
  nombre: string;
}

export default function CreateExpenseScreen({ navigation }) {
  const { periodo } = useContext(PeriodoContext);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [selectedPresupuestoId, setSelectedPresupuestoId] = useState<string | null>(null);
  const [medios, setMedios] = useState<Medio[]>([]);
  const [selectedMedioId, setSelectedMedioId] = useState<string | null>(null);
  const [restante, setRestante] = useState<number | null>(null);
  const [isLoadingPresupuestos, setIsLoadingPresupuestos] = useState(true);
  const [isLoadingMedios, setIsLoadingMedios] = useState(true);
  const [isCalculatingRestante, setIsCalculatingRestante] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load budgets and payment methods for the current period
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingPresupuestos(true);
      setIsLoadingMedios(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          Alert.alert('Error', 'Usuario no autenticado.');
          return;
        }
        const mesInicio = `${periodo}-01`;
        // Fetch presupuestos
        const { data: presData, error: presError } = await supabase
          .from('presupuestos')
          .select('*')
          .eq('usuario_id', user.id)
          .eq('periodo', mesInicio)
          .order('categoria', { ascending: true });
        if (presError) {
          console.error('Error loading budgets:', presError);
        } else {
          setPresupuestos(presData ?? []);
        }
        // Fetch medios
        const { data: mediosData, error: mediosError } = await supabase
          .from('medios')
          .select('id, nombre')
          .order('nombre', { ascending: true });
        if (mediosError) {
          console.error('Error loading medios:', mediosError);
        } else {
          setMedios(mediosData ?? []);
        }
      } catch (error) {
        console.error('Fetch budgets/medios exception:', error);
      } finally {
        setIsLoadingPresupuestos(false);
        setIsLoadingMedios(false);
      }
    };
    fetchData();
  }, [periodo]);

  // Calculate remaining budget for selected presupuesto
  const calcularRestante = async (presupuestoId: string | null) => {
    if (!presupuestoId) {
      setRestante(null);
      return;
    }
    const pres = presupuestos.find(p => p.id === presupuestoId);
    if (!pres) {
      setRestante(null);
      return;
    }
    setIsCalculatingRestante(true);
    try {
      const mesInicio = `${periodo}-01`;
      const { data: gastosData, error: gastosError } = await supabase
        .from('gastos')
        .select('monto')
        .eq('presupuesto_id', presupuestoId)
        .eq('periodo', mesInicio);
      if (gastosError) throw gastosError;
      const totalGastado = gastosData.reduce((sum, g) => sum + g.monto, 0);
      setRestante(pres.monto - totalGastado);
    } catch (error) {
      console.error('Error calculating restante:', error);
      setRestante(null);
    } finally {
      setIsCalculatingRestante(false);
    }
  };

  // Validate inputs and save expense
  const handleSave = async () => {
    if (!amount || !description || !selectedPresupuestoId || !selectedMedioId) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'El monto debe ser un número positivo.');
      return;
    }
    if (restante !== null && numericAmount > restante) {
      Alert.alert(
        'Advertencia',
        `El monto ingresado excede el presupuesto restante (${restante.toFixed(2)}).`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => proceedWithSave(numericAmount) },
        ]
      );
      return;
    }
    proceedWithSave(numericAmount);
  };

  // Insert expense into Supabase
  const proceedWithSave = async (numericAmount: number) => {
    setIsSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError;
      const pres = presupuestos.find(p => p.id === selectedPresupuestoId);
      const categoria = pres?.categoria;
      if (!categoria) throw new Error('Categoría no encontrada');
      const { error } = await supabase.from('gastos').insert([
        {
          monto: numericAmount,
          descripcion: description,
          presupuesto_id: selectedPresupuestoId,
          usuario_id: user.id,
          periodo: `${periodo}-01`,
          medio_id: selectedMedioId,
          categoria,
        },
      ]);
      if (error) throw error;
      Alert.alert('Éxito', 'Gasto registrado correctamente.');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving expense:', error);
      Alert.alert('Error', 'No se pudo guardar el gasto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Monto</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        placeholder="Ingresa el monto"
        editable={!isSaving}
      />

      <Text style={styles.label}>Descripción</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Descripción del gasto"
        editable={!isSaving}
      />

      <Text style={styles.label}>Medio de Pago</Text>
      {isLoadingMedios ? (
        <ActivityIndicator size="small" color="#0000ff" style={styles.indicator} />
      ) : (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedMedioId}
            onValueChange={val => setSelectedMedioId(val)}
            enabled={!isSaving}
          >
            <Picker.Item label="-- Selecciona el medio --" value={null} />
            {medios.map(m => (
              <Picker.Item key={m.id} label={m.nombre} value={m.id} />
            ))}
          </Picker>
        </View>
      )}

      <Text style={styles.label}>Presupuesto ({periodo})</Text>
      {isLoadingPresupuestos ? (
        <ActivityIndicator size="small" color="#0000ff" style={styles.indicator} />
      ) : (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedPresupuestoId}
            onValueChange={val => {
              setSelectedPresupuestoId(val);
              calcularRestante(val);
            }}
            enabled={!isSaving}
          >
            <Picker.Item label="-- Selecciona un presupuesto --" value={null} />
            {presupuestos.map(p => (
              <Picker.Item
                key={p.id}
                label={`${p.categoria} (${p.monto.toFixed(2)})`}
                value={p.id}
              />
            ))}
          </Picker>
        </View>
      )}

      {isCalculatingRestante && <ActivityIndicator size="small" color="#0000ff" style={styles.indicator} />}
      {!isCalculatingRestante && restante !== null && (
        <Text style={[styles.restanteText, restante < 0 && styles.restanteNegativo]}>
          Restante: {restante.toFixed(2)}
        </Text>
      )}

      <Button
        title={isSaving ? 'Guardando...' : 'Guardar gasto'}
        onPress={handleSave}
        disabled={isSaving || isLoadingPresupuestos || isCalculatingRestante || isLoadingMedios}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  label: {
    marginTop: 16,
    marginBottom: 4,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#495057',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  indicator: {
    marginVertical: 10,
    alignSelf: 'center',
  },
  restanteText: {
    fontSize: 16,
    marginBottom: 16,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
  },
  restanteNegativo: {
    color: '#dc3545',
  },
});
