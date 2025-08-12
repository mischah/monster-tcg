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
    and,
    orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { DatabaseService } from './DatabaseService.js';
import { FriendshipService } from './FriendshipService.js';
import { notificationService } from './NotificationService.js';
import type { 
    TradeRequest, 
    TradedCard, 
    TradeStatus,
    MonsterData,
    UserProfile 
} from '../types.js';

/**
 * Firestore Data Structure:
 * 
 * trades/{tradeId} -> TradeRequest
 * 
 * Collection Indexes needed:
 * - trades: (initiator.uid, status, createdAt)
 * - trades: (receiver.uid, status, createdAt)
 * - trades: (expiresAt) // for cleanup
 */

export class TradingService {
    private static instance: TradingService | null = null;
    private realtimeListeners: Map<string, Unsubscribe> = new Map();
    private databaseService: DatabaseService;
    private friendshipService: FriendshipService;
    private seenTrades: Set<string> = new Set();

    constructor() {
        if (TradingService.instance) {
            return TradingService.instance;
        }
        TradingService.instance = this;
        this.databaseService = new DatabaseService();
        this.friendshipService = new FriendshipService();
        this.loadSeenTradesFromStorage();
    }

    private loadSeenTradesFromStorage(): void {
        try {
            const seenTrades = localStorage.getItem('seenTrades');
            if (seenTrades) {
                this.seenTrades = new Set(JSON.parse(seenTrades));
            }
        } catch (error) {
            console.error('Error loading seen trades from storage:', error);
        }
    }

    private saveSeenTradesToStorage(): void {
        try {
            localStorage.setItem('seenTrades', JSON.stringify([...this.seenTrades]));
        } catch (error) {
            console.error('Error saving seen trades to storage:', error);
        }
    }

    private markTradeAsSeenLocally(tradeId: string): void {
        this.seenTrades.add(tradeId);
        this.saveSeenTradesToStorage();
    }

    /**
     * Convert MonsterData to TradedCard format
     */
    private monsterToTradedCard(monster: MonsterData): TradedCard {
        // Ensure all fields have valid values (defensive programming)
        return {
            name: monster.name || 'Unknown',
            rarity: monster.rarity || 'common',
            attack: monster.attack ?? 0,
            defense: monster.defense ?? 0,
            health: monster.health ?? 0,
            description: monster.description || 'No description',
            emoji: monster.emoji || '❓',
            cardKey: monster.id || `${monster.name}_${monster.rarity}_${Date.now()}`
        };
    }

    /**
     * Convert TradedCard back to MonsterData format
     */
    private tradedCardToMonster(tradedCard: TradedCard): MonsterData {
        return {
            id: tradedCard.cardKey,
            name: tradedCard.name,
            rarity: tradedCard.rarity,
            attack: tradedCard.attack,
            defense: tradedCard.defense,
            health: tradedCard.health,
            description: tradedCard.description,
            emoji: tradedCard.emoji
        };
    }

