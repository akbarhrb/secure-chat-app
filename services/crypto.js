import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';
import 'react-native-get-random-values';
import * as Random from 'expo-random';

if (global.crypto === undefined) {
  global.crypto = {};
}

if (!global.crypto.getRandomValues) {
  global.crypto.getRandomValues = function (array) {
    const bytes = Random.getRandomBytes(array.length);
    array.set(bytes);
  };
}

// Generate RSA keys
export function generateKeys() {
  const crypt = new JSEncrypt({ default_key_size: 2048 });
  crypt.getKey(); // generate key pair

  return {
    publicKey: crypt.getPublicKey(),
    privateKey: crypt.getPrivateKey(),
  };
}

// Encrypt message with AES, then encrypt AES key with RSA
export function encryptMessage(message, receiverPublicKey) {
  const aesKey = CryptoJS.lib.WordArray.random(32).toString(); // 256-bit AES key
  const ciphertext = CryptoJS.AES.encrypt(message, aesKey).toString();

  const rsa = new JSEncrypt();
  rsa.setPublicKey(receiverPublicKey);
  const encryptedKey = rsa.encrypt(aesKey);

  return {
    encryptedMessage: ciphertext,
    encryptedKey,
  };
}

// Decrypt AES key with private RSA, then decrypt message
export function decryptMessage(data, privateKey) {
  const rsa = new JSEncrypt();
  rsa.setPrivateKey(privateKey);

  const aesKey = rsa.decrypt(data.encryptedKey);
  if (!aesKey) throw new Error('Failed to decrypt AES key');

  const bytes = CryptoJS.AES.decrypt(data.encryptedMessage, aesKey);
  const originalText = bytes.toString(CryptoJS.enc.Utf8);
  return originalText;
}

// Encrypt a file (base64) with AES
export function encryptFile(base64Data) {
  const aesKey = CryptoJS.lib.WordArray.random(32).toString(); // 256-bit key
  const iv = CryptoJS.lib.WordArray.random(16).toString(); // 128-bit IV

  const encrypted = CryptoJS.AES.encrypt(
    base64Data,
    CryptoJS.enc.Hex.parse(aesKey),
    {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  ).toString();

  return {
    encryptedFileData: encrypted,
    aesKey,
    iv
  };
}

// Decrypt AES-encrypted base64 file
export function decryptFile(base64Encrypted, aesKeyHex, ivHex) {
  const decrypted = CryptoJS.AES.decrypt(
    {
      ciphertext: CryptoJS.enc.Base64.parse(base64Encrypted),
    },
    CryptoJS.enc.Hex.parse(aesKeyHex),
    {
      iv: CryptoJS.enc.Hex.parse(ivHex),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );

  // Convert decrypted WordArray to Base64
  return CryptoJS.enc.Base64.stringify(decrypted);
}
