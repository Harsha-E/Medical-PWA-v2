/**
 * @fileoverview Cryptographic Vault Service for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module.
 * Paradigm: Local Encryption via Web Crypto API.
 * Requires: window.crypto.subtle available in a Secure Context (HTTPS/localhost).
 * * @security PIN is never stored. Only the derived CryptoKey is held in 
 * memory and is actively cleared upon calling lock().
 */

import { dbEngine } from './DatabaseEngine.js';

// ============================================================================
// CRYPTOGRAPHIC CONSTANTS
// ============================================================================
const PBKDF2_ITERATIONS = 310000; // OWASP 2023 Recommendation for PBKDF2-HMAC-SHA256
const SALT_LENGTH_BYTES = 16;     // Standard salt length
const IV_LENGTH_BYTES = 12;       // Standard Initialization Vector length for AES-GCM
const KEY_LENGTH_BITS = 256;      // Maximum AES key strength
const CANARY_STRING = 'medcare_ok';
const CANARY_DB_KEY = 'cryptoCanary';
const SALT_DB_KEY = 'cryptoSalt';

/**
 * Core Security Service managing AES-GCM encryption and decryption.
 * Protects local PHI (Protected Health Information) utilizing keys derived
 * from the user's PIN via PBKDF2.
 */
class CryptoVault {
    constructor() {
        /**
         * The derived cryptographic key utilized for AES-GCM operations.
         * Maintained exclusively in volatile memory.
         * @private
         * @type {CryptoKey|null}
         */
        this._cryptoKey = null;

        /**
         * Access state flag tracking vault readiness.
         * @private
         * @type {boolean}
         */
        this._isUnlocked = false;

        if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
            console.error('[CryptoVault Fatal] Web Crypto API is unavailable. Ensure context is secure (HTTPS).');
        }
    }

    /**
     * Converts a binary ArrayBuffer into a Base64 encoded string.
     * @private
     * @param {ArrayBuffer} buffer - The raw binary data.
     * @returns {string} The Base64 representation.
     */
    _toBase64(buffer) {
        const byteMatrix = new Uint8Array(buffer);
        let binaryString = '';
        for (let i = 0; i < byteMatrix.byteLength; i++) {
            binaryString += String.fromCharCode(byteMatrix[i]);
        }
        return window.btoa(binaryString);
    }

    /**
     * Converts a Base64 string back into a binary Uint8Array.
     * @private
     * @param {string} base64String - The Base64 encoded payload.
     * @returns {Uint8Array} The extracted binary array.
     */
    _fromBase64(base64String) {
        const binarySequence = window.atob(base64String);
        const byteMatrix = new Uint8Array(binarySequence.length);
        for (let i = 0; i < binarySequence.length; i++) {
            byteMatrix[i] = binarySequence.charCodeAt(i);
        }
        return byteMatrix;
    }

    /**
     * Internal hardware-accelerated key derivation utilizing PBKDF2.
     * @private
     * @param {string} pin - The user-provided alphanumeric PIN.
     * @param {Uint8Array} salt - The unique cryptographic salt sequence.
     * @returns {Promise<CryptoKey>} The symmetric AES-GCM encryption key.
     * @throws {Error} If key derivation fails.
     */
    async _deriveKey(pin, salt) {
        try {
            const encoder = new TextEncoder();
            const initialKeyMaterial = await window.crypto.subtle.importKey(
                'raw',
                encoder.encode(pin),
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );

            return await window.crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: PBKDF2_ITERATIONS,
                    hash: 'SHA-256'
                },
                initialKeyMaterial,
                { name: 'AES-GCM', length: KEY_LENGTH_BITS },
                false,
                ['encrypt', 'decrypt']
            );
        } catch (derivationError) {
            console.error('[CryptoVault] Critical failure during key derivation phase:', derivationError);
            throw new Error('Cryptographic key derivation failed.');
        }
    }

    /**
     * Encrypts the static verification token and anchors it to IndexedDB.
     * Enables subsequent PIN validation without compromising user payload data.
     * @private
     * @returns {Promise<void>}
     */
    async _storeCanary() {
        try {
            const encryptedCanary = await this.encrypt(CANARY_STRING);
            await dbEngine.setProfileField(CANARY_DB_KEY, encryptedCanary);
        } catch (canaryError) {
            console.error('[CryptoVault] Canary placement sequence rejected:', canaryError);
            throw new Error('Failed to anchor cryptographic canary.');
        }
    }

    /**
     * Initializes the encryption subsystem during user onboarding.
     * Generates persistent salts and derives the initial memory-bound CryptoKey.
     * @param {string} pin - The selected 4-8 character alphanumeric security PIN.
     * @returns {Promise<boolean>} True if initialization completes successfully.
     * @throws {Error} If the PIN pattern violates security constraints.
     */
    async setupPin(pin) {
        const pinConstraints = /^[a-zA-Z0-9]{4,8}$/;
        if (!pin || typeof pin !== 'string' || !pinConstraints.test(pin)) {
            throw new Error('Security PIN must be 4 to 8 alphanumeric characters.');
        }

        try {
            const cryptographicSalt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
            const base64Salt = this._toBase64(cryptographicSalt.buffer);
            
            this._cryptoKey = await this._deriveKey(pin, cryptographicSalt);
            this._isUnlocked = true;

            await dbEngine.setProfileField(SALT_DB_KEY, base64Salt);
            await this._storeCanary();

            console.log('[CryptoVault] Encryption architecture established successfully.');
            return true;
        } catch (setupError) {
            this.lock();
            console.error('[CryptoVault] Vault initialization sequence failed:', setupError);
            throw new Error('Vault setup failed due to internal cryptographic error.');
        }
    }

    /**
     * Restores access to the vault by verifying the PIN against the stored canary token.
     * @param {string} pin - The user-provided security PIN.
     * @returns {Promise<boolean>} True if the PIN successfully decrypts the verification canary.
     */
    async unlock(pin) {
        try {
            const base64Salt = await dbEngine.getProfileField(SALT_DB_KEY);
            const storedCanary = await dbEngine.getProfileField(CANARY_DB_KEY);

            if (!base64Salt || !storedCanary) {
                console.warn('[CryptoVault] Missing salt or canary variables. Setup required.');
                return false;
            }

            const activeSalt = this._fromBase64(base64Salt);
            const proposedKey = await this._deriveKey(pin, activeSalt);

            // Temporarily assign the proposed key to attempt canary decryption
            this._cryptoKey = proposedKey;
            this._isUnlocked = true;

            const decryptedCanary = await this.decrypt(storedCanary);

            if (decryptedCanary === CANARY_STRING) {
                console.log('[CryptoVault] Vault access authenticated.');
                return true;
            } else {
                this.lock(); // Immediately purge invalid keys
                return false;
            }
        } catch (unlockError) {
            // Decryption failure indicates an incorrect PIN. Fail gracefully.
            this.lock();
            return false;
        }
    }

    /**
     * Secures a standard UTF-8 string utilizing AES-GCM encryption.
     * @param {string} plaintextString - The sensitive data payload.
     * @returns {Promise<string>} Base64 formatted string combining IV and Ciphertext.
     * @throws {Error} If the vault is locked or encryption fails.
     */
    async encrypt(plaintextString) {
        if (!this._isUnlocked || !this._cryptoKey) {
            throw new Error('Vault is locked. Call unlock() first.');
        }

        try {
            const initializationVector = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
            const dataEncoder = new TextEncoder();
            const binaryData = dataEncoder.encode(plaintextString);

            const ciphertextBuffer = await window.crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: initializationVector
                },
                this._cryptoKey,
                binaryData
            );

            const base64IV = this._toBase64(initializationVector.buffer);
            const base64Ciphertext = this._toBase64(ciphertextBuffer);

            return `${base64IV}.${base64Ciphertext}`;
        } catch (encryptionError) {
            console.error('[CryptoVault] Data masking sequence failed:', encryptionError);
            throw new Error('Encryption execution failed.');
        }
    }

    /**
     * Reverts a previously secured Base64 string back into readable plaintext.
     * @param {string} encryptedString - The formatted string containing the IV and Ciphertext.
     * @returns {Promise<string>} The extracted plaintext payload.
     * @throws {Error} If the vault is locked, data is malformed, or integrity is compromised.
     */
    async decrypt(encryptedString) {
        if (!this._isUnlocked || !this._cryptoKey) {
            throw new Error('Vault is locked. Call unlock() first.');
        }

        if (!encryptedString || typeof encryptedString !== 'string' || !encryptedString.includes('.')) {
            throw new Error('Decryption failed. Encrypted payload is malformed.');
        }

        try {
            const [base64IV, base64Ciphertext] = encryptedString.split('.');
            const initializationVector = this._fromBase64(base64IV);
            const ciphertextBinary = this._fromBase64(base64Ciphertext);

            const plaintextBuffer = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: initializationVector
                },
                this._cryptoKey,
                ciphertextBinary
            );

            const dataDecoder = new TextDecoder();
            return dataDecoder.decode(plaintextBuffer);

        } catch (decryptionError) {
            console.error('[CryptoVault] Payload extraction rejected:', decryptionError);
            throw new Error('Decryption failed. Data may be corrupted.');
        }
    }

    /**
     * Convenience method wrapping standard JSON stringification before encryption.
     * @param {Object} obj - The complex data structure to secure.
     * @returns {Promise<string>} The encrypted string payload.
     */
    async encryptObject(obj) {
        try {
            const jsonPayload = JSON.stringify(obj);
            return await this.encrypt(jsonPayload);
        } catch (serializationError) {
            throw new Error('Failed to serialize object for encryption.');
        }
    }

    /**
     * Convenience method wrapping standard decryption before JSON parsing.
     * @param {string} encryptedString - The secured payload.
     * @returns {Promise<Object>} The reconstituted data structure.
     */
    async decryptObject(encryptedString) {
        try {
            const jsonPayload = await this.decrypt(encryptedString);
            return JSON.parse(jsonPayload);
        } catch (parseError) {
            throw new Error('Failed to parse decrypted object payload.');
        }
    }

    /**
     * Secures the system by forcibly clearing the active cryptographic key from memory.
     * Must be executed when the application shifts to the background.
     * @returns {void}
     */
    lock() {
        this._cryptoKey = null;
        this._isUnlocked = false;
        console.log('[CryptoVault] Volatile key memory purged. Vault locked.');
    }

    /**
     * Exposes the current accessibility state of the cryptographic module.
     * @returns {boolean} True if the vault holds an active, validated key.
     */
    isUnlocked() {
        return this._isUnlocked;
    }
}

// Export a persistent singleton instance guaranteeing uniform state control
export const cryptoVault = new CryptoVault();