/**
 * @fileoverview Web Crypto API Vault Service.
 * Architecture: ES6 Module, Zero-Dependency.
 * Paradigm: Local AES-GCM encryption for PHI (Protected Health Information).
 * @security The raw PIN is never stored. The derived CryptoKey is kept only in 
 * memory and is aggressively cleared on lock() or app background.
 */

class CryptoVault {
  constructor() {
    /** @type {CryptoKey|null} The active AES-GCM key */
    this._cryptoKey = null;
    
    /** @type {boolean} Vault status */
    this._isUnlocked = false;

    // Cryptographic Constants
    this.PBKDF2_ITERATIONS = 310000;
    this.SALT_LENGTH = 16;
    this.IV_LENGTH = 12;
    this.KEY_LENGTH = 256;
  }

  /**
   * Generates a new cryptographic key from a PIN and secures a canary value.
   * @param {string} pin - A 4-8 digit numeric or alphanumeric PIN.
   * @returns {Promise<boolean>}
   */
  async setupPin(pin) {
    if (!pin || pin.length < 4) {
      throw new Error('[CryptoVault] PIN must be at least 4 characters.');
    }

    try {
      // 1. Generate random Salt
      const salt = window.crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const base64Salt = this._toBase64(salt);

      // 2. Derive Key
      this._cryptoKey = await this._deriveKey(pin, salt);
      this._isUnlocked = true;

      // 3. Store Salt (Safe to store in plaintext localStorage)
      localStorage.setItem('medcheck_crypto_salt', base64Salt);

      // 4. Store encrypted Canary to verify PINs in the future
      await this._storeCanary();

      console.log('[CryptoVault] Vault secured and locked to new PIN.');
      return true;

    } catch (error) {
      console.error('[CryptoVault] Failed to setup PIN:', error);
      this.lock();
      return false;
    }
  }

  /**
   * Attempts to unlock the vault using a provided PIN.
   * @param {string} pin 
   * @returns {Promise<boolean>} True if unlocked, false if PIN is incorrect.
   */
  async unlock(pin) {
    try {
      const base64Salt = localStorage.getItem('medcheck_crypto_salt');
      const encryptedCanary = localStorage.getItem('medcheck_crypto_canary');

      if (!base64Salt || !encryptedCanary) {
        console.warn('[CryptoVault] No vault setup found.');
        return false;
      }

      const salt = this._fromBase64(base64Salt);
      
      // Temporarily derive key to test
      this._cryptoKey = await this._deriveKey(pin, salt);
      this._isUnlocked = true; // Set true temporarily to allow decrypt()

      // Test the key against the canary
      const decryptedCanary = await this.decrypt(encryptedCanary);

      if (decryptedCanary === 'medcheck_ok') {
        console.log('[CryptoVault] Vault unlocked successfully.');
        return true;
      } else {
        this.lock();
        return false;
      }

    } catch (error) {
      // A decryption failure here means the wrong key (wrong PIN) was used
      this.lock();
      return false;
    }
  }

  /**
   * Encrypts a known string to verify future unlock attempts without exposing data.
   * @private
   */
  async _storeCanary() {
    const encrypted = await this.encrypt('medcheck_ok');
    localStorage.setItem('medcheck_crypto_canary', encrypted);
  }

  /**
   * Encrypts a plaintext string using AES-GCM.
   * @param {string} plaintextString 
   * @returns {Promise<string>} Base64 formatted string: "IV.Ciphertext"
   */
  async encrypt(plaintextString) {
    if (!this._isUnlocked || !this._cryptoKey) {
      throw new Error('[CryptoVault] Vault is locked. Call unlock() first.');
    }

    const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    const encodedText = new TextEncoder().encode(plaintextString);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      this._cryptoKey,
      encodedText
    );

    const base64Iv = this._toBase64(iv);
    const base64Ciphertext = this._toBase64(new Uint8Array(ciphertextBuffer));

    // Append IV to ciphertext so it can be extracted during decryption
    return `${base64Iv}.${base64Ciphertext}`;
  }

  /**
   * Decrypts an AES-GCM encrypted string.
   * @param {string} encryptedString - Format: "IV.Ciphertext"
   * @returns {Promise<string>}
   */
  async decrypt(encryptedString) {
    if (!this._isUnlocked || !this._cryptoKey) {
      throw new Error('[CryptoVault] Vault is locked.');
    }

    const parts = encryptedString.split('.');
    if (parts.length !== 2) throw new Error('[CryptoVault] Invalid encrypted payload format.');

    const iv = this._fromBase64(parts[0]);
    const ciphertext = this._fromBase64(parts[1]);

    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        this._cryptoKey,
        ciphertext
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      throw new Error('[CryptoVault] Decryption failed. Data corrupted or wrong PIN.');
    }
  }

  /**
   * Helper to encrypt a JavaScript object.
   * @param {Object} obj 
   * @returns {Promise<string>}
   */
  async encryptObject(obj) {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * Helper to decrypt a JavaScript object.
   * @param {string} encryptedString 
   * @returns {Promise<Object>}
   */
  async decryptObject(encryptedString) {
    const jsonStr = await this.decrypt(encryptedString);
    return JSON.parse(jsonStr);
  }

  /**
   * Instantly destroys the cryptographic key in memory and locks the vault.
   */
  lock() {
    this._cryptoKey = null;
    this._isUnlocked = false;
    console.log('[CryptoVault] Vault locked. Key destroyed.');
  }

  /**
   * @returns {boolean} True if the vault is currently open.
   */
  isUnlocked() {
    return this._isUnlocked;
  }

  /**
   * Standard PBKDF2 Key Derivation function.
   * @private
   */
  async _deriveKey(pin, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      false, // Do not allow the key to be extracted from the Crypto API
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Converts Uint8Array to Base64 String.
   * @private
   */
  _toBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Converts Base64 String to Uint8Array.
   * @private
   */
  _fromBase64(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
  }
}

export const cryptoVault = new CryptoVault();