import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, 
  KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Image, Alert 
} from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Import your cryptographic utilities
import { encryptMessage, decryptMessage, encryptFile, decryptFile } from '../services/crypto';
import { getPrivateKey } from '../storage/secureStorage';

const API_URL = 'http://localhost:8000'; 
const COLORS = { 
  primary: '#6366F1', 
  sentBubble: '#6366F1', 
  receivedBubble: '#F1F5F9', 
  textDark: '#1E293B', 
  white: '#FFFFFF',
  muted: '#64748B',
  warning: '#FFFBEB',
  warningText: '#B45309'
};

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userPublicId, contactPublicId, contactEmail, contactPublicKey: initialPublicKey } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  const [sending, setSending] = useState(false);
  const [contactPublicKey, setContactPublicKey] = useState(initialPublicKey);
  
  // Maps message ID to decrypted content (text or boolean for images)
  const [decryptedMap, setDecryptedMap] = useState({});

  const intervalRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    initChat();
    intervalRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const initChat = async () => {
    if (!contactPublicKey) await fetchContactPublicKey();
    await fetchMessages();
  };

  const fetchContactPublicKey = async () => {
    try {
      const res = await axios.get(`${API_URL}/public-key/${contactPublicId}`);
      setContactPublicKey(res.data.public_key);
    } catch (err) { console.error("Key fetch error", err); }
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/messages`, {
        params: { user_public_id: userPublicId, contact_public_id: contactPublicId }
      });
      setMessages(res.data);
    } catch (err) {
      console.error('Error fetching messages', err);
    } finally {
      setLoading(false);
    }
  };

  // Triggered by the "Decrypt" button in header
  const handleDecryptAll = async () => {
    setDecrypting(true);
    const privKey = await getPrivateKey();
    const newDecryptedMap = { ...decryptedMap };

    for (const msg of messages) {
      // We only decrypt what we received. We can't decrypt what we sent.
      if (msg.sender_public_id !== userPublicId && !newDecryptedMap[msg.id]) {
        try {
          if (msg.message_type === 'image') {
            newDecryptedMap[msg.id] = true; // Signal to EncryptedImage sub-component
          } else if (msg.message && typeof msg.message === 'object') {
            newDecryptedMap[msg.id] = decryptMessage(msg.message, privKey);
          }
        } catch (e) {
          newDecryptedMap[msg.id] = "[Decryption Failed]";
        }
      }
    }
    setDecryptedMap(newDecryptedMap);
    setDecrypting(false);
  };

  const sendMessage = async () => {
    if (!text.trim() || !contactPublicKey) return;
    const plainText = text;
    setText(''); 

    try {
      const encryptedPayload = encryptMessage(plainText, contactPublicKey);
      await axios.post(`${API_URL}/messages`, {
        sender_public_id: userPublicId,
        receiver_public_id: contactPublicId,
        message: { ...encryptedPayload, type: 'text' }
      });
      fetchMessages();
    } catch (err) { console.log("Send error", err); }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      sendImage(result.assets[0].base64);
    }
  };

  const sendImage = async (base64Data) => {
    setSending(true);
    try {
      const { encryptedFileData, aesKey } = encryptFile(base64Data);
      const formData = new FormData();

      // Web vs Mobile Form Data Handling
      if (Platform.OS === 'web') {
        const response = await fetch(`data:image/jpeg;base64,${encryptedFileData}`);
        const blob = await response.blob();
        formData.append('file', blob, 'image.jpg');
      } else {
        formData.append('file', {
          uri: `data:image/jpeg;base64,${encryptedFileData}`,
          type: 'image/jpeg',
          name: 'image.jpg'
        });
      }

      formData.append('sender_public_id', userPublicId);
      formData.append('receiver_public_id', contactPublicId);
      formData.append('message_type', 'image');
      formData.append('encrypted_key', JSON.stringify(encryptMessage(aesKey, contactPublicKey)));

      await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchMessages();
    } catch (err) {
      Alert.alert("Upload Failed", "Error processing file for upload.");
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const isMine = item.sender_public_id === userPublicId;
    const isDecrypted = decryptedMap[item.id];
    
    let displayContent = "";
    if (isMine) {
      displayContent = "🔒 Encrypted Content";
    } else {
      displayContent = isDecrypted ? decryptedMap[item.id] : (item.message.encryptedMessage || "Ciphertext...");
    }

    return (
      <View style={[styles.wrapper, isMine ? styles.mineWrapper : styles.theirsWrapper]}>
        <View style={[styles.bubble, isMine ? styles.sentBubble : styles.receivedBubble]}>
          {item.message_type === 'image' ? (
            <EncryptedImage 
              payload={item.message} 
              isMine={isMine} 
              shouldDecrypt={!!isDecrypted} 
            />
          ) : (
            <Text style={[
              styles.messageText, 
              isMine ? styles.sentText : styles.receivedText,
              !isDecrypted && !isMine && styles.cipherText
            ]}>
              {displayContent}
            </Text>
          )}
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{contactEmail}</Text>
        <TouchableOpacity style={styles.decryptBtn} onPress={handleDecryptAll} disabled={decrypting}>
          {decrypting ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
            <><Ionicons name="key-outline" size={16} color={COLORS.primary} /><Text style={styles.decryptBtnText}>Decrypt</Text></>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.warningBanner}>
        <Ionicons name="information-circle" size={16} color={COLORS.warningText} />
        <Text style={styles.warningText}>You can only decrypt incoming messages. Outgoing messages are keyed to the receiver.</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {sending && <ActivityIndicator style={{ margin: 10 }} color={COLORS.primary} />}

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={26} color={COLORS.muted} />
          </TouchableOpacity>
          <TextInput 
            style={styles.input} 
            value={text} 
            onChangeText={setText} 
            placeholder="Type a secure message..." 
            multiline
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EncryptedImage({ payload, isMine, shouldDecrypt }) {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (shouldDecrypt && !isMine && !imageUri) decryptAndLoad();
  }, [shouldDecrypt]);

  const decryptAndLoad = async () => {
    setLoading(true);
    try {
      const privKey = await getPrivateKey();
      const aesKey = decryptMessage(payload.encryptionData, privKey);
      
      const res = await fetch(payload.fileUrl);
      const encryptedBase64 = await res.text();
      
      const decryptedBase64 = decryptFile(encryptedBase64, aesKey);
      setImageUri(`data:image/jpeg;base64,${decryptedBase64}`);
    } catch (e) { console.error("Image decryption error", e); }
    setLoading(false);
  };

  const openFullImage = () => {
    if (Platform.OS === 'web' && imageUri) {
      const win = window.open();
      win.document.write(`<img src="${imageUri}" style="max-width:100%; border-radius:8px;">`);
    }
  };

  if (isMine) return (
    <View style={styles.placeholderBox}>
      <Ionicons name="lock-closed" size={24} color="#fff" />
      <Text style={{color: '#fff', fontSize: 10, marginTop: 4}}>Sent Encrypted</Text>
    </View>
  );

  if (!shouldDecrypt) return (
    <View style={styles.placeholderBox}>
      <Ionicons name="eye-off" size={24} color={COLORS.muted} />
      <Text style={{color: COLORS.muted, fontSize: 10, marginTop: 4}}>Click Decrypt</Text>
    </View>
  );

  if (loading) return <ActivityIndicator color={COLORS.primary} />;

  return (
    <TouchableOpacity onPress={openFullImage}>
      <Image source={{ uri: imageUri }} style={styles.imageDisplay} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, flex: 1 },
  decryptBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4 },
  decryptBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  warningBanner: { flexDirection: 'row', backgroundColor: COLORS.warning, padding: 12, alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#FEF3C7' },
  warningText: { color: COLORS.warningText, fontSize: 11, flex: 1, lineHeight: 15 },
  wrapper: { marginBottom: 12, paddingHorizontal: 16 },
  mineWrapper: { alignItems: 'flex-end' },
  theirsWrapper: { alignItems: 'flex-start' },
  bubble: { padding: 10, borderRadius: 18, maxWidth: '85%' },
  sentBubble: { backgroundColor: COLORS.sentBubble, borderTopRightRadius: 4 },
  receivedBubble: { backgroundColor: COLORS.receivedBubble, borderTopLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  cipherText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11, color: COLORS.muted },
  sentText: { color: '#fff', fontSize: 13, opacity: 0.85, fontStyle: 'italic' },
  receivedText: { color: COLORS.textDark },
  timestamp: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', alignItems: 'center', borderTopWidth: 1, borderColor: '#E2E8F0' },
  attachBtn: { marginRight: 12 },
  input: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10, maxHeight: 100 },
  sendBtn: { backgroundColor: COLORS.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  placeholderBox: { width: 180, height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: '#CBD5E1', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#94A3B8' },
  imageDisplay: { width: 240, height: 240, borderRadius: 12, resizeMode: 'cover' }
});