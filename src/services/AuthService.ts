import { 
    signInWithEmailLink, 
    sendSignInLinkToEmail, 
    isSignInWithEmailLink,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import { auth } from '../config/firebase.js';
import { DatabaseService } from './DatabaseService.js';
import { presenceService } from './PresenceService.js';
import type { EmailLinkAuthResult, UserProfile, AuthState } from '../types.js';

export class AuthService {
    private authState: AuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null
    };

    private authStateListeners: Array<(authState: AuthState) => void> = [];
    private databaseService: DatabaseService;

    constructor() {
        this.databaseService = new DatabaseService();
        this.initializeAuthListener();
    }

    private initializeAuthListener(): void {
        onAuthStateChanged(auth, async (user: User | null) => {
            this.authState.isLoading = true;
            this.notifyAuthStateListeners();

            if (user) {
                try {
                    // Try to load existing user profile from database
                    let userProfile = await this.loadUserProfileFromDatabase(user);
                    
                    if (!userProfile) {
                        // Create default profile if none exists
                        userProfile = this.createDefaultUserProfile(user);
                        
                        // Save the new profile to database
                        await this.databaseService.createUserProfile(userProfile, {
                            coins: 100,
                            collection: [],
                            deck: [],
                            lastSaved: new Date().toISOString()
                        });
                    }

                    this.authState = {
                        user: userProfile,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    };

                    // Set user as online in presence system
                    await presenceService.setUserOnline(userProfile.uid);
                } catch (error) {
                    console.error('Error loading user profile:', error);
                    
                    // Fallback: create basic profile without database save
                    const fallbackProfile = this.createDefaultUserProfile(user);
                    this.authState = {
                        user: fallbackProfile,
                        isAuthenticated: true,
                        isLoading: false,
                        error: 'Profile loaded with limited functionality'
                    };
                }
            } else {
                // User logged out - set offline and cleanup presence
                if (this.authState.user) {
                    await presenceService.setUserOffline(this.authState.user.uid);
                    presenceService.cleanup();
                }

                this.authState = {
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null
                };
            }

            this.notifyAuthStateListeners();
        });
    }

    public async sendEmailLink(email: string): Promise<EmailLinkAuthResult> {
        try {
            const actionCodeSettings = {
                url: window.location.href,
                handleCodeInApp: true
            };

            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            
            // Store email in localStorage for the sign-in flow
            localStorage.setItem('emailForSignIn', email);
            
            return { success: true };
        } catch (error: any) {
            console.error('Error sending email link:', error);
            
            let errorMessage = 'Failed to send sign-in link';
            if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            } else if (error.code === 'auth/quota-exceeded') {
                errorMessage = 'Too many attempts, please try again later';
            }
            
            return { 
                success: false, 
                error: errorMessage 
            };
        }
    }

    public async completeEmailLinkSignIn(): Promise<EmailLinkAuthResult> {
        try {
            if (!isSignInWithEmailLink(auth, window.location.href)) {
                return { 
                    success: false, 
                    error: 'Invalid sign-in link' 
                };
            }

            let email = localStorage.getItem('emailForSignIn');
            
            if (!email) {
                email = window.prompt('Please provide your email for confirmation');
                if (!email) {
                    return { 
                        success: false, 
                        error: 'Email is required' 
                    };
                }
            }

            const result = await signInWithEmailLink(auth, email, window.location.href);
            
            // Clear stored email
            localStorage.removeItem('emailForSignIn');
            
            if (result.user) {
                return { success: true };
            } else {
                return { 
                    success: false, 
                    error: 'Sign-in failed' 
                };
            }
            
        } catch (error: any) {
            console.error('Error completing email link sign-in:', error);
            
            let errorMessage = 'Failed to complete sign-in';
            if (error.code === 'auth/invalid-action-code') {
                errorMessage = 'Invalid or expired sign-in link';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            }
            
            return { 
                success: false, 
                error: errorMessage 
            };
        }
    }

    public async signOut(): Promise<void> {
        try {
            // Set user offline before signing out
            if (this.authState.user) {
                await presenceService.setUserOffline(this.authState.user.uid);
                presenceService.cleanup();
            }
            
            await firebaseSignOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }

    public getAuthState(): AuthState {
        return { ...this.authState };
    }

    public onAuthStateChange(callback: (authState: AuthState) => void): () => void {
        this.authStateListeners.push(callback);
        
        // Immediately call with current state
        callback(this.getAuthState());
        
        // Return unsubscribe function
        return () => {
            const index = this.authStateListeners.indexOf(callback);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
            }
        };
    }

    private notifyAuthStateListeners(): void {
        this.authStateListeners.forEach(listener => {
            listener(this.getAuthState());
        });
    }

    private async loadUserProfileFromDatabase(user: User): Promise<UserProfile | null> {
        try {
            const firestoreProfile = await this.databaseService.getUserProfile(user.uid);
            
            if (firestoreProfile) {
                // Generate missing friend code for existing users
                let friendCode = firestoreProfile.friendCode;
                let createdAt = firestoreProfile.createdAt;
                let needsUpdate = false;
                
                if (!friendCode) {
                    friendCode = this.generateFriendCode(user.uid);
                    console.log('🔄 Generated missing friend code for existing user:', friendCode);
                    needsUpdate = true;
                }
                
                // Fix missing or invalid createdAt for existing users
                if (!createdAt || new Date(createdAt).toString() === 'Invalid Date') {
                    createdAt = new Date().toISOString();
                    console.log('🔄 Generated missing createdAt for existing user:', createdAt);
                    needsUpdate = true;
                }
                
                // Update database if any fields were missing
                if (needsUpdate) {
                    try {
                        const updates: any = {};
                        if (!firestoreProfile.friendCode) updates.friendCode = friendCode;
                        if (!firestoreProfile.createdAt || new Date(firestoreProfile.createdAt).toString() === 'Invalid Date') {
                            updates.createdAt = createdAt;
                        }
                        
                        await this.databaseService.updateUserProfile(user.uid, updates);
                        
                        if (!firestoreProfile.friendCode) {
                            await this.databaseService.updateFriendCodeMapping('', friendCode, user.uid, firestoreProfile.nickname, firestoreProfile.email);
                        }
                        
                        console.log('✅ Missing profile fields saved to database');
                    } catch (error) {
                        console.error('Failed to save missing profile fields:', error);
                    }
                }
                
                return {
                    uid: user.uid,
                    email: firestoreProfile.email,
                    nickname: firestoreProfile.nickname,
                    friendCode: friendCode,
                    createdAt: createdAt,
                    lastActive: firestoreProfile.lastActive || new Date().toISOString()
                };
            }
            
            return null;
        } catch (error) {
            console.error('Failed to load user profile from database:', error);
            return null;
        }
    }

    private createDefaultUserProfile(user: User): UserProfile {
        return {
            uid: user.uid,
            email: user.email || '',
            nickname: user.displayName || this.generateDefaultNickname(user.uid, user.email || ''),
            friendCode: this.generateFriendCode(user.uid),
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
        };
    }

    private generateDefaultNickname(uid: string, email: string): string {
        const username = email.split('@')[0];
        // Use UID hash for consistency - same UID will always generate same nickname
        let hash = 0;
        for (let i = 0; i < uid.length; i++) {
            const char = uid.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const suffix = Math.abs(hash % 1000).toString().padStart(3, '0');
        return `${username}${suffix}`;
    }

    private generateFriendCode(uid: string): string {
        // Generate a 6-character friend code from UID
        let hash = 0;
        for (let i = 0; i < uid.length; i++) {
            const char = uid.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Convert to base36 and ensure 6 characters
        const friendCode = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').substring(0, 6);
        return friendCode;
    }

    public getCurrentUser(): UserProfile | null {
        return this.authState.user;
    }

    public isAuthenticated(): boolean {
        return this.authState.isAuthenticated;
    }

    public isLoading(): boolean {
        return this.authState.isLoading;
    }
}