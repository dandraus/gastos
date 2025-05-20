// src/screens/AuthScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem('rememberEmail');
        const storedPassword = await AsyncStorage.getItem('rememberPassword');
        if (storedEmail && storedPassword) {
          setEmail(storedEmail);
          setPassword(storedPassword);
          setRememberMe(true);
        }
      } catch (e) {
        console.log(e);
      }
    };
    loadCredentials();
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresá email y contraseña');
      return;
    }

    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (!error) {
      if (rememberMe) {
        await AsyncStorage.setItem('rememberEmail', email);
        await AsyncStorage.setItem('rememberPassword', password);
      } else {
        await AsyncStorage.removeItem('rememberEmail');
        await AsyncStorage.removeItem('rememberPassword');
      }
    }

    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Éxito', isLogin ? 'Sesión iniciada' : 'Registro exitoso');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isLogin ? 'Iniciar sesión' : 'Registrarse'}</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <View style={styles.rememberContainer}>
        <Switch value={rememberMe} onValueChange={setRememberMe} />
        <Text style={styles.rememberLabel}>Recordarme</Text>
      </View>
      <Button title={isLogin ? 'Ingresar' : 'Registrar'} onPress={handleAuth} />
      <Text
        style={styles.toggle}
        onPress={() => setIsLogin(!isLogin)}
      >
        {isLogin ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginTop: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rememberLabel: {
    marginLeft: 8,
  },
  toggle: {
    color: 'blue',
    marginTop: 16,
    textAlign: 'center',
  },
});
