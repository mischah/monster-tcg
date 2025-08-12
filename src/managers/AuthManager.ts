import { AuthService } from '../services/AuthService.js';
import { LoginModal } from '../ui/LoginModal.js';
import { UserProfileModal } from '../ui/UserProfileModal.js';
import { notificationService } from '../services/NotificationService.js';
import type { AuthState, UserProfile, GameManagerType } from '../types.js';

export class AuthManager {
    private game: GameManagerType;
    private authService: AuthService;
    private loginModal: LoginModal;
    private userProfileModal: UserProfileModal;
    private authStateUnsubscribe: (() => void) | null = null;

    constructor(game: GameManagerType) {
        this.game = game;
        this.authService = new AuthService();
        this.loginModal = new LoginModal(this.authService);
        this.userProfileModal = new UserProfileModal();
        
        this.initializeAuthFlow();
        this.setupAuthStateListener();
        
        // Add login modal styles
        LoginModal.addLoginStyles();
    }

    private initializeAuthFlow(): void {
        // Check if we're completing an email link sign-in
        if (this.isCompletingEmailLinkSignIn()) {
            this.handleEmailLinkCompletion();
        } else if (!this.authService.isAuthenticated() && !this.authService.isLoading()) {
            // Show login modal if not authenticated
            setTimeout(() => {
                this.showLogin();
            }, 1000);
        }
    }

    private setupAuthStateListener(): void {
        this.authStateUnsubscribe = this.authService.onAuthStateChange((authState: AuthState) => {
            this.handleAuthStateChange(authState);
        });
    }

    private handleAuthStateChange(authState: AuthState): void {
        if (authState.isAuthenticated && authState.user) {
            this.onUserAuthenticated(authState.user);
        } else if (!authState.isLoading && !authState.isAuthenticated) {
            this.onUserUnauthenticated();
        }

        // Update UI based on auth state
        this.updateAuthUI(authState);
    }

    private onUserAuthenticated(user: UserProfile): void {
        console.log('🔓 User authenticated:', user.email);
        
        // Close login modal if open
        this.closeLoginModal();
        
        // Initialize user-specific game data
        this.initializeUserGameData(user);
        
        // Setup real-time sync
        this.setupRealTimeSync(user);
        
        // Start cross-browser notification listener
        notificationService.startTempNotificationListener(user.uid);
        
        // Show welcome message
        this.showWelcomeMessage(user);
        
        // Switch to user profile or collection tab
        setTimeout(() => {
            this.game.switchTab('collection');
        }, 1000);
    }

    private onUserUnauthenticated(): void {
        console.log('🔒 User unauthenticated');
        
        // Stop real-time sync
        this.stopRealTimeSync();
        
        // Stop cross-browser notification listener
        notificationService.stopTempNotificationListener();
        
        // Clear any user-specific data
        this.clearUserGameData();
        
        // Show login modal after a delay
        setTimeout(() => {
            if (!this.authService.isAuthenticated()) {
                this.showLogin();
            }
        }, 500);
    }

    private async initializeUserGameData(user: UserProfile): Promise<void> {
        try {
            console.log('🎮 Initializing user game data for:', user.email);
            
            // Check if user profile exists in database
            const databaseService = new (await import('../services/DatabaseService.js')).DatabaseService();
            const existingProfile = await databaseService.getUserProfile(user.uid);
            
            if (!existingProfile || !existingProfile.email) {
                console.log('🔄 Creating complete user profile in database...');
                
                // Create initial game data
                const initialGameData = {
                    coins: this.game.coins,
                    collection: this.game.collection.map((card: any) => {
                        if (typeof card.toData === 'function') {
                            return card.toData();
                        }
                        return card;
                    }),
                    deck: this.game.deck.map((card: any) => {
                        if (typeof card.toData === 'function') {
                            return card.toData();
                        }
                        return card;
                    }),
                    lastSaved: new Date().toISOString()
                };
                
                // Create complete user profile
                await databaseService.createUserProfile(user, initialGameData);
                console.log('✅ User profile created successfully');
            } else {
                console.log('✅ User profile already exists');
            }
            
        } catch (error) {
            console.error('Failed to initialize user game data:', error);
        }
    }

    private clearUserGameData(): void {
        // Clear any user-specific data
        console.log('🧹 Clearing user game data');
    }

    private updateAuthUI(authState: AuthState): void {
        // Update header to show user info or login button
        this.updateHeaderAuthSection(authState);
        
        // Update navigation based on auth state
        this.updateNavigationAuth(authState);
    }

