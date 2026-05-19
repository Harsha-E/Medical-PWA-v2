/**
 * @fileoverview Comprehensive Utility Library for MedCare PWA.
 * Architecture: Native ES6 Module, Zero External Dependencies.
 * Paradigm: High-performance, memory-safe helpers for DOM, Data, and Network.
 */

// ============================================================================
// TOAST SYSTEM
// ============================================================================

/**
 * SVG Icon Definitions for Toast Notifications
 * @type {Object<string, string>}
 */
const TOAST_ICONS = {
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    warn: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
};

/**
 * Dynamically creates and displays a non-blocking toast notification.
 * @param {string} message - The text payload to display.
 * @param {'info'|'success'|'warn'|'error'} [type='info'] - Semantic type dictating styling and icon.
 * @param {number} [duration=4000] - Display duration in milliseconds before auto-dismissal.
 */
function showToast(message, type = 'info', duration = 4000) {
    const toastContainer = qs('#medcare-toast-layer');
    if (!toastContainer) {
        console.warn('[Utils:Toast] Container #medcare-toast-layer missing from DOM.');
        return;
    }

    const toastElement = createElement('div', ['toast', `toast--${type}`], {
        role: 'alert',
        'aria-live': 'polite'
    });

    const iconHtml = TOAST_ICONS[type] || TOAST_ICONS.info;
    toastElement.innerHTML = `
        <span class="flex items-center justify-center">${iconHtml}</span>
        <span class="typography-body">${sanitizeString(message)}</span>
    `;

    toastContainer.appendChild(toastElement);

    // Auto-dismissal cleanup with animation handling
    setTimeout(() => {
        // Fallback programmatic animation mapping to style.css keyframes
        // Applied safely to trigger the exit transition before removing from DOM
        toastElement.style.animation = 'toastOut 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards';
        
        toastElement.addEventListener('animationend', () => {
            toastElement.remove();
        }, { once: true });
    }, duration);
}

// ============================================================================
// MODAL SYSTEM
// ============================================================================

/**
 * Populates and reveals the application-level modal overlay.
 * Returns a Promise to allow async/await flow control for user confirmations.
 * @param {string} title - The header text for the modal.
 * @param {string} body - The HTML or text content for the modal body.
 * @param {string} [primaryLabel='OK'] - The text for the primary action button.
 * @param {Function} [onPrimary] - Optional synchronous callback executed before resolution.
 * @returns {Promise<boolean>} Resolves to true when the primary button is clicked.
 */
function showModal(title, body, primaryLabel = 'OK', onPrimary = null) {
    return new Promise((resolve) => {
        const modalLayer = qs('#medcare-modal-layer');
        const titleElement = qs('#modal-title');
        const bodyElement = qs('#modal-body');
        const primaryBtn = qs('#modal-primary-btn');

        if (!modalLayer || !titleElement || !bodyElement || !primaryBtn) {
            console.error('[Utils:Modal] Required modal DOM elements missing.');
            resolve(false);
            return;
        }

        titleElement.textContent = sanitizeString(title);
        bodyElement.innerHTML = sanitizeString(body); // Allowing safe tags could be done via DOMPurify, basic sanitization applied.
        
        // Clone button to securely sever any lingering event listeners from previous modal instances
        const clonedBtn = primaryBtn.cloneNode(true);
        clonedBtn.textContent = sanitizeString(primaryLabel);
        primaryBtn.replaceWith(clonedBtn);

        clonedBtn.addEventListener('click', () => {
            hideModal();
            if (typeof onPrimary === 'function') {
                onPrimary();
            }
            resolve(true);
        }, { once: true });

        modalLayer.classList.remove('hidden');
    });
}

/**
 * Hides the application-level modal overlay.
 */
function hideModal() {
    const modalLayer = qs('#medcare-modal-layer');
    if (modalLayer) {
        modalLayer.classList.add('hidden');
    }
}

// ============================================================================
// DATE / TIME UTILITIES
// ============================================================================

