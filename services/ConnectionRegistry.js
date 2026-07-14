/**
 * ConnectionRegistry.js
 * Centralized runtime state manager for PeerMesh connections.
 * Handles tracking active connections, Reconnect Manager (exponential backoff),
 * and explicit connection states.
 */

export const ConnectionState = {
    DISCOVERED: 'DISCOVERED',
    CONNECTING: 'CONNECTING',
    RETRYING: 'RETRYING',
    WAITING_FOR_REMOTE: 'WAITING_FOR_REMOTE',
    CONNECTED_UNTRUSTED: 'CONNECTED_UNTRUSTED',
    AUTHENTICATING: 'AUTHENTICATING',
    AUTHORIZED: 'AUTHORIZED',
    SYNC_NEGOTIATION: 'SYNC_NEGOTIATION',
    SYNC_ACTIVE: 'SYNC_ACTIVE',
    DISCONNECTED: 'DISCONNECTED'
};

class ConnectionRegistry {
    constructor() {
        this.connections = new Map(); // peerId -> active DataChannel
        this.states = new Map(); // peerId -> ConnectionState
        this.reconnectTasks = new Map(); // peerId -> { attempts, timeoutId }
        this.lastSeen = new Map(); // peerId -> timestamp
    }

    setConnection(peerId, conn) {
        this.connections.set(peerId, conn);
        this.lastSeen.set(peerId, Date.now());
    }

    getConnection(peerId) {
        return this.connections.get(peerId);
    }
    
    getAllConnections() {
        return this.connections;
    }

    removeConnection(peerId) {
        this.connections.delete(peerId);
        this.states.delete(peerId);
        this.clearReconnectTask(peerId);
    }

    setState(peerId, state) {
        const oldState = this.states.get(peerId);
        if (oldState === state) return; // No change
        
        this.states.set(peerId, state);
        console.log(`[ConnectionRegistry] ${peerId} state changed: ${oldState || 'NONE'} -> ${state}`);
        window.dispatchEvent(new CustomEvent('peermesh:state-changed', {
            detail: { peerId, state }
        }));
    }

    getState(peerId) {
        return this.states.get(peerId) || ConnectionState.DISCONNECTED;
    }

    updateLastSeen(peerId) {
        this.lastSeen.set(peerId, Date.now());
    }

    // --- Reconnect Manager ---
    
    scheduleReconnect(peerId, targetInstallationId, targetName, connectCallback) {
        if (this.getState(peerId) === ConnectionState.SYNC_ACTIVE) {
            this.clearReconnectTask(peerId);
            return; // Already connected
        }

        let task = this.reconnectTasks.get(peerId);
        if (!task) {
            task = { attempts: 0, timeoutId: null };
            this.reconnectTasks.set(peerId, task);
        }

        task.attempts += 1;
        
        // Jittered exponential backoff: ~1s, 2s, 4s, 8s, 16s. Max 30s envelope.
        const baseDelay = Math.pow(2, task.attempts - 1) * 1000;
        const jitter = Math.random() * 500;
        let delay = baseDelay + jitter;
        
        if (delay > 30000) {
            console.warn(`[ConnectionRegistry] Reconnect envelope exceeded 30s for ${peerId}. Stopping.`);
            this.clearReconnectTask(peerId);
            this.setState(peerId, ConnectionState.DISCONNECTED);
            return;
        }

        this.setState(peerId, ConnectionState.WAITING_FOR_REMOTE);
        
        console.log(`[ConnectionRegistry] Scheduling reconnect for ${peerId} in ${Math.round(delay)}ms (Attempt ${task.attempts})`);
        
        task.timeoutId = setTimeout(() => {
            if (this.getState(peerId) !== ConnectionState.SYNC_ACTIVE) {
                console.log(`[ConnectionRegistry] Executing retry for ${peerId}...`);
                this.setState(peerId, ConnectionState.RETRYING);
                connectCallback(peerId, targetInstallationId, targetName);
            }
        }, delay);
    }

    clearReconnectTask(peerId) {
        const task = this.reconnectTasks.get(peerId);
        if (task && task.timeoutId) {
            clearTimeout(task.timeoutId);
        }
        this.reconnectTasks.delete(peerId);
    }
}

export const registry = new ConnectionRegistry();
