import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, Image, Dimensions, SafeAreaView,
  ActivityIndicator, Alert, Linking
} from 'react-native';
import axios from 'axios';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const { width } = Dimensions.get('window');

// REPLACE THIS with your machine's IP address if testing on a physical device
const API_URL = 'http://localhost:8000'; 

const COLORS = {
  primary: '#6366F1',
  sentBubble: '#6366F1',
  receivedBubble: '#F1F5F9',
  bg: '#FFFFFF',
  textDark: '#1E293B',
  textLight: '#94A3B8',
  white: '#FFFFFF'
};

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId, contactId, contactEmail } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const intervalRef = useRef(null);
  const flatListRef = useRef(null);

  // 1. Fetch Messages
  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/messages`, {
        params: { user_id: userId, contact_id: contactId }
      });
      setMessages(res.data);
    } catch (err) {
      console.error('Error fetching messages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Polling every 2 seconds
    intervalRef.current = setInterval(fetchMessages, 2000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // 2. Open File Logic (Web + Mobile Compatible)
  const handleOpenFile = async (fileUrl) => {
    if (!fileUrl) return;

    if (Platform.OS === 'web') {
      window.open(fileUrl, '_blank');
    } else {
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert("Error", "Unable to open this file type.");
      }
    }
  };

  // 3. Send Text Message
  const sendMessage = async () => {
    if (!text.trim()) return;
    const messageContent = text;
    setText(''); 

    try {
      await axios.post(`${API_URL}/messages`, {
        sender_id: userId,
        receiver_id: contactId,
        message: messageContent
      });
      fetchMessages();
    } catch (err) {
      Alert.alert("Error", "Message could not be sent.");
    }
  };

  // 4. File Picking Logic
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access gallery is required!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });

    if (!result.canceled) {
      handleUpload(result.assets[0].uri, 'image', result.assets[0].fileName || 'image.jpg');
    }
  };

  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!result.canceled) {
      handleUpload(result.assets[0].uri, 'file', result.assets[0].name);
    }
  };

  // 5. Unified Upload Logic
  const handleUpload = async (uri, type, fileName) => {
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('sender_id', userId.toString());
      formData.append('receiver_id', contactId.toString());
      formData.append('message_type', type);

      await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchMessages();
    } catch (err) {
      console.error(err);
      alert("Upload Failed.");
    } finally {
      setUploading(false);
    }
  };

  // 6. UI Render Item
  const renderItem = ({ item }) => {
    const isMine = item.sender_id === userId;
    const isFile = item.message_type === 'file' || item.message_type === 'image';

    return (
      <View style={[styles.messageWrapper, isMine ? styles.mineWrapper : styles.theirWrapper]}>
        <TouchableOpacity 
          activeOpacity={isFile ? 0.7 : 1}
          onPress={() => isFile ? handleOpenFile(item.file_url) : null}
          style={[styles.bubble, isMine ? styles.sentBubble : styles.receivedBubble]}
        >
          {/* Image Content */}
          {item.message_type === 'image' && (
            <Image 
              source={{ uri: item.file_url }} 
              style={styles.messageImage} 
              resizeMode="cover"
            />
          )}

          {/* File Content */}
          {item.message_type === 'file' && (
            <View style={styles.fileRow}>
              <View style={[styles.fileIconBox, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name="document-text" size={20} color={isMine ? COLORS.white : COLORS.primary} />
              </View>
              <Text style={[styles.fileText, { color: isMine ? COLORS.white : COLORS.textDark }]} numberOfLines={1}>
                {item.file_url.split('/').pop() || 'Document'}
              </Text>
            </View>
          )}

          {/* Text Content */}
          {item.message && (
            <Text style={[styles.messageText, { color: isMine ? COLORS.white : COLORS.textDark }]}>
              {item.message}
            </Text>
          )}

          <Text style={[styles.timeText, { color: isMine ? 'rgba(255,255,255,0.7)' : COLORS.textLight }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.textDark} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerName}>{contactEmail ? contactEmail.split('@')[0] : 'Chat'}</Text>
          <Text style={styles.headerStatus}>Online</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 16 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.uploadingText}>Sending file...</Text>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputBar}>
          <TouchableOpacity onPress={pickDocument} style={styles.iconBtn}>
            <Ionicons name="add-circle-outline" size={28} color={COLORS.textLight} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={COLORS.textLight}
            value={text}
            onChangeText={setText}
            multiline
          />

          {text.trim().length > 0 ? (
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
              <Ionicons name="arrow-up" size={24} color={COLORS.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
              <Ionicons name="camera-outline" size={28} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    height: 60,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleContainer: { flex: 1, marginLeft: 10 },
  headerName: { fontSize: 17, fontWeight: '700', color: COLORS.textDark },
  headerStatus: { fontSize: 12, color: '#22C55E', fontWeight: '500' },
  messageWrapper: { marginBottom: 12, width: '100%' },
  mineWrapper: { alignItems: 'flex-end' },
  theirWrapper: { alignItems: 'flex-start' },
  bubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: width * 0.78,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  sentBubble: { backgroundColor: COLORS.sentBubble, borderBottomRightRadius: 4 },
  receivedBubble: { backgroundColor: COLORS.receivedBubble, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 22 },
  messageImage: { width: width * 0.65, height: 200, borderRadius: 12, marginBottom: 5 },
  fileRow: { flexDirection: 'row', alignItems: 'center', padding: 5, borderRadius: 10 },
  fileIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  fileText: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
  timeText: { fontSize: 10, marginTop: 4, textAlign: 'right', fontWeight: '500' },
  uploadingBar: { flexDirection: 'row', padding: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF' },
  uploadingText: { marginLeft: 8, fontSize: 12, color: COLORS.primary },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 10,
    fontSize: 16,
    maxHeight: 100,
    color: COLORS.textDark
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtn: { padding: 4 }
});