/**
 * Converts an ISO date string into a human-readable relative time format.
 * @param {string|number|Date} isoString - The target date/time.
 * @returns {string} e.g., "2 hours ago", "yesterday", "Just now"
 */
function formatRelativeTime(isoString) {
    if (!isoString) return '';
    const targetDate = new Date(isoString);
    if (isNaN(targetDate.getTime())) return 'Invalid date';

    const now = new Date();
    const diffInMs = now - targetDate;
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return formatDate(isoString);
}

/**
 * Formats an ISO string specifically for medication dosing schedules (Local Time).
 * @param {string|number|Date} isoString - The target date/time.
 * @returns {string} e.g., "8:30 AM"
 */
function formatDoseTime(isoString) {
    if (!isoString) return '';
    const targetDate = new Date(isoString);
    if (isNaN(targetDate.getTime())) return '--:--';

    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(targetDate);
}

/**
 * Formats an ISO string to a standard readable date.
 * @param {string|number|Date} isoString - The target date/time.
 * @returns {string} e.g., "Mon, 14 Jul 2025"
 */
function formatDate(isoString) {
    if (!isoString) return '';
    const targetDate = new Date(isoString);
    if (isNaN(targetDate.getTime())) return 'Invalid date';

    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(targetDate);
}

/**
 * Checks if two dates fall on the same calendar day locally.
 * @param {string|number|Date} date1 
 * @param {string|number|Date} date2 
 * @returns {boolean}
 */
function isSameDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
    
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

/**
 * Returns a new Date object clamped to 00:00:00.000 local time.
 * @param {string|number|Date} dateInput 
 * @returns {Date}
 */
function startOfDay(dateInput) {
    const targetDate = new Date(dateInput);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate;
}

/**
 * Calculates the total integer days passed between two dates.
 * @param {string|number|Date} date1 - Start date
 * @param {string|number|Date} date2 - End date
 * @returns {number} Integer representing the difference in days
 */
function daysBetween(date1, date2) {
    const start = startOfDay(date1).getTime();
    const end = startOfDay(date2).getTime();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.round(Math.abs((end - start) / MS_PER_DAY));
}

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generates a collision-resistant unique identifier.
 * Favors native crypto.randomUUID with a fallback for older webviews.
 * @returns {string} UUIDv4 compliant or heavily randomized string.
 */
function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback pseudo-UUID
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates if an input string represents a valid medical dosage format.
 * Expects a numeric value followed directly by a standard unit (e.g., '500mg', '10.5ml').
 * @param {string} value 
 * @returns {boolean}
 */
function isValidDosage(value) {
    if (!value || typeof value !== 'string') return false;
    const dosagePattern = /^\d+(\.\d+)?[a-zA-Z]+$/;
    return dosagePattern.test(value.trim());
}

/**
 * Validates standard international blood type strings.
 * @param {string} value 
 * @returns {boolean}
 */
function isValidBloodType(value) {
    if (!value || typeof value !== 'string') return false;
    const validTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    return validTypes.includes(value.trim().toUpperCase());
}

/**
 * Strips dangerous HTML tags from a string input to prevent XSS.
 * @param {string} input 
 * @returns {string} Sanitized and trimmed string.
 */
function sanitizeString(input) {
    if (!input || typeof input !== 'string') return '';
    // Strip HTML tags
    const doc = new DOMParser().parseFromString(input, 'text/html');
    return (doc.body.textContent || '').trim();
}

// ============================================================================
// DATA HELPERS
// ============================================================================

/**
 * Deep clones an object securely, preserving structure and detaching references.
 * @param {Object|Array} obj - The data structure to clone.
 * @returns {Object|Array} A distinct cloned structure.
 */
