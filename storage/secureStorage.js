import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

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
