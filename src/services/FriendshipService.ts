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
    or,
    and
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { DatabaseService } from './DatabaseService.js';
import { presenceService } from './PresenceService.js';
import { notificationService } from './NotificationService.js';

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export type Friendship = {
    id: string;
    user1: string;           // alphabetically sorted UIDs
    user2: string;
    status: FriendshipStatus;
    initiatedBy: string;     // who sent the request
    createdAt: string;
    acceptedAt: string | null;
    lastActivity: string;
    metadata: {
        user1CanTrade: boolean;  // User 1's consent to trade with User 2
        user2CanTrade: boolean;  // User 2's consent to trade with User 1  
        canChat: boolean;
    };
};

export type FriendRequest = {
    id: string;
    from: {
        uid: string;
        nickname: string;
        email: string;
        friendCode: string;
    };
    to: {
        uid: string;
        nickname: string;
        email: string;
        friendCode: string;
    };
    status: FriendshipStatus;
    createdAt: string;
};

export type Friend = {
    uid: string;
    nickname: string;
    email: string;
    friendCode: string;
    friendshipId: string;
    isOnline: boolean;
    lastActive: string;
    iAllowTrading: boolean;    // Current user allows trading with this friend
    friendAllowsTrading: boolean;  // This friend allows trading with current user
    canChat: boolean;
};

export class FriendshipService {
    private static instance: FriendshipService | null = null;
    private realtimeListeners: Map<string, Unsubscribe> = new Map();
    private databaseService: DatabaseService;
    private seenFriendRequests: Set<string> = new Set();
    private seenFriendships: Set<string> = new Set();

    constructor() {
        if (FriendshipService.instance) {
            return FriendshipService.instance;
        }
        FriendshipService.instance = this;
        this.databaseService = new DatabaseService();
        this.loadSeenRequestsFromStorage();
    }

    private loadSeenRequestsFromStorage(): void {
        try {
            const seenRequests = localStorage.getItem('seenFriendRequests');
            const seenFriendships = localStorage.getItem('seenFriendships');
            
            if (seenRequests) {
                this.seenFriendRequests = new Set(JSON.parse(seenRequests));
            }
            if (seenFriendships) {
                this.seenFriendships = new Set(JSON.parse(seenFriendships));
            }
        } catch (error) {
            console.error('Error loading seen requests from storage:', error);
        }
    }

    private saveSeenRequestsToStorage(): void {
        try {
            localStorage.setItem('seenFriendRequests', JSON.stringify([...this.seenFriendRequests]));
            localStorage.setItem('seenFriendships', JSON.stringify([...this.seenFriendships]));
        } catch (error) {
            console.error('Error saving seen requests to storage:', error);
        }
    }

    private markRequestAsSeen(requestId: string): void {
        this.seenFriendRequests.add(requestId);
        this.saveSeenRequestsToStorage();
    }

    private markFriendshipAsSeen(friendshipId: string): void {
        this.seenFriendships.add(friendshipId);
        this.saveSeenRequestsToStorage();
    }

    /**
     * Generate friendship document ID from two UIDs (alphabetically sorted)
     */
    private getFriendshipId(uid1: string, uid2: string): string {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }

    /**
     * Sort UIDs alphabetically for consistent storage
     */
    private sortUIDs(uid1: string, uid2: string): [string, string] {
        return uid1 < uid2 ? [uid1, uid2] : [uid2, uid1];
    }

