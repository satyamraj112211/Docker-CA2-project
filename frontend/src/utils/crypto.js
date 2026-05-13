// Wrapper around Web Crypto API for End-to-End Encryption

const getPasswordKey = (password) => {
  const enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
};

const deriveKey = async (passwordKey, salt, keyUsage) => {
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    keyUsage
  );
};

const arrayBufferToBase64 = (buffer) => {
  let binary = "";
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToArrayBuffer = (base64) => {
  let binary_string = window.atob(base64);
  let len = binary_string.length;
  let bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

export const encryptText = async (plaintext, password) => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const passwordKey = await getPasswordKey(password);
  const aesKey = await deriveKey(passwordKey, salt, ["encrypt"]);
  
  const enc = new TextEncoder();
  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    enc.encode(plaintext)
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedContent),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt)
  };
};

export const decryptText = async (ciphertextBase64, ivBase64, saltBase64, password) => {
  try {
    const ciphertext = base64ToArrayBuffer(ciphertextBase64);
    const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
    const salt = new Uint8Array(base64ToArrayBuffer(saltBase64));

    const passwordKey = await getPasswordKey(password);
    const aesKey = await deriveKey(passwordKey, salt, ["decrypt"]);

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedContent);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Invalid passcode or corrupted data.");
  }
};
