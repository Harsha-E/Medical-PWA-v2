import db from '../core/db.js';
import { db as firestoreDb } from '../core/firebase.js';
import { doc, setDoc, getDocs, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import state from '../core/state.js';

export class TrustManager {
    /**
     * Initializes trust management and begins listening to Firestore for new relationships.
     */
    static async init() {
        if (!state.user) return;
        const myUid = state.user.uid;

        // Listen for people trusting US
        const trustedByRef = collection(firestoreDb, `users/${myUid}/trustedUsers`);
        onSnapshot(trustedByRef, async (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    const data = change.doc.data();
                    await this.syncToDexie(data);
                    window.dispatchEvent(new CustomEvent('trust:updated', { detail: data }));
                } else if (change.type === 'removed') {
                    const data = change.doc.data();
                    await db.family.where('trustedUid').equals(data.trustedUid).delete();
                }
            });
        });
    }

    /**
     * Called after WebRTC one-time pairing.
     */
    static async establishTrust(patientUid, trustedUid, patientName, trustedName, role = 'CAREGIVER') {
        console.log(`[TrustManager] establishTrust called: patient=${patientUid}, trusted=${trustedUid}, patientName=${patientName}, trustedName=${trustedName}`);
        const relationshipId = `${patientUid}_${trustedUid}`;
        const permissions = this.getDefaultPermissionsForRole(role);
        
        const payload = {
            relationshipId,
            patientUid,
            trustedUid,
            patientName: patientName || 'Unknown',
            trustedName: trustedName || 'Unknown',
            role,
            permissions,
            pairedAt: new Date().toISOString(),
            pairedBy: trustedUid, // Assuming caregiver initiated the scan
            status: 'ACTIVE',
            lastAccess: new Date().toISOString()
        };

        console.log(`[TrustManager] Payload constructed, syncing to Dexie FIRST:`, payload);

        // Save locally to Dexie FIRST (Offline-first approach)
        await this.syncToDexie(payload);

        console.log(`[TrustManager] Dexie sync complete, now syncing to Firestore...`);

        try {
            const patientRef = doc(firestoreDb, `users/${patientUid}/trustedUsers`, trustedUid);
            const caregiverRef = doc(firestoreDb, `users/${trustedUid}/trustedUsers`, patientUid);
            
            // Use allSettled so Firebase Security Rules blocking the other user's profile doesn't crash our own write.
            Promise.allSettled([
                setDoc(patientRef, payload, { merge: true }),
                setDoc(caregiverRef, payload, { merge: true })
            ]).then((results) => {
                const successes = results.filter(r => r.status === 'fulfilled').length;
                console.log(`[TrustManager] Firestore trust sync complete for ${successes}/2 nodes.`);
            });
        } catch (err) {
            console.warn('[TrustManager] Firestore write failed or delayed (offline/rules).', err);
        }
        return payload;
    }

    static async syncToDexie(payload) {
        // Find existing or create new in `family` table to maintain UI compatibility
        const existing = await db.family.filter(f => f.patientUid === payload.patientUid && f.trustedUid === payload.trustedUid).first();
        const record = {
            relationship: payload.role,
            name: payload.patientUid === state.user?.uid ? payload.trustedName : payload.patientName,
            role: payload.role,
            permission: JSON.stringify(payload.permissions),
            trustLevel: 'VERIFIED',
            patientUid: payload.patientUid,
            trustedUid: payload.trustedUid,
            status: payload.status,
            userId: state.user?.uid, // This is who owns the Dexie record
            updatedAt: new Date().toISOString()
        };
        
        if (existing) {
            await db.family.update(existing.id, record);
        } else {
            await db.family.add(record);
        }
    }

    static getDefaultPermissionsForRole(role) {
        switch(role) {
            case 'PRIMARY': return { read: true, write: true, share: true };
            case 'CAREGIVER': return { read: true, write: true, share: false };
            case 'VIEW_ONLY': return { read: true, write: false, share: false };
            case 'EMERGENCY': return { read: true, write: false, share: false, timeBound: true };
            case 'CLINICIAN': return { read: true, write: true, share: false, clinical: true };
            default: return { read: true, write: false, share: false };
        }
    }

    static async revokeTrust(patientUid, trustedUid) {
        console.log(`[TrustManager] revokeTrust called: patient=${patientUid}, trusted=${trustedUid}`);
        
        try {
            // 1. Mark inactive in Dexie INSTANTLY (Optimistic UI)
            const myUid = state.user?.uid || window.appState?.user?.uid;
            const existing = await db.family.filter(f => f.patientUid === patientUid && f.trustedUid === trustedUid && f.userId === myUid).first();
            if (existing) {
                await db.family.update(existing.id, { status: 'REVOKED', updatedAt: new Date().toISOString() });
            }

            // 2. Remove from Firestore in the background (DO NOT AWAIT to keep UI fast)
            const patientRef = doc(firestoreDb, `users/${patientUid}/trustedUsers`, trustedUid);
            const caregiverRef = doc(firestoreDb, `users/${trustedUid}/trustedUsers`, patientUid);
            
            // We use allSettled because Firebase Security Rules will likely block us from writing to the OTHER user's profile.
            // That's perfectly fine - each device will independently update its own profile if they are both online.
            Promise.allSettled([
                setDoc(patientRef, { status: 'REVOKED', updatedAt: new Date().toISOString() }, { merge: true }),
                setDoc(caregiverRef, { status: 'REVOKED', updatedAt: new Date().toISOString() }, { merge: true })
            ]).then((results) => {
                const successes = results.filter(r => r.status === 'fulfilled').length;
                console.log(`[TrustManager] Trust revoked successfully in cloud for ${successes}/2 nodes.`);
            });
            
        } catch(e) {
            console.warn('[TrustManager] Trust revocation failed locally.', e);
        }
    }

    static async getTrustedProfiles() {
        const myUid = state.user?.uid;
        if (!myUid) {
            console.log(`[TrustManager] getTrustedProfiles: myUid is null or undefined!`);
            return [];
        }
        const allFamily = await db.family.toArray();
        console.log(`[TrustManager] DB Dump for family table:`, allFamily);
        
        const profiles = allFamily.filter(f => f.userId === myUid && f.status === 'ACTIVE');
        console.log(`[TrustManager] getTrustedProfiles found ${profiles.length} profiles for userId ${myUid}.`);
        return profiles;
    }
}
