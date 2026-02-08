import React, { useEffect, useState, useRef } from 'react';
import { View, TextInput, Button, FlatList, Text, Image, TouchableOpacity } from 'react-native';
import { getPrivateKey } from '../storage/secureStorage';
import { encryptMessage, decryptMessage } from '../services/crypto';
import * as ImagePicker from 'expo-image-picker';
import { Buffer } from 'buffer';
import axios from 'axios';

const API_URL = 'http://YOUR_SERVER_IP:8000';

export default function ChatScreen({ route }) {
  const { contactId, contactEmail } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const ws = useRef(null);
  const [privateKey, setPrivateKey] = useState('');

  useEffect(() => {
    (async () => {
      const key = await getPrivateKey();
      setPrivateKey(key);
    })();

    // Connect to WebSocket
    ws.current = new WebSocket(`ws://YOUR_SERVER_IP:8000/ws/YOUR_USER_ID`);
    
    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'text') {
        const decrypted = decryptMessage(data, privateKey);
        setMessages((prev) => [...prev, { ...data, content: decrypted, type: 'text' }]);
      } else if (data.type === 'image') {
        // Handle encrypted images
        setMessages((prev) => [...prev, { ...data, type: 'image' }]);
      }
    };

    return () => ws.current.close();
  }, [privateKey]);

  const sendMessage = async () => {
    if (!input) return;

    // Get receiver public key
    const res = await axios.get(`${API_URL}/public-key/${contactId}`);
    const receiverPublicKey = res.data.public_key;

    const encrypted = encryptMessage(input, receiverPublicKey);

    const payload = {
      type: 'text',
      receiver_id: contactId,
      ...encrypted,
    };

    ws.current.send(JSON.stringify(payload));
    setMessages((prev) => [...prev, { ...payload, content: input, type: 'text' }]);
    setInput('');
  };

  // Upload image
  const sendImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
    });
    if (result.cancelled) return;

    const res = await axios.get(`${API_URL}/public-key/${contactId}`);
    const receiverPublicKey = res.data.public_key;

    // Encrypt image bytes
    const imageBuffer = Buffer.from(result.base64, 'base64');
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    let encryptedImage = Buffer.concat([cipher.update(imageBuffer), cipher.final()]);

    const encryptedAESKey = crypto.publicEncrypt(receiverPublicKey, aesKey);

    const payload = {
      type: 'image',
      receiver_id: contactId,
      encryptedMessage: encryptedImage.toString('base64'),
      encryptedKey: encryptedAESKey.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
    };

    ws.current.send(JSON.stringify(payload));
    setMessages((prev) => [...prev, { ...payload, content: result.uri, type: 'image' }]);
  };

  const renderItem = ({ item }) => (
    <View style={{ marginVertical: 5 }}>
      {item.type === 'text' ? (
        <Text>{item.content}</Text>
      ) : (
        <Image source={{ uri: item.content }} style={{ width: 200, height: 200 }} />
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <FlatList
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
      />
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Type a message..."
        style={{ borderWidth: 1, marginBottom: 5, padding: 5 }}
      />
      <Button title="Send Text" onPress={sendMessage} />
      <Button title="Send Image" onPress={sendImage} />
    </View>
  );
}
