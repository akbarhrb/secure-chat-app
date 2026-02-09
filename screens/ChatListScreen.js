import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  SafeAreaView, 
  RefreshControl,
  StatusBar
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'http://localhost:8000';

// Helper for random soft colors for avatars
const AVATAR_COLORS = ['#FF6B6B', '#4E73DF', '#1CC88A', '#F6C23E', '#36B9CC', '#6610F2'];

export default function ChatListScreen() {
  const navigation = useNavigation();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchContacts = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`);
      setContacts(res.data);
    } catch (err) {
      console.log('Error fetching contacts', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContacts();
  }, []);

  const getAvatarColor = (email) => {
    const charCode = email.charCodeAt(0);
    return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
  };

  const renderItem = ({ item }) => {
    const avatarColor = getAvatarColor(item.email);
    const initial = item.email.charAt(0).toUpperCase();
  
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('Chat', {
            userId,
            contactId: item.id,
            contactEmail: item.email,
          })
        }
        style={styles.chatCard}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
  
        <View style={{ flex: 1 }}>
          <View style={styles.cardHeader}>
            <Text style={styles.emailText} numberOfLines={1}>
              {item.email}
            </Text>
            <Text style={styles.timeText}>12:45 PM</Text>
          </View>
  
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || 'Start a secure conversation...'}
          </Text>
        </View>
  
        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
      </TouchableOpacity>
    );
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4E73DF" />
        <Text style={styles.loadingText}>Loading your conversations...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="create-outline" size={24} color="#4E73DF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#4E73DF" 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={80} color="#E2E8F0" />
            <Text style={styles.emptyText}>No contacts found yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  headerIcon: {
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 16,
    // Add background color for better visibility on white
    backgroundColor: '#FFF',
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  lastMessage: {
    fontSize: 14,
    color: '#64748B',
    width: '90%',
  },
  loadingText: {
    marginTop: 15,
    color: '#64748B',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 10,
    color: '#94A3B8',
    fontSize: 16,
  },
});