import { AuthService } from '../services/AuthService.js';
import { DatabaseService } from '../services/DatabaseService.js';
import { FriendshipService } from '../services/FriendshipService.js';
import { TradingService } from '../services/TradingService.js';
import { presenceService } from '../services/PresenceService.js';
import { notificationService } from '../services/NotificationService.js';
import type { UserProfile, TradeRequest } from '../types.js';

export class FriendsTab {
    private authService: AuthService;
    private databaseService: DatabaseService;
    private friendshipService: FriendshipService;
    private tradingService: TradingService;
    private currentUser: UserProfile | null = null;
    private pendingTrades: TradeRequest[] = [];
    private collectionManager: any = null;

    // Trading modal properties
    private selectedResponseCards: string[] = [];

    constructor() {
        this.authService = new AuthService();
        this.databaseService = new DatabaseService();
        this.friendshipService = new FriendshipService();
        this.tradingService = new TradingService();
        
        // Listen to auth state changes
        this.authService.onAuthStateChange((authState) => {
            this.currentUser = authState.user;
            // Always re-initialize when auth state changes
            this.initialize();
        });

        // Get collectionManager from global game object
        this.collectionManager = (window as any).game?.collectionManager || null;
    }

    public initialize(): void {
        console.log('🔧 DEBUG: FriendsTab.initialize() called');
        console.log('🔧 DEBUG: currentUser:', this.currentUser);
        
        // Make friendsTab globally accessible for onclick handlers
        (window as any).friendsTab = this;
        
        if (!this.currentUser) {
            console.log('🔧 DEBUG: User not logged in, rendering login required');
            this.renderLoginRequired();
            return;
        }
        
        console.log('🔧 DEBUG: User logged in, rendering friends tab');
        this.renderFriendsTab();
        this.setupEventListeners();
        
        // Load and display friend requests, friends, and trade requests
        console.log('🔧 DEBUG: Loading friend requests, friends, and trade requests...');
        this.loadFriendRequests();
        this.loadFriends();
        this.loadTradeRequests();
        
        // Mark all current requests as seen (user is now viewing the Friends tab)
        if (this.currentUser) {
            this.friendshipService.markAllRequestsAsSeen(this.currentUser.uid);
            // Also clear the navigation badge when user visits Friends tab
            this.clearNavigationBadge();
        }
        
        console.log('🔧 DEBUG: FriendsTab setup completed');
    }

    private renderLoginRequired(): void {
        const friendsContent = document.getElementById('friends-content');
        if (!friendsContent) return;

        friendsContent.innerHTML = `
            <div class="login-required">
                <div class="login-message">
                    <h3>🔒 Anmeldung erforderlich</h3>
                    <p>Um Freunde hinzuzufügen und zu verwalten, musst du dich zuerst anmelden.</p>
                    <button id="login-redirect-btn" class="login-btn">
                        📧 Jetzt anmelden
                    </button>
                </div>
            </div>
            
            <style>
                .login-required {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 300px;
                    padding: 40px 20px;
                }

                .login-message {
                    text-align: center;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid #333;
                    border-radius: 15px;
                    padding: 40px;
                    max-width: 400px;
                }

                .login-message h3 {
                    color: #fff;
                    margin: 0 0 15px 0;
                    font-size: 24px;
                }

                .login-message p {
                    color: #aaa;
                    margin: 0 0 25px 0;
                    line-height: 1.5;
                }

                .login-btn {
                    background: linear-gradient(135deg, #4a90e2, #357ABD);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .login-btn:hover {
                    background: linear-gradient(135deg, #357ABD, #2868A3);
                    transform: translateY(-2px);
                }
            </style>
        `;

        // Add event listener for login redirect
        const loginBtn = document.getElementById('login-redirect-btn');
        loginBtn?.addEventListener('click', () => {
            // Trigger login modal
            const loginModalBtn = document.querySelector('[data-action="login"]') as HTMLElement;
            if (loginModalBtn) {
                loginModalBtn.click();
            }
        });
    }

    private renderFriendsTab(): void {
        const friendsContent = document.getElementById('friends-content');
        if (!friendsContent || !this.currentUser) return;

        friendsContent.innerHTML = `
            ${this.getStyles()}
            
            <!-- Eigener Freundschaftscode -->
            <div class="friends-section my-friend-code">
                <div class="section-header">
                    <h3>🤝 Mein Freundschaftscode</h3>
                    <p class="section-description">Teile diesen Code mit Freunden</p>
                </div>
                <div class="friend-code-display">
                    <div class="friend-code-box">
                        <span id="my-friend-code" class="friend-code">${this.currentUser.friendCode || 'Wird geladen...'}</span>
                    </div>
                    <button id="copy-friend-code" class="copy-btn" title="Code kopieren">
                        📋 Kopieren
                    </button>
                </div>
            </div>

            <!-- Freund hinzufügen -->
            <div class="friends-section add-friend">
                <div class="section-header">
                    <h3>➕ Freund hinzufügen</h3>
                </div>
                <div class="add-friend-form">
                    <div class="input-group">
                        <input type="text" id="friend-code-input" placeholder="Freundschaftscode eingeben..." maxlength="6">
                        <button id="search-friend-btn" class="search-btn">🔍 Suchen</button>
                    </div>
                    <div id="friend-search-result" class="search-result hidden"></div>
                </div>
            </div>

            <!-- Freundschaftsanfragen -->
            <div class="friends-section friend-requests">
                <div class="section-header">
                    <h3>📨 Freundschaftsanfragen</h3>
                    <span id="requests-badge" class="badge hidden">0</span>
                </div>
                <div id="friend-requests-list" class="requests-list">
                    <div class="no-requests">Keine Anfragen vorhanden</div>
                </div>
            </div>

            <!-- Trading Requests -->
            <div class="friends-section trade-requests">
                <div class="section-header">
                    <h3>🔄 Tauschanfragen</h3>
                    <span id="trade-requests-badge" class="badge hidden">0</span>
                </div>
                <div id="trade-requests-list" class="requests-list">
                    <div class="no-requests">Keine Tauschanfragen vorhanden</div>
                </div>
            </div>

            <!-- Freundesliste -->
            <div class="friends-section friends-list">
                <div class="section-header">
                    <h3>👥 Meine Freunde</h3>
                    <span id="friends-count" class="badge">0</span>
                </div>
                <div id="friends-list" class="list">
                    <div class="no-friends">Noch keine Freunde hinzugefügt</div>
                </div>
            </div>

            <!-- Status Messages -->
            <div id="friends-status" class="status-message hidden"></div>
        `;
    }

