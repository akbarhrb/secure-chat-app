import React, { useState, useEffect } from 'react';
import { 
  View, TextInput, Text, TouchableOpacity, StyleSheet, 
  SafeAreaView, ScrollView, ActivityIndicator, Image, Dimensions, KeyboardAvoidingView, Platform 
} from 'react-native';
import { register } from '../services/api';
import { generateKeys } from '../services/crypto';
import { savePrivateKey } from '../storage/secureStorage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  const handleRegister = async () => {
    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Crypto Generation
      setLoadingStatus('Generating secure keys...');
      const { publicKey, privateKey } = await generateKeys();
      
      // Step 2: Secure Storage
      setLoadingStatus('Securing your private key...');
      await savePrivateKey(privateKey);
      
      // Step 3: API Registration
      setLoadingStatus('Creating your account...');
      const response = await register({ email, password, public_key: publicKey });
      
      setLoadingStatus('Success!');
      alert('Account created successfully!');
      navigation.navigate('Login');
    } catch (err) {
      console.log(err);
      alert('Registration failed: ' + err.message);
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
               <Ionicons name="lock-closed" size={50} color="#4e73df" />
            </View>
            <Text style={styles.title}>Secure Chat</Text>
            <Text style={styles.subtitle}>End-to-end encrypted messaging</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#a4b0be" style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color="#a4b0be" style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a strong password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[styles.input, { flex: 1 }]}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#a4b0be" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleRegister} 
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.buttonText}>{loadingStatus}</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.footerLink}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.linkBold}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    // Shadow for iOS
    shadowColor: '#4e73df',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    // Shadow for Android
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  button: {
    backgroundColor: '#4e73df',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLink: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  linkBold: {
    color: '#4e73df',
    fontWeight: '700',
  },
});