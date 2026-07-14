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
            // Save to Patient's Firestore Profile (Who they trust)
            const patientRef = doc(firestoreDb, `users/${patientUid}/trustedUsers`, trustedUid);
            await setDoc(patientRef, payload, { merge: true });

            // Save to Caregiver's Firestore Profile (Who trusts them)
            const caregiverRef = doc(firestoreDb, `users/${trustedUid}/trustedUsers`, patientUid);
            await setDoc(caregiverRef, payload, { merge: true });
            console.log(`[TrustManager] Firestore sync complete.`);
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
