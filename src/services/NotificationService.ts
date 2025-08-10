import { 
    doc, 
    setDoc, 
    collection,
    onSnapshot,
    deleteDoc,
    Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface NotificationData {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    duration?: number;
    clickAction?: () => void;
    audioFile?: string;
}

export class NotificationService {
    private static instance: NotificationService | null = null;
    private notificationContainer: HTMLElement | null = null;
    private activeNotifications: Map<string, HTMLElement> = new Map();
    private tempNotificationListener: Unsubscribe | null = null;
    private currentUserId: string | null = null;

    constructor() {
        if (NotificationService.instance) {
            return NotificationService.instance;
        }
        NotificationService.instance = this;
        this.initializeContainer();
    }

    private initializeContainer(): void {
        // Create notification container if it doesn't exist
        this.notificationContainer = document.getElementById('notification-container');
        if (!this.notificationContainer) {
            this.notificationContainer = document.createElement('div');
            this.notificationContainer.id = 'notification-container';
            this.notificationContainer.className = 'notification-container';
            document.body.appendChild(this.notificationContainer);
        }
    }

    public showNotification(data: NotificationData): void {
        console.log('🔔 Showing notification:', data);
        
        this.initializeContainer();
        if (!this.notificationContainer) return;

        // Play audio if specified
        if (data.audioFile) {
            this.playAudio(data.audioFile);
        }

        // Create notification element
        const notification = this.createNotificationElement(data);
        
        // Add to container
        this.notificationContainer.appendChild(notification);
        this.activeNotifications.set(data.id, notification);

        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Auto-dismiss after duration
        const duration = data.duration || 5000;
        setTimeout(() => {
            this.dismissNotification(data.id);
        }, duration);
    }

    private createNotificationElement(data: NotificationData): HTMLElement {
        const notification = document.createElement('div');
        notification.className = `notification notification-${data.type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${this.getIconForType(data.type)}</div>
                <div class="notification-text">
                    <div class="notification-title">${data.title}</div>
                    <div class="notification-message">${data.message}</div>
                </div>
                <button class="notification-close" onclick="window.notificationService?.dismissNotification('${data.id}')">×</button>
            </div>
        `;

        // Add click handler if provided
        if (data.clickAction) {
            notification.style.cursor = 'pointer';
            notification.addEventListener('click', (e) => {
                // Don't trigger if close button was clicked
                if ((e.target as HTMLElement).classList.contains('notification-close')) {
                    return;
                }
                data.clickAction!();
                this.dismissNotification(data.id);
            });
        }

        // Add styles
        this.injectStyles();

        return notification;
    }

    private getIconForType(type: NotificationType): string {
        switch (type) {
            case 'success': return '✅';
            case 'info': return '📨';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            default: return '📨';
        }
    }

    public dismissNotification(id: string): void {
        const notification = this.activeNotifications.get(id);
        if (notification) {
            notification.classList.add('hide');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.activeNotifications.delete(id);
            }, 300);
        }
    }

    private playAudio(filename: string): void {
        console.log('🔊 Attempting to play audio:', filename);
        try {
            const audio = new Audio(`/src/audio/${filename}`);
            audio.volume = 0.3; // 30% volume
            console.log('🔊 Audio object created, attempting to play...');
            audio.play().then(() => {
                console.log('✅ Audio played successfully:', filename);
            }).catch(error => {
                console.log('🔇 Could not play notification sound:', error);
                console.log('🔇 Error details:', error.message);
            });
        } catch (error) {
            console.log('🔇 Audio not available:', error);
            console.log('🔇 Error details:', error.message);
        }
    }

    private getCurrentActiveTab(): string | null {
        const activeTabButton = document.querySelector('.nav-btn.active');
        if (activeTabButton) {
            return activeTabButton.getAttribute('data-tab');
        }
        return null;
    }

    private shouldShowToastNotification(): boolean {
        const currentTab = this.getCurrentActiveTab();
        const isOnFriendsTab = currentTab === 'friends';
        console.log('🔔 Current tab:', currentTab, '| On Friends tab:', isOnFriendsTab);
        return !isOnFriendsTab;
    }

    private playAudioOnly(filename: string): void {
        console.log('🔊 Playing audio only (user on Friends tab):', filename);
        this.playAudio(filename);
    }

    /**
     * Cross-browser notification functionality
     */
    public startTempNotificationListener(userId: string): void {
        if (this.tempNotificationListener) {
            this.stopTempNotificationListener();
        }
        
        this.currentUserId = userId;
        const tempNotificationsRef = collection(db, 'temp_notifications', userId, 'notifications');
        
        console.log('🔔 Starting temp notification listener for user:', userId);
        
        this.tempNotificationListener = onSnapshot(tempNotificationsRef, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const notificationData = change.doc.data();
                    console.log('🔔 Received cross-browser notification:', notificationData);
                    
                    // Play audio
                    if (notificationData.audioFile) {
                        this.playAudio(notificationData.audioFile);
                    }
                    
                    // Show toast if not on Friends tab
                    if (this.shouldShowToastNotification()) {
                        this.showNotification({
                            id: `cross-browser-${Date.now()}`,
                            type: notificationData.type || 'info',
                            title: notificationData.title || 'Neue Benachrichtigung',
                            message: notificationData.message || '',
                            clickAction: notificationData.clickAction === 'switchToFriendsTab' ? () => {
                                const game = (window as any).game;
                                if (game && game.switchTab) {
                                    game.switchTab('friends');
                                }
                            } : undefined
                        });
                    }
                    
                    // Delete the temp notification after processing
                    try {
                        await deleteDoc(change.doc.ref);
                        console.log('🗑️ Temp notification deleted:', change.doc.id);
                    } catch (error) {
                        console.error('❌ Failed to delete temp notification:', error);
                    }
                }
            });
        }, (error) => {
            console.error('❌ Temp notification listener error:', error);
        });
    }
    
    public stopTempNotificationListener(): void {
        if (this.tempNotificationListener) {
            this.tempNotificationListener();
            this.tempNotificationListener = null;
            console.log('✅ Temp notification listener stopped');
        }
        this.currentUserId = null;
    }
    
    private async sendCrossBrowserNotification(
        targetUserId: string, 
        notificationData: {
            type: string;
            title: string;
            message: string;
            audioFile: string;
            clickAction?: () => void;
        }
    ): Promise<void> {
        try {
            const tempNotificationRef = doc(
                collection(db, 'temp_notifications', targetUserId, 'notifications')
            );
            
            await setDoc(tempNotificationRef, {
                ...notificationData,
                createdAt: new Date().toISOString(),
                // Don't serialize clickAction function - handle it generically on the receiving end
                clickAction: notificationData.clickAction ? 'switchToFriendsTab' : null
            });
            
            console.log('✅ Cross-browser notification sent to user:', targetUserId);
        } catch (error) {
            console.error('❌ Failed to send cross-browser notification:', error);
        }
    }

    // Friend-specific notification methods
    public showFriendRequest(fromUser: { nickname: string; email: string }, targetUserId?: string): void {
        const notificationData = {
            type: 'info' as NotificationType,
            title: '🤝 Neue Freundschaftsanfrage',
            message: `${fromUser.nickname} möchte dich als Freund hinzufügen`,
            audioFile: 'ding.mp3',
            clickAction: () => {
                // Switch to friends tab
                const game = (window as any).game;
                if (game && game.switchTab) {
                    game.switchTab('friends');
                }
            }
        };
        
        if (targetUserId) {
            // Send cross-browser notification
            this.sendCrossBrowserNotification(targetUserId, notificationData);
        } else {
            // Local notification (existing behavior)
            // Always play audio
            this.playAudio('ding.mp3');
            
            // Only show toast if not on Friends tab
            if (this.shouldShowToastNotification()) {
                this.showNotification({
                    id: `friend-request-${Date.now()}`,
                    ...notificationData
                });
            } else {
                console.log('🔔 Toast suppressed - user is on Friends tab');
            }
        }
    }

    public showRequestAccepted(byUser: { nickname: string }, targetUserId?: string): void {
        console.log('🎉 showRequestAccepted called for:', byUser.nickname);
        
        const notificationData = {
            type: 'success' as NotificationType,
            title: '🎉 Freundschaftsanfrage angenommen',
            message: `${byUser.nickname} hat deine Freundschaftsanfrage angenommen!`,
            audioFile: 'success.mp3',
            clickAction: () => {
                const game = (window as any).game;
                if (game && game.switchTab) {
                    game.switchTab('friends');
                }
            }
        };
        
        if (targetUserId) {
            // Send cross-browser notification
            this.sendCrossBrowserNotification(targetUserId, notificationData);
        } else {
            // Local notification (existing behavior)
            // Always play audio
            this.playAudio('success.mp3');
            
            // Only show toast if not on Friends tab
            if (this.shouldShowToastNotification()) {
                this.showNotification({
                    id: `request-accepted-${Date.now()}`,
                    ...notificationData
                });
            } else {
                console.log('🔔 Toast suppressed - user is on Friends tab');
            }
        }
    }

    public showRequestDeclined(byUser: { nickname: string }, targetUserId?: string): void {
        console.log('👋 showRequestDeclined called for:', byUser.nickname);
        
        const notificationData = {
            type: 'warning' as NotificationType,
            title: '👋 Freundschaftsanfrage abgelehnt',
            message: `${byUser.nickname} hat deine Freundschaftsanfrage abgelehnt`,
            audioFile: 'neutral.mp3',
            clickAction: () => {
                const game = (window as any).game;
                if (game && game.switchTab) {
                    game.switchTab('friends');
                }
            }
        };
        
        if (targetUserId) {
            // Send cross-browser notification
            this.sendCrossBrowserNotification(targetUserId, notificationData);
        } else {
            // Local notification (existing behavior)
            // Always play audio
            this.playAudio('neutral.mp3');
            
            // Only show toast if not on Friends tab
            if (this.shouldShowToastNotification()) {
                this.showNotification({
                    id: `request-declined-${Date.now()}`,
                    ...notificationData
                });
            } else {
                console.log('🔔 Toast suppressed - user is on Friends tab');
            }
        }
    }

    public showFriendAdded(friendName: string, targetUserId?: string): void {
        const notificationData = {
            type: 'success' as NotificationType,
            title: '👥 Neuer Freund hinzugefügt',
            message: `${friendName} ist jetzt dein Freund!`,
            audioFile: 'success.mp3',
            clickAction: () => {
                const game = (window as any).game;
                if (game && game.switchTab) {
                    game.switchTab('friends');
                }
            }
        };
        
        if (targetUserId) {
            // Send cross-browser notification
            this.sendCrossBrowserNotification(targetUserId, notificationData);
        } else {
            // Local notification (existing behavior)
            // Always play audio
            this.playAudio('success.mp3');
            
            // Only show toast if not on Friends tab
            if (this.shouldShowToastNotification()) {
                this.showNotification({
                    id: `friend-added-${Date.now()}`,
                    ...notificationData
                });
            } else {
                console.log('🔔 Toast suppressed - user is on Friends tab');
            }
        }
    }

    private injectStyles(): void {
        if (document.getElementById('notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            }

            .notification {
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid #333;
                border-radius: 12px;
                margin-bottom: 10px;
                min-width: 320px;
                max-width: 400px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: auto;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }

            .notification.show {
                opacity: 1;
                transform: translateX(0);
            }

            .notification.hide {
                opacity: 0;
                transform: translateX(100%);
            }

            .notification-content {
                display: flex;
                align-items: flex-start;
                padding: 16px;
                gap: 12px;
            }

            .notification-icon {
                font-size: 24px;
                flex-shrink: 0;
                margin-top: 2px;
            }

            .notification-text {
                flex: 1;
                min-width: 0;
            }

            .notification-title {
                color: #fff;
                font-weight: 600;
                font-size: 16px;
                margin-bottom: 4px;
                line-height: 1.2;
            }

            .notification-message {
                color: #ccc;
                font-size: 14px;
                line-height: 1.4;
                word-wrap: break-word;
            }

            .notification-close {
                background: none;
                border: none;
                color: #999;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s;
            }

            .notification-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            .notification-success {
                border-left: 4px solid #28a745;
            }

            .notification-info {
                border-left: 4px solid #17a2b8;
            }

            .notification-warning {
                border-left: 4px solid #ffc107;
            }

            .notification-error {
                border-left: 4px solid #dc3545;
            }

            .notification:hover {
                transform: translateX(-5px);
                box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
            }

            @media (max-width: 768px) {
                .notification-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                }

                .notification {
                    min-width: auto;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Make globally accessible
declare global {
    interface Window {
        notificationService?: NotificationService;
    }
}

// Export singleton instance
export const notificationService = new NotificationService();
(window as any).notificationService = notificationService;