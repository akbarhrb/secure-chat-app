import * as SecureStore from 'expo-secure-store';

export async function savePrivateKey(key) {
  await SecureStore.setItemAsync('private_key', key);
}

export async function getPrivateKey() {
  return await SecureStore.getItemAsync('private_key');
}
