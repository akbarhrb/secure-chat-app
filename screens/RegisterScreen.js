import React, { useState } from 'react';
import { 
  View, TextInput, Text, TouchableOpacity, StyleSheet, Modal,
  SafeAreaView, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { register } from '../services/api';
import { generateKeys } from '../services/crypto';
import { savePrivateKey } from '../storage/secureStorage';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const validateInputs = () => {
    const emailRegex = /\S+@\S+\.\S+/;
    if (username.length < 3) return "Username must be at least 3 characters";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    if (password.length < 8) return "Password must be at least 8 characters";
    return null;
  };

  const handleRegister = async () => {
    const error = validateInputs();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);
    setLoadingStatus('Initializing...');

    // Small delay to let the UI thread update the spinner before heavy crypto work
    setTimeout(async () => {
      try {
        setLoadingStatus('Generating secure keys...');
        const { publicKey, privateKey } = await generateKeys();
        
        setLoadingStatus('Securing your identity...');
        await savePrivateKey(privateKey);
        
        setLoadingStatus('Creating account...');
        await register({ username, email, password, public_key: publicKey });
        
        setLoading(false);
        setShowSuccessModal(true);
      } catch (err) {
        setLoading(false);
        const errorMsg = err.response?.data?.detail || err.message;
        alert('Registration failed: ' + errorMsg);
      }
    }, 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            <View style={styles.iconCircle}>
               <Ionicons name="shield-checkmark" size={50} color="#4e73df" />
            </View>
            <Text style={styles.title}>Join Secure Chat</Text>
            <Text style={styles.subtitle}>Privacy by default. Encrypted forever.</Text>
          </View>

          <View style={styles.card}>
            {/* Username */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Display Name</Text>
              <div style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#a4b0be" style={styles.inputIcon} />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g. JohnDoe"
                  style={styles.input}
                />
              </div>
            </View>

            {/* Email */}
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

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#a4b0be" style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 characters"
                  secureTextEntry={!showPassword}
                  style={styles.input}
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
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.buttonTextLoading}>{loadingStatus}</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Create Secure Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* THE NEW ADDITION: LOGIN LINK */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')} 
            style={styles.footerLink}
          >
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.linkBold}>Log in</Text>
            </Text>
          </TouchableOpacity>

          {/* Success Modal */}
          <Modal visible={showSuccessModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
                <Text style={styles.modalTitle}>Ready to Chat!</Text>
                <Text style={styles.modalBody}>
                  Your account and encryption keys have been created.
                </Text>
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => {
                    setShowSuccessModal(false);
                    navigation.navigate('Login');
                  }}
                >
                  <Text style={styles.modalButtonText}>Go to Login</Text>
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
  buttonTextLoading: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 12 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center' },
  
  // Footer Styling
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
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginTop: 16 },
  modalBody: { fontSize: 16, color: '#64748b', textAlign: 'center', marginTop: 10, lineHeight: 24 },
  modalButton: {
    backgroundColor: '#4e73df', paddingHorizontal: 40, paddingVertical: 14,
    borderRadius: 12, marginTop: 24, width: '100%', alignItems: 'center',
  },
  modalButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});