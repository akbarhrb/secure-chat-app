import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Save private key
export const savePrivateKey = async (key) => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem('private_key', key);
    } else {
      await SecureStore.setItemAsync('private_key', key);
    }
  } catch (e) {
    console.log('Save key error:', e);
    throw e;
  }
};

// Get private key
export const getPrivateKey = async () => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem('private_key');
    } else {
      return await SecureStore.getItemAsync('private_key');
    }
  } catch (e) {
    console.log('Get key error:', e);
    throw e;
  }
};
