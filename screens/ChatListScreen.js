import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';

const API_URL = 'http://YOUR_SERVER_IP:8000';

export default function ChatListScreen() {
  const navigation = useNavigation();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`); // You may need to implement this endpoint
      setContacts(res.data);
    } catch (err) {
      console.log('Error fetching contacts', err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('Chat', { contactId: item.id, contactEmail: item.email })
      }
      style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#ccc' }}
    >
      <Text style={{ fontWeight: 'bold' }}>{item.email}</Text>
      <Text>{item.lastMessage || 'No messages yet'}</Text>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <FlatList
      data={contacts}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
    />
  );
}
