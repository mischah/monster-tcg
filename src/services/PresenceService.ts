import { 
    doc, 
    setDoc, 
    getDoc,
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    updateDoc,
    deleteDoc,
    Timestamp,
    Unsubscribe,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { DatabaseService } from './DatabaseService.js';

export interface PresenceData {
    uid: string;
    isOnline: boolean;
    lastSeen: Timestamp;
    sessionId?: string;
    device?: string;
}

export class PresenceService {
    private static instance: PresenceService | null = null;
    private databaseService: DatabaseService;
    private currentSessionId: string | null = null;
    private presenceListeners: Map<string, Unsubscribe> = new Map();
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.databaseService = new DatabaseService();
        this.currentSessionId = this.generateSessionId();
    }

    public static getInstance(): PresenceService {
        if (!PresenceService.instance) {
            PresenceService.instance = new PresenceService();
        }
        return PresenceService.instance;
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Set user as online when they log in
     */
    public async setUserOnline(uid: string): Promise<void> {
        try {
            const presenceRef = doc(db, 'presence', uid);
            
            const presenceData: PresenceData = {
                uid,
                isOnline: true,
                lastSeen: serverTimestamp() as Timestamp,
                sessionId: this.currentSessionId || undefined,
                device: this.getDeviceInfo()
            };

            await setDoc(presenceRef, presenceData);
            
            // Setup disconnect handler to set offline when user disconnects
            this.setupDisconnectHandler(uid);
            
            // Start heartbeat to maintain online status
            this.startHeartbeat(uid);

            console.log('✅ User presence set to online:', uid);
        } catch (error) {
            console.error('❌ Failed to set user online:', error);
        }
    }

    /**
     * Set user as offline when they log out
     */
    public async setUserOffline(uid: string): Promise<void> {
        try {
            const presenceRef = doc(db, 'presence', uid);
            
            await updateDoc(presenceRef, {
                isOnline: false,
                lastSeen: serverTimestamp(),
                sessionId: undefined
            });

            this.stopHeartbeat();
            
            console.log('✅ User presence set to offline:', uid);
        } catch (error) {
            console.error('❌ Failed to set user offline:', error);
        }
    }

    /**
     * Get online status for a specific user
     */
    public async getUserPresence(uid: string): Promise<PresenceData | null> {
        try {
            const presenceRef = doc(db, 'presence', uid);
            const presenceSnap = await getDoc(presenceRef);
            
            if (presenceSnap.exists()) {
                const data = presenceSnap.data() as PresenceData;
                
                // Check if user is considered online (last seen within 5 minutes)
                const now = Date.now();
                const lastSeenTime = data.lastSeen?.toMillis() || 0;
                const fiveMinutesAgo = now - (5 * 60 * 1000);
                
                // Update isOnline based on recent activity
                data.isOnline = data.isOnline && lastSeenTime > fiveMinutesAgo;
                
                return data;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Failed to get user presence:', error);
            return null;
        }
    }

    /**
     * Get online status for multiple users
     */
    public async getMultipleUserPresence(uids: string[]): Promise<Map<string, PresenceData>> {
        const presenceMap = new Map<string, PresenceData>();
        
        try {
            const presencePromises = uids.map(uid => this.getUserPresence(uid));
            const presenceResults = await Promise.all(presencePromises);
            
            uids.forEach((uid, index) => {
                const presence = presenceResults[index];
                if (presence) {
                    presenceMap.set(uid, presence);
                } else {
                    // Default offline presence for users without presence data
                    presenceMap.set(uid, {
                        uid,
                        isOnline: false,
                        lastSeen: Timestamp.fromDate(new Date(0)),
                        sessionId: undefined
                    });
                }
            });
            
        } catch (error) {
            console.error('❌ Failed to get multiple user presence:', error);
        }
        
        return presenceMap;
    }

    /**
     * Subscribe to real-time presence updates for a user
     */
    public subscribeToUserPresence(uid: string, callback: (presence: PresenceData | null) => void): Unsubscribe {
        const presenceRef = doc(db, 'presence', uid);
        
        const unsubscribe = onSnapshot(presenceRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as PresenceData;
                
                // Check if user is considered online (last seen within 5 minutes)
                const now = Date.now();
                const lastSeenTime = data.lastSeen?.toMillis() || 0;
                const fiveMinutesAgo = now - (5 * 60 * 1000);
                
                data.isOnline = data.isOnline && lastSeenTime > fiveMinutesAgo;
                
                callback(data);
            } else {
                callback(null);
            }
        });
        
        this.presenceListeners.set(uid, unsubscribe);
        return unsubscribe;
    }

    /**
     * Subscribe to presence updates for multiple users
     */
    public subscribeToMultipleUserPresence(
        uids: string[], 
        callback: (presenceMap: Map<string, PresenceData>) => void
    ): Unsubscribe {
        const unsubscribeCallbacks: Unsubscribe[] = [];
        const presenceMap = new Map<string, PresenceData>();
        
        uids.forEach(uid => {
            const unsubscribe = this.subscribeToUserPresence(uid, (presence) => {
                if (presence) {
                    presenceMap.set(uid, presence);
                } else {
                    presenceMap.set(uid, {
                        uid,
                        isOnline: false,
                        lastSeen: Timestamp.fromDate(new Date(0)),
                        sessionId: undefined
                    });
                }
                
                // Call callback with updated map
                callback(new Map(presenceMap));
            });
            
            unsubscribeCallbacks.push(unsubscribe);
        });
        
        // Return a function that unsubscribes from all listeners
        return () => {
            unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
        };
    }

    /**
     * Setup disconnect handler for when user closes browser/app
     */
    private setupDisconnectHandler(uid: string): void {
        // Note: onDisconnect is only available in Firebase Realtime Database
        // For Firestore, we rely on heartbeat timeout
        
        // Setup window beforeunload event
        window.addEventListener('beforeunload', () => {
            this.setUserOffline(uid);
        });
        
        // Setup page visibility change (when user switches tabs)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // User switched away from tab
                this.pauseHeartbeat();
            } else {
                // User returned to tab
                this.resumeHeartbeat(uid);
            }
        });
    }

    /**
     * Start heartbeat to maintain online status
     */
    private startHeartbeat(uid: string): void {
        this.stopHeartbeat(); // Clear any existing heartbeat
        
        this.heartbeatInterval = setInterval(async () => {
            try {
                const presenceRef = doc(db, 'presence', uid);
                await updateDoc(presenceRef, {
                    lastSeen: serverTimestamp(),
                    isOnline: true
                });
            } catch (error) {
                console.error('❌ Heartbeat failed:', error);
            }
        }, 60000); // Update every minute
    }

    /**
     * Stop heartbeat
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Pause heartbeat (when tab is hidden)
     */
    private pauseHeartbeat(): void {
        this.stopHeartbeat();
    }

    /**
     * Resume heartbeat (when tab becomes visible again)
     */
    private resumeHeartbeat(uid: string): void {
        this.startHeartbeat(uid);
        
        // Immediately update presence to show user is back
        const presenceRef = doc(db, 'presence', uid);
        updateDoc(presenceRef, {
            lastSeen: serverTimestamp(),
            isOnline: true
        });
    }

    /**
     * Get device info for presence data
     */
    private getDeviceInfo(): string {
        const userAgent = navigator.userAgent;
        if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
            return 'mobile';
        } else if (/Tablet/.test(userAgent)) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }

    /**
     * Cleanup all subscriptions
     */
    public cleanup(): void {
        this.stopHeartbeat();
        
        this.presenceListeners.forEach(unsubscribe => {
            unsubscribe();
        });
        this.presenceListeners.clear();
    }

    /**
     * Get online friends count
     */
    public async getOnlineFriendsCount(friendUids: string[]): Promise<number> {
        const presenceMap = await this.getMultipleUserPresence(friendUids);
        let onlineCount = 0;
        
        presenceMap.forEach(presence => {
            if (presence.isOnline) {
                onlineCount++;
            }
        });
        
        return onlineCount;
    }
}

// Export singleton instance
export const presenceService = PresenceService.getInstance();
