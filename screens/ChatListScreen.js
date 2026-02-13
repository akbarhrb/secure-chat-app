import React, { useState, useCallback, useRef } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, 
  StyleSheet, SafeAreaView, RefreshControl, StatusBar, Dimensions 
} from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://secure-chat-app-backend.onrender.com'; // Change to your IP for physical devices

const COLORS = {
  primary: '#6366F1',
  background: '#F8FAFC',
  card: '#FFFFFF',
  textMain: '#1E293B',
  textMuted: '#64748B',
  border: '#F1F5F9',
  online: '#22C55E'
};

const AVATAR_GRADIENTS = ['#818CF8', '#F472B6', '#FB923C', '#2DD4BF', '#A78BFA'];

export default function ChatListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userPublicId  } = route.params;

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const intervalRef = useRef(null);

  // 1. Fetch Contacts Logic
  const fetchContacts = async (showLoading = false) => {
    console.log(route.params);
    if (showLoading) setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/users`, {
        params: { exclude_user_public_id: userPublicId  }
      });
      setContacts(res.data);
    } catch (err) {
      console.log('Error fetching contacts', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 2. Focused Polling
  useFocusEffect(
    useCallback(() => {
      fetchContacts(contacts.length === 0);

      intervalRef.current = setInterval(() => {
        fetchContacts(false);
      }, 1500); // Slightly increased to reduce server load

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [userPublicId, contacts.length])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContacts(false);
  }, []);

  // 3. Helpers
  const getAvatarColor = (email) => {
    const charCode = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_GRADIENTS[charCode % AVATAR_GRADIENTS.length];
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // 4. Render Item
  const renderItem = ({ item }) => {
    const avatarColor = getAvatarColor(item.email);
    const initial = item.email.charAt(0).toUpperCase();

    // --- ENCRYPTION HANDLING START ---
    // If the last_message is an object, it's encrypted data.
    // We can't decrypt it here without the user's private key and serious CPU overhead,
    // so we show a secure placeholder string.
    let displayMessage = item.last_message;
    
    if (displayMessage && typeof displayMessage === 'object') {
      displayMessage = "🔒 Encrypted Message";
    } else if (!displayMessage) {
      displayMessage = "No messages yet";
    }
    // --- ENCRYPTION HANDLING END ---

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ChatScreen', {
          userPublicId,
          contactPublicId: item.public_id,
          contactEmail: item.email,
          contactPublicKey: item.public_key // Passing this prevents an extra fetch in ChatScreen
        })}
        style={styles.chatCard}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initial}</Text>
          <View style={styles.onlineStatus} />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.row}>
            <Text style={styles.emailText} numberOfLines={1}>
              {item.username || item.email}
            </Text>
            {item.last_message_at && (
              <Text style={styles.timeText}>{formatTime(item.last_message_at)}</Text>
            )}
          </View>

          <Text style={[styles.subText, item.unread && styles.unreadText]} numberOfLines={1}>
            {displayMessage}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Secure Messages 🔒</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={22} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.public_id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={80} color="#E2E8F0" />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textMain,
    letterSpacing: -0.5,
  },
  searchButton: {
    padding: 8,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.textMuted, fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
  chatCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: { 
    width: 58, 
    height: 58, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15,
    position: 'relative'
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 22 },
  onlineStatus: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: COLORS.online,
    borderWidth: 3,
    borderColor: COLORS.card
  },
  contentContainer: { flex: 1, marginRight: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  emailText: { fontSize: 16, fontWeight: '700', color: COLORS.textMain, flex: 1 },
  timeText: { fontSize: 12, color: COLORS.textMuted },
  subText: { fontSize: 14, color: COLORS.textMuted },
  unreadText: { fontWeight: '700', color: COLORS.textMain },
  emptyContainer: { marginTop: 100, alignItems: 'center' },
  emptyText: { marginTop: 15, color: COLORS.textMuted, fontSize: 16, fontWeight: '500' }
});