import type { UserProfile } from '../types.js';
import { DatabaseService } from '../services/DatabaseService.js';

export class UserProfileModal {
    private databaseService: DatabaseService;
    private currentUser: UserProfile | null = null;

    constructor() {
        this.databaseService = new DatabaseService();
        this.addStyles();
    }

    public showUserProfile(user: UserProfile): void {
        console.log('🔍 showUserProfile called with user:', user);
        this.currentUser = user;
        
        if (document.getElementById('user-profile-modal')) {
            console.log('⚠️ Modal already exists, removing old one');
            const existingModal = document.getElementById('user-profile-modal');
            if (existingModal) {
                document.body.removeChild(existingModal);
            }
        }

        const modal = this.createUserProfileModalElement();
        document.body.appendChild(modal);
        console.log('✅ Modal created and added to DOM');
        
        // Show modal
        setTimeout(() => {
            modal.style.display = 'flex';
            console.log('✅ Modal displayed');
        }, 10);

        this.setupEventListeners(modal);
        console.log('✅ Event listeners setup');
        
        console.log('🔍 About to call loadUserData...');
        this.loadUserData();
    }

    private createUserProfileModalElement(): HTMLElement {
        const modal = document.createElement('div');
        modal.id = 'user-profile-modal';
        modal.className = 'modal user-profile-modal';
        
        modal.innerHTML = `
            <div class="modal-content user-profile-content">
                <div class="profile-header">
                    <h2>👤 Dein Profil</h2>
                    <button id="close-profile-modal" class="close-btn">✕</button>
                </div>
                
                <div class="profile-sections">
                    <!-- Email Section -->
                    <div class="profile-section">
                        <div class="section-header">
                            <h3>📧 E-Mail-Adresse</h3>
                            <span class="section-description">Account-Identifikator (nicht änderbar)</span>
                        </div>
                        <div class="profile-field">
                            <div class="field-display">
                                <span id="current-email" class="field-value readonly">Wird geladen...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Nickname Section -->
                    <div class="profile-section">
                        <div class="section-header">
                            <h3>🎮 Nickname</h3>
                        </div>
                        <div class="profile-field">
                            <div class="field-display">
                                <span id="current-nickname" class="field-value">Wird geladen...</span>
                                <button id="edit-nickname-btn" class="edit-btn" title="Nickname bearbeiten">✏️</button>
                            </div>
                            <div id="nickname-edit-form" class="field-edit-form hidden">
                                <input type="text" id="new-nickname" placeholder="Neuer Nickname" maxlength="20">
                                <div class="edit-actions">
                                    <button id="save-nickname-btn" class="save-btn">Speichern</button>
                                    <button id="cancel-nickname-btn" class="cancel-btn">Abbrechen</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Friend Code Section -->
                    <div class="profile-section">
                        <div class="section-header">
                            <h3>🤝 Freundschaftscode</h3>
                            <span class="section-description">Teile diesen Code mit Freunden um sie hinzuzufügen</span>
                        </div>
                        <div class="profile-field">
                            <div class="friend-code-display">
                                <div class="friend-code-box">
                                    <code id="friend-code" class="friend-code-value">Wird geladen...</code>
                                    <button id="copy-friend-code-btn" class="copy-btn" title="In Zwischenablage kopieren">📋</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Account Info Section -->
                    <div class="profile-section">
                        <div class="section-header">
                            <h3>ℹ️ Account-Informationen</h3>
                        </div>
                        <div class="profile-field account-info">
                            <div class="info-item">
                                <span class="info-label">Mitglied seit:</span>
                                <span id="member-since" class="info-value">Wird geladen...</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Letzte Aktivität:</span>
                                <span id="last-active" class="info-value">Wird geladen...</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Spielstatus:</span>
                                <span class="info-value online-status">🟢 Online</span>
                            </div>
                        </div>
                    </div>

                    <!-- Trading Settings Section -->
                    <div class="profile-section">
                        <div class="section-header">
                            <h3>🔄 Handel-Einstellungen</h3>
                            <span class="section-description">Kontrolle über deine Trading-Aktivitäten</span>
                        </div>
                        <div class="profile-field">
                            <div class="toggle-setting">
                                <div class="toggle-info">
                                    <span class="toggle-label">Handel aktiviert</span>
                                    <span class="toggle-description">Erlaube anderen Spielern, dir Tauschangebote zu senden</span>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="trading-enabled-toggle" checked>
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="profile-actions">
                    <button id="logout-profile-btn" class="profile-action-btn logout">🚪 Abmelden</button>
                </div>

                <div id="profile-status" class="profile-status hidden"></div>
            </div>
        `;

        return modal;
    }