function deepClone(obj) {
    if (!obj) return obj;
    if (typeof structuredClone === 'function') {
        return structuredClone(obj);
    }
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Pauses execution for a specified number of milliseconds.
 * @param {number} ms - Milliseconds to delay.
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Limits the execution rate of a function. The function will execute only after 
 * the specified delay has passed since its last invocation.
 * @param {Function} fn - The function to debounce.
 * @param {number} delay - Milliseconds to delay.
 * @returns {Function} Debounced wrapper.
 */
function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

/**
 * Ensures a function is called at most once per specified time limit.
 * @param {Function} fn - The function to throttle.
 * @param {number} limit - Milliseconds representing the rate limit.
 * @returns {Function} Throttled wrapper.
 */
function throttle(fn, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Groups an array of objects by a specific property evaluated by a key function.
 * @param {Array<Object>} array - Data to group.
 * @param {Function} keyFn - Function extracting the key (e.g., item => item.category).
 * @returns {Map<any, Array<Object>>} A Map where keys map to arrays of matching items.
 */
function groupBy(array, keyFn) {
    if (!Array.isArray(array)) return new Map();
    const resultGroup = new Map();
    
    for (const item of array) {
        const key = keyFn(item);
        if (!resultGroup.has(key)) {
            resultGroup.set(key, []);
        }
        resultGroup.get(key).push(item);
    }
    
    return resultGroup;
}

/**
 * Sorts an array of objects immutably based on a key extraction function.
 * @param {Array<Object>} array - Data to sort.
 * @param {Function} keyFn - Function extracting the sort value.
 * @param {'asc'|'desc'} [dir='asc'] - Sort direction.
 * @returns {Array<Object>} A sorted, shallow copy of the array.
 */
function sortBy(array, keyFn, dir = 'asc') {
    if (!Array.isArray(array)) return [];
    
    const arrayCopy = array.slice();
    const sortMultiplier = dir === 'desc' ? -1 : 1;

    return arrayCopy.sort((itemA, itemB) => {
        const valueA = keyFn(itemA);
        const valueB = keyFn(itemB);

        if (typeof valueA === 'string' && typeof valueB === 'string') {
            return valueA.localeCompare(valueB) * sortMultiplier;
        }
        
        if (valueA < valueB) return -1 * sortMultiplier;
        if (valueA > valueB) return 1 * sortMultiplier;
        return 0;
    });
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/**
 * Instantiates a DOM element, assigns CSS classes, and sets attributes.
 * @param {string} tag - The HTML tag name (e.g., 'div', 'button').
 * @param {Array<string>} [classes=[]] - Array of class names mapping to style.css.
 * @param {Object<string, string>} [attrs={}] - Object mapping of HTML attributes.
 * @returns {HTMLElement} The constructed DOM node.
 */
function createElement(tag, classes = [], attrs = {}) {
    const element = document.createElement(tag);
    
    if (Array.isArray(classes) && classes.length > 0) {
        element.classList.add(...classes.filter(Boolean));
    }

    if (attrs && typeof attrs === 'object') {
        for (const [key, value] of Object.entries(attrs)) {
            element.setAttribute(key, value);
        }
    }

    return element;
}

/**
 * Safe querySelector wrapper with explicit null guard structure.
 * @param {string} selector - CSS selector string.
 * @param {HTMLElement|Document} [parent=document] - Scope for the query.
 * @returns {HTMLElement|null}
 */
function qs(selector, parent = document) {
    if (!parent || typeof parent.querySelector !== 'function') return null;
    return parent.querySelector(selector);
}

/**
 * Safe querySelectorAll wrapper returning a native Array instead of NodeList.
 * @param {string} selector - CSS selector string.
 * @param {HTMLElement|Document} [parent=document] - Scope for the query.
 * @returns {Array<HTMLElement>}
 */
function qsAll(selector, parent = document) {
    if (!parent || typeof parent.querySelectorAll !== 'function') return [];
    return Array.from(parent.querySelectorAll(selector));
}

/**
 * Attach an event listener and return an immutable cleanup function.
 * @param {HTMLElement|Window|Document} element - The event target.
 * @param {string} event - The event name.
 * @param {Function} handler - The callback function.
 * @param {boolean|Object} [options] - EventListener options.
 * @returns {Function} Invokable function to safely remove the listener.
 */
function on(element, event, handler, options = false) {
    if (!element || typeof element.addEventListener !== 'function') {
        console.warn(`[Utils:DOM] Cannot bind event '${event}' to invalid element.`);
        return () => {};
    }

    element.addEventListener(event, handler, options);
    
    return () => {
        element.removeEventListener(event, handler, options);
    };
}

// ============================================================================
// NETWORK
// ============================================================================

/**
 * Synchronous check of the current navigator online status.
 * @returns {boolean} True if the browser reports network connectivity.
 */
function isOnline() {
    return typeof navigator !== 'undefined' && navigator.onLine === true;
}

/**
 * Registers real-time listeners for network connection state changes.
 * @param {Function} onlineCallback - Executed when connection is restored.
 * @param {Function} offlineCallback - Executed when connection is lost.
 * @returns {Function} Invokable cleanup function to unregister both listeners.
 */
function onNetworkChange(onlineCallback, offlineCallback) {
    const unbindOnline = on(window, 'online', () => {
        if (typeof onlineCallback === 'function') onlineCallback();
    });
    
    const unbindOffline = on(window, 'offline', () => {
        if (typeof offlineCallback === 'function') offlineCallback();
    });

    return () => {
        unbindOnline();
        unbindOffline();
    };
}

// ============================================================================
// CRYPTO (Non-Sensitive / Hashing)
// ============================================================================

/**
 * Computes a SHA-256 hash of a string securely via Web Crypto API.
 * Used for fast delta comparisons and data integrity checks.
 * @param {string} str - The target string to hash.
 * @returns {Promise<string>} Hexadecimal string representation of the hash.
 */
async function hashString(str) {
    try {
        if (!crypto || !crypto.subtle) {
            throw new Error('Web Crypto API not available in this environment.');
        }
        
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hexString = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
        
        return hexString;
    } catch (error) {
        console.error('[Utils:Crypto] Hash generation failed:', error);
        // Fallback for extreme environments without SubleCrypto (not ideal, but prevents fatal crash)
        return generateId(); 
    }
}

/**
 * Generates a secure, cryptographically random numeric One Time Password (OTP).
 * Primarily used for WebRTC (PeerJS) QR pairing tunnels.
 * @param {number} [length=6] - The desired length of the numeric string.
 * @returns {string} Numeric string.
 */
function generateOTP(length = 6) {
    if (length <= 0) return '';
    
    let otpString = '';
    const randomBuffer = new Uint32Array(length);
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(randomBuffer);
        for (let i = 0; i < length; i++) {
            // Modulo 10 gives a single digit 0-9
            otpString += (randomBuffer[i] % 10).toString();
        }
    } else {
        // Fallback if typed arrays fail
        for (let i = 0; i < length; i++) {
            otpString += Math.floor(Math.random() * 10).toString();
        }
    }
    
    return otpString;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    showToast,
    showModal,
    hideModal,
    formatRelativeTime,
    formatDoseTime,
    formatDate,
    isSameDay,
    startOfDay,
    daysBetween,
    generateId,
    isValidDosage,
    isValidBloodType,
    sanitizeString,
    deepClone,
    sleep,
    debounce,
    throttle,
    groupBy,
    sortBy,
    createElement,
    qs,
    qsAll,
    on,
    isOnline,
    onNetworkChange,
    hashString,
    generateOTP
};

export const Utils = {
    showToast,
    showModal,
    hideModal,
    formatRelativeTime,
    formatDoseTime,
    formatDate,
    isSameDay,
    startOfDay,
    daysBetween,
    generateId,
    isValidDosage,
    isValidBloodType,
    sanitizeString,
    deepClone,
    sleep,
    debounce,
    throttle,
    groupBy,
    sortBy,
    createElement,
    qs,
    qsAll,
    on,
    isOnline,
    onNetworkChange,
    hashString,
    generateOTP
};