    private updateHeaderAuthSection(authState: AuthState): void {
        let authSection = document.getElementById('auth-section');
        
        if (!authSection) {
            // Create auth section in header
            const headerStats = document.querySelector('.header-stats');
            if (headerStats) {
                authSection = document.createElement('div');
                authSection.id = 'auth-section';
                authSection.className = 'auth-section';
                headerStats.appendChild(authSection);
            }
        }

        if (!authSection) return;

        if (authState.isLoading) {
            authSection.innerHTML = `
                <div class="auth-status loading">
                    <span>⏳ Laden...</span>
                </div>
            `;
        } else if (authState.isAuthenticated && authState.user) {
            authSection.innerHTML = `
                <div class="auth-status authenticated">
                    <div class="user-info">
                        <span class="user-email">👤 ${authState.user.email}</span>
                        <button id="user-profile-btn" class="profile-btn" title="Profil anzeigen">⚙️</button>
                        <button id="logout-btn" class="logout-btn" title="Abmelden">↗️</button>
                    </div>
                </div>
            `;
            
            // Add event listeners
            const profileBtn = authSection.querySelector('#user-profile-btn');
            const logoutBtn = authSection.querySelector('#logout-btn');
            
            if (profileBtn) {
                profileBtn.addEventListener('click', () => {
                    this.showUserProfile();
                });
            }
            
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    this.logout();
                });
            }
            
        } else {
            authSection.innerHTML = `
                <div class="auth-status unauthenticated">
                    <button id="login-btn" class="login-btn">🔑 Login</button>
                </div>
            `;
            
            // Add event listener
            const loginBtn = authSection.querySelector('#login-btn');
            if (loginBtn) {
                loginBtn.addEventListener('click', () => {
                    this.showLogin();
                });
            }
        }
    }

    private updateNavigationAuth(authState: AuthState): void {
        console.log('🔧 DEBUG: updateNavigationAuth called, isAuthenticated:', authState.isAuthenticated);
        
        // Add profile tab if authenticated
        const gameNav = document.querySelector('.game-nav');
        if (!gameNav) {
            console.log('🔧 DEBUG ERROR: gameNav not found!');
            return;
        }

        let friendsBtn = gameNav.querySelector('[data-tab="friends"]');
        console.log('🔧 DEBUG: Existing friends button:', !!friendsBtn);
        
        if (authState.isAuthenticated && !friendsBtn) {
            console.log('🔧 DEBUG: Creating friends button');
            friendsBtn = document.createElement('button');
            friendsBtn.className = 'nav-btn';
            friendsBtn.setAttribute('data-tab', 'friends');
            friendsBtn.innerHTML = '👥 Freunde <span id="friends-badge" class="nav-badge hidden">0</span>';
            gameNav.appendChild(friendsBtn);
            console.log('🔧 DEBUG: Friends button created and added to DOM');
            
            // DIRECT TEST: Add a specific click listener just for Friends button
            friendsBtn.addEventListener('click', (e) => {
                console.log('🚨 DIRECT TEST: Friends button clicked!', e);
                
                // WORKAROUND: Since event bubbling is broken, call switchTab directly
                console.log('🚨 DIRECT WORKAROUND: Calling switchTab directly!');
                if (this.game && this.game.switchTab) {
                    this.game.switchTab('friends');
                } else {
                    console.log('🚨 ERROR: Game instance not available in AuthManager!');
                }
            });
            
            // Initialize badge functionality
            this.initializeFriendsBadge(authState.user?.uid);
            
        } else if (!authState.isAuthenticated && friendsBtn) {
            console.log('🔧 DEBUG: Removing friends button');
            friendsBtn.remove();
            // Clean up badge subscription
            this.cleanupFriendsBadge();
        }
    }

    private isCompletingEmailLinkSignIn(): boolean {
        const url = window.location.href;
        return url.includes('apiKey') && url.includes('oobCode');
    }

    private async handleEmailLinkCompletion(): Promise<void> {
        try {
            const result = await this.authService.completeEmailLinkSignIn();
            
            if (result.success) {
                // Clear URL parameters
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Show success message
                this.game.ui.showSaveIndicator('✅ Erfolgreich angemeldet!', 'success');
            } else {
                console.error('Email link sign-in failed:', result.error);
                this.game.ui.showSaveIndicator(`❌ Anmeldung fehlgeschlagen: ${result.error}`, 'error');
                
                // Show login modal for retry
                setTimeout(() => this.showLogin(), 2000);
            }
        } catch (error) {
            console.error('Error completing email link sign-in:', error);
            this.game.ui.showSaveIndicator('❌ Anmeldung fehlgeschlagen', 'error');
            setTimeout(() => this.showLogin(), 2000);
        }
    }

    private showWelcomeMessage(user: UserProfile): void {
        const nickname = user.nickname || user.email.split('@')[0];
        this.game.ui.showSaveIndicator(`🎉 Willkommen zurück, ${nickname}!`, 'success');
    }

    private closeLoginModal(): void {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.style.display = 'none';
            document.body.removeChild(loginModal);
        }
    }

    public showLogin(): void {
        if (this.authService.isAuthenticated()) {
            return; // Already authenticated
        }
        
        this.loginModal.showLoginModal();
    }

    public async logout(): Promise<void> {
        try {
            await this.authService.signOut();
            this.game.ui.showSaveIndicator('👋 Erfolgreich abgemeldet', 'success');
        } catch (error) {
            console.error('Logout failed:', error);
            this.game.ui.showSaveIndicator('❌ Abmeldung fehlgeschlagen', 'error');
        }
    }

    public showUserProfile(): void {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            this.userProfileModal.showUserProfile(currentUser);
        } else {
            this.game.ui.showSaveIndicator('❌ Nicht angemeldet', 'error');
        }
    }

    public getCurrentUser(): UserProfile | null {
        return this.authService.getCurrentUser();
    }

    public isAuthenticated(): boolean {
        return this.authService.isAuthenticated();
    }

    public isLoading(): boolean {
        return this.authService.isLoading();
    }

    private setupRealTimeSync(user: UserProfile): void {
        // Setup real-time sync for game data
        (this.game as any).firebaseSaveManager?.setupRealTimeSync(user);
    }

    private stopRealTimeSync(): void {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            (this.game as any).firebaseSaveManager?.stopRealTimeSync(currentUser);
        }
    }

    private friendsBadgeUnsubscribe: (() => void) | null = null;

    private async initializeFriendsBadge(uid?: string): Promise<void> {
        if (!uid) return;
        
        try {
            // Import services dynamically to avoid circular dependencies
            const { FriendshipService } = await import('../services/FriendshipService.js');
            const { TradingService } = await import('../services/TradingService.js');
            const friendshipService = new FriendshipService();
            const tradingService = new TradingService();
            
            let friendRequestsCount = 0;
            let tradeRequestsCount = 0;
            
            // Subscribe to friend requests
            const friendRequestsUnsubscribe = friendshipService.subscribeFriendRequests(uid, (requests) => {
                const incomingRequests = requests.filter(r => r.to.uid === uid);
                friendRequestsCount = incomingRequests.length;
                this.updateFriendsBadge(friendRequestsCount + tradeRequestsCount);
                console.log('🔔 Friends badge updated - Friend requests:', friendRequestsCount, 'Trade requests:', tradeRequestsCount);
            });
            
            // Subscribe to trade requests
            const tradeRequestsUnsubscribe = tradingService.subscribeTradeRequests(uid, (trades) => {
                const incomingTrades = trades.filter(t => t.receiver.uid === uid && t.status === 'pending');
                tradeRequestsCount = incomingTrades.length;
                this.updateFriendsBadge(friendRequestsCount + tradeRequestsCount);
                console.log('🔔 Friends badge updated - Friend requests:', friendRequestsCount, 'Trade requests:', tradeRequestsCount);
            });
            
            // Store cleanup function that handles both subscriptions
            this.friendsBadgeUnsubscribe = () => {
                friendRequestsUnsubscribe();
                tradeRequestsUnsubscribe();
            };
            
            console.log('✅ Friends badge initialized with friend and trade requests');
        } catch (error) {
            console.error('❌ Failed to initialize friends badge:', error);
        }
    }

    private updateFriendsBadge(count: number): void {
        const badge = document.getElementById('friends-badge');
        if (!badge) return;
        
        if (count > 0) {
            badge.textContent = count.toString();
            badge.classList.remove('hidden');
            console.log('🔔 Friends badge updated:', count);
        } else {
            badge.classList.add('hidden');
            console.log('🔔 Friends badge hidden (no requests)');
        }
    }

    private cleanupFriendsBadge(): void {
        if (this.friendsBadgeUnsubscribe) {
            this.friendsBadgeUnsubscribe();
            this.friendsBadgeUnsubscribe = null;
            console.log('✅ Friends badge subscription cleaned up');
        }
    }

    public destroy(): void {
        if (this.authStateUnsubscribe) {
            this.authStateUnsubscribe();
            this.authStateUnsubscribe = null;
        }
        
        this.cleanupFriendsBadge();
        this.stopRealTimeSync();
        notificationService.stopTempNotificationListener();
    }
}