    private setupEventListeners(modal: HTMLElement): void {
        // Close modal
        const closeBtn = modal.querySelector('#close-profile-modal') as HTMLButtonElement;
        closeBtn.addEventListener('click', () => this.closeModal());


        // Nickname editing
        const editNicknameBtn = modal.querySelector('#edit-nickname-btn') as HTMLButtonElement;
        const saveNicknameBtn = modal.querySelector('#save-nickname-btn') as HTMLButtonElement;
        const cancelNicknameBtn = modal.querySelector('#cancel-nickname-btn') as HTMLButtonElement;

        editNicknameBtn.addEventListener('click', () => this.startNicknameEdit());
        saveNicknameBtn.addEventListener('click', () => this.saveNickname());
        cancelNicknameBtn.addEventListener('click', () => this.cancelNicknameEdit());

        // Friend code copy
        const copyFriendCodeBtn = modal.querySelector('#copy-friend-code-btn') as HTMLButtonElement;
        copyFriendCodeBtn.addEventListener('click', () => this.copyFriendCode());

        // Trading toggle
        const tradingToggle = modal.querySelector('#trading-enabled-toggle') as HTMLInputElement;
        tradingToggle.addEventListener('change', () => this.updateTradingSettings(tradingToggle.checked));

        // Actions
        const logoutBtn = modal.querySelector('#logout-profile-btn') as HTMLButtonElement;
        logoutBtn.addEventListener('click', () => this.logout());

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Enter key support for inputs
        const newNicknameInput = modal.querySelector('#new-nickname') as HTMLInputElement;

        newNicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveNickname();
            if (e.key === 'Escape') this.cancelNicknameEdit();
        });
    }

    private async loadUserData(): Promise<void> {
        console.log('🔍 loadUserData called, currentUser:', this.currentUser);
        if (!this.currentUser) {
            console.log('❌ No currentUser, returning');
            return;
        }

        try {
            console.log('🔍 Calling getUserProfile for UID:', this.currentUser.uid);
            // Load fresh user data from database
            const userData = await this.databaseService.getUserProfile(this.currentUser.uid);
            console.log('🔍 getUserProfile returned:', userData);
            
            if (userData && userData.email && userData.nickname && userData.friendCode) {
                console.log('✅ Complete database data found, calling updateProfileDisplay');
                this.updateProfileDisplay(userData);
            } else {
                // Fallback: Use current user data if no database entry exists yet
                console.log('⚠️ No database entry found, using current auth data');
                const fallbackData = {
                    email: this.currentUser.email,
                    nickname: this.currentUser.nickname,
                    friendCode: this.currentUser.friendCode,
                    createdAt: this.currentUser.createdAt,
                    lastActive: this.currentUser.lastActive,
                    gameData: { coins: 0, collection: [], deck: [], lastSaved: '' }
                };
                console.log('🔍 Fallback data:', fallbackData);
                this.updateProfileDisplay(fallbackData);
            }
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
            
            // Fallback: Use current user data
            console.log('⚠️ Database error, using current auth data as fallback');
            const fallbackData = {
                email: this.currentUser.email,
                nickname: this.currentUser.nickname,
                friendCode: this.currentUser.friendCode,
                createdAt: this.currentUser.createdAt,
                lastActive: this.currentUser.lastActive,
                gameData: { coins: 0, collection: [], deck: [], lastSaved: '' }
            };
            console.log('🔍 Error fallback data:', fallbackData);
            this.updateProfileDisplay(fallbackData);
        }
    }

    private updateProfileDisplay(userData: any): void {
        console.log('🔍 updateProfileDisplay called with:', userData);
        const modal = document.getElementById('user-profile-modal');
        console.log('🔍 Modal found:', !!modal);
        if (!modal) {
            console.log('❌ Modal not found, returning');
            return;
        }

        // Update email
        const emailElement = modal.querySelector('#current-email') as HTMLSpanElement;
        console.log('🔍 Email element found:', !!emailElement, 'Current content:', emailElement?.textContent);
        if (emailElement) {
            emailElement.textContent = userData.email || 'Keine E-Mail';
            console.log('✅ Email updated to:', emailElement.textContent);
        }

        // Update nickname
        const nicknameElement = modal.querySelector('#current-nickname') as HTMLSpanElement;
        console.log('🔍 Nickname element found:', !!nicknameElement, 'Current content:', nicknameElement?.textContent);
        if (nicknameElement) {
            nicknameElement.textContent = userData.nickname || 'Kein Nickname';
            console.log('✅ Nickname updated to:', nicknameElement.textContent);
        }

        // Update friend code
        const friendCodeElement = modal.querySelector('#friend-code') as HTMLElement;
        console.log('🔍 Friend code element found:', !!friendCodeElement, 'Current content:', friendCodeElement?.textContent);
        if (friendCodeElement) {
            friendCodeElement.textContent = userData.friendCode || 'Kein Code';
            console.log('✅ Friend code updated to:', friendCodeElement.textContent);
        }

        // Update account info
        const memberSinceElement = modal.querySelector('#member-since') as HTMLSpanElement;
        const lastActiveElement = modal.querySelector('#last-active') as HTMLSpanElement;

        // Safe date parsing with fallback
        const createdDate = userData.createdAt 
            ? (new Date(userData.createdAt).toString() !== 'Invalid Date' 
                ? new Date(userData.createdAt).toLocaleDateString()
                : 'Nicht verfügbar')
            : 'Nicht verfügbar';
            
        const lastActiveDate = userData.lastActive 
            ? (new Date(userData.lastActive).toString() !== 'Invalid Date'
                ? new Date(userData.lastActive).toLocaleString()
                : 'Nicht verfügbar')
            : 'Nicht verfügbar';

        memberSinceElement.textContent = createdDate;
        lastActiveElement.textContent = lastActiveDate;

        // Update trading toggle
        const tradingToggle = modal.querySelector('#trading-enabled-toggle') as HTMLInputElement;
        if (tradingToggle) {
            tradingToggle.checked = userData.tradingEnabled !== false; // Default to true if undefined
            console.log('✅ Trading toggle updated to:', tradingToggle.checked);
        }
    }


    private startNicknameEdit(): void {
        const modal = document.getElementById('user-profile-modal');
        if (!modal) return;

        const displayDiv = modal.querySelector('#current-nickname')?.parentElement;
        const editForm = modal.querySelector('#nickname-edit-form') as HTMLElement;
        const newNicknameInput = modal.querySelector('#new-nickname') as HTMLInputElement;

        if (displayDiv && editForm) {
            displayDiv.classList.add('hidden');
            editForm.classList.remove('hidden');
            newNicknameInput.value = this.currentUser?.nickname || '';
            newNicknameInput.focus();
        }
    }

    private cancelNicknameEdit(): void {
        const modal = document.getElementById('user-profile-modal');
        if (!modal) return;

        const displayDiv = modal.querySelector('#current-nickname')?.parentElement;
        const editForm = modal.querySelector('#nickname-edit-form') as HTMLElement;

        if (displayDiv && editForm) {
            displayDiv.classList.remove('hidden');
            editForm.classList.add('hidden');
        }
    }

    private async saveNickname(): Promise<void> {
        if (!this.currentUser) return;

        const modal = document.getElementById('user-profile-modal');
        if (!modal) return;

        const newNicknameInput = modal.querySelector('#new-nickname') as HTMLInputElement;
        const newNickname = newNicknameInput.value.trim();

        if (!newNickname || newNickname.length < 2) {
            this.showStatus('❌ Nickname muss mindestens 2 Zeichen lang sein', 'error');
            return;
        }

        if (newNickname === this.currentUser.nickname) {
            this.cancelNicknameEdit();
            return;
        }

        try {
            await this.databaseService.updateNickname(this.currentUser.uid, newNickname);
            
            // Update current user object
            this.currentUser.nickname = newNickname;
            
            // Update display
            const nicknameElement = modal.querySelector('#current-nickname') as HTMLSpanElement;
            nicknameElement.textContent = newNickname;
            
            this.cancelNicknameEdit();
            this.showStatus('✅ Nickname erfolgreich aktualisiert', 'success');
        } catch (error) {
            console.error('Failed to update nickname:', error);
            this.showStatus('❌ Fehler beim Aktualisieren des Nicknames', 'error');
        }
    }

    private async updateTradingSettings(enabled: boolean): Promise<void> {
        if (!this.currentUser) return;

        try {
            await this.databaseService.updateTradingEnabled(this.currentUser.uid, enabled);
            
            // Update current user object
            this.currentUser.tradingEnabled = enabled;
            
            this.showStatus(
                enabled 
                    ? '✅ Handel wurde aktiviert' 
                    : '❌ Handel wurde deaktiviert', 
                'success'
            );
        } catch (error) {
            console.error('Failed to update trading settings:', error);
            this.showStatus('❌ Fehler beim Aktualisieren der Handel-Einstellungen', 'error');
            
            // Revert toggle on error
            const tradingToggle = document.querySelector('#trading-enabled-toggle') as HTMLInputElement;
            if (tradingToggle) {
                tradingToggle.checked = !enabled;
            }
        }
    }

    private async copyFriendCode(): Promise<void> {
        if (!this.currentUser) return;

        try {
            await navigator.clipboard.writeText(this.currentUser.friendCode);
            this.showStatus('📋 Freundschaftscode kopiert!', 'success');
        } catch (error) {
            // Fallback for older browsers
            const friendCodeElement = document.querySelector('#friend-code') as HTMLElement;
            if (friendCodeElement) {
                const textArea = document.createElement('textarea');
                textArea.value = this.currentUser.friendCode;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showStatus('📋 Freundschaftscode kopiert!', 'success');
            }
        }
    }


    private logout(): void {
        if (confirm('🚪 Möchtest du dich wirklich abmelden?')) {
            // Close modal first
            this.closeModal();
            
            // Trigger logout from main game
            const game = (window as any).game;
            if (game && game.authManager) {
                game.authManager.logout();
            }
        }
    }

    private showStatus(message: string, type: 'success' | 'error'): void {
        const modal = document.getElementById('user-profile-modal');
        if (!modal) return;

        const statusElement = modal.querySelector('#profile-status') as HTMLElement;
        statusElement.textContent = message;
        statusElement.className = `profile-status ${type}`;
        statusElement.classList.remove('hidden');

        // Hide after 3 seconds
        setTimeout(() => {
            statusElement.classList.add('hidden');
        }, 3000);
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private closeModal(): void {
        const modal = document.getElementById('user-profile-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.removeChild(modal);
        }
    }

    private addStyles(): void {
        if (document.getElementById('user-profile-modal-styles')) {
            return; // Styles already added
        }

        const styles = document.createElement('style');
        styles.id = 'user-profile-modal-styles';
        styles.textContent = `
            .user-profile-modal .modal-content {
                max-width: 600px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
            }

            .profile-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 2px solid #333;
            }

            .profile-header h2 {
                margin: 0;
                color: #4a90e2;
                font-family: 'Orbitron', monospace;
            }

            .profile-sections {
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-bottom: 25px;
            }

            .profile-section {
                background: rgba(0, 0, 0, 0.2);
                border: 1px solid #333;
                border-radius: 10px;
                padding: 20px;
            }

            .section-header {
                margin-bottom: 15px;
            }

            .section-header h3 {
                margin: 0 0 5px 0;
                color: #4a90e2;
                font-size: 1.1rem;
            }

            .section-description {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.7);
            }

            .profile-field {
                position: relative;
            }

            .field-display {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .field-value {
                flex: 1;
                padding: 10px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid #333;
                border-radius: 6px;
                color: white;
            }

            .field-value.readonly {
                background: rgba(0, 0, 0, 0.2);
                border: 1px solid #444;
                color: rgba(255, 255, 255, 0.8);
                cursor: not-allowed;
            }

            .edit-btn {
                background: #4a90e2;
                border: none;
                color: white;
                padding: 8px 10px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.3s;
            }

            .edit-btn:hover {
                background: #357ABD;
            }

            .field-edit-form {
                margin-top: 10px;
            }

            .field-edit-form input {
                width: 100%;
                padding: 10px;
                background: #2a2a3e;
                border: 2px solid #333;
                border-radius: 6px;
                color: white;
                font-size: 16px;
                margin-bottom: 10px;
                box-sizing: border-box;
            }

            .field-edit-form input:focus {
                outline: none;
                border-color: #4a90e2;
            }

            .edit-actions {
                display: flex;
                gap: 10px;
            }

            .save-btn, .cancel-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.3s;
                min-width: 100px;
                white-space: nowrap;
            }

            .save-btn {
                background: #4CAF50;
                color: white;
            }

            .save-btn:hover {
                background: #45a049;
            }

            .cancel-btn {
                background: #666;
                color: white;
            }

            .cancel-btn:hover {
                background: #555;
            }

            .friend-code-display {
                margin-top: 10px;
            }

            .friend-code-box {
                display: flex;
                align-items: center;
                gap: 10px;
                background: rgba(0, 0, 0, 0.4);
                padding: 15px;
                border-radius: 8px;
                border: 2px solid #4a90e2;
            }

            .friend-code-value {
                flex: 1;
                font-family: 'Courier New', monospace;
                font-size: 1.2rem;
                font-weight: bold;
                color: #4a90e2;
                letter-spacing: 2px;
            }

            .copy-btn {
                background: #4a90e2;
                border: none;
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.3s;
            }

            .copy-btn:hover {
                background: #357ABD;
            }

            .account-info {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .info-item:last-child {
                border-bottom: none;
            }

            .info-label {
                color: rgba(255, 255, 255, 0.7);
                font-weight: 500;
            }

            .info-value {
                color: white;
                font-weight: 600;
            }

            .online-status {
                color: #4CAF50;
            }

            .profile-actions {
                display: flex;
                justify-content: center;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #333;
            }

            .profile-action-btn {
                padding: 12px 30px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                min-width: 200px;
            }

            .profile-action-btn.logout {
                background: #dc3545;
                color: white;
            }

            .profile-action-btn.logout:hover {
                background: #c82333;
                transform: translateY(-2px);
            }

            .profile-status {
                margin-top: 15px;
                padding: 10px;
                border-radius: 6px;
                text-align: center;
                font-weight: 500;
            }

            .profile-status.success {
                background: rgba(76, 175, 80, 0.2);
                border: 1px solid #4CAF50;
                color: #4CAF50;
            }

            .profile-status.error {
                background: rgba(244, 67, 54, 0.2);
                border: 1px solid #f44336;
                color: #f44336;
            }

            /* Trading Settings Toggle */
            .toggle-setting {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 0;
            }

            .toggle-info {
                flex: 1;
            }

            .toggle-label {
                display: block;
                font-weight: 600;
                color: #fff;
                margin-bottom: 4px;
            }

            .toggle-description {
                display: block;
                font-size: 0.9rem;
                color: #aaa;
                line-height: 1.3;
            }

            .toggle-switch {
                position: relative;
                display: inline-block;
                width: 60px;
                height: 34px;
                margin-left: 20px;
            }

            .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #444;
                transition: 0.3s;
                border-radius: 34px;
            }

            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 26px;
                width: 26px;
                left: 4px;
                bottom: 4px;
                background-color: white;
                transition: 0.3s;
                border-radius: 50%;
            }

            input:checked + .toggle-slider {
                background-color: #4CAF50;
            }

            input:focus + .toggle-slider {
                box-shadow: 0 0 1px #4CAF50;
            }

            input:checked + .toggle-slider:before {
                transform: translateX(26px);
            }

            .hidden {
                display: none !important;
            }
        `;

        document.head.appendChild(styles);
    }
}