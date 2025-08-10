import { AuthService } from '../services/AuthService.js';
import { DatabaseService } from '../services/DatabaseService.js';
import { FriendshipService } from '../services/FriendshipService.js';
import { notificationService } from '../services/NotificationService.js';
import type { UserProfile } from '../types.js';

export class FriendsTab {
    private authService: AuthService;
    private databaseService: DatabaseService;
    private friendshipService: FriendshipService;
    private currentUser: UserProfile | null = null;

    constructor() {
        this.authService = new AuthService();
        this.databaseService = new DatabaseService();
        this.friendshipService = new FriendshipService();
        
        // Listen to auth state changes
        this.authService.onAuthStateChange((authState) => {
            this.currentUser = authState.user;
            // Always re-initialize when auth state changes
            this.initialize();
        });
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
        
        // Load and display friend requests and friends
        console.log('🔧 DEBUG: Loading friend requests and friends...');
        this.loadFriendRequests();
        this.loadFriends();
        
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
                document.getElementById('friend-code-input')?.value.trim().toUpperCase() || ''
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
                    friendCode: friendData.friendCode
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
                </div>
                <div class="friend-actions">
                    <button class="friend-action-btn" onclick="window.friendsTab.removeFriend('${friend.friendshipId}', '${friend.nickname}')">
                        🗑️ Entfernen
                    </button>
                </div>
            </div>
        `).join('');
        
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

    private clearNavigationBadge(): void {
        const badge = document.getElementById('friends-badge');
        if (badge) {
            badge.classList.add('hidden');
            console.log('🔔 Navigation badge cleared (user viewing Friends tab)');
        }
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
                .friend-request-item, .friend-item {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid #444;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .request-info, .friend-info {
                    flex: 1;
                }

                .request-info h4, .friend-info h4 {
                    margin: 0 0 5px 0;
                    color: #fff;
                    font-size: 16px;
                }

                .request-email, .request-code, .request-type, .request-date,
                .friend-email, .friend-code, .friend-status, .friend-active {
                    margin: 2px 0;
                    color: #aaa;
                    font-size: 14px;
                }

                .request-actions, .friend-actions {
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
}