    /**
     * Send a friend request
     */
    public async sendFriendRequest(
        fromUid: string,
        fromUserData: { nickname: string; email: string; friendCode: string },
        toUid: string,
        toUserData: { nickname: string; email: string; friendCode: string }
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Validate inputs
            if (!fromUid || !toUid || fromUid === toUid) {
                return { success: false, error: 'Invalid user IDs' };
            }

            const friendshipId = this.getFriendshipId(fromUid, toUid);
            
            // Check if friendship already exists
            const existingFriendship = await this.getFriendship(fromUid, toUid);
            if (existingFriendship) {
                if (existingFriendship.status === 'accepted') {
                    return { success: false, error: 'Ihr seid bereits befreundet' };
                } else if (existingFriendship.status === 'pending') {
                    return { success: false, error: 'Freundschaftsanfrage bereits gesendet' };
                } else if (existingFriendship.status === 'blocked') {
                    return { success: false, error: 'Freundschaftsanfrage nicht möglich' };
                }
            }

            // Create friendship document
            const [user1, user2] = this.sortUIDs(fromUid, toUid);
            const friendship: Omit<Friendship, 'id'> = {
                user1,
                user2,
                status: 'pending',
                initiatedBy: fromUid,
                createdAt: new Date().toISOString(),
                acceptedAt: null,
                lastActivity: new Date().toISOString(),
                metadata: {
                    user1CanTrade: true,  // Default: both users allow trading
                    user2CanTrade: true,  // Default: both users allow trading
                    canChat: true
                }
            };

            await setDoc(doc(db, 'friendships', friendshipId), friendship);
            console.log('✅ Friend request sent successfully');
            
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to send friend request:', error);
            return { success: false, error: 'Fehler beim Senden der Freundschaftsanfrage' };
        }
    }

    /**
     * Accept a friend request
     */
    public async acceptFriendRequest(friendshipId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const friendshipRef = doc(db, 'friendships', friendshipId);
            
            await updateDoc(friendshipRef, {
                status: 'accepted',
                acceptedAt: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            });

            console.log('✅ Friend request accepted');
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to accept friend request:', error);
            return { success: false, error: 'Fehler beim Akzeptieren der Freundschaftsanfrage' };
        }
    }

    /**
     * Decline/Cancel a friend request
     */
    public async declineFriendRequest(friendshipId: string, declinedBy?: string): Promise<{ success: boolean; error?: string }> {
        try {
            const friendshipRef = doc(db, 'friendships', friendshipId);
            
            console.log('🔧 DEBUG: declineFriendRequest called with:', { friendshipId, declinedBy });
            
            // Get friendship data before deleting to send notification
            const friendshipDoc = await getDoc(friendshipRef);
            if (friendshipDoc.exists()) {
                const friendshipData = friendshipDoc.data();
                const initiatedBy = friendshipData.initiatedBy;
                
                console.log('🔧 DEBUG: Friendship data:', { initiatedBy, declinedBy });
                console.log('🔧 DEBUG: Should send notification?', declinedBy && declinedBy !== initiatedBy);
                
                // Send notification to the person who sent the original request (if someone else declined it)
                if (declinedBy && declinedBy !== initiatedBy) {
                    try {
                        console.log('🔧 DEBUG: Loading decliner profile for:', declinedBy);
                        const declinerProfile = await this.databaseService.getUserProfile(declinedBy);
                        if (declinerProfile) {
                            console.log('🔔 Sending decline notification to initiator:', initiatedBy);
                            console.log('🔔 Request was declined by:', declinerProfile.nickname);
                            
                            // Send notification to the person who sent the original request
                            // The notification shows who declined it
                            notificationService.showRequestDeclined({
                                nickname: declinerProfile.nickname
                            }, initiatedBy);
                        } else {
                            console.log('🔧 DEBUG: No decliner profile found');
                        }
                    } catch (notificationError) {
                        console.error('❌ Failed to send decline notification:', notificationError);
                        // Continue with deletion even if notification fails
                    }
                } else {
                    console.log('🔧 DEBUG: No notification needed - either no declinedBy or same as initiator');
                }
            } else {
                console.log('🔧 DEBUG: Friendship document does not exist');
            }
            
            // Delete the friendship document
            await deleteDoc(friendshipRef);

            console.log('✅ Friend request declined');
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to decline friend request:', error);
            return { success: false, error: 'Fehler beim Ablehnen der Freundschaftsanfrage' };
        }
    }

    /**
     * Remove/Block a friend
     */
    public async removeFriend(friendshipId: string, shouldBlock: boolean = false): Promise<{ success: boolean; error?: string }> {
        try {
            const friendshipRef = doc(db, 'friendships', friendshipId);
            
            if (shouldBlock) {
                await updateDoc(friendshipRef, {
                    status: 'blocked',
                    lastActivity: new Date().toISOString()
                });
                console.log('✅ Friend blocked');
            } else {
                await deleteDoc(friendshipRef);
                console.log('✅ Friend removed');
            }

            return { success: true };

        } catch (error) {
            console.error('❌ Failed to remove friend:', error);
            return { success: false, error: 'Fehler beim Entfernen des Freundes' };
        }
    }

    /**
     * Get friendship between two users
     */
    public async getFriendship(uid1: string, uid2: string): Promise<Friendship | null> {
        try {
            const friendshipId = this.getFriendshipId(uid1, uid2);
            const docRef = doc(db, 'friendships', friendshipId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                } as Friendship;
            }

            return null;
        } catch (error) {
            console.error('Failed to get friendship:', error);
            return null;
        }
    }

    /**
     * Get all friend requests for a user (incoming and outgoing)
     */
    public async getFriendRequests(uid: string): Promise<FriendRequest[]> {
        try {
            const friendshipsRef = collection(db, 'friendships');
            
            // Query for friendships where user is involved and status is pending
            const q = query(
                friendshipsRef,
                and(
                    or(
                        where('user1', '==', uid),
                        where('user2', '==', uid)
                    ),
                    where('status', '==', 'pending')
                )
            );

            const querySnapshot = await getDocs(q);
            const requests: FriendRequest[] = [];

            for (const docSnap of querySnapshot.docs) {
                const data = docSnap.data();
                
                // Determine direction of request
                const isIncoming = data.initiatedBy !== uid;
                const friendUid = data.user1 === uid ? data.user2 : data.user1;
                
                console.log('🔧 DEBUG: Loading user data for friendUid:', friendUid);
                
                // Get friend user data from users collection
                let friendData = {
                    uid: friendUid,
                    nickname: 'Loading...',
                    email: '',
                    friendCode: ''
                };
                
                try {
                    const friendProfile = await this.databaseService.getUserProfile(friendUid);
                    if (friendProfile) {
                        friendData = {
                            uid: friendUid,
                            nickname: friendProfile.nickname || 'Unknown User',
                            email: friendProfile.email || '',
                            friendCode: friendProfile.friendCode || ''
                        };
                        console.log('🔧 DEBUG: Loaded friend data:', friendData);
                    } else {
                        console.log('⚠️ Warning: Friend profile not found for UID:', friendUid);
                    }
                } catch (error) {
                    console.error('❌ Error loading friend profile:', error);
                }

                const request: FriendRequest = {
                    id: docSnap.id,
                    from: isIncoming ? friendData : {
                        uid: uid,
                        nickname: 'You',
                        email: '',
                        friendCode: ''
                    },
                    to: isIncoming ? {
                        uid: uid,
                        nickname: 'You', 
                        email: '',
                        friendCode: ''
                    } : friendData,
                    status: data.status,
                    createdAt: data.createdAt
                };

                requests.push(request);
            }

            return requests;

        } catch (error) {
            console.error('Failed to get friend requests:', error);
            return [];
        }
    }

    /**
     * Get all friends for a user
     */
    public async getFriends(uid: string): Promise<Friend[]> {
        try {
            const friendshipsRef = collection(db, 'friendships');
            
            // Query for accepted friendships where user is involved
            const q = query(
                friendshipsRef,
                and(
                    or(
                        where('user1', '==', uid),
                        where('user2', '==', uid)
                    ),
                    where('status', '==', 'accepted')
                )
            );

            const querySnapshot = await getDocs(q);
            const friends: Friend[] = [];

            // Collect all friend UIDs for batch presence lookup
            const friendUids: string[] = [];
            const friendshipData: Array<{ docSnap: any; friendUid: string }> = [];

            for (const docSnap of querySnapshot.docs) {
                const data = docSnap.data();
                const friendUid = data.user1 === uid ? data.user2 : data.user1;
                
                friendUids.push(friendUid);
                friendshipData.push({ docSnap, friendUid });
            }

            // Get presence data for all friends at once
            const presenceMap = await presenceService.getMultipleUserPresence(friendUids);

            // Process each friendship with presence data
            for (const { docSnap, friendUid } of friendshipData) {
                const data = docSnap.data();
                const presence = presenceMap.get(friendUid);

                // Get friend user data from users collection
                let friendData = {
                    uid: friendUid,
                    nickname: 'Loading...',
                    email: '',
                    friendCode: ''
                };
                
                try {
                    const friendProfile = await this.databaseService.getUserProfile(friendUid);
                    if (friendProfile) {
                        friendData = {
                            uid: friendUid,
                            nickname: friendProfile.nickname || 'Unknown User',
                            email: friendProfile.email || '',
                            friendCode: friendProfile.friendCode || ''
                        };
                    }
                } catch (error) {
                    console.warn('Failed to load friend profile:', friendUid, error);
                }

                // Determine which permissions apply to current user vs friend
                const currentUserIsUser1 = data.user1 === uid;
                const iAllowTrading = currentUserIsUser1 
                    ? (data.metadata?.user1CanTrade ?? true)
                    : (data.metadata?.user2CanTrade ?? true);
                const friendAllowsTrading = currentUserIsUser1 
                    ? (data.metadata?.user2CanTrade ?? true)
                    : (data.metadata?.user1CanTrade ?? true);

                const friend: Friend = {
                    uid: friendUid,
                    nickname: friendData.nickname,
                    email: friendData.email,
                    friendCode: friendData.friendCode,
                    friendshipId: docSnap.id,
                    isOnline: presence?.isOnline || false,
                    lastActive: presence?.lastSeen?.toDate().toISOString() || data.lastActivity || data.createdAt,
                    iAllowTrading: iAllowTrading,
                    friendAllowsTrading: friendAllowsTrading,
                    canChat: data.metadata?.canChat ?? true
                };

                friends.push(friend);
            }

            return friends;

        } catch (error) {
            console.error('Failed to get friends:', error);
            return [];
        }
    }

    /**
     * Subscribe to real-time friend requests updates
     */
    public subscribeFriendRequests(uid: string, callback: (requests: FriendRequest[]) => void): Unsubscribe {
        const friendshipsRef = collection(db, 'friendships');
        
        const q = query(
            friendshipsRef,
            and(
                or(
                    where('user1', '==', uid),
                    where('user2', '==', uid)
                ),
                where('status', '==', 'pending')
            )
        );

        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const requests: FriendRequest[] = [];
            
            // Process all friend requests with user data loading
            const requestPromises = querySnapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                const isIncoming = data.initiatedBy !== uid;
                const friendUid = data.user1 === uid ? data.user2 : data.user1;
                
                console.log('🔧 DEBUG: [Real-time] Loading user data for friendUid:', friendUid);
                
                // Get friend user data from users collection
                let friendData = {
                    uid: friendUid,
                    nickname: 'Loading...',
                    email: '',
                    friendCode: ''
                };
                
                try {
                    const friendProfile = await this.databaseService.getUserProfile(friendUid);
                    if (friendProfile) {
                        friendData = {
                            uid: friendUid,
                            nickname: friendProfile.nickname || 'Unknown User',
                            email: friendProfile.email || '',
                            friendCode: friendProfile.friendCode || ''
                        };
                        console.log('🔧 DEBUG: [Real-time] Loaded friend data:', friendData);
                    } else {
                        console.log('⚠️ Warning: [Real-time] Friend profile not found for UID:', friendUid);
                    }
                } catch (error) {
                    console.error('❌ Error [Real-time] loading friend profile:', error);
                }

                const request: FriendRequest = {
                    id: docSnap.id,
                    from: isIncoming ? friendData : {
                        uid: uid,
                        nickname: 'You',
                        email: '',
                        friendCode: ''
                    },
                    to: isIncoming ? {
                        uid: uid,
                        nickname: 'You',
                        email: '',
                        friendCode: ''
                    } : friendData,
                    status: data.status,
                    createdAt: data.createdAt
                };

                return request;
            });

            try {
                const resolvedRequests = await Promise.all(requestPromises);
                
                // Check for new requests and trigger notifications
                resolvedRequests.forEach(request => {
                    if (!this.seenFriendRequests.has(request.id)) {
                        console.log('🔔 New friend request detected:', request);
                        
                        // Only notify for incoming requests (not our own sent requests)
                        if (request.to.uid === uid) {
                            notificationService.showFriendRequest({
                                nickname: request.from.nickname,
                                email: request.from.email
                            });
                        }
                        
                        this.markRequestAsSeen(request.id);
                    }
                });
                
                callback(resolvedRequests);
            } catch (error) {
                console.error('❌ Error processing real-time friend requests:', error);
                callback([]);
            }
        }, (error) => {
            console.error('Friend requests subscription error:', error);
            callback([]);
        });

        // Store listener for cleanup
        this.realtimeListeners.set(`friendRequests_${uid}`, unsubscribe);
        return unsubscribe;
    }

    /**
     * Subscribe to real-time friends list updates
     */
    public subscribeFriends(uid: string, callback: (friends: Friend[]) => void): Unsubscribe {
        const friendshipsRef = collection(db, 'friendships');
        
        const q = query(
            friendshipsRef,
            and(
                or(
                    where('user1', '==', uid),
                    where('user2', '==', uid)
                ),
                where('status', '==', 'accepted')
            )
        );

        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const friends: Friend[] = [];
            
            // Collect all friend UIDs for batch presence lookup
            const friendUids: string[] = [];
            const friendshipData: Array<{ docSnap: any; friendUid: string }> = [];

            for (const docSnap of querySnapshot.docs) {
                const data = docSnap.data();
                const friendUid = data.user1 === uid ? data.user2 : data.user1;
                
                friendUids.push(friendUid);
                friendshipData.push({ docSnap, friendUid });
            }

            // Get presence data for all friends at once
            const presenceMap = await presenceService.getMultipleUserPresence(friendUids);
            
            // Process all friends with user data and presence loading
            const friendPromises = friendshipData.map(async ({ docSnap, friendUid }) => {
                const data = docSnap.data();
                const presence = presenceMap.get(friendUid);
                
                console.log('🔧 DEBUG: [Friends Real-time] Loading user data for friendUid:', friendUid);
                
                // Get friend user data from users collection
                let friendData = {
                    nickname: 'Loading...',
                    email: '',
                    friendCode: ''
                };
                
                try {
                    const friendProfile = await this.databaseService.getUserProfile(friendUid);
                    if (friendProfile) {
                        friendData = {
                            nickname: friendProfile.nickname || 'Unknown User',
                            email: friendProfile.email || '',
                            friendCode: friendProfile.friendCode || ''
                        };
                    }
                } catch (error) {
                    console.error('❌ Error [Friends Real-time] loading friend profile:', error);
                }

                // Determine which permissions apply to current user vs friend
                const currentUserIsUser1 = data.user1 === uid;
                const iAllowTrading = currentUserIsUser1 
                    ? (data.metadata?.user1CanTrade ?? true)
                    : (data.metadata?.user2CanTrade ?? true);
                const friendAllowsTrading = currentUserIsUser1 
                    ? (data.metadata?.user2CanTrade ?? true)
                    : (data.metadata?.user1CanTrade ?? true);

                const friend: Friend = {
                    uid: friendUid,
                    nickname: friendData.nickname,
                    email: friendData.email,
                    friendCode: friendData.friendCode,
                    friendshipId: docSnap.id,
                    isOnline: presence?.isOnline || false,
                    lastActive: presence?.lastSeen?.toDate().toISOString() || data.lastActivity || data.createdAt,
                    iAllowTrading: iAllowTrading,
                    friendAllowsTrading: friendAllowsTrading,
                    canChat: data.metadata?.canChat ?? true
                };

                // Check if this is a new friendship (friend request was accepted)
                if (!this.seenFriendships.has(docSnap.id)) {
                    console.log('🔔 New friendship detected:', friend);
                    
                    // Check if this user initiated the request (meaning their request was accepted)
                    if (data.initiatedBy === uid) {
                        notificationService.showRequestAccepted({
                            nickname: friendData.nickname
                        });
                    } else {
                        // They accepted our incoming request
                        notificationService.showFriendAdded(friendData.nickname);
                    }
                    
                    this.markFriendshipAsSeen(docSnap.id);
                }

                return friend;
            });

            try {
                const resolvedFriends = await Promise.all(friendPromises);
                callback(resolvedFriends);
            } catch (error) {
                console.error('❌ Error processing real-time friends:', error);
                callback([]);
            }
        }, (error) => {
            console.error('Friends subscription error:', error);
            callback([]);
        });

        // Store listener for cleanup
        this.realtimeListeners.set(`friends_${uid}`, unsubscribe);
        return unsubscribe;
    }

    /**
     * Update friendship metadata with bidirectional permissions
     */
    public async updateFriendshipMetadata(
        friendshipId: string, 
        currentUserUid: string,
        metadata: Partial<{ canTrade: boolean; canChat: boolean }>
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const friendshipRef = doc(db, 'friendships', friendshipId);
            
            // Get the friendship to determine which user is making the update
            const friendshipDoc = await getDoc(friendshipRef);
            if (!friendshipDoc.exists()) {
                return { success: false, error: 'Freundschaft nicht gefunden' };
            }
            
            const friendshipData = friendshipDoc.data();
            const isUser1 = friendshipData.user1 === currentUserUid;
            
            // Build update object with only provided fields
            const updates: any = {
                lastActivity: new Date().toISOString()
            };
            
            // Update the appropriate user's trading permission
            if (metadata.canTrade !== undefined) {
                if (isUser1) {
                    updates[`metadata.user1CanTrade`] = metadata.canTrade;
                } else {
                    updates[`metadata.user2CanTrade`] = metadata.canTrade;
                }
            }
            
            if (metadata.canChat !== undefined) {
                updates[`metadata.canChat`] = metadata.canChat;
            }
            
            await updateDoc(friendshipRef, updates);

            return { success: true };

        } catch (error) {
            console.error('Failed to update friendship metadata:', error);
            return { success: false, error: 'Fehler beim Aktualisieren der Freundschaftseinstellungen' };
        }
    }

    /**
     * Get friendship statistics for a user
     */
    public async getFriendshipStats(uid: string): Promise<{
        totalFriends: number;
        pendingRequests: number;
        sentRequests: number;
    }> {
        try {
            const [friends, requests] = await Promise.all([
                this.getFriends(uid),
                this.getFriendRequests(uid)
            ]);

            const pendingRequests = requests.filter(r => r.to.uid === uid).length;
            const sentRequests = requests.filter(r => r.from.uid === uid).length;

            return {
                totalFriends: friends.length,
                pendingRequests,
                sentRequests
            };

        } catch (error) {
            console.error('Failed to get friendship stats:', error);
            return {
                totalFriends: 0,
                pendingRequests: 0,
                sentRequests: 0
            };
        }
    }

    /**
     * Check if two users are friends
     */
    public async areFriends(uid1: string, uid2: string): Promise<boolean> {
        const friendship = await this.getFriendship(uid1, uid2);
        return friendship?.status === 'accepted';
    }

    /**
     * Check if two users can trade with each other
     * Requires both users to have global trading enabled AND both to allow trading with each other
     */
    public async canUsersTradeAB(
        userAUid: string, 
        userBUid: string,
        userAProfile?: { tradingEnabled?: boolean },
        userBProfile?: { tradingEnabled?: boolean }
    ): Promise<{ canTrade: boolean; reason?: string }> {
        try {
            // Load user profiles if not provided
            if (!userAProfile) {
                const profile = await this.databaseService.getUserProfile(userAUid);
                userAProfile = { tradingEnabled: profile?.tradingEnabled };
            }
            if (!userBProfile) {
                const profile = await this.databaseService.getUserProfile(userBUid);
                userBProfile = { tradingEnabled: profile?.tradingEnabled };
            }

            // Check global trading settings
            if (userAProfile.tradingEnabled === false) {
                return { canTrade: false, reason: 'User A has trading disabled globally' };
            }
            if (userBProfile.tradingEnabled === false) {
                return { canTrade: false, reason: 'User B has trading disabled globally' };
            }

            // Check friendship and individual permissions
            const friendship = await this.getFriendship(userAUid, userBUid);
            if (!friendship || friendship.status !== 'accepted') {
                return { canTrade: false, reason: 'Users are not friends' };
            }

            // Determine which user is user1 vs user2 in the friendship
            const userAIsUser1 = friendship.user1 === userAUid;
            const userAAllowsTrading = userAIsUser1 
                ? (friendship.metadata?.user1CanTrade ?? true)
                : (friendship.metadata?.user2CanTrade ?? true);
            const userBAllowsTrading = userAIsUser1 
                ? (friendship.metadata?.user2CanTrade ?? true)
                : (friendship.metadata?.user1CanTrade ?? true);

            if (!userAAllowsTrading) {
                return { canTrade: false, reason: 'User A does not allow trading with User B' };
            }
            if (!userBAllowsTrading) {
                return { canTrade: false, reason: 'User B does not allow trading with User A' };
            }

            return { canTrade: true };

        } catch (error) {
            console.error('Error checking if users can trade:', error);
            return { canTrade: false, reason: 'Error checking trading permissions' };
        }
    }

    /**
     * Cleanup all subscriptions
     */
    public unsubscribeAll(): void {
        this.realtimeListeners.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.realtimeListeners.clear();
    }

    /**
     * Cleanup specific subscription
     */
    public unsubscribe(key: string): void {
        const unsubscribe = this.realtimeListeners.get(key);
        if (unsubscribe) {
            unsubscribe();
            this.realtimeListeners.delete(key);
        }
    }

    /**
     * Mark all current friend requests as seen (called when user visits Friends tab)
     */
    public async markAllRequestsAsSeen(uid: string): Promise<void> {
        try {
            const requests = await this.getFriendRequests(uid);
            requests.forEach(request => {
                this.markRequestAsSeen(request.id);
            });
            console.log('🔔 Marked all friend requests as seen');
        } catch (error) {
            console.error('Error marking requests as seen:', error);
        }
    }
}