    /**
     * Generate unique trade ID
     */
    private generateTradeId(): string {
        return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create a new trade request
     */
    public async createTradeRequest(
        initiatorUid: string,
        receiverUid: string,
        offeredCards: MonsterData[]
    ): Promise<{ success: boolean; tradeId?: string; error?: string }> {
        try {
            console.log('🔄 Creating trade request:', { initiatorUid, receiverUid, offeredCards: offeredCards.length });

            // Validate trading permissions
            const permissionCheck = await this.friendshipService.canUsersTradeAB(initiatorUid, receiverUid);
            if (!permissionCheck.canTrade) {
                return { success: false, error: permissionCheck.reason || 'Trading nicht erlaubt' };
            }

            // Check for existing pending trade between users
            const existingTrade = await this.getExistingPendingTrade(initiatorUid, receiverUid);
            if (existingTrade) {
                return { success: false, error: 'Es gibt bereits eine aktive Tauschanfrage zwischen euch' };
            }

            // Validate card ownership
            const cardOwnershipValid = await this.validateCardOwnership(initiatorUid, offeredCards);
            if (!cardOwnershipValid) {
                return { success: false, error: 'Ein oder mehrere Karten sind nicht mehr in deinem Besitz' };
            }

            // Get user profiles
            const [initiatorProfile, receiverProfile] = await Promise.all([
                this.databaseService.getUserProfile(initiatorUid),
                this.databaseService.getUserProfile(receiverUid)
            ]);

            if (!initiatorProfile || !receiverProfile) {
                return { success: false, error: 'Benutzerprofile nicht gefunden' };
            }

            // Create trade request
            const tradeId = this.generateTradeId();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

            const tradeRequest: Omit<TradeRequest, 'id'> = {
                initiator: {
                    uid: initiatorUid,
                    nickname: initiatorProfile.nickname,
                    offeredCards: offeredCards.map(card => this.monsterToTradedCard(card))
                },
                receiver: {
                    uid: receiverUid,
                    nickname: receiverProfile.nickname
                },
                status: 'pending',
                createdAt: new Date().toISOString(),
                expiresAt: expiresAt.toISOString(),
                metadata: {
                    initiatorSeen: true,
                    receiverSeen: false,
                    version: 1
                }
            };

            await setDoc(doc(db, 'trades', tradeId), tradeRequest);
            console.log('✅ Trade request created successfully:', tradeId);

            // Send notification to receiver
            notificationService.showTradeRequest(
                { nickname: initiatorProfile.nickname },
                offeredCards.length,
                receiverUid
            );

            return { success: true, tradeId };

        } catch (error) {
            console.error('❌ Failed to create trade request:', error);
            return { success: false, error: 'Fehler beim Erstellen der Tauschanfrage' };
        }
    }

    /**
     * Respond to trade request with requested cards
     */
    public async respondToTradeRequest(
        tradeId: string,
        responderUid: string,
        requestedCards: MonsterData[]
    ): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('🔄 Responding to trade request:', { tradeId, responderUid, cards: requestedCards.length });

            const tradeRef = doc(db, 'trades', tradeId);
            const tradeDoc = await getDoc(tradeRef);

            if (!tradeDoc.exists()) {
                return { success: false, error: 'Tauschanfrage nicht gefunden' };
            }

            const tradeData = tradeDoc.data() as TradeRequest;

            // Validate responder is the receiver
            if (tradeData.receiver.uid !== responderUid) {
                return { success: false, error: 'Du bist nicht berechtigt auf diese Tauschanfrage zu antworten' };
            }

            // Validate trade is still pending
            if (tradeData.status !== 'pending') {
                return { success: false, error: 'Diese Tauschanfrage kann nicht mehr beantwortet werden' };
            }

            // Validate at least one card is selected
            if (!requestedCards || requestedCards.length === 0) {
                return { success: false, error: 'Du musst mindestens eine Karte für den Tausch auswählen' };
            }

            // Validate card ownership
            const cardOwnershipValid = await this.validateCardOwnership(responderUid, requestedCards);
            if (!cardOwnershipValid) {
                return { success: false, error: 'Ein oder mehrere Karten sind nicht mehr in deinem Besitz' };
            }

            // Update trade request
            await updateDoc(tradeRef, {
                'receiver.requestedCards': requestedCards.map(card => this.monsterToTradedCard(card)),
                status: 'responded',
                respondedAt: new Date().toISOString(),
                'metadata.version': tradeData.metadata.version + 1,
                'metadata.receiverSeen': true,
                'metadata.initiatorSeen': false // Initiator needs to see the response
            });

            console.log('✅ Trade response sent successfully');

            // Send notification to initiator
            notificationService.showTradeResponse(
                { nickname: tradeData.receiver.nickname },
                tradeData.initiator.uid
            );

            return { success: true };

        } catch (error) {
            console.error('❌ Failed to respond to trade request:', error);
            return { success: false, error: 'Fehler beim Beantworten der Tauschanfrage' };
        }
    }

    /**
     * Finalize trade request (accept or decline)
     */
    public async finalizeTradeRequest(
        tradeId: string,
        finalizerUid: string,
        accept: boolean
    ): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('🔄 Finalizing trade request:', { tradeId, finalizerUid, accept });

            const tradeRef = doc(db, 'trades', tradeId);
            const tradeDoc = await getDoc(tradeRef);

            if (!tradeDoc.exists()) {
                return { success: false, error: 'Tauschanfrage nicht gefunden' };
            }

            const tradeData = tradeDoc.data() as TradeRequest;

            // Validate finalizer is the initiator
            if (tradeData.initiator.uid !== finalizerUid) {
                return { success: false, error: 'Du bist nicht berechtigt diese Tauschanfrage zu finalisieren' };
            }

            // Validate trade is in responded state
            if (tradeData.status !== 'responded') {
                return { success: false, error: 'Diese Tauschanfrage kann nicht mehr finalisiert werden' };
            }

            if (accept) {
                // Execute the trade
                const tradeResult = await this.executeTrade(tradeData);
                if (!tradeResult.success) {
                    return { success: false, error: tradeResult.error };
                }

                // Update trade status to accepted
                await updateDoc(tradeRef, {
                    status: 'accepted',
                    completedAt: new Date().toISOString(),
                    'metadata.version': tradeData.metadata.version + 1,
                    'metadata.initiatorSeen': true,
                    'metadata.receiverSeen': false // Receiver needs to see completion
                });

                console.log('✅ Trade accepted and executed successfully');

                // Send acceptance notification to receiver
                notificationService.showTradeAccepted(
                    { nickname: tradeData.initiator.nickname },
                    tradeData.receiver.requestedCards?.length || 0,
                    tradeData.receiver.uid
                );

                // Send completion notification to initiator
                notificationService.showTradeAccepted(
                    { nickname: tradeData.receiver.nickname },
                    tradeData.initiator.offeredCards.length,
                    tradeData.initiator.uid
                );

            } else {
                // Decline the trade
                await updateDoc(tradeRef, {
                    status: 'declined',
                    completedAt: new Date().toISOString(),
                    'metadata.version': tradeData.metadata.version + 1,
                    'metadata.initiatorSeen': true,
                    'metadata.receiverSeen': false // Receiver needs to see decline
                });

                console.log('❌ Trade declined');

                // Send decline notification to receiver
                notificationService.showTradeDeclined(
                    { nickname: tradeData.initiator.nickname },
                    tradeData.receiver.uid
                );
            }

            return { success: true };

        } catch (error) {
            console.error('❌ Failed to finalize trade request:', error);
            return { success: false, error: 'Fehler beim Finalisieren der Tauschanfrage' };
        }
    }

    /**
     * Cancel trade request (initiator only)
     */
    public async cancelTradeRequest(
        tradeId: string,
        cancellerUid: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const tradeRef = doc(db, 'trades', tradeId);
            const tradeDoc = await getDoc(tradeRef);

            if (!tradeDoc.exists()) {
                return { success: false, error: 'Tauschanfrage nicht gefunden' };
            }

            const tradeData = tradeDoc.data() as TradeRequest;

            // Validate canceller is the initiator
            if (tradeData.initiator.uid !== cancellerUid) {
                return { success: false, error: 'Du kannst nur deine eigenen Tauschanfragen abbrechen' };
            }

            // Validate trade can be cancelled
            if (!['pending', 'responded'].includes(tradeData.status)) {
                return { success: false, error: 'Diese Tauschanfrage kann nicht mehr abgebrochen werden' };
            }

            await updateDoc(tradeRef, {
                status: 'cancelled',
                completedAt: new Date().toISOString(),
                'metadata.version': tradeData.metadata.version + 1
            });

            console.log('🚫 Trade cancelled successfully');
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to cancel trade request:', error);
            return { success: false, error: 'Fehler beim Abbrechen der Tauschanfrage' };
        }
    }

    /**
     * Execute the actual card trade between users
     */
    private async executeTrade(tradeData: TradeRequest): Promise<{ success: boolean; error?: string }> {
        try {
            if (!tradeData.receiver.requestedCards) {
                return { success: false, error: 'Keine Tauschkarten vom Empfänger angegeben' };
            }

            const initiatorUid = tradeData.initiator.uid;
            const receiverUid = tradeData.receiver.uid;
            const offeredCards = tradeData.initiator.offeredCards.map(card => this.tradedCardToMonster(card));
            const requestedCards = tradeData.receiver.requestedCards.map(card => this.tradedCardToMonster(card));

            // Re-validate card ownership before executing trade
            const [initiatorOwnsOffered, receiverOwnsRequested] = await Promise.all([
                this.validateCardOwnership(initiatorUid, offeredCards),
                this.validateCardOwnership(receiverUid, requestedCards)
            ]);

            if (!initiatorOwnsOffered) {
                return { success: false, error: 'Initiator besitzt nicht mehr alle angebotenen Karten' };
            }

            if (!receiverOwnsRequested) {
                return { success: false, error: 'Empfänger besitzt nicht mehr alle angeforderten Karten' };
            }

            // Get current game data for both users
            const [initiatorGameData, receiverGameData] = await Promise.all([
                this.databaseService.getGameData(initiatorUid),
                this.databaseService.getGameData(receiverUid)
            ]);

            if (!initiatorGameData || !receiverGameData) {
                return { success: false, error: 'Spieldaten nicht gefunden' };
            }

            // Remove offered cards from initiator's collection
            let initiatorCollection = [...initiatorGameData.collection];
            for (const cardToRemove of offeredCards) {
                const cardIndex = initiatorCollection.findIndex(card => 
                    card.id === cardToRemove.id || 
                    (card.name === cardToRemove.name && card.rarity === cardToRemove.rarity)
                );
                if (cardIndex !== -1) {
                    initiatorCollection.splice(cardIndex, 1);
                }
            }

            // Remove requested cards from receiver's collection
            let receiverCollection = [...receiverGameData.collection];
            for (const cardToRemove of requestedCards) {
                const cardIndex = receiverCollection.findIndex(card => 
                    card.id === cardToRemove.id || 
                    (card.name === cardToRemove.name && card.rarity === cardToRemove.rarity)
                );
                if (cardIndex !== -1) {
                    receiverCollection.splice(cardIndex, 1);
                }
            }

            // Add requested cards to initiator's collection
            initiatorCollection.push(...requestedCards);

            // Add offered cards to receiver's collection
            receiverCollection.push(...offeredCards);

            // Save updated collections
            await Promise.all([
                this.databaseService.saveGameData(initiatorUid, {
                    ...initiatorGameData,
                    collection: initiatorCollection,
                    lastSaved: new Date().toISOString()
                }),
                this.databaseService.saveGameData(receiverUid, {
                    ...receiverGameData,
                    collection: receiverCollection,
                    lastSaved: new Date().toISOString()
                })
            ]);

            console.log('✅ Card trade executed successfully');
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to execute trade:', error);
            return { success: false, error: 'Fehler beim Durchführen des Kartentauschs' };
        }
    }

    /**
     * Get trade requests for a user (both incoming and outgoing)
     * Uses separate queries to avoid complex index requirements
     */
    public async getTradeRequests(uid: string): Promise<TradeRequest[]> {
        try {
            const tradesRef = collection(db, 'trades');
            
            // Query 1: Trades where user is initiator
            const q1 = query(
                tradesRef,
                where('initiator.uid', '==', uid),
                where('status', 'in', ['pending', 'responded'])
            );

            // Query 2: Trades where user is receiver
            const q2 = query(
                tradesRef,
                where('receiver.uid', '==', uid),
                where('status', 'in', ['pending', 'responded'])
            );

            const [initiatorSnapshot, receiverSnapshot] = await Promise.all([
                getDocs(q1),
                getDocs(q2)
            ]);

            const trades: TradeRequest[] = [];

            // Add initiator trades
            initiatorSnapshot.docs.forEach(doc => {
                trades.push({
                    id: doc.id,
                    ...doc.data()
                } as TradeRequest);
            });

            // Add receiver trades
            receiverSnapshot.docs.forEach(doc => {
                trades.push({
                    id: doc.id,
                    ...doc.data()
                } as TradeRequest);
            });

            // Sort by creation date (newest first)
            trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            return trades;

        } catch (error) {
            console.error('Failed to get trade requests:', error);
            return [];
        }
    }

    /**
     * Subscribe to real-time trade requests updates
     * Uses separate queries to avoid complex index requirements
     */
    public subscribeTradeRequests(uid: string, callback: (trades: TradeRequest[]) => void): Unsubscribe {
        const tradesRef = collection(db, 'trades');
        let initiatorTrades: TradeRequest[] = [];
        let receiverTrades: TradeRequest[] = [];
        let hasInitiatorData = false;
        let hasReceiverData = false;

        const processResults = () => {
            if (!hasInitiatorData || !hasReceiverData) return;

            // Combine and deduplicate trades
            const allTrades = [...initiatorTrades, ...receiverTrades];
            const uniqueTrades = allTrades.filter((trade, index, arr) => 
                arr.findIndex(t => t.id === trade.id) === index
            );

            // Sort by creation date (newest first)
            uniqueTrades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            // Check for new trades and trigger notifications
            uniqueTrades.forEach(tradeData => {
                if (!this.seenTrades.has(tradeData.id)) {
                    // Only notify for trades directed at current user
                    if (tradeData.receiver.uid === uid && tradeData.status === 'pending') {
                        // New trade request received - let NotificationService handle this via cross-browser
                        console.log('🔔 New trade request detected, letting cross-browser notification handle it:', tradeData.initiator.nickname);
                        // Don't trigger notification here, cross-browser will handle it
                    } else if (tradeData.initiator.uid === uid && tradeData.status === 'responded') {
                        // Trade response received - let NotificationService handle this via cross-browser
                        console.log('🔔 Trade response detected, letting cross-browser notification handle it:', tradeData.receiver.nickname);
                        // Don't trigger notification here, cross-browser will handle it
                    }

                    this.markTradeAsSeenLocally(tradeData.id);
                }
            });

            console.log('🔧 DEBUG: Calling callback with', uniqueTrades.length, 'trades');
            callback(uniqueTrades);
        };

        // Query 1: Trades where user is initiator
        const q1 = query(
            tradesRef,
            where('initiator.uid', '==', uid),
            where('status', 'in', ['pending', 'responded'])
        );

        // Query 2: Trades where user is receiver  
        const q2 = query(
            tradesRef,
            where('receiver.uid', '==', uid),
            where('status', 'in', ['pending', 'responded'])
        );

        const unsubscribe1 = onSnapshot(q1, (querySnapshot) => {
            console.log('🔧 DEBUG: Initiator trades query result:', querySnapshot.docs.length);
            initiatorTrades = [];
            querySnapshot.docs.forEach(doc => {
                initiatorTrades.push({
                    id: doc.id,
                    ...doc.data()
                } as TradeRequest);
            });
            
            hasInitiatorData = true;
            processResults();
        }, (error) => {
            console.error('Trade requests subscription error (initiator):', error);
            hasInitiatorData = true;
            processResults();
        });

        const unsubscribe2 = onSnapshot(q2, (querySnapshot) => {
            console.log('🔧 DEBUG: Receiver trades query result:', querySnapshot.docs.length);
            receiverTrades = [];
            querySnapshot.docs.forEach(doc => {
                receiverTrades.push({
                    id: doc.id,
                    ...doc.data()
                } as TradeRequest);
            });
            
            hasReceiverData = true;
            processResults();
        }, (error) => {
            console.error('Trade requests subscription error (receiver):', error);
            hasReceiverData = true;
            processResults();
        });

        // Combined unsubscribe function
        const combinedUnsubscribe = () => {
            unsubscribe1();
            unsubscribe2();
        };

        // Store listener for cleanup
        this.realtimeListeners.set(`tradeRequests_${uid}`, combinedUnsubscribe);
        return combinedUnsubscribe;
    }

    /**
     * Decline trade request (receiver only)
     */
    public async declineTradeRequest(
        tradeId: string,
        declinerUid: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('🔄 Declining trade request:', { tradeId, declinerUid });

            const tradeRef = doc(db, 'trades', tradeId);
            const tradeDoc = await getDoc(tradeRef);

            if (!tradeDoc.exists()) {
                return { success: false, error: 'Tauschanfrage nicht gefunden' };
            }

            const tradeData = tradeDoc.data() as TradeRequest;

            // Validate decliner is the receiver
            if (tradeData.receiver.uid !== declinerUid) {
                return { success: false, error: 'Du kannst nur an dich gerichtete Tauschanfragen ablehnen' };
            }

            // Validate trade can be declined
            if (tradeData.status !== 'pending') {
                return { success: false, error: 'Diese Tauschanfrage kann nicht mehr abgelehnt werden' };
            }

            // Update trade status to declined
            await updateDoc(tradeRef, {
                status: 'declined',
                completedAt: new Date().toISOString(),
                'metadata.version': tradeData.metadata.version + 1
            });

            // Send notification to initiator  
            notificationService.showTradeDeclined(
                { nickname: tradeData.receiver.nickname },
                tradeData.initiator.uid
            );

            console.log('❌ Trade declined successfully');
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to decline trade request:', error);
            return { success: false, error: 'Fehler beim Ablehnen der Tauschanfrage' };
        }
    }

    /**
     * Check for existing pending trade between two users
     * Uses separate queries to avoid complex index requirements
     */
    private async getExistingPendingTrade(uid1: string, uid2: string): Promise<TradeRequest | null> {
        try {
            const tradesRef = collection(db, 'trades');

            // Query 1: uid1 -> uid2
            const q1 = query(
                tradesRef,
                where('initiator.uid', '==', uid1),
                where('receiver.uid', '==', uid2),
                where('status', 'in', ['pending', 'responded'])
            );

            // Query 2: uid2 -> uid1
            const q2 = query(
                tradesRef,
                where('initiator.uid', '==', uid2),
                where('receiver.uid', '==', uid1),
                where('status', 'in', ['pending', 'responded'])
            );

            const [snapshot1, snapshot2] = await Promise.all([
                getDocs(q1),
                getDocs(q2)
            ]);

            // Check first query result
            if (!snapshot1.empty) {
                const doc = snapshot1.docs[0];
                return {
                    id: doc.id,
                    ...doc.data()
                } as TradeRequest;
            }

            // Check second query result
            if (!snapshot2.empty) {
                const doc = snapshot2.docs[0];
                return {
                    id: doc.id,
                    ...doc.data()
                } as TradeRequest;
            }

            return null;

        } catch (error) {
            console.error('Error checking existing trade:', error);
            return null;
        }
    }

    /**
     * Validate that user owns all specified cards
     */
    private async validateCardOwnership(uid: string, cards: MonsterData[]): Promise<boolean> {
        try {
            const gameData = await this.databaseService.getGameData(uid);
            if (!gameData) return false;

            const userCollection = gameData.collection;

            for (const card of cards) {
                const owned = userCollection.some(userCard => 
                    userCard.id === card.id || 
                    (userCard.name === card.name && userCard.rarity === card.rarity)
                );
                if (!owned) {
                    console.log('Card not owned:', card.name, card.rarity);
                    return false;
                }
            }

            return true;

        } catch (error) {
            console.error('Error validating card ownership:', error);
            return false;
        }
    }

    /**
     * Mark trade as seen by user
     */
    public async markTradeAsSeen(tradeId: string, uid: string): Promise<void> {
        try {
            const tradeRef = doc(db, 'trades', tradeId);
            const tradeDoc = await getDoc(tradeRef);

            if (!tradeDoc.exists()) return;

            const tradeData = tradeDoc.data() as TradeRequest;
            const updates: any = {};

            if (tradeData.initiator.uid === uid) {
                updates['metadata.initiatorSeen'] = true;
            } else if (tradeData.receiver.uid === uid) {
                updates['metadata.receiverSeen'] = true;
            }

            if (Object.keys(updates).length > 0) {
                await updateDoc(tradeRef, updates);
            }

        } catch (error) {
            console.error('Error marking trade as seen:', error);
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
}