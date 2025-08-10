import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    onSnapshot,
    serverTimestamp,
    DocumentSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import type { 
    UserProfile, 
    FirebaseGameData, 
    FirestoreUserDocument, 
    MonsterData 
} from '../types.js';

/**
 * Firestore Data Structure:
 * 
 * users/{uid} -> {
 *   email: string,
 *   nickname: string,
 *   friendCode: string,
 *   gameData: {
 *     coins: number,
 *     collection: MonsterData[],
 *     deck: MonsterData[],
 *     lastSaved: string
 *   },
 *   createdAt: serverTimestamp,
 *   lastActive: serverTimestamp
 * }
 * 
 * friendCodes/{friendCode} -> {
 *   uid: string,
 *   nickname: string,
 *   email: string
 * }
 */

export class DatabaseService {
    private static instance: DatabaseService | null = null;
    private realtimeListeners: Map<string, Unsubscribe> = new Map();

    constructor() {
        if (DatabaseService.instance) {
            return DatabaseService.instance;
        }
        DatabaseService.instance = this;
    }

    // User Profile Management
    public async createUserProfile(user: UserProfile, gameData: FirebaseGameData): Promise<void> {
        try {
            const userDoc: FirestoreUserDocument = {
                email: user.email,
                nickname: user.nickname,
                friendCode: user.friendCode,
                gameData: gameData,
                createdAt: new Date().toISOString(),
                lastActive: new Date().toISOString()
            };

            // Create user document
            await setDoc(doc(db, 'users', user.uid), userDoc);

            // Create friend code mapping
            await setDoc(doc(db, 'friendCodes', user.friendCode), {
                uid: user.uid,
                nickname: user.nickname,
                email: user.email
            });

            console.log('✅ User profile created successfully');
        } catch (error) {
            console.error('❌ Failed to create user profile:', error);
            throw error;
        }
    }

