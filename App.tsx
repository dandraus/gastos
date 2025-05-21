// App.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { TouchableOpacity, Alert, View, Text, Image, ActivityIndicator } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import ExpenseScreen from './src/screens/ExpenseScreen';
import CreateBudgetScreen from './src/screens/CreateBudgetScreen';
import CreateExpenseScreen from './src/screens/CreateExpenseScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import BudgetDetailScreen from './src/screens/BudgetDetailScreen';

import AuthScreen from './src/screens/AuthScreen';
import { supabase } from './src/lib/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import { PeriodoProvider } from './src/context/PeriodoContext';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const RootStack = createNativeStackNavigator();

function BottomTabs({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ marginLeft: 16 }}>
            <Ionicons name="menu" size={24} />
          </TouchableOpacity>
        ),
        tabBarIcon: ({ color, size }) => {
          let iconName = '';
          if (route.name === 'Resumen') iconName = 'home';
          else if (route.name === 'Presupuestos') iconName = 'wallet';
          else if (route.name === 'Gastos') iconName = 'receipt';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Resumen" component={SummaryScreen} />
      <Tab.Screen name="Presupuestos" component={CreateBudgetScreen} />
      <Tab.Screen name="Gastos" component={CreateExpenseScreen} />
    </Tab.Navigator>
  );
}

function ConfigScreen() {
  return null;
}

function LogoutScreen({ navigation }) {
  React.useEffect(() => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que querés salir?', [
      { text: 'Cancelar', onPress: () => navigation.goBack(), style: 'cancel' },
      { text: 'Sí, salir', onPress: async () => {
          await supabase.auth.signOut();
          navigation.reset({ index: 0, routes: [{ name: 'AuthScreen' }] });
        }
      }
    ]);
  }, []);
  return null;
}

function MainStack({ user }) {
  return (
    <Drawer.Navigator
      screenOptions={({ route }) => ({
        drawerIcon: ({ color, size }) => {
          let iconName = '';
          switch (route.name) {
            case 'Inicio': iconName = 'home-outline'; break;
            case 'Presupuestos': iconName = 'wallet-outline'; break;
            case 'Gastos': iconName = 'receipt-outline'; break;
            case 'Nuevo presupuesto': iconName = 'add-circle-outline'; break;
            case 'Nuevo gasto': iconName = 'cash-outline'; break;
            case 'Resumen': iconName = 'stats-chart-outline'; break;
            case 'Configuración': iconName = 'settings-outline'; break;
            case 'Cerrar sesión': iconName = 'log-out-outline'; break;
            default: iconName = 'ellipse-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Drawer.Screen
        name="Inicio"
        component={BottomTabs}
        options={{
          drawerLabel: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={{ uri: 'https://your-avatar-url.com' }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
              <Text style={{ marginLeft: 10 }}>{user?.email || 'Usuario'}</Text>
            </View>
          )
        }}
      />
      <Drawer.Screen name="Nuevo presupuesto" component={CreateBudgetScreen} />
      <Drawer.Screen name="Nuevo gasto" component={CreateExpenseScreen} />
      <Drawer.Screen name="Resumen" component={SummaryScreen} />
      <Drawer.Screen name="Configuración" component={ConfigScreen} />
      <Drawer.Screen name="Cerrar sesión" component={LogoutScreen} />
    </Drawer.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user);
      setLoading(false);
    };
    getSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <PeriodoProvider>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {session ? (
            <>
              <RootStack.Screen name="Main">
                {() => <MainStack user={user} />}
              </RootStack.Screen>
              <RootStack.Screen name="BudgetDetailScreen" component={BudgetDetailScreen} />
            </>
          ) : (
            <RootStack.Screen name="AuthScreen" component={AuthScreen} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </PeriodoProvider>
  );
}
