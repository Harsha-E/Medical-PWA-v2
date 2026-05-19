/**
 * @fileoverview Reactive State Management Module for MedCare PWA.
 * Architecture: Singleton Event-Driven Store (Redux-inspired)
 * Paradigm: Offline-First, Immutable State, Vanilla JS (ES6)
 */

/**
 * Recursively freezes an object to guarantee immutability.
 * @param {Object|Array} targetObject - The state object to freeze.
 * @returns {Object|Array} The deep-frozen state object.
 */
const deepFreeze = (targetObject) => {
    const propertyNames = Reflect.ownKeys(targetObject);
    for (const propertyName of propertyNames) {
        const propertyValue = targetObject[propertyName];
        if (
            propertyValue &&
            typeof propertyValue === 'object' &&
            !Object.isFrozen(propertyValue)
        ) {
            deepFreeze(propertyValue);
        }
    }
    return Object.freeze(targetObject);
};

/**
 * The initial baseline state for the application.
 * Defines the structure of the data architecture.
 * @type {Object}
 */
const INITIAL_STATE = {
    app: {
        currentView: 'splash',
        isLoading: true,
        isOnline: navigator.onLine
    },
    user: {
        name: '',
        bloodType: '',
        allergies: [],
        pin: null,
        onboarded: false
    },
    medications: [], 
    doseLogs: [],
    alerts: [],
    graph: {}
};

/**
 * The Central Reactive Store for MedCare PWA.
 * Manages all application state with strict immutability, action reduction, 
 * and slice-based UI subscriptions.
 */
class Store {
    /**
     * @param {Object} initialState - The starting state tree.
     */
    constructor(initialState) {
        if (!initialState || typeof initialState !== 'object') {
            throw new Error('[Store] A valid initial state object is required.');
        }

        /** @private {Object} */
        this._state = structuredClone(initialState);
        
        /** @private {Map<string, Set<Function>>} */
        this._listeners = new Map();
        
        /** @private {Array<Object>} */
        this._history = [];
        
        /** @private {number} */
        this._MAX_HISTORY_LENGTH = 20;

        // Initialize global slice key
        this._listeners.set('*', new Set());
    }

    /**
     * Retrieves a deep-frozen, immutable copy of the state or a specific slice.
     * Prevents UI components from mutating state outside of the dispatch cycle.
     * * @param {string} [sliceName] - Optional key of the state slice (e.g., 'medications').
     * @returns {Object|Array} A read-only clone of the requested state.
     */
    getState(sliceName = undefined) {
        const stateClone = structuredClone(this._state);
        
        if (sliceName) {
            if (!(sliceName in stateClone)) {
                console.warn(`[Store] Attempted to access non-existent state slice: ${sliceName}`);
                return undefined;
            }
            return deepFreeze(stateClone[sliceName]);
        }
        
        return deepFreeze(stateClone);
    }

    /**
     * Dispatches an action to mutate the state and notifies relevant subscribers.
     * * @param {string} actionType - The semantic identifier for the action.
     * @param {any} actionPayload - The data required to execute the action.
     */
    dispatch(actionType, actionPayload) {
        if (typeof actionType !== 'string') {
            throw new TypeError('[Store] actionType must be a string.');
        }

        const previousState = structuredClone(this._state);
        
        // 1. Maintain Time-Travel History
        this._history.push(previousState);
        if (this._history.length > this._MAX_HISTORY_LENGTH) {
            this._history.shift(); // Remove oldest entry to prevent memory bloat
        }

        // 2. Reduce the Next State (Operating on a mutable clone)
        const workingStateClone = structuredClone(this._state);
        this._state = this._reduce(workingStateClone, actionType, actionPayload);

        // 3. Dev Mode Logging
        console.groupCollapsed(`[Store Dispatch] %c${actionType}`, 'color: var(--clr-accent); font-weight: 600;');
        console.log('%cPayload:', 'color: var(--clr-text-lo);', actionPayload);
        console.log('%cPrevious State:', 'color: var(--clr-warn);', previousState);
        console.log('%cNext State:', 'color: var(--clr-success);', this._state);
        console.groupEnd();

        // 4. Notify Subscribers
        this._notifySubscribers(previousState, this._state);
    }

