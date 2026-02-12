import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, 
  KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Image, Alert 
} from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Import your utils
import { encryptMessage, decryptMessage, encryptFile, decryptFile } from '../services/crypto';
import { getPrivateKey } from '../storage/secureStorage';

const API_URL = 'http://localhost:8000'; 
const COLORS = { 
  primary: '#6366F1', 
  sentBubble: '#6366F1', 
  receivedBubble: '#F1F5F9', 
  textDark: '#1E293B', 
  white: '#FFFFFF',
  muted: '#64748B'
};

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userPublicId, contactPublicId, contactEmail, contactPublicKey: initialPublicKey } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contactPublicKey, setContactPublicKey] = useState(initialPublicKey);
  
  const intervalRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    initChat();
    // Poll for new messages every 2 seconds
    intervalRef.current = setInterval(fetchMessages, 2000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const initChat = async () => {
    if (!contactPublicKey) {
      await fetchContactPublicKey();
    }
    await fetchMessages();
  };

  const fetchContactPublicKey = async () => {
    try {
      const res = await axios.get(`${API_URL}/public-key/${contactId}`);
      setContactPublicKey(res.data.public_key);
    } catch (err) {
      console.error("Could not fetch contact public key", err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/messages`, {
        params: { 
          user_public_id: userPublicId, 
          contact_public_id: contactPublicId 
        }
      });
      
      const privKey = await getPrivateKey();
      
      const decryptedData = await Promise.all(res.data.map(async (msg) => {
        // If it's your own message, just show the the encrypted content
        if (msg.sender_public_id === userPublicId) {
          if (typeof msg.message === 'object' && msg.message.type === 'text') {
            return { ...msg, message: msg.message.encryptedMessage }; // or store the plaintext on client side
          }
          return msg;
        }

        // For messages from the contact, decrypt
        if (msg.message && typeof msg.message === 'object') {
          try {
            if (msg.message.type === 'text' || !msg.message.type) {
              return { ...msg, message: decryptMessage(msg.message, privKey) };
            }
            if (msg.message.type === 'image') {
              return { ...msg, isImage: true };
            }
          } catch (e) {
            return { ...msg, message: "[Decryption Failed]" };
          }
        }
        return msg;
      }));


      setMessages(decryptedData);
    } catch (err) {
      console.error('Error fetching messages', err);
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      console.log("Error Message could not be sent." , err);
    }
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
      formData.append('file', {
        uri: `data:image/jpeg;base64,${encryptedFileData}`,
        type: 'image/jpeg',
        name: 'image.jpg'
      });
      formData.append('sender_public_id', userPublicId);
      formData.append('receiver_public_id', contactPublicId);
      formData.append('message_type', 'image');
      formData.append('encrypted_key', encryptMessage(aesKey, contactPublicKey));
      formData.append('iv', 'your-iv-if-any'); // depends on your encryptFile function

      const uploadRes = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      fetchMessages();
    } catch (err) {
      Alert.alert("Upload Failed", "Could not send encrypted image.");
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const isMine = item.sender_public_id === userPublicId;

    return (
      <View
        style={[
          styles.wrapper,
          isMine ? styles.mineWrapper : styles.theirsWrapper
        ]}
      >
        <View
          style={[
            styles.bubble,
            isMine ? styles.sentBubble : styles.receivedBubble
          ]}
        >
          {item.isImage ? (
            <EncryptedImage payload={item.message} isMine={isMine} />
          ) : (
            <Text style={[styles.messageText, isMine ? styles.sentText : styles.receivedText]}>
              {item.message}
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
        <Ionicons name="lock-closed" size={18} color={COLORS.primary} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : null} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingVertical: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {sending && <ActivityIndicator style={{ marginBottom: 10 }} color={COLORS.primary} />}

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={24} color={COLORS.muted} />
          </TouchableOpacity>
          <TextInput 
            style={styles.input} 
            value={text} 
            onChangeText={setText} 
            placeholder="Encrypted message..." 
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

// Sub-component to handle Image Decryption
function EncryptedImage({ payload, isMine }) {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    decryptAndLoad();
  }, []);

  const decryptAndLoad = async () => {
    try {
      const privKey = await getPrivateKey();
      // 1. Decrypt the AES Key
      const aesKey = decryptMessage(payload.encryptionData, privKey);
      // 2. Fetch the encrypted file
      const res = await fetch(payload.fileUrl);
      const encryptedBase64 = await res.text();
      // 3. Decrypt the file
      const decryptedBase64 = decryptFile(encryptedBase64, aesKey);
      setImageUri(`data:image/jpeg;base64,${decryptedBase64}`);
    } catch (e) {
      console.error("Image Decryption Failed", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator color={isMine ? "#fff" : COLORS.primary} />;
  if (!imageUri) return <Ionicons name="alert-circle" size={24} color="red" />;

  return <Image source={{ uri: imageUri }} style={styles.imageDisplay} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderColor: '#E2E8F0',
    gap: 10
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, flex: 1 },
  wrapper: { marginBottom: 15, paddingHorizontal: 15 },
  mine: { alignItems: 'flex-end' },
  theirs: { alignItems: 'flex-start' },
  bubble: { padding: 12, borderRadius: 20, maxWidth: '80%', elevation: 1 },
  sent: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  received: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  timestamp: { fontSize: 10, color: COLORS.muted, marginTop: 4, marginHorizontal: 5 },
  inputBar: { 
    flexDirection: 'row', 
    padding: 12, 
    backgroundColor: '#fff', 
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#E2E8F0'
  },
  input: { 
    flex: 1, 
    backgroundColor: '#F1F5F9', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    marginRight: 10,
    maxHeight: 100 
  },
  sendBtn: { 
    backgroundColor: COLORS.primary, 
    width: 42, 
    height: 42, 
    borderRadius: 21, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  attachBtn: { marginRight: 10 },
  imageDisplay: { width: 200, height: 200, borderRadius: 10, resizeMode: 'cover' },
  wrapper: { marginBottom: 12, paddingHorizontal: 16 },
  mineWrapper: { alignItems: 'flex-end' },
  theirsWrapper: { alignItems: 'flex-start' },

  bubble: { 
    paddingVertical: 10, 
    paddingHorizontal: 14, 
    borderRadius: 20, 
    maxWidth: '75%',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2, 
    elevation: 2,
  },

  sentBubble: {
    backgroundColor: '#6366F1',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderTopLeftRadius: 20,
  },

  receivedBubble: {
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
  },

  messageText: { fontSize: 16, lineHeight: 22 },
  sentText: { color: '#fff' },
  receivedText: { color: '#1E293B' },

  timestamp: { fontSize: 10, color: '#94A3B8', marginTop: 4, marginHorizontal: 5 },

  imageDisplay: { 
    width: 200, 
    height: 200, 
    borderRadius: 12, 
    resizeMode: 'cover',
    marginVertical: 4,
  },
  
});