import React, { useState } from 'react';
import { 
  View, TextInput, Text, TouchableOpacity, StyleSheet, Modal,
  SafeAreaView, ScrollView, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform 
} from 'react-native';
import { login } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState(''); // Email or Username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [userId, setUserId] = useState(null);

  const handleLogin = async () => {
    if (!identifier || !password) {
      alert("Please enter your credentials");
      return;
    }

    setLoading(true);
    try {
      // We pass identifier as the "email" field to the existing API
      const res = await login({ email: identifier, password });
      setUserId(res.data.user_id);
      setLoading(false);
      setShowSuccessModal(true);
    } catch (err) {
      setLoading(false);
      alert('Login failed: ' + (err.response?.data?.detail || "Invalid credentials"));
    }
  };

  const proceedToApp = () => {
    setShowSuccessModal(false);
    navigation.navigate('ChatList', { userId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
               <Ionicons name="lock-open" size={50} color="#4e73df" />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Securely sign in to your account</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username or Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#a4b0be" style={styles.inputIcon} />
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="Enter username or email"
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
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={styles.input}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#a4b0be" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleLogin} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.footerLink}>
            <Text style={styles.footerText}>
              Don't have an account? <Text style={styles.linkBold}>Create one</Text>
            </Text>
          </TouchableOpacity>

          {/* Success Modal */}
          <Modal visible={showSuccessModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.successBadge}>
                    <Ionicons name="finger-print" size={50} color="#fff" />
                </View>
                <Text style={styles.modalTitle}>Authenticated</Text>
                <Text style={styles.modalBody}>
                  Identity verified. Decrypting your messaging session...
                </Text>
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={proceedToApp}
                >
                  <Text style={styles.modalButtonText}>Enter Chats</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContainer: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#4e73df', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 5,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 15, elevation: 3,
  },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9',
    borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1e293b' },
  button: {
    backgroundColor: '#4e73df', paddingVertical: 16, borderRadius: 12,
    marginTop: 8, alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footerLink: { marginTop: 30, alignItems: 'center' },
  footerText: { fontSize: 14, color: '#64748b' },
  linkBold: { color: '#4e73df', fontWeight: '700' },
  
  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 30, padding: 30,
    alignItems: 'center', width: '100%',
  },
  successBadge: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#4e73df',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  modalBody: {
    fontSize: 16, color: '#64748b', textAlign: 'center',
    marginTop: 10, lineHeight: 24,
  },
  modalButton: {
    backgroundColor: '#1e293b', paddingHorizontal: 40, paddingVertical: 14,
    borderRadius: 12, marginTop: 24, width: '100%', alignItems: 'center',
  },
  modalButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});