// App.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, ScrollView, Dimensions } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import { BarChart, PieChart } from 'react-native-chart-kit';

const supabaseUrl = 'https://zswrqbhrxlawnwocyduj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzd3JxYmhyeGxhd253b2N5ZHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxOTg1NDQsImV4cCI6MjA1MTc3NDU0NH0.6th1Cpf63yciic_NpwWg6NDPfuOpJG5cr6SuQi-MKZ4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Category = {
  id: string;
  name: string;
  monthly_budget: number;
  user_id: string;
};

type Expense = {
  id: string;
  category_id: string;
  amount: number;
  description: string;
  date: string;
  category: { name: string };
};

type SummaryItem = {
  name: string;
  budget: number;
  spent: number;
};

export default function App() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [session, setSession] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDesc, setExpenseDesc] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryItem[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchCategories(session.user.id);
        fetchExpenses(session.user.id);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchCategories(session.user.id);
        fetchExpenses(session.user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (categories.length && expenses.length) {
      generateSummary();
    }
  }, [categories, expenses]);

  const fetchCategories = async (userId: string) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);
    if (error) console.error(error);
    else setCategories(data);
  };

  const fetchExpenses = async (userId: string) => {
    const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:categories(name)')
      .eq('user_id', userId)
      .gte('date', startOfMonth)
      .order('date', { ascending: false });
    if (error) console.error(error);
    else setExpenses(data);
  };

  const generateSummary = () => {
    const map: { [key: string]: SummaryItem } = {};
    for (let c of categories) {
      map[c.id] = { name: c.name, budget: parseFloat(c.monthly_budget.toString()), spent: 0 };
    }
    for (let e of expenses) {
      if (map[e.category_id]) {
        map[e.category_id].spent += parseFloat(e.amount.toString());
      }
    }
    setSummary(Object.values(map));
  };

  const handleAddCategory = async () => {
    const { error } = await supabase.from('categories').insert({
      user_id: session.user.id,
      name: newCategory,
      monthly_budget: parseFloat(budget),
    });
    if (error) console.error(error);
    else {
      setNewCategory('');
      setBudget('');
      fetchCategories(session.user.id);
    }
  };

  const handleAddExpense = async () => {
    if (!selectedCategory) return alert('Selecciona un rubro');
    const { error } = await supabase.from('expenses').insert({
      user_id: session.user.id,
      category_id: selectedCategory,
      amount: parseFloat(expenseAmount),
      description: expenseDesc,
      date: new Date().toISOString().split('T')[0],
    });
    if (error) console.error(error);
    else {
      setExpenseAmount('');
      setExpenseDesc('');
      fetchExpenses(session.user.id);
    }
  };

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) console.error(error);
  };

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) console.error(error);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Email:</Text>
        <TextInput value={email} onChangeText={setEmail} style={{ borderWidth: 1, marginBottom: 10 }} />
        <Text>Password:</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, marginBottom: 10 }} />
        <Button title="Sign In" onPress={handleSignIn} />
        <Button title="Sign Up" onPress={handleSignUp} />
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const pieColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#F67019'];

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text>Bienvenido, {session.user.email}</Text>
      <Button title="Sign Out" onPress={handleSignOut} />

      <Text style={{ marginTop: 20 }}>Agregar Rubro:</Text>
      <TextInput placeholder="Nombre" value={newCategory} onChangeText={setNewCategory} style={{ borderWidth: 1, marginBottom: 10 }} />
      <TextInput placeholder="Presupuesto mensual" value={budget} onChangeText={setBudget} keyboardType="numeric" style={{ borderWidth: 1, marginBottom: 10 }} />
      <Button title="Agregar" onPress={handleAddCategory} />

      <Text style={{ marginTop: 20 }}>Agregar Gasto:</Text>
      <TextInput placeholder="Monto" value={expenseAmount} onChangeText={setExpenseAmount} keyboardType="numeric" style={{ borderWidth: 1, marginBottom: 10 }} />
      <TextInput placeholder="Descripción" value={expenseDesc} onChangeText={setExpenseDesc} style={{ borderWidth: 1, marginBottom: 10 }} />
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        horizontal
        renderItem={({ item }) => (
          <Button
            title={item.name}
            onPress={() => setSelectedCategory(item.id)}
            color={selectedCategory === item.id ? 'green' : 'gray'}
          />
        )}
      />
      <Button title="Guardar Gasto" onPress={handleAddExpense} />

      <Text style={{ marginTop: 20 }}>Resumen mensual:</Text>
      <FlatList
        data={summary}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <Text>
            {item.name}: ${item.spent} / ${item.budget} ({((item.spent / item.budget) * 100).toFixed(0)}%)
          </Text>
        )}
      />

      <BarChart
        data={{
          labels: summary.map((s) => s.name),
          datasets: [
            {
              data: summary.map((s) => s.spent),
            },
          ],
        }}
        width={screenWidth - 40}
        height={220}
        yAxisLabel="$"
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        verticalLabelRotation={30}
        style={{ marginVertical: 10 }}
      />

      <PieChart
        data={summary.map((s, i) => ({
          name: s.name,
          population: s.spent,
          color: pieColors[i % pieColors.length],
          legendFontColor: '#000',
          legendFontSize: 12,
        }))}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor={'population'}
        backgroundColor={'transparent'}
        paddingLeft={'10'}
        style={{ marginVertical: 10 }}
      />

      <Text style={{ marginTop: 20 }}>Gastos:</Text>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text>{item.description} - ${item.amount} ({item.category.name})</Text>
        )}
      />
    </ScrollView>
  );
}