    private setupEventListeners(): void {
        // Copy friend code
        const copyBtn = document.getElementById('copy-friend-code');
        copyBtn?.addEventListener('click', () => this.copyFriendCode());

        // Search friend
        const searchBtn = document.getElementById('search-friend-btn');
        searchBtn?.addEventListener('click', () => this.searchFriend());

        // Enter key for search
        const friendCodeInput = document.getElementById('friend-code-input') as HTMLInputElement;
        friendCodeInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchFriend();
        });

        // Input validation
        friendCodeInput?.addEventListener('input', (e) => {
            const input = e.target as HTMLInputElement;
            input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    }

    private async copyFriendCode(): Promise<void> {
        if (!this.currentUser?.friendCode) return;

        try {
            await navigator.clipboard.writeText(this.currentUser.friendCode);
            this.showStatus('✅ Freundschaftscode kopiert!', 'success');
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = this.currentUser.friendCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showStatus('✅ Freundschaftscode kopiert!', 'success');
        }
    }

    private async searchFriend(): Promise<void> {
        const friendCodeInput = document.getElementById('friend-code-input') as HTMLInputElement;
        const searchResult = document.getElementById('friend-search-result');
        
        if (!friendCodeInput || !searchResult) return;

        const friendCode = friendCodeInput.value.trim().toUpperCase();
        
        if (!friendCode) {
            this.showStatus('❌ Bitte gib einen Freundschaftscode ein', 'error');
            return;
        }

        if (friendCode.length !== 6) {
            this.showStatus('❌ Freundschaftscode muss 6 Zeichen lang sein', 'error');
            return;
        }

        if (friendCode === this.currentUser?.friendCode) {
            this.showStatus('❌ Du kannst dich nicht selbst als Freund hinzufügen', 'error');
            return;
        }

        try {
            searchResult.innerHTML = '<div class="loading">🔍 Suche...</div>';
            searchResult.classList.remove('hidden');

            const friendData = await this.databaseService.getUserByFriendCode(friendCode);
            
            if (!friendData) {
                searchResult.innerHTML = '<div class="no-result">❌ Kein Benutzer mit diesem Code gefunden</div>';
                return;
            }

            // Display found user
            searchResult.innerHTML = `
                <div class="friend-preview">
                    <div class="friend-info">
                        <h4>👤 ${friendData.nickname}</h4>
                        <p class="friend-email">${friendData.email}</p>
                        <p class="friend-code">Code: ${friendCode}</p>
                    </div>
                    <button id="send-friend-request" class="friend-request-btn">
                        🤝 Freundschaftsanfrage senden
                    </button>
                </div>
            `;

            // Add event listener for friend request
            const sendRequestBtn = document.getElementById('send-friend-request');
            sendRequestBtn?.addEventListener('click', () => this.sendFriendRequest(friendData.uid, friendData.nickname));

        } catch (error) {
            console.error('Error searching friend:', error);
            searchResult.innerHTML = '<div class="error">❌ Fehler bei der Suche</div>';
        }
    }

    private async sendFriendRequest(friendUid: string, friendNickname: string): Promise<void> {
        if (!this.currentUser) return;

        try {
            // Get friend's full data
            const friendData = await this.databaseService.getUserByFriendCode(
                (document.getElementById('friend-code-input') as HTMLInputElement)?.value?.trim().toUpperCase() || ''
            );
            
            if (!friendData) {
                this.showStatus('❌ Freund nicht gefunden', 'error');
                return;
            }

            const result = await this.friendshipService.sendFriendRequest(
                this.currentUser.uid,
                {
                    nickname: this.currentUser.nickname,
                    email: this.currentUser.email,
                    friendCode: this.currentUser.friendCode
                },
                friendUid,
                {
                    nickname: friendData.nickname,
                    email: friendData.email,
                    friendCode: (friendData as any).friendCode || 'UNKNOWN'
                }
            );

            if (result.success) {
                this.showStatus(`🤝 Freundschaftsanfrage an ${friendNickname} gesendet!`, 'success');
                
                // Clear search
                const friendCodeInput = document.getElementById('friend-code-input') as HTMLInputElement;
                const searchResult = document.getElementById('friend-search-result');
                
                if (friendCodeInput) friendCodeInput.value = '';
                if (searchResult) {
                    searchResult.classList.add('hidden');
                    searchResult.innerHTML = '';
                }
            } else {
                this.showStatus(`❌ ${result.error}`, 'error');
            }

        } catch (error) {
            console.error('Error sending friend request:', error);
            this.showStatus('❌ Fehler beim Senden der Freundschaftsanfrage', 'error');
        }
    }

    private showStatus(message: string, type: 'success' | 'error' | 'info'): void {
        const statusElement = document.getElementById('friends-status');
        if (!statusElement) return;

        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        statusElement.classList.remove('hidden');

        setTimeout(() => {
            statusElement.classList.add('hidden');
        }, 3000);
    }

    private async loadFriendRequests(): Promise<void> {
        if (!this.currentUser) return;
        
        console.log('🔧 DEBUG: Loading friend requests for user:', this.currentUser.uid);
        
        try {
            // Subscribe to real-time friend requests updates
            this.friendshipService.subscribeFriendRequests(this.currentUser.uid, (requests) => {
                console.log('🔧 DEBUG: Received friend requests update:', requests);
                this.displayFriendRequests(requests);
            });
        } catch (error) {
            console.error('❌ Failed to load friend requests:', error);
            this.showStatus('❌ Fehler beim Laden der Freundschaftsanfragen', 'error');
        }
    }

    private async loadFriends(): Promise<void> {
        if (!this.currentUser) return;
        
        console.log('🔧 DEBUG: Loading friends for user:', this.currentUser.uid);
        
        try {
            // Subscribe to real-time friends updates
            this.friendshipService.subscribeFriends(this.currentUser.uid, (friends) => {
                console.log('🔧 DEBUG: Received friends update:', friends);
                this.displayFriends(friends);
            });
        } catch (error) {
            console.error('❌ Failed to load friends:', error);
            this.showStatus('❌ Fehler beim Laden der Freunde', 'error');
        }
    }

    private async loadTradeRequests(): Promise<void> {
        if (!this.currentUser) return;
        
        console.log('🔧 DEBUG: Loading trade requests for user:', this.currentUser.uid);
        
        try {
            console.log('🔧 DEBUG: Setting up trade requests subscription for:', this.currentUser.uid);
            
            // Cleanup any existing subscription first
            if (this.tradingService) {
                // This will cleanup any existing listeners
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Subscribe to real-time trade requests updates
            this.tradingService.subscribeTradeRequests(this.currentUser.uid, (trades) => {
                console.log('🔧 DEBUG: Trade subscription callback called with:', trades.length, 'trades');
                console.log('🔧 DEBUG: Trades data:', trades);
                this.displayTradeRequests(trades);
                
                // 🔔 Show notification if needed
                if (trades.length > 0) {
                    console.log('🔔 Trade requests received, updating UI...');
                }
            });
        } catch (error) {
            console.error('❌ Failed to load trade requests:', error);
            this.showStatus('❌ Fehler beim Laden der Tauschanfragen', 'error');
        }
    }

    private displayFriendRequests(requests: any[]): void {
        console.log('🔧 DEBUG: Displaying friend requests:', requests);
        
        const requestsList = document.getElementById('friend-requests-list');
        const requestsBadge = document.getElementById('requests-badge');
        
        if (!requestsList || !requestsBadge) return;

        // Update badge
        const incomingRequests = requests.filter(r => r.to.uid === this.currentUser?.uid);
        const requestCount = incomingRequests.length;
        
        if (requestCount > 0) {
            requestsBadge.textContent = requestCount.toString();
            requestsBadge.classList.remove('hidden');
        } else {
            requestsBadge.classList.add('hidden');
        }

        // Display requests
        if (requests.length === 0) {
            requestsList.innerHTML = '<div class="no-requests">Keine Anfragen vorhanden</div>';
            return;
        }

        requestsList.innerHTML = requests.map(request => {
            const isIncoming = request.to.uid === this.currentUser?.uid;
            const friendData = isIncoming ? request.from : request.to;
            
            return `
                <div class="friend-request-item">
                    <div class="request-info">
                        <h4>👤 ${friendData.nickname}</h4>
                        <p class="request-email">${friendData.email}</p>
                        <p class="request-code">Code: ${friendData.friendCode}</p>
                        <p class="request-type">${isIncoming ? '📥 Eingehende Anfrage' : '📤 Gesendete Anfrage'}</p>
                        <p class="request-date">📅 ${new Date(request.createdAt).toLocaleDateString('de-DE')}</p>
                    </div>
                    <div class="request-actions">
                        ${isIncoming ? `
                            <button class="accept-btn" onclick="window.friendsTab.acceptRequest('${request.id}')">
                                ✅ Annehmen
                            </button>
                            <button class="decline-btn" onclick="window.friendsTab.declineRequest('${request.id}')">
                                ❌ Ablehnen
                            </button>
                        ` : `
                            <button class="cancel-btn" onclick="window.friendsTab.cancelRequest('${request.id}')">
                                🚫 Abbrechen
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
        
        // Make friendsTab globally accessible for onclick handlers
        (window as any).friendsTab = this;
    }

    private displayFriends(friends: any[]): void {
        console.log('🔧 DEBUG: Displaying friends:', friends);
        
        const friendsList = document.getElementById('friends-list');
        const friendsCount = document.getElementById('friends-count');
        
        if (!friendsList || !friendsCount) return;

        // Update count
        friendsCount.textContent = friends.length.toString();

        // Display friends
        if (friends.length === 0) {
            friendsList.innerHTML = '<div class="no-friends">Noch keine Freunde hinzugefügt</div>';
            return;
        }

        friendsList.innerHTML = friends.map(friend => `
            <div class="friend-item">
                <div class="friend-info">
                    <h4>👤 ${friend.nickname}</h4>
                    <p class="friend-email">${friend.email}</p>
                    <p class="friend-code">Code: ${friend.friendCode}</p>
                    <p class="friend-status">${friend.isOnline ? '🟢 Online' : '⚫ Offline'}</p>
                    <p class="friend-active">Letzte Aktivität: ${new Date(friend.lastActive).toLocaleDateString('de-DE')}</p>
                    
                    <div class="friend-trading-settings">
                        <div class="friend-toggle-setting">
                            <span class="toggle-label">🔄 Ich erlaube Handel</span>
                            <label class="friend-toggle-switch">
                                <input type="checkbox" 
                                       id="trade-toggle-${friend.friendshipId}" 
                                       ${friend.iAllowTrading ? 'checked' : ''} 
                                       onchange="window.friendsTab.updateFriendTradingPermission('${friend.friendshipId}', this.checked)">
                                <span class="friend-toggle-slider"></span>
                            </label>
                        </div>
                        <div class="friend-trading-status">
                            <span class="trading-status ${friend.friendAllowsTrading ? 'allowed' : 'blocked'}">
                                ${friend.friendAllowsTrading ? '✅ Freund erlaubt Handel' : '❌ Freund verbietet Handel'}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="friend-actions">
                    ${this.renderTradeButton(friend)}
                    <button class="friend-action-btn" onclick="window.friendsTab.removeFriend('${friend.friendshipId}', '${friend.nickname}')">
                        🗑️ Entfernen
                    </button>
                </div>
            </div>
        `).join('');
        
        // Make friendsTab globally accessible for onclick handlers
        (window as any).friendsTab = this;
    }

    private displayTradeRequests(trades: TradeRequest[]): void {
        console.log('🔧 DEBUG: Displaying trade requests:', trades);
        console.log('🔧 DEBUG: Number of trades:', trades.length);
        console.log('🔧 DEBUG: Current user UID:', this.currentUser?.uid);
        
        // 🔥 CRITICAL FIX: Update pendingTrades property for modal access
        this.pendingTrades = trades;
        
        const tradeRequestsList = document.getElementById('trade-requests-list');
        const tradeRequestsBadge = document.getElementById('trade-requests-badge');
        
        if (!tradeRequestsList || !tradeRequestsBadge) return;

        // Update badge
        const incomingTrades = trades.filter(t => t.receiver.uid === this.currentUser?.uid);
        const outgoingTrades = trades.filter(t => t.initiator.uid === this.currentUser?.uid);
        const tradeCount = trades.length;
        
        if (tradeCount > 0) {
            tradeRequestsBadge.textContent = tradeCount.toString();
            tradeRequestsBadge.classList.remove('hidden');
        } else {
            tradeRequestsBadge.classList.add('hidden');
        }

        // Display trade requests
        if (trades.length === 0) {
            tradeRequestsList.innerHTML = '<div class="no-requests">Keine Tauschanfragen vorhanden</div>';
            return;
        }

        tradeRequestsList.innerHTML = trades.map(trade => {
            const isIncoming = trade.receiver.uid === this.currentUser?.uid;
            const partnerData = isIncoming ? trade.initiator : trade.receiver;
            const statusText = this.getTradeStatusText(trade.status, isIncoming);
            const offeredCards = trade.initiator.offeredCards;
            const requestedCards = trade.receiver.requestedCards || [];
            
            return `
                <div class="trade-request-item">
                    <div class="trade-info">
                        <h4>👤 ${partnerData.nickname}</h4>
                        <p class="trade-type">${isIncoming ? '📥 Eingehende Tauschanfrage' : '📤 Gesendete Tauschanfrage'}</p>
                        <p class="trade-status">Status: ${statusText}</p>
                        <p class="trade-cards">
                            ${isIncoming ? `Bietet: ${offeredCards.length} Karten` : `Du bietest: ${offeredCards.length} Karten`}
                            ${requestedCards.length > 0 ? ` | ${isIncoming ? 'Du bietest' : 'Möchte'}: ${requestedCards.length} Karten` : ''}
                        </p>
                        <p class="trade-date">📅 ${new Date(trade.createdAt).toLocaleDateString('de-DE')}</p>
                    </div>
                    <div class="trade-actions">
                        ${this.renderTradeActions(trade, isIncoming)}
                    </div>
                </div>
            `;
        }).join('');
        
        // Make friendsTab globally accessible for onclick handlers
        (window as any).friendsTab = this;
    }

    public async acceptRequest(friendshipId: string): Promise<void> {
        console.log('🔧 DEBUG: Accepting friend request:', friendshipId);
        
        try {
            const result = await this.friendshipService.acceptFriendRequest(friendshipId);
            if (result.success) {
                this.showStatus('✅ Freundschaftsanfrage angenommen!', 'success');
            } else {
                this.showStatus(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error accepting friend request:', error);
            this.showStatus('❌ Fehler beim Annehmen der Freundschaftsanfrage', 'error');
        }
    }

    public async declineRequest(friendshipId: string): Promise<void> {
        console.log('🔧 DEBUG: Declining friend request:', friendshipId);
        
        try {
            // Pass current user ID so notification can be sent to the requester
            const result = await this.friendshipService.declineFriendRequest(friendshipId, this.currentUser?.uid);
            if (result.success) {
                this.showStatus('❌ Freundschaftsanfrage abgelehnt', 'success');
            } else {
                this.showStatus(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error declining friend request:', error);
            this.showStatus('❌ Fehler beim Ablehnen der Freundschaftsanfrage', 'error');
        }
    }

    public async cancelRequest(friendshipId: string): Promise<void> {
        console.log('🔧 DEBUG: Canceling friend request:', friendshipId);
        
        try {
            // When canceling own request, no notification needed (pass no declinedBy parameter)
            const result = await this.friendshipService.declineFriendRequest(friendshipId);
            if (result.success) {
                this.showStatus('🚫 Freundschaftsanfrage abgebrochen', 'success');
            } else {
                this.showStatus(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error canceling friend request:', error);
            this.showStatus('❌ Fehler beim Abbrechen der Freundschaftsanfrage', 'error');
        }
    }

    public async removeFriend(friendshipId: string, friendName: string): Promise<void> {
        if (!confirm(`Möchtest du ${friendName} wirklich aus deiner Freundesliste entfernen?`)) {
            return;
        }
        
        console.log('🔧 DEBUG: Removing friend:', friendshipId);
        
        try {
            const result = await this.friendshipService.removeFriend(friendshipId);
            if (result.success) {
                this.showStatus(`✅ ${friendName} wurde aus der Freundesliste entfernt`, 'success');
            } else {
                this.showStatus(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error removing friend:', error);
            this.showStatus('❌ Fehler beim Entfernen des Freundes', 'error');
        }
    }

    public async updateFriendTradingPermission(friendshipId: string, canTrade: boolean): Promise<void> {
        console.log('🔧 DEBUG: Updating friend trading permission:', friendshipId, canTrade);
        
        if (!this.currentUser) {
            this.showStatus('❌ Nicht angemeldet', 'error');
            return;
        }
        
        try {
            const result = await this.friendshipService.updateFriendshipMetadata(
                friendshipId, 
                this.currentUser.uid,
                { canTrade }
            );
            if (result.success) {
                this.showStatus(
                    canTrade 
                        ? '✅ Du erlaubst jetzt Handel mit diesem Freund' 
                        : '❌ Du verbietest jetzt Handel mit diesem Freund', 
                    'success'
                );
            } else {
                this.showStatus(`❌ ${result.error}`, 'error');
                
                // Revert toggle on error
                const toggle = document.getElementById(`trade-toggle-${friendshipId}`) as HTMLInputElement;
                if (toggle) {
                    toggle.checked = !canTrade;
                }
            }
        } catch (error) {
            console.error('❌ Error updating friend trading permission:', error);
            this.showStatus('❌ Fehler beim Aktualisieren der Handel-Berechtigung', 'error');
            
            // Revert toggle on error
            const toggle = document.getElementById(`trade-toggle-${friendshipId}`) as HTMLInputElement;
            if (toggle) {
                toggle.checked = !canTrade;
            }
        }
    }

    private clearNavigationBadge(): void {
        const badge = document.getElementById('friends-badge');
        if (badge) {
            badge.classList.add('hidden');
            console.log('🔔 Navigation badge cleared (user viewing Friends tab)');
        }
    }

    private renderTradeButton(friend: any): string {
        const canInitiateTrade = friend.iAllowTrading && friend.friendAllowsTrading;
        const tradeButtonClass = canInitiateTrade ? 'trade-btn' : 'trade-btn disabled';
        const tradeButtonTitle = canInitiateTrade 
            ? 'Tauschanfrage senden'
            : !friend.iAllowTrading 
                ? 'Du erlaubst keinen Handel mit diesem Freund'
                : 'Freund erlaubt keinen Handel';
        
        return `
            <button class="${tradeButtonClass}" 
                    title="${tradeButtonTitle}"
                    ${!canInitiateTrade ? 'disabled' : ''}
                    onclick="window.friendsTab.initiateTrade('${friend.uid}', '${friend.nickname}')">
                🔄 Tauschen
            </button>
        `;
    }

    public initiateTrade(friendUid: string, friendNickname: string): void {
        console.log('🔄 Initiating trade with:', friendNickname);
        
        // Get the game instance from window
        const game = (window as any).game;
        if (!game || !game.switchTab) {
            console.error('❌ Game not available');
            this.showStatus('❌ Spiel nicht verfügbar', 'error');
            return;
        }

        // Switch to collection tab and activate trading mode
        game.switchTab('collection');
        
        // Wait for tab switch, then activate trading mode
        setTimeout(() => {
            if (game.collectionManager) {
                // Activate trading mode if not already active
                if (!game.collectionManager.tradingModeActive) {
                    game.collectionManager.toggleTradingMode();
                }
                
                // Show instruction to user
                game.ui.showSaveIndicator(
                    `🔄 Trading-Modus aktiviert! Wähle Karten aus und klicke auf "Trading-Anfrage senden" um mit ${friendNickname} zu handeln.`, 
                    'success'
                );
            }
        }, 300);
    }

    private getTradeStatusText(status: string, isIncoming: boolean): string {
        switch (status) {
            case 'pending':
                return isIncoming ? '⏳ Wartet auf deine Antwort' : '📤 Gesendet, wartet auf Antwort';
            case 'responded':
                return isIncoming ? '💱 Du hast geantwortet' : '✅ Partner hat geantwortet';
            case 'accepted':
                return '✅ Tausch abgeschlossen';
            case 'declined':
                return '❌ Tausch abgelehnt';
            case 'cancelled':
                return '🚫 Tausch abgebrochen';
            case 'expired':
                return '⏰ Tausch verfallen';
            default:
                return `❓ Status: ${status}`;
        }
    }

    private renderTradeActions(trade: TradeRequest, isIncoming: boolean): string {
        const tradeId = trade.id;
        
        switch (trade.status) {
            case 'pending':
                if (isIncoming) {
                    // Incoming pending trade - receiver can respond or decline
                    return `
                        <button class="accept-btn" onclick="window.friendsTab.viewTradeRequest('${tradeId}')">
                            👁️ Ansehen & Antworten
                        </button>
                        <button class="decline-btn" onclick="window.friendsTab.declineTradeRequest('${tradeId}')">
                            ❌ Ablehnen
                        </button>
                    `;
                } else {
                    // Outgoing pending trade - initiator can cancel
                    return `
                        <button class="cancel-btn" onclick="window.friendsTab.cancelTradeRequest('${tradeId}')">
                            🚫 Abbrechen
                        </button>
                    `;
                }
            
            case 'responded':
                if (!isIncoming) {
                    // Initiator sees response and can accept/decline
                    return `
                        <button class="accept-btn" onclick="window.friendsTab.viewTradeResponse('${tradeId}')">
                            👁️ Antwort ansehen
                        </button>
                        <button class="decline-btn" onclick="window.friendsTab.finalizeTradeRequest('${tradeId}', false)">
                            ❌ Ablehnen
                        </button>
                    `;
                } else {
                    // Receiver has responded, waiting for initiator
                    return `
                        <span class="trade-waiting">⏳ Wartet auf Entscheidung</span>
                    `;
                }
            
            case 'accepted':
            case 'declined':
            case 'cancelled':
            case 'expired':
                return `
                    <button class="friend-action-btn" onclick="window.friendsTab.removeTradeRequest('${tradeId}')">
                        🗑️ Entfernen
                    </button>
                `;
            
            default:
                return '';
        }
    }

    // Trade Request Action Methods
    public async viewTradeRequest(tradeId: string): Promise<void> {
        console.log('🔄 Viewing trade request:', tradeId);
        
        const trade = this.pendingTrades.find(t => t.id === tradeId);
        if (!trade) {
            console.error('Trade not found:', tradeId);
            this.showStatus('❌ Tauschanfrage nicht gefunden', 'error');
            return;
        }

        const modal = document.getElementById('trade-response-modal') as HTMLElement;
        if (!modal) {
            console.error('Trade response modal not found');
            this.showStatus('❌ Modal nicht gefunden', 'error');
            return;
        }

        console.log('🔧 DEBUG: Trade modal found, setting up...');

        // Set trade data
        modal.setAttribute('data-trade-id', tradeId);

        // Update title with partner name
        const titleElement = modal.querySelector('#trade-response-title') as HTMLElement;
        if (titleElement) {
            titleElement.textContent = `🔄 Tauschanfrage von ${trade.initiator.nickname}`;
        }

        const partnerNameElement = modal.querySelector('#trade-partner-name') as HTMLElement;
        if (partnerNameElement) {
            partnerNameElement.textContent = trade.initiator.nickname;
        }

        // Show initiator's offer
        const offeredGrid = modal.querySelector('#offered-cards-display') as HTMLElement;
        if (offeredGrid) {
            this.renderTradeCards(offeredGrid, trade.initiator.offeredCards);
        }

        // Show current user's cards for response
        this.displayResponseCards();

        // Show selection instructions
        const game = (window as any).game;
        if (game?.ui?.showSaveIndicator) {
            const cardCount = trade.initiator.offeredCards.length;
            game.ui.showSaveIndicator(
                `📝 Wähle genau ${cardCount} Karten aus, um ein Gegenangebot zu erstellen`, 
                'info'
            );
        }

        // Setup modal event listeners
        this.setupTradeResponseModalListeners();

        // Initialize button state
        this.updateTradeResponseButton();

        // Show modal (remove hidden class, add show class, and set display)
        modal.classList.remove('hidden');
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        console.log('🔧 DEBUG: Modal should now be visible');
        console.log('🔧 DEBUG: Modal classes:', modal.className);
        console.log('🔧 DEBUG: Modal display style:', modal.style.display);
    }

    public async viewTradeResponse(tradeId: string): Promise<void> {
        console.log('🔄 Viewing trade response:', tradeId);
        
        const trade = this.pendingTrades.find(t => t.id === tradeId);
        if (!trade) {
            console.error('Trade not found:', tradeId);
            this.showStatus('❌ Tauschanfrage nicht gefunden', 'error');
            return;
        }

        const modal = document.getElementById('trade-finalize-modal') as HTMLElement;
        if (!modal) {
            console.error('Trade finalize modal not found');
            this.showStatus('❌ Modal nicht gefunden', 'error');
            return;
        }

        // Set trade data
        modal.setAttribute('data-trade-id', tradeId);

        // Update modal title
        const titleElement = modal.querySelector('#trade-finalize-title') as HTMLElement;
        if (titleElement) {
            titleElement.textContent = `🔄 Antwort von ${trade.receiver.nickname}`;
        }

        // Update partner name
        const partnerNameElement = modal.querySelector('#finalize-partner-name') as HTMLElement;
        if (partnerNameElement) {
            partnerNameElement.textContent = trade.receiver.nickname;
        }

        // Show both card sets
        const myCardsGrid = modal.querySelector('#my-final-cards-display') as HTMLElement;
        const theirCardsGrid = modal.querySelector('#their-final-cards-display') as HTMLElement;
        
        console.log('🔧 DEBUG: Modal grids found:', !!myCardsGrid, !!theirCardsGrid);
        console.log('🔧 DEBUG: Trade data:', {
            initiator: trade.initiator.nickname,
            receiver: trade.receiver.nickname,
            currentUser: this.currentUser?.nickname,
            tradeStatus: trade.status,
            initiatorCards: trade.initiator.offeredCards?.length || 0,
            receiverCards: trade.receiver.requestedCards?.length || 0
        });
        
        if (myCardsGrid && theirCardsGrid) {
            // Check if trade has been responded to
            if (trade.status === 'responded') {
                // Trade has response - show both card sets
                // "Ich gebe:" = my original offered cards
                // "[Friend] gibt:" = their response cards
                this.renderTradeCards(myCardsGrid, trade.initiator.offeredCards);
                this.renderTradeCards(theirCardsGrid, trade.receiver.requestedCards || []);
            } else {
                // Trade is still pending - show message
                console.log('🔧 DEBUG: Trade is still pending, no response cards available');
                myCardsGrid.innerHTML = '<div class="no-cards-message">⏳ Warte auf Antwort des Partners</div>';
                theirCardsGrid.innerHTML = '<div class="no-cards-message">📭 Noch keine Antwort erhalten</div>';
                
                // Hide value comparison for pending trades
                const modal = document.getElementById('trade-finalize-modal') as HTMLElement;
                const valueSection = modal.querySelector('.value-comparison') as HTMLElement;
                if (valueSection) {
                    valueSection.style.display = 'none';
                }
                return;
            }
            
            console.log('🔧 DEBUG: Rendered cards:', {
                myCards: trade.initiator.offeredCards?.length || 0,
                theirCards: trade.receiver.requestedCards?.length || 0
            });
        } else {
            console.error('❌ Modal grids not found');
        }

        // Calculate and display value comparison
        this.displayValueComparison(trade.initiator.offeredCards, trade.receiver.requestedCards || []);

        // Setup modal event listeners
        this.setupTradeFinalizeModalListeners();

        // Show modal (remove hidden class, add show class, and set display)
        modal.classList.remove('hidden');
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        console.log('🔧 DEBUG: Trade finalize modal should now be visible');
        console.log('🔧 DEBUG: Modal classes:', modal.className);
        console.log('🔧 DEBUG: Modal display style:', modal.style.display);
    }

    public async declineTradeRequest(tradeId: string): Promise<void> {
        console.log('🔄 Declining trade request:', tradeId);
        
        // Find the trade to determine user role
        const trade = this.pendingTrades.find(t => t.id === tradeId);
        if (!trade) {
            console.error('Trade not found:', tradeId);
            this.showStatus('❌ Tauschanfrage nicht gefunden', 'error');
            return;
        }
        
        const isReceiver = trade.receiver.uid === this.currentUser?.uid;
        const isInitiator = trade.initiator.uid === this.currentUser?.uid;
        
        console.log('🔧 DEBUG: Decline trade request context:', {
            tradeId,
            isReceiver,
            isInitiator,
            currentUserUid: this.currentUser?.uid,
            tradeStatus: trade.status
        });
        
        try {
            if (isReceiver && trade.status === 'pending') {
                // Receiver declining incoming trade request - use new declineTradeRequest method
                const result = await this.tradingService.declineTradeRequest(
                    tradeId,
                    this.currentUser?.uid || ''
                );
                
                if (result.success) {
                    this.showStatus('❌ Tauschanfrage abgelehnt', 'success');
                } else {
                    this.showStatus(`❌ ${result.error}`, 'error');
                }
            } else if (isInitiator) {
                // Initiator declining their own trade or finalizing a response
                const result = await this.tradingService.finalizeTradeRequest(
                    tradeId,
                    this.currentUser?.uid || '',
                    false // decline
                );
                
                if (result.success) {
                    this.showStatus('❌ Tauschanfrage abgelehnt', 'success');
                } else {
                    this.showStatus(`❌ ${result.error}`, 'error');
                }
            } else {
                // User is not authorized for this action
                console.error('❌ User not authorized to decline this trade');
                this.showStatus('❌ Du bist nicht berechtigt diese Tauschanfrage abzulehnen', 'error');
            }
        } catch (error) {
            console.error('❌ Error declining trade request:', error);
            this.showStatus('❌ Fehler beim Ablehnen der Tauschanfrage', 'error');
        }
    }

    public async cancelTradeRequest(tradeId: string): Promise<void> {
        console.log('🔄 Canceling trade request:', tradeId);
        
        try {
            const result = await this.tradingService.cancelTradeRequest(
                tradeId,
                this.currentUser?.uid || ''
            );
            
            if (result.success) {
                this.showStatus('🚫 Tauschanfrage abgebrochen', 'success');
            } else {
                this.showStatus(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error canceling trade request:', error);
            this.showStatus('❌ Fehler beim Abbrechen der Tauschanfrage', 'error');
        }
    }

    public async finalizeTradeRequest(tradeId: string, accept: boolean): Promise<void> {
        console.log('🔄 Finalizing trade request:', tradeId, 'accept:', accept);
        
        try {
            const result = await this.tradingService.finalizeTradeRequest(
                tradeId,
                this.currentUser?.uid || '',
                accept
            );
            
            if (result.success) {
                this.showStatus(
                    accept ? '✅ Tausch erfolgreich abgeschlossen!' : '❌ Tausch abgelehnt', 
                    'success'
                );
            } else {
                this.showStatus(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error finalizing trade request:', error);
            this.showStatus('❌ Fehler beim Finalisieren der Tauschanfrage', 'error');
        }
    }

    public async removeTradeRequest(tradeId: string): Promise<void> {
        console.log('🔄 Removing trade request from UI:', tradeId);
        // This is just a UI action to hide completed/expired trades
        // The actual trade document remains in Firestore for history
        this.showStatus('🗑️ Tauschanfrage aus Liste entfernt', 'info');
        
        // Hide the trade request element
        const tradeElements = document.querySelectorAll('.trade-request-item');
        tradeElements.forEach(element => {
            const buttons = element.querySelectorAll('button[onclick*="' + tradeId + '"]');
            if (buttons.length > 0) {
                (element as HTMLElement).style.display = 'none';
            }
        });
    }

    // Trading modal helper methods
    private renderTradeCards(container: HTMLElement, cards: any[]): void {
        if (!container) {
            console.error('❌ renderTradeCards: Container not found');
            return;
        }
        
        console.log('🔧 DEBUG: renderTradeCards called with:', {
            containerID: container.id,
            cardsLength: cards?.length || 0,
            cards: cards
        });
        
        container.innerHTML = '';
        
        if (!cards || cards.length === 0) {
            console.log('🔧 DEBUG: No cards to render');
            return;
        }
        
        cards.forEach((card, index) => {
            console.log(`🔧 DEBUG: Rendering card ${index}:`, card);
            const cardEl = this.createTradeCardElement(card);
            container.appendChild(cardEl);
        });
        
        console.log('🔧 DEBUG: Finished rendering', cards.length, 'cards to', container.id);
    }

    private createTradeCardElement(card: any): HTMLElement {
        const cardEl = document.createElement('div');
        cardEl.className = 'trade-card monster-card';
        
        // Use only card.id for consistency
        const cardId = card.id;
        console.log('🔧 DEBUG: createTradeCardElement - Card:', {
            name: card.name,
            id: card.id,
            finalId: cardId
        });
        
        cardEl.setAttribute('data-card-id', cardId);
        
        // Add rarity class for styling
        if (card.rarity) {
            cardEl.classList.add(`rarity-${card.rarity.toLowerCase()}`);
        }
        
        cardEl.innerHTML = `
            <div class="monster-card-inner">
                <div class="monster-emoji">${card.emoji || '🐾'}</div>
                <div class="monster-name">${card.name}</div>
                <div class="monster-rarity">${card.rarity || 'Common'}</div>
                <div class="monster-stats">
                    <div class="stat">
                        <span class="stat-icon">⚔️</span>
                        <span class="stat-value">${card.attack || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-icon">🛡️</span>
                        <span class="stat-value">${card.defense || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-icon">❤️</span>
                        <span class="stat-value">${card.health || 0}</span>
                    </div>
                </div>
                ${card.element ? `<div class="monster-element">${card.element}</div>` : ''}
            </div>
        `;
        
        return cardEl;
    }

    private displayResponseCards(): void {
        const modal = document.getElementById('trade-response-modal') as HTMLElement;
        const responseGrid = modal.querySelector('#my-response-cards') as HTMLElement;

        if (!responseGrid) {
            console.log('🔧 DEBUG: Response grid not found');
            return;
        }

        // Get collectionManager and game dynamically
        const game = (window as any).game;
        const collectionManager = game?.collectionManager;

        if (!collectionManager || !game?.collection) {
            console.log('🔧 DEBUG: Collection manager or collection not found');
            console.log('🔧 DEBUG: Game object:', game);
            console.log('🔧 DEBUG: Game.collectionManager:', game?.collectionManager);
            console.log('🔧 DEBUG: Game.collection:', game?.collection);
            return;
        }

        console.log('🔧 DEBUG: Displaying response cards...');

        // Get user's collection directly from game.collection
        const collection = game.collection;
        console.log('🔧 DEBUG: User collection size:', collection.length);
        
        // Apply filters
        const rarityFilter = (modal.querySelector('#response-rarity-filter') as HTMLSelectElement)?.value || 'all';
        const searchTerm = (modal.querySelector('#response-search') as HTMLInputElement)?.value?.toLowerCase() || '';

        let filteredCards = collection.filter((card: any) => {
            const matchesRarity = rarityFilter === 'all' || card.rarity.toLowerCase() === rarityFilter;
            const matchesSearch = !searchTerm || 
                card.name.toLowerCase().includes(searchTerm) ||
                (card.type && card.type.toLowerCase().includes(searchTerm));
            return matchesRarity && matchesSearch;
        });

        console.log('🔧 DEBUG: Filtered cards:', filteredCards.length);
        console.log('🔧 DEBUG: Rarity filter:', rarityFilter);
        console.log('🔧 DEBUG: Search term:', searchTerm);

        // Clear and populate response grid
        responseGrid.innerHTML = '';
        filteredCards.forEach((card: any) => {
            console.log('🔧 DEBUG: Adding card to response grid:', {
                name: card.name,
                id: card.id,
                source: 'game.collection'
            });
            const cardEl = this.createSelectableTradeCardElement(card);
            responseGrid.appendChild(cardEl);
        });

        // Store a reference to the filtered cards for later lookup
        (modal as any)._displayedCards = filteredCards;
        console.log('🔧 DEBUG: Stored displayed cards reference with', filteredCards.length, 'cards');

        // Update selected cards display
        this.updateSelectedResponseDisplay();
    }

    private createSelectableTradeCardElement(card: any): HTMLElement {
        const cardEl = this.createTradeCardElement(card);
        cardEl.classList.add('selectable');
        
        // Add selection state
        if (this.selectedResponseCards.includes(card.id)) {
            cardEl.classList.add('selected');
        }
        
        // Add click handler for selection
        cardEl.addEventListener('click', () => this.toggleResponseCard(card.id));
        
        return cardEl;
    }

    private toggleResponseCard(cardId: string): void {
        console.log('🔧 DEBUG: toggleResponseCard called with cardId:', cardId);
        console.log('🔧 DEBUG: Current selectedResponseCards:', this.selectedResponseCards);
        
        const modal = document.getElementById('trade-response-modal') as HTMLElement;
        const tradeId = modal.getAttribute('data-trade-id');
        const trade = this.pendingTrades.find(t => t.id === tradeId);
        
        if (!trade) return;
        
        const maxCards = trade.initiator.offeredCards.length;
        const index = this.selectedResponseCards.indexOf(cardId);
        
        console.log('🔧 DEBUG: Card selection status:', {
            cardId,
            currentIndex: index,
            maxCards,
            currentlySelected: this.selectedResponseCards.length
        });
        
        if (index > -1) {
            // Remove card from selection
            this.selectedResponseCards.splice(index, 1);
            console.log('🔧 DEBUG: Card REMOVED from selection');
        } else {
            // Add card to selection if under limit
            if (this.selectedResponseCards.length < maxCards) {
                this.selectedResponseCards.push(cardId);
                console.log('🔧 DEBUG: Card ADDED to selection');
            } else {
                // Show limit message
                console.log('🔧 DEBUG: Selection limit reached');
                const game = (window as any).game;
                if (game?.ui?.showSaveIndicator) {
                    game.ui.showSaveIndicator(
                        `⚠️ Du kannst maximal ${maxCards} Karten auswählen (entspricht dem Angebot)`, 
                        'error'
                    );
                }
                return;
            }
        }

        console.log('🔧 DEBUG: New selectedResponseCards:', this.selectedResponseCards);
        
        this.updateSelectedResponseDisplay();
        this.updateResponseCardSelection();
        this.updateTradeResponseButton();
    }

    private updateResponseCardSelection(): void {
        const modal = document.getElementById('trade-response-modal') as HTMLElement;
        const cardElements = modal.querySelectorAll('.trade-card');
        
        cardElements.forEach(cardEl => {
            const cardId = cardEl.getAttribute('data-card-id');
            if (cardId && this.selectedResponseCards.includes(cardId)) {
                cardEl.classList.add('selected');
            } else {
                cardEl.classList.remove('selected');
            }
        });
    }

    private updateSelectedResponseDisplay(): void {
        const modal = document.getElementById('trade-response-modal') as HTMLElement;
        const selectedDisplay = modal.querySelector('.selected-cards-display') as HTMLElement;
        const countDisplay = modal.querySelector('.response-count') as HTMLElement;

        if (!selectedDisplay || !countDisplay) return;

        // Get game and collection dynamically
        const game = (window as any).game;
        const collection = game?.collection;

        if (!collection) {
            console.log('🔧 DEBUG: Collection not found in updateSelectedResponseDisplay');
            return;
        }

        selectedDisplay.innerHTML = '';
        
        this.selectedResponseCards.forEach(cardId => {
            const card = collection.find((c: any) => c.id === cardId);
            if (card) {
                const miniCard = document.createElement('span');
                miniCard.className = 'mini-trade-card';
                miniCard.innerHTML = `${card.emoji} ${card.name}`;
                miniCard.style.cssText = `
                    background: rgba(74, 144, 226, 0.2);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    color: #4a90e2;
                    border: 1px solid rgba(74, 144, 226, 0.3);
                    margin-right: 5px;
                    margin-bottom: 5px;
                    display: inline-block;
                `;
                selectedDisplay.appendChild(miniCard);
            }
        });

        countDisplay.textContent = `${this.selectedResponseCards.length} Karten ausgewählt`;
        
        // Update button state
        this.updateTradeResponseButton();
    }

    private updateTradeResponseButton(): void {
        const modal = document.getElementById('trade-response-modal') as HTMLElement;
        const sendBtn = modal.querySelector('#respond-trade-btn') as HTMLButtonElement;
        const tradeId = modal.getAttribute('data-trade-id');
        const trade = this.pendingTrades.find(t => t.id === tradeId);
        
        if (!sendBtn || !trade) return;
        
        const maxCards = trade.initiator.offeredCards.length;
        const selectedCount = this.selectedResponseCards.length;
        
        // Enable button only if we have selected the same number of cards as offered
        if (selectedCount === maxCards && selectedCount > 0) {
            sendBtn.disabled = false;
            sendBtn.textContent = `💱 ${selectedCount} Karten tauschen`;
        } else {
            sendBtn.disabled = true;
            if (selectedCount === 0) {
                sendBtn.textContent = `💱 Wähle ${maxCards} Karten aus`;
            } else {
                sendBtn.textContent = `💱 ${selectedCount}/${maxCards} Karten gewählt`;
            }
        }
    }

    private displayValueComparison(myCards: any[], theirCards: any[]): void {
        // Simple value calculation based on rarity
        const calculateValue = (cards: any[]): number => {
            return cards.reduce((total, card) => {
                const rarity = card.rarity?.toLowerCase() || 'common';
                switch (rarity) {
                    case 'common': return total + 1;
                    case 'uncommon': return total + 3;
                    case 'rare': return total + 8;
                    case 'epic': return total + 20;
                    case 'legendary': return total + 50;
                    default: return total + 1;
                }
            }, 0);
        };

        const myValue = calculateValue(myCards);
        const theirValue = calculateValue(theirCards);
        const maxValue = Math.max(myValue, theirValue, 1);

        console.log('🔧 DEBUG: Value calculation:', {
            myCards: myCards.map(c => ({ name: c.name, rarity: c.rarity })),
            theirCards: theirCards.map(c => ({ name: c.name, rarity: c.rarity })),
            myValue,
            theirValue
        });

        // Update value bars
        const modal = document.getElementById('trade-finalize-modal') as HTMLElement;
        const myValueBar = modal.querySelector('#my-value-bar') as HTMLElement;
        const theirValueBar = modal.querySelector('#partner-value-bar') as HTMLElement;
        const myValueText = modal.querySelector('#my-value-text') as HTMLElement;
        const theirValueText = modal.querySelector('#partner-value-text') as HTMLElement;
        const fairnessText = modal.querySelector('#fairness-text') as HTMLElement;

        console.log('🔧 DEBUG: Value comparison elements found:', {
            myValueBar: !!myValueBar,
            theirValueBar: !!theirValueBar,
            myValueText: !!myValueText,
            theirValueText: !!theirValueText,
            fairnessText: !!fairnessText
        });

        if (myValueBar && theirValueBar && myValueText && theirValueText && fairnessText) {
            myValueBar.style.width = `${(myValue / maxValue) * 100}%`;
            theirValueBar.style.width = `${(theirValue / maxValue) * 100}%`;
            
            myValueText.textContent = `${myValue} Punkte`;
            theirValueText.textContent = `${theirValue} Punkte`;

            const ratio = Math.min(myValue, theirValue) / Math.max(myValue, theirValue);
            if (ratio >= 0.8) {
                fairnessText.textContent = '✅ Fairer Tausch';
                fairnessText.className = 'fairness-text fair';
            } else {
                fairnessText.textContent = '⚠️ Ungleicher Tausch';
                fairnessText.className = 'fairness-text unfair';
            }
        } else {
            console.error('❌ Value comparison elements not found');
        }
    }

    private setupTradeResponseModalListeners(): void {
        const modal = document.getElementById('trade-response-modal') as HTMLElement;
        if (!modal) return;

        console.log('🔧 DEBUG: Setting up trade response modal listeners');

        // Close button listener - try multiple selectors
        const closeBtn1 = modal.querySelector('.close') as HTMLElement;
        const closeBtn2 = modal.querySelector('.modal-close') as HTMLElement;
        const closeBtn3 = modal.querySelector('[data-close]') as HTMLElement;
        
        console.log('🔧 DEBUG: Close buttons found:', {
            '.close': !!closeBtn1,
            '.modal-close': !!closeBtn2,
            '[data-close]': !!closeBtn3
        });
        
        if (closeBtn1) {
            console.log('🔧 DEBUG: Setting up .close button listener');
            closeBtn1.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 DEBUG: Close button clicked');
                this.closeTradeModal();
            };
        }
        
        if (closeBtn2) {
            console.log('🔧 DEBUG: Setting up .modal-close button listener');
            closeBtn2.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 DEBUG: Modal close button clicked');
                this.closeTradeModal();
            };
        }
        
        if (closeBtn3) {
            console.log('🔧 DEBUG: Setting up [data-close] button listener');
            closeBtn3.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 DEBUG: Data-close button clicked');
                this.closeTradeModal();
            };
        }

        // Filter listeners
        const rarityFilter = modal.querySelector('#response-rarity-filter') as HTMLSelectElement;
        const searchInput = modal.querySelector('#response-search') as HTMLInputElement;
        
        if (rarityFilter) {
            rarityFilter.addEventListener('change', () => this.displayResponseCards());
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', () => this.displayResponseCards());
        }

        // Button listeners
        const sendBtn = modal.querySelector('#respond-trade-btn') as HTMLButtonElement;
        const declineBtn = modal.querySelector('#decline-trade-btn') as HTMLButtonElement;
        const cancelBtn = modal.querySelector('#cancel-response-btn') as HTMLButtonElement;
        
        console.log('🔧 DEBUG: Modal buttons found:', {
            sendBtn: !!sendBtn,
            declineBtn: !!declineBtn,
            cancelBtn: !!cancelBtn
        });
        
        if (sendBtn) {
            sendBtn.onclick = (e) => {
                e.preventDefault();
                this.submitTradeResponse();
            };
        }
        
        if (declineBtn) {
            declineBtn.onclick = (e) => {
                e.preventDefault();
                this.declineTradeFromModal();
            };
        }
        
        if (cancelBtn) {
            console.log('🔧 DEBUG: Setting up cancel button listener');
            cancelBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 DEBUG: Cancel button clicked');
                this.closeTradeModal();
            };
        }

        // Close modal on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                console.log('🔧 DEBUG: Background clicked, closing modal');
                this.closeTradeModal();
            }
        };
        
        // Prevent modal content clicks from closing modal
        const modalContent = modal.querySelector('.modal-content') as HTMLElement;
        if (modalContent) {
            modalContent.onclick = (e: Event) => {
                e.stopPropagation();
            };
        }

        // Escape key listener
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                console.log('🔧 DEBUG: Escape key pressed, closing modal');
                this.closeTradeModal();
            }
        });
    }

    private setupTradeFinalizeModalListeners(): void {
        const modal = document.getElementById('trade-finalize-modal') as HTMLElement;
        if (!modal) return;

        console.log('🔧 DEBUG: Setting up trade finalize modal listeners');

        // Close button listener - try multiple selectors
        const closeBtn1 = modal.querySelector('.close') as HTMLElement;
        const closeBtn2 = modal.querySelector('.modal-close') as HTMLElement;
        const closeBtn3 = modal.querySelector('[data-close]') as HTMLElement;
        
        console.log('🔧 DEBUG: Close buttons found in finalize modal:', {
            '.close': !!closeBtn1,
            '.modal-close': !!closeBtn2,
            '[data-close]': !!closeBtn3
        });
        
        if (closeBtn1) {
            closeBtn1.addEventListener('click', (e) => {
                console.log('🔧 DEBUG: Close button 1 (.close) clicked');
                e.preventDefault();
                e.stopPropagation();
                this.closeTradeModal();
            });
        }
        
        if (closeBtn2) {
            closeBtn2.addEventListener('click', (e) => {
                console.log('🔧 DEBUG: Close button 2 (.modal-close) clicked');
                e.preventDefault();
                e.stopPropagation();
                this.closeTradeModal();
            });
        }
        
        if (closeBtn3) {
            closeBtn3.addEventListener('click', (e) => {
                console.log('🔧 DEBUG: Close button 3 ([data-close]) clicked');
                e.preventDefault();
                e.stopPropagation();
                this.closeTradeModal();
            });
        }

        // Button listeners - use correct IDs from HTML
        const acceptBtn = modal.querySelector('#accept-final-trade-btn') as HTMLButtonElement;
        const declineBtn = modal.querySelector('#decline-final-trade-btn') as HTMLButtonElement;
        const cancelBtn = modal.querySelector('#cancel-finalize-btn') as HTMLButtonElement;
        
        console.log('🔧 DEBUG: Trade finalize buttons found:', {
            acceptBtn: !!acceptBtn,
            declineBtn: !!declineBtn,
            cancelBtn: !!cancelBtn
        });
        
        if (acceptBtn) {
            acceptBtn.addEventListener('click', (e) => {
                console.log('🔧 DEBUG: Accept final trade button clicked');
                e.preventDefault();
                e.stopPropagation();
                this.finalizeTradeAccept();
            });
        }
        
        if (declineBtn) {
            declineBtn.addEventListener('click', (e) => {
                console.log('🔧 DEBUG: Decline final trade button clicked');
                e.preventDefault();
                e.stopPropagation();
                this.finalizeTradeDecline();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                console.log('🔧 DEBUG: Cancel final trade button clicked');
                e.preventDefault();
                e.stopPropagation();
                this.closeTradeModal();
            });
        }

        // Escape key handler
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                console.log('🔧 DEBUG: Escape key pressed in finalize modal');
                this.closeTradeModal();
            }
        };
        
        document.addEventListener('keydown', handleEscape);

        // Close modal on background click
        modal.onclick = (e) => {
            if (e.target === modal) this.closeTradeModal();
        };
    }

    private async submitTradeResponse(): Promise<void> {
        const modal = document.getElementById('trade-response-modal') as HTMLElement;
        const tradeId = modal.getAttribute('data-trade-id');
        
        console.log('🔧 DEBUG: submitTradeResponse called');
        console.log('🔧 DEBUG: TradeId:', tradeId);
        console.log('🔧 DEBUG: Selected response cards:', this.selectedResponseCards);
        
        if (!tradeId || !this.currentUser) {
            this.showStatus('❌ Fehler beim Verarbeiten der Tauschanfrage', 'error');
            return;
        }

        if (this.selectedResponseCards.length === 0) {
            this.showStatus('❌ Bitte wähle mindestens eine Karte aus', 'error');
            return;
        }

        // Get selected cards data - use stored displayed cards first
        const displayedCards = (modal as any)._displayedCards;
        
        console.log('🔧 DEBUG: Displayed cards reference available:', !!displayedCards);
        console.log('🔧 DEBUG: Displayed cards length:', displayedCards?.length || 0);

        let collection = displayedCards;
        
        // Fallback to game collection if stored reference not available
        if (!collection) {
            console.log('🔧 DEBUG: Falling back to game.collection');
            const game = (window as any).game;
            collection = game?.collection;
        }

        console.log('🔧 DEBUG: Using collection with length:', collection?.length || 0);
        
        // Debug: Show card IDs in the collection we're using
        if (collection && collection.length > 0) {
            console.log('🔧 DEBUG: Collection card IDs:', collection.map((c: any) => c.id));
            console.log('🔧 DEBUG: Looking for these selected IDs:', this.selectedResponseCards);
        }
        
        if (!collection) {
            this.showStatus('❌ Sammlung nicht verfügbar', 'error');
            return;
        }
        
        const responseCards = this.selectedResponseCards
            .map(cardId => {
                // Search only by id for consistency
                const card = collection.find((c: any) => c.id === cardId);
                console.log(`🔧 DEBUG: Looking for card ${cardId}:`, card ? 'FOUND' : 'NOT FOUND');
                if (card) {
                    console.log(`🔧 DEBUG: Card details:`, {
                        id: card.id,
                        name: card.name,
                        rarity: card.rarity
                    });
                } else {
                    console.log(`🔧 DEBUG: Card ${cardId} not found in collection of ${collection.length} cards`);
                }
                return card;
            })
            .filter(card => card !== undefined);

        console.log('🔧 DEBUG: Final response cards to send:', responseCards);
        console.log('🔧 DEBUG: Response cards length:', responseCards.length);

        try {
            console.log('🔧 DEBUG: Calling tradingService.respondToTradeRequest...');
            const result = await this.tradingService.respondToTradeRequest(
                tradeId,
                this.currentUser.uid,
                responseCards
            );

            console.log('🔧 DEBUG: TradingService response:', result);

            if (result.success) {
                this.showStatus('✅ Gegenangebot gesendet!', 'success');
                this.closeTradeModal();
                this.selectedResponseCards = []; // Reset selection
            } else {
                this.showStatus(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error submitting trade response:', error);
            this.showStatus('❌ Fehler beim Senden des Gegenangebots', 'error');
        }
    }

    private async finalizeTradeAccept(): Promise<void> {
        const modal = document.getElementById('trade-finalize-modal') as HTMLElement;
        const tradeId = modal.getAttribute('data-trade-id');
        
        if (!tradeId || !this.currentUser) {
            this.showStatus('❌ Fehler beim Verarbeiten der Tauschanfrage', 'error');
            return;
        }

        try {
            const result = await this.tradingService.finalizeTradeRequest(
                tradeId,
                this.currentUser.uid,
                true // accept
            );

            if (result.success) {
                this.showStatus('✅ Tausch erfolgreich abgeschlossen!', 'success');
                this.closeTradeModal();
            } else {
                this.showStatus(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error accepting trade:', error);
            this.showStatus('❌ Fehler beim Annehmen des Tauschs', 'error');
        }
    }

    private async finalizeTradeDecline(): Promise<void> {
        const modal = document.getElementById('trade-finalize-modal') as HTMLElement;
        const tradeId = modal.getAttribute('data-trade-id');
        
        if (!tradeId || !this.currentUser) {
            this.showStatus('❌ Fehler beim Verarbeiten der Tauschanfrage', 'error');
            return;
        }

        try {
            const result = await this.tradingService.finalizeTradeRequest(
                tradeId,
                this.currentUser.uid,
                false // decline
            );

            if (result.success) {
                this.showStatus('❌ Tausch abgelehnt', 'success');
                this.closeTradeModal();
            } else {
                this.showStatus(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error declining trade:', error);
            this.showStatus('❌ Fehler beim Ablehnen des Tauschs', 'error');
        }
    }

    private closeTradeModal(): void {
        console.log('🔧 DEBUG: closeTradeModal() called');
        
        // Close trade response modal
        const responseModal = document.getElementById('trade-response-modal') as HTMLElement;
        if (responseModal) {
            console.log('🔧 DEBUG: Closing response modal');
            console.log('🔧 DEBUG: Response modal classes before:', responseModal.className);
            
            responseModal.classList.remove('show');
            responseModal.classList.add('hidden');
            responseModal.style.display = 'none';
            
            console.log('🔧 DEBUG: Response modal classes after:', responseModal.className);
            console.log('🔧 DEBUG: Response modal closed');
        }
        
        // Close trade finalize modal
        const finalizeModal = document.getElementById('trade-finalize-modal') as HTMLElement;
        if (finalizeModal) {
            console.log('🔧 DEBUG: Closing finalize modal');
            console.log('🔧 DEBUG: Finalize modal classes before:', finalizeModal.className);
            
            finalizeModal.classList.remove('show');
            finalizeModal.classList.add('hidden');
            finalizeModal.style.display = 'none';
            
            console.log('🔧 DEBUG: Finalize modal classes after:', finalizeModal.className);
            console.log('🔧 DEBUG: Finalize modal closed');
        }
        
        // Reset selected cards
        console.log('🔧 DEBUG: Resetting selected cards');
        this.selectedResponseCards = [];
        this.updateSelectedResponseDisplay();
        
        console.log('🔧 DEBUG: Modal should now be hidden - closeTradeModal() complete');
    }

    private async declineTradeFromModal(): Promise<void> {
        const modal = document.getElementById('trade-response-modal') as HTMLElement;
        const tradeId = modal.getAttribute('data-trade-id');
        
        if (!tradeId) {
            this.showStatus('❌ Fehler beim Ablehnen der Tauschanfrage', 'error');
            return;
        }
        
        // Use existing decline method
        await this.declineTradeRequest(tradeId);
        this.closeTradeModal();
    }

    private getStyles(): string {
        return `
            <style>
                .friends-section {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid #333;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 20px;
                }

                .section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 15px;
                }

                .section-header h3 {
                    margin: 0;
                    color: #fff;
                    font-size: 18px;
                }

                .section-description {
                    color: #aaa;
                    font-size: 14px;
                    margin: 5px 0;
                }

                .badge {
                    background: #4a90e2;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .friend-code-display {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .friend-code-box {
                    flex: 1;
                    background: rgba(0, 0, 0, 0.5);
                    border: 2px solid #4a90e2;
                    border-radius: 8px;
                    padding: 15px;
                    text-align: center;
                }

                .friend-code {
                    font-size: 24px;
                    font-weight: 700;
                    color: #4a90e2;
                    letter-spacing: 3px;
                    font-family: 'Courier New', monospace;
                }

                .copy-btn {
                    background: #4a90e2;
                    color: white;
                    border: none;
                    padding: 15px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s;
                }

                .copy-btn:hover {
                    background: #357ABD;
                    transform: translateY(-2px);
                }

                .input-group {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 15px;
                }

                .input-group input {
                    flex: 1;
                    padding: 12px;
                    background: rgba(0, 0, 0, 0.5);
                    border: 1px solid #333;
                    border-radius: 6px;
                    color: white;
                    font-size: 16px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    text-align: center;
                }

                .input-group input:focus {
                    border-color: #4a90e2;
                    outline: none;
                }

                .search-btn {
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s;
                }

                .search-btn:hover {
                    background: #218838;
                }

                .search-result {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid #444;
                    border-radius: 6px;
                    padding: 15px;
                    margin-top: 10px;
                }

                .friend-preview {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 15px;
                }

                .friend-info h4 {
                    margin: 0 0 5px 0;
                    color: #fff;
                }

                .friend-email, .friend-code {
                    margin: 0;
                    color: #aaa;
                    font-size: 14px;
                }

                .friend-request-btn {
                    background: #4a90e2;
                    color: white;
                    border: none;
                    padding: 10px 15px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s;
                    white-space: nowrap;
                }

                .friend-request-btn:hover {
                    background: #357ABD;
                }

                .loading, .no-result, .error, .no-requests, .no-friends {
                    text-align: center;
                    color: #aaa;
                    padding: 20px;
                    font-style: italic;
                }

                .status-message {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    z-index: 1000;
                    transition: all 0.3s;
                }

                .status-message.success {
                    background: #28a745;
                    color: white;
                }

                .status-message.error {
                    background: #dc3545;
                    color: white;
                }

                .status-message.info {
                    background: #17a2b8;
                    color: white;
                }

                .hidden {
                    display: none !important;
                }

                /* Friend Request Styles */
                .friend-request-item, .friend-item, .trade-request-item {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid #444;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .request-info, .friend-info, .trade-info {
                    flex: 1;
                }

                .request-info h4, .friend-info h4, .trade-info h4 {
                    margin: 0 0 5px 0;
                    color: #fff;
                    font-size: 16px;
                }

                .request-email, .request-code, .request-type, .request-date,
                .friend-email, .friend-code, .friend-status, .friend-active,
                .trade-type, .trade-status, .trade-cards, .trade-date {
                    margin: 2px 0;
                    color: #aaa;
                    font-size: 14px;
                }

                .request-actions, .friend-actions, .trade-actions {
                    display: flex;
                    gap: 10px;
                    flex-shrink: 0;
                }

                .accept-btn, .decline-btn, .cancel-btn, .friend-action-btn {
                    padding: 8px 12px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.3s;
                }

                .accept-btn {
                    background: #28a745;
                    color: white;
                }

                .accept-btn:hover {
                    background: #218838;
                }

                .decline-btn, .cancel-btn {
                    background: #dc3545;
                    color: white;
                }

                .decline-btn:hover, .cancel-btn:hover {
                    background: #c82333;
                }

                .friend-action-btn {
                    background: #6c757d;
                    color: white;
                }

                .friend-action-btn:hover {
                    background: #5a6268;
                }

                .trade-btn {
                    background: #4a90e2;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.3s;
                }

                .trade-btn:hover:not(:disabled) {
                    background: #357ABD;
                    transform: translateY(-1px);
                }

                .trade-btn.disabled,
                .trade-btn:disabled {
                    background: #666;
                    cursor: not-allowed;
                    opacity: 0.6;
                }

                .trade-btn.disabled:hover,
                .trade-btn:disabled:hover {
                    transform: none;
                    background: #666;
                }

                /* Friend-level Trading Controls */
                .friend-trading-settings {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .friend-toggle-setting {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                }

                .friend-toggle-setting .toggle-label {
                    font-size: 13px;
                    color: #bbb;
                    font-weight: 500;
                }

                .friend-toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 24px;
                }

                .friend-toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .friend-toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #444;
                    transition: 0.3s;
                    border-radius: 24px;
                }

                .friend-toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }

                input:checked + .friend-toggle-slider {
                    background-color: #4a90e2;
                }

                input:focus + .friend-toggle-slider {
                    box-shadow: 0 0 1px #4a90e2;
                }

                input:checked + .friend-toggle-slider:before {
                    transform: translateX(20px);
                }

                /* Trading Status Display */
                .friend-trading-status {
                    margin-top: 8px;
                }

                .trading-status {
                    font-size: 12px;
                    font-weight: 500;
                    padding: 4px 8px;
                    border-radius: 4px;
                    display: inline-block;
                }

                .trading-status.allowed {
                    background: rgba(76, 175, 80, 0.2);
                    color: #4CAF50;
                    border: 1px solid rgba(76, 175, 80, 0.3);
                }

                .trading-status.blocked {
                    background: rgba(244, 67, 54, 0.2);
                    color: #f44336;
                    border: 1px solid rgba(244, 67, 54, 0.3);
                }

                /* No cards message */
                .no-cards-message {
                    color: #aaa;
                    text-align: center;
                    padding: 20px;
                    font-style: italic;
                    border: 2px dashed #444;
                    border-radius: 8px;
                    background: rgba(0, 0, 0, 0.2);
                }

                /* Trade Request Specific Styles */
                .trade-waiting {
                    color: #ffa500;
                    font-style: italic;
                    padding: 8px 12px;
                    background: rgba(255, 165, 0, 0.1);
                    border-radius: 6px;
                    border: 1px solid rgba(255, 165, 0, 0.3);
                }

                @media (max-width: 768px) {
                    .friend-code-display {
                        flex-direction: column;
                    }
                    
                    .friend-preview {
                        flex-direction: column;
                        text-align: center;
                    }
                }
            </style>
        `;
    }

    // Cleanup subscriptions when component is destroyed
    public cleanup(): void {
        console.log('🔧 DEBUG: Cleaning up FriendsTab subscriptions');
        
        if (this.currentUser) {
            // Cleanup trading service listeners
            if (this.tradingService && typeof this.tradingService.unsubscribeAll === 'function') {
                this.tradingService.unsubscribeAll();
            }
            
            // Cleanup friendship service listeners  
            if (this.friendshipService && typeof this.friendshipService.unsubscribe === 'function') {
                this.friendshipService.unsubscribe();
            }
        }
    }
}