    public async getUserProfile(uid: string): Promise<FirestoreUserDocument | null> {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data() as FirestoreUserDocument;
            } else {
                console.log('No user profile found for uid:', uid);
                return null;
            }
        } catch (error) {
            console.error('Failed to get user profile:', error);
            throw error;
        }
    }

    public async updateUserProfile(uid: string, updates: Partial<FirestoreUserDocument>): Promise<void> {
        try {
            const docRef = doc(db, 'users', uid);
            
            // Add lastActive timestamp to updates
            const updatesWithTimestamp = {
                ...updates,
                lastActive: new Date().toISOString()
            };

            await updateDoc(docRef, updatesWithTimestamp);
            console.log('✅ User profile updated successfully');
        } catch (error) {
            console.error('❌ Failed to update user profile:', error);
            throw error;
        }
    }

    // Game Data Management
    public async saveGameData(uid: string, gameData: FirebaseGameData): Promise<void> {
        try {
            const docRef = doc(db, 'users', uid);
            
            // Use setDoc with merge to create document if it doesn't exist
            await setDoc(docRef, {
                gameData: gameData,
                lastActive: new Date().toISOString()
            }, { merge: true });

            console.log('💾 Game data saved successfully');
        } catch (error) {
            console.error('❌ Failed to save game data:', error);
            throw error;
        }
    }

    public async getGameData(uid: string): Promise<FirebaseGameData | null> {
        try {
            const userProfile = await this.getUserProfile(uid);
            return userProfile?.gameData || null;
        } catch (error) {
            console.error('Failed to get game data:', error);
            throw error;
        }
    }

    // Real-time Game Data Sync
    public subscribeToGameData(uid: string, callback: (gameData: FirebaseGameData | null) => void): Unsubscribe {
        const docRef = doc(db, 'users', uid);
        
        const unsubscribe = onSnapshot(docRef, (docSnap: DocumentSnapshot) => {
            if (docSnap.exists()) {
                const userData = docSnap.data() as FirestoreUserDocument;
                callback(userData.gameData || null);
            } else {
                callback(null);
            }
        }, (error) => {
            console.error('Real-time sync error:', error);
            callback(null);
        });

        // Store listener for cleanup
        this.realtimeListeners.set(`gameData_${uid}`, unsubscribe);
        
        return unsubscribe;
    }

    // Friend Code Management
    public async getUserByFriendCode(friendCode: string): Promise<{ uid: string; nickname: string; email: string } | null> {
        try {
            const docRef = doc(db, 'friendCodes', friendCode);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data() as { uid: string; nickname: string; email: string };
            } else {
                return null;
            }
        } catch (error) {
            console.error('Failed to get user by friend code:', error);
            throw error;
        }
    }

    public async updateFriendCodeMapping(oldFriendCode: string, newFriendCode: string, uid: string, nickname: string, email: string): Promise<void> {
        try {
            // Remove old friend code mapping (only if different)
            if (oldFriendCode && oldFriendCode !== newFriendCode) {
                const oldDocRef = doc(db, 'friendCodes', oldFriendCode);
                await setDoc(oldDocRef, { deleted: true }, { merge: true });
            }

            // Create new friend code mapping - ensure all values are defined
            const friendCodeData = {
                uid: uid || '',
                nickname: nickname || '',
                email: email || ''
            };

            // Only update if we have valid data
            if (friendCodeData.uid && friendCodeData.nickname && friendCodeData.email) {
                await setDoc(doc(db, 'friendCodes', newFriendCode), friendCodeData);
                console.log('✅ Friend code mapping updated');
            } else {
                throw new Error('Invalid friend code mapping data');
            }
        } catch (error) {
            console.error('❌ Failed to update friend code mapping:', error);
            throw error;
        }
    }

    // Utility Methods
    public async userExists(uid: string): Promise<boolean> {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            return docSnap.exists();
        } catch (error) {
            console.error('Failed to check if user exists:', error);
            return false;
        }
    }

    public async isFriendCodeTaken(friendCode: string): Promise<boolean> {
        try {
            const docRef = doc(db, 'friendCodes', friendCode);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() && !docSnap.data()?.deleted;
        } catch (error) {
            console.error('Failed to check friend code availability:', error);
            return true; // Assume taken on error for safety
        }
    }

    // Nickname Management
    public async updateNickname(uid: string, newNickname: string): Promise<void> {
        try {
            if (!uid || !newNickname) {
                throw new Error('UID and nickname are required');
            }

            const userProfile = await this.getUserProfile(uid);
            if (!userProfile) {
                throw new Error('User profile not found');
            }

            // Update user document first
            await this.updateUserProfile(uid, { nickname: newNickname });

            // Update friend code mapping only if we have all required data
            if (userProfile.friendCode && userProfile.email) {
                await this.updateFriendCodeMapping(
                    userProfile.friendCode, 
                    userProfile.friendCode, 
                    uid, 
                    newNickname, 
                    userProfile.email
                );
            }

            console.log('✅ Nickname updated successfully');
        } catch (error) {
            console.error('❌ Failed to update nickname:', error);
            throw error;
        }
    }


    // Collection and Deck Utilities
    public async addMonsterToCollection(uid: string, monster: MonsterData): Promise<void> {
        try {
            const gameData = await this.getGameData(uid);
            if (!gameData) {
                throw new Error('Game data not found');
            }

            gameData.collection.push(monster);
            gameData.lastSaved = new Date().toISOString();

            await this.saveGameData(uid, gameData);
        } catch (error) {
            console.error('Failed to add monster to collection:', error);
            throw error;
        }
    }

    public async removeMonsterFromCollection(uid: string, monsterId: string): Promise<void> {
        try {
            const gameData = await this.getGameData(uid);
            if (!gameData) {
                throw new Error('Game data not found');
            }

            gameData.collection = gameData.collection.filter(monster => 
                monster.id ? monster.id !== monsterId : monster.name !== monsterId
            );
            gameData.lastSaved = new Date().toISOString();

            await this.saveGameData(uid, gameData);
        } catch (error) {
            console.error('Failed to remove monster from collection:', error);
            throw error;
        }
    }

    public async updateDeck(uid: string, deck: MonsterData[]): Promise<void> {
        try {
            const gameData = await this.getGameData(uid);
            if (!gameData) {
                throw new Error('Game data not found');
            }

            gameData.deck = deck;
            gameData.lastSaved = new Date().toISOString();

            await this.saveGameData(uid, gameData);
        } catch (error) {
            console.error('Failed to update deck:', error);
            throw error;
        }
    }

    public async updateCoins(uid: string, coins: number): Promise<void> {
        try {
            const gameData = await this.getGameData(uid);
            if (!gameData) {
                throw new Error('Game data not found');
            }

            gameData.coins = coins;
            gameData.lastSaved = new Date().toISOString();

            await this.saveGameData(uid, gameData);
        } catch (error) {
            console.error('Failed to update coins:', error);
            throw error;
        }
    }

    // Cleanup
    public unsubscribeAll(): void {
        this.realtimeListeners.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.realtimeListeners.clear();
    }

    public unsubscribeFromGameData(uid: string): void {
        const key = `gameData_${uid}`;
        const unsubscribe = this.realtimeListeners.get(key);
        if (unsubscribe) {
            unsubscribe();
            this.realtimeListeners.delete(key);
        }
    }
}