    /**
     * Internal reducer handling specific business logic mutations.
     * * @private
     * @param {Object} mutableState - The cloned state object safe for direct mutation.
     * @param {string} type - The dispatched action type.
     * @param {any} payload - The action payload.
     * @returns {Object} The mutated state.
     */
    _reduce(mutableState, type, payload) {
        switch (type) {
            // --- MEDICATIONS SLICE ---
            case 'MEDICATIONS/ADD':
                if (!payload.id) payload.id = crypto.randomUUID();
                mutableState.medications.push(payload);
                break;
                
            case 'MEDICATIONS/REMOVE':
                mutableState.medications = mutableState.medications.filter(
                    (medication) => medication.id !== payload
                );
                break;
                
            case 'MEDICATIONS/UPDATE':
                mutableState.medications = mutableState.medications.map((medication) => 
                    medication.id === payload.id ? { ...medication, ...payload } : medication
                );
                break;

            // --- DOSE LOGS SLICE ---
            case 'DOSE_LOGS/RECORD':
                if (!payload.id) payload.id = crypto.randomUUID();
                mutableState.doseLogs.push(payload);
                break;

            // --- USER SLICE ---
            case 'USER/SET_PROFILE':
                mutableState.user = { ...mutableState.user, ...payload };
                break;

            // --- ALERTS SLICE ---
            case 'ALERTS/ADD':
                if (!payload.id) payload.id = crypto.randomUUID();
                payload.dismissed = false;
                payload.timestamp = Date.now();
                mutableState.alerts.push(payload);
                break;
                
            case 'ALERTS/DISMISS':
                const targetAlert = mutableState.alerts.find(alert => alert.id === payload);
                if (targetAlert) {
                    targetAlert.dismissed = true;
                }
                break;

            // --- APP SLICE ---
            case 'APP/SET_VIEW':
                mutableState.app.currentView = payload;
                break;
                
            case 'APP/SET_LOADING':
                mutableState.app.isLoading = Boolean(payload);
                break;
                
            case 'APP/SET_ONLINE':
                mutableState.app.isOnline = Boolean(payload);
                break;
                
            // --- GRAPH SLICE ---
            case 'GRAPH/LOAD':
                mutableState.graph = payload;
                break;

            default:
                console.warn(`[Store] Unrecognized action type dispatched: ${type}`);
                break;
        }

        return mutableState;
    }

    /**
     * Subscribes a callback to changes within a specific state slice.
     * * @param {string} sliceName - The state key to monitor (e.g., 'medications').
     * @param {Function} callback - Executed when the slice changes: (newSlice, oldSlice) => void.
     * @returns {Function} Unsubscribe method to prevent memory leaks in UI components.
     */
    subscribe(sliceName, callback) {
        if (typeof sliceName !== 'string' || typeof callback !== 'function') {
            throw new Error('[Store] Invalid arguments for subscribe method.');
        }

        if (!this._listeners.has(sliceName)) {
            this._listeners.set(sliceName, new Set());
        }

        const sliceSubscribers = this._listeners.get(sliceName);
        sliceSubscribers.add(callback);

        return () => {
            sliceSubscribers.delete(callback);
            if (sliceSubscribers.size === 0 && sliceName !== '*') {
                this._listeners.delete(sliceName);
            }
        };
    }

    /**
     * Subscribes a callback to ANY change in the entire state tree.
     * * @param {Function} callback - Executed on any dispatch: (newState, oldState) => void.
     * @returns {Function} Unsubscribe method.
     */
    subscribeAll(callback) {
        if (typeof callback !== 'function') {
            throw new Error('[Store] callback must be a function.');
        }
        
        const globalSubscribers = this._listeners.get('*');
        globalSubscribers.add(callback);
        
        return () => {
            globalSubscribers.delete(callback);
        };
    }

    /**
     * Internal mechanism to fire callbacks only for slices that have structurally mutated.
     * * @private
     * @param {Object} previousState - State before the reduction.
     * @param {Object} nextState - State after the reduction.
     */
    _notifySubscribers(previousState, nextState) {
        // 1. Notify targeted slice listeners
        for (const [sliceName, subscriberSet] of this._listeners.entries()) {
            if (sliceName === '*') continue;

            const previousSlice = previousState[sliceName];
            const nextSlice = nextState[sliceName];

            // Perform a JSON stringify comparison. Fast enough for POJO UI state validation.
            if (JSON.stringify(previousSlice) !== JSON.stringify(nextSlice)) {
                const frozenPreviousSlice = deepFreeze(structuredClone(previousSlice));
                const frozenNextSlice = this.getState(sliceName);

                for (const subscriberCallback of subscriberSet) {
                    try {
                        subscriberCallback(frozenNextSlice, frozenPreviousSlice);
                    } catch (callbackError) {
                        console.error(`[Store] Error in subscriber callback for slice: ${sliceName}`, callbackError);
                    }
                }
            }
        }

        // 2. Notify global 'subscribeAll' listeners
        const globalSubscribers = this._listeners.get('*');
        if (globalSubscribers.size > 0) {
            const frozenPreviousState = deepFreeze(structuredClone(previousState));
            const frozenNextState = this.getState();
            
            for (const globalCallback of globalSubscribers) {
                try {
                    globalCallback(frozenNextState, frozenPreviousState);
                } catch (callbackError) {
                    console.error('[Store] Error in global subscriber callback.', callbackError);
                }
            }
        }
    }
}

// Export a single, immutable instance of the application store
export const globalStore = new Store(INITIAL_STATE);