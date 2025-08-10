import type { LoginState } from '../types.js';
import { AuthService } from '../services/AuthService.js';

export class LoginModal {
    private authService: AuthService;
    private loginState: LoginState = {
        isLoading: false,
        isEmailSent: false,
        error: null
    };

    constructor(authService: AuthService) {
        this.authService = authService;
    }

    public showLoginModal(): void {
        if (document.getElementById('login-modal')) {
            return; // Modal already exists
        }

        const modal = this.createLoginModalElement();
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => {
            modal.style.display = 'flex';
        }, 10);

        this.setupEventListeners(modal);
    }

    private createLoginModalElement(): HTMLElement {
        const modal = document.createElement('div');
        modal.id = 'login-modal';
        modal.className = 'modal login-modal';
        
        modal.innerHTML = `
            <div class="modal-content login-modal-content">
                <div class="login-header">
                    <h2>🔥 Monster TCG Login</h2>
                    <p>Gib deine E-Mail-Adresse ein und wir senden dir einen Login-Link!</p>
                </div>
                
                <div id="login-form" class="login-form">
                    <div class="email-input-group">
                        <label for="login-email">E-Mail-Adresse:</label>
                        <input 
                            type="email" 
                            id="login-email" 
                            placeholder="deine@email.com"
                            required
                        >
                    </div>
                    
                    <button id="send-login-link" class="login-btn primary">
                        📧 Login-Link senden
                    </button>
                    
                    <div id="login-error" class="login-error hidden"></div>
                </div>
                
                <div id="email-sent-info" class="email-sent-info hidden">
                    <div class="success-icon">✅</div>
                    <h3>E-Mail gesendet!</h3>
                    <p>Wir haben dir einen Login-Link an <strong id="sent-email"></strong> gesendet.</p>
                    <p class="email-instructions">
                        📱 Prüfe deine E-Mails und klicke auf den Link um dich anzumelden.
                        <br><br>
                        <small>💡 Der Link ist 1 Stunde gültig. Falls du keine E-Mail erhältst, prüfe deinen Spam-Ordner.</small>
                    </p>
                    
                    <div class="email-sent-actions">
                        <button id="resend-email" class="login-btn secondary">
                            🔄 Erneut senden
                        </button>
                        <button id="change-email" class="login-btn secondary">
                            ✏️ E-Mail ändern
                        </button>
                    </div>
                </div>
                
                <div class="login-footer">
                    <p><small>🔒 Deine Daten sind sicher und werden verschlüsselt übertragen.</small></p>
                    <button id="close-login-modal" class="close-btn">✕</button>
                </div>
            </div>
        `;

        return modal;
    }

    private setupEventListeners(modal: HTMLElement): void {
        const emailInput = modal.querySelector('#login-email') as HTMLInputElement;
        const sendButton = modal.querySelector('#send-login-link') as HTMLButtonElement;
        const closeButton = modal.querySelector('#close-login-modal') as HTMLButtonElement;
        const resendButton = modal.querySelector('#resend-email') as HTMLButtonElement;
        const changeEmailButton = modal.querySelector('#change-email') as HTMLButtonElement;

        // Send login link
        sendButton.addEventListener('click', () => {
            this.handleSendLoginLink(emailInput.value.trim());
        });

        // Enter key support
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSendLoginLink(emailInput.value.trim());
            }
        });

        // Resend email
        resendButton.addEventListener('click', () => {
            this.handleSendLoginLink(emailInput.value.trim());
        });

        // Change email
        changeEmailButton.addEventListener('click', () => {
            this.resetToEmailForm();
        });

        // Close modal
        closeButton.addEventListener('click', () => {
            this.closeModal();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    private async handleSendLoginLink(email: string): Promise<void> {
        if (!email) {
            this.showError('Bitte gib eine E-Mail-Adresse ein.');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showError('Bitte gib eine gültige E-Mail-Adresse ein.');
            return;
        }

        this.setLoading(true);
        this.clearError();

        try {
            const result = await this.authService.sendEmailLink(email);
            
            if (result.success) {
                this.showEmailSentInfo(email);
            } else {
                this.showError(result.error || 'Fehler beim Senden der E-Mail.');
            }
        } catch (error) {
            console.error('Error sending login link:', error);
            this.showError('Ein unerwarteter Fehler ist aufgetreten.');
        } finally {
            this.setLoading(false);
        }
    }

    private showEmailSentInfo(email: string): void {
        const modal = document.getElementById('login-modal');
        if (!modal) return;

        const loginForm = modal.querySelector('#login-form') as HTMLElement;
        const emailSentInfo = modal.querySelector('#email-sent-info') as HTMLElement;
        const sentEmailSpan = modal.querySelector('#sent-email') as HTMLSpanElement;

        loginForm.classList.add('hidden');
        emailSentInfo.classList.remove('hidden');
        sentEmailSpan.textContent = email;

        this.loginState.isEmailSent = true;
    }

    private resetToEmailForm(): void {
        const modal = document.getElementById('login-modal');
        if (!modal) return;

        const loginForm = modal.querySelector('#login-form') as HTMLElement;
        const emailSentInfo = modal.querySelector('#email-sent-info') as HTMLElement;

        loginForm.classList.remove('hidden');
        emailSentInfo.classList.add('hidden');

        this.loginState.isEmailSent = false;
        this.clearError();
    }

    private setLoading(isLoading: boolean): void {
        const modal = document.getElementById('login-modal');
        if (!modal) return;

        const sendButton = modal.querySelector('#send-login-link') as HTMLButtonElement;
        const resendButton = modal.querySelector('#resend-email') as HTMLButtonElement;

        this.loginState.isLoading = isLoading;

        if (isLoading) {
            sendButton.disabled = true;
            sendButton.textContent = '⏳ Wird gesendet...';
            if (resendButton) {
                resendButton.disabled = true;
                resendButton.textContent = '⏳ Wird gesendet...';
            }
        } else {
            sendButton.disabled = false;
            sendButton.textContent = '📧 Login-Link senden';
            if (resendButton) {
                resendButton.disabled = false;
                resendButton.textContent = '🔄 Erneut senden';
            }
        }
    }

    private showError(message: string): void {
        const modal = document.getElementById('login-modal');
        if (!modal) return;

        const errorElement = modal.querySelector('#login-error') as HTMLElement;
        errorElement.textContent = `❌ ${message}`;
        errorElement.classList.remove('hidden');

        this.loginState.error = message;
    }

    private clearError(): void {
        const modal = document.getElementById('login-modal');
        if (!modal) return;

        const errorElement = modal.querySelector('#login-error') as HTMLElement;
        errorElement.classList.add('hidden');
        errorElement.textContent = '';

        this.loginState.error = null;
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private closeModal(): void {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.removeChild(modal);
        }
    }

    public static addLoginStyles(): void {
        if (document.getElementById('login-modal-styles')) {
            return; // Styles already added
        }

        const styles = document.createElement('style');
        styles.id = 'login-modal-styles';
        styles.textContent = `
            .login-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            }

            .login-modal-content {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #4a90e2;
                border-radius: 15px;
                padding: 30px;
                max-width: 450px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: loginModalAppear 0.3s ease-out;
            }

            @keyframes loginModalAppear {
                from {
                    opacity: 0;
                    transform: translateY(-50px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .login-header {
                text-align: center;
                margin-bottom: 25px;
                color: white;
            }

            .login-header h2 {
                margin: 0 0 10px 0;
                font-family: 'Orbitron', monospace;
                color: #4a90e2;
                font-size: 1.8rem;
            }

            .login-header p {
                margin: 0;
                opacity: 0.8;
                line-height: 1.4;
            }

            .login-form {
                margin-bottom: 20px;
            }

            .email-input-group {
                margin-bottom: 20px;
            }

            .email-input-group label {
                display: block;
                margin-bottom: 8px;
                color: white;
                font-weight: 500;
            }

            .email-input-group input {
                width: 100%;
                padding: 12px 15px;
                border: 2px solid #333;
                border-radius: 8px;
                background: #2a2a3e;
                color: white;
                font-size: 16px;
                transition: border-color 0.3s;
                box-sizing: border-box;
            }

            .email-input-group input:focus {
                outline: none;
                border-color: #4a90e2;
                box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
            }

            .login-btn {
                width: 100%;
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                margin-bottom: 10px;
            }

            .login-btn.primary {
                background: linear-gradient(135deg, #4a90e2, #357ABD);
                color: white;
            }

            .login-btn.primary:hover:not(:disabled) {
                background: linear-gradient(135deg, #357ABD, #2868A3);
                transform: translateY(-2px);
            }

            .login-btn.secondary {
                background: #333;
                color: white;
                width: calc(50% - 5px);
            }

            .login-btn.secondary:hover:not(:disabled) {
                background: #444;
            }

            .login-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            .login-error {
                background: rgba(244, 67, 54, 0.1);
                border: 1px solid #f44336;
                border-radius: 6px;
                padding: 10px;
                color: #f44336;
                margin-top: 10px;
                text-align: center;
            }

            .email-sent-info {
                text-align: center;
                color: white;
            }

            .success-icon {
                font-size: 3rem;
                margin-bottom: 15px;
            }

            .email-sent-info h3 {
                margin: 0 0 15px 0;
                color: #4CAF50;
                font-family: 'Orbitron', monospace;
            }

            .email-sent-info p {
                margin: 0 0 15px 0;
                line-height: 1.5;
            }

            .email-instructions {
                background: rgba(74, 144, 226, 0.1);
                border: 1px solid #4a90e2;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
            }

            .email-sent-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }

            .login-footer {
                text-align: center;
                position: relative;
                padding-top: 20px;
                border-top: 1px solid #333;
                color: rgba(255, 255, 255, 0.6);
            }

            .close-btn {
                position: absolute;
                top: -10px;
                right: 0;
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.6);
                font-size: 24px;
                cursor: pointer;
                padding: 5px;
                border-radius: 50%;
                transition: all 0.3s;
            }

            .close-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }

            .hidden {
                display: none !important;
            }
        `;

        document.head.appendChild(styles);
    }
}