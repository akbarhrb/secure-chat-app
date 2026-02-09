import React, { useEffect, useState, useRef } from 'react';
import { 
  View, TextInput, FlatList, Text, Image, TouchableOpacity, 
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView 
} from 'react-native';
import { getPrivateKey } from '../storage/secureStorage';
import { encryptMessage, decryptMessage } from '../services/crypto';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

export default function ChatScreen({ route, navigation }) {
  const { userId, contactId, contactEmail } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const ws = useRef(null);
  const flatListRef = useRef(null);
  const [privateKey, setPrivateKey] = useState('');

  // Set header title to contact email
  useEffect(() => {
    navigation.setOptions({ title: contactEmail });
  }, [contactEmail]);

  useEffect(() => {
    (async () => {
      const key = await getPrivateKey();
      setPrivateKey(key);
    })();

    ws.current = new WebSocket(`ws://localhost:8000/ws/${userId}`);
    
    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'text') {
        const decrypted = decryptMessage(data, privateKey);
        setMessages((prev) => [...prev, { ...data, content: decrypted, sender_id: contactId }]);
      } else if (data.type === 'image') {
        setMessages((prev) => [...prev, { ...data, sender_id: contactId }]);
      }
    };

    return () => ws.current.close();
  }, [privateKey]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      const res = await axios.get(`${API_URL}/public-key/${contactId}`);
      const receiverPublicKey = res.data.public_key;
      const encrypted = encryptMessage(input, receiverPublicKey);

      const payload = { type: 'text', receiver_id: contactId, ...encrypted };
      ws.current.send(JSON.stringify(payload));
      
      setMessages((prev) => [...prev, { ...payload, content: input, isMe: true }]);
      setInput('');
    } catch (err) { alert("Encryption failed"); }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
       // logic for encryption and sending goes here as per your previous snippet
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.isMe || item.sender_id !== contactId;
    return (
      <View style={[styles.messageRow, isMe ? styles.myMsgRow : styles.theirMsgRow]}>
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
          {item.type === 'text' ? (
            <Text style={[styles.msgText, isMe ? styles.myText : styles.theirText]}>
              {item.content}
            </Text>
          ) : (
            <Image source={{ uri: item.content }} style={styles.messageImage} />
          )}
          <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.theirTimestamp]}>
            12:00 PM
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        keyboardVerticalOffset={90}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listPadding}
          onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })}
        />

        {/* Action Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
            <Ionicons name="add-circle-outline" size={28} color="#4e73df" />
          </TouchableOpacity>
          
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            multiline
            style={styles.textInput}
          />

          <TouchableOpacity 
            onPress={sendMessage} 
            disabled={!input.trim()}
            style={[styles.sendButton, !input.trim() && { opacity: 0.5 }]}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9', // Subtle grey background
  },
  listPadding: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    width: '100%',
  },
  myMsgRow: { justifyContent: 'flex-end' },
  theirMsgRow: { justifyContent: 'flex-start' },
  
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    elevation: 1, // Slight shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  myBubble: {
    backgroundColor: '#4e73df',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myText: { color: '#fff' },
  theirText: { color: '#1e293b' },
  
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: { color: '#cbd5e1' },
  theirTimestamp: { color: '#94a3b8' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  iconButton: {
    padding: 4,
  },
  sendButton: {
    backgroundColor: '#4e73df',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
});