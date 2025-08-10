import { Monster } from '../models/Monster.js';
import { DatabaseService } from '../services/DatabaseService.js';
import type { GameStateData, MonsterData, FirebaseGameData, UserProfile, GameManagerType } from '../types.js';

// Utility function to clean undefined values for Firestore
const cleanDataForFirestore = (obj: any): any => {
    if (obj === null || obj === undefined) {
        return null;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(cleanDataForFirestore);
    }
    
    if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = cleanDataForFirestore(value);
            }
        }
        return cleaned;
    }
    
    return obj;
};

export class FirebaseSaveManager {
    private game: GameManagerType;
    private databaseService: DatabaseService;
    private autoSaveInterval: NodeJS.Timeout | null = null;
    private isOnline: boolean = navigator.onLine;
    private pendingSave: boolean = false;
    private lastSaveTime: string | null = null;

    constructor(game: GameManagerType) {
        this.game = game;
        this.databaseService = new DatabaseService();
        
        this.setupNetworkListeners();
    }

    private setupNetworkListeners(): void {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Connection restored - syncing data...');
            if (this.pendingSave) {
                this.saveGameData();
            }
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Connection lost - switching to offline mode');
        });
    }

    public async loadGameData(user: UserProfile | null = null): Promise<void> {
        if (!user) {
            // Not authenticated - try to load from localStorage for offline access
            this.loadFromLocalStorage();
            return;
        }

        try {
            // Try to load from Firebase first
            const firebaseData = await this.databaseService.getGameData(user.uid);
            
            if (firebaseData) {
                // Firebase data exists - use it
                this.applyFirebaseGameData(firebaseData);
                
                // Also save to localStorage as backup
                this.saveToLocalStorage();
                
                console.log('💾 Game data loaded from Firebase');
            } else {
                // No Firebase data - check if user has existing local data
                const hasLocalData = this.hasLocalStorageData();
                
                if (hasLocalData) {
                    // Migrate local data to Firebase
                    await this.migrateLocalDataToFirebase(user);
                } else {
                    // New user - initialize starter cards
                    this.game.initializeStarterCards();
                    await this.saveGameData();
                }
            }
        } catch (error) {
            console.error('❌ Failed to load from Firebase, using local storage:', error);
            this.loadFromLocalStorage();
        }
    }

    private async migrateLocalDataToFirebase(user: UserProfile): Promise<void> {
        try {
            console.log('🔄 Migrating local data to Firebase...');
            
            // Load existing local data
            this.loadFromLocalStorage();
            
            // Save to Firebase
            await this.saveGameData();
            
            console.log('✅ Local data migrated to Firebase successfully');
            this.game.ui.showSaveIndicator('📤 Lokale Daten erfolgreich synchronisiert!', 'success');
        } catch (error) {
            console.error('❌ Failed to migrate local data:', error);
            this.game.ui.showSaveIndicator('⚠️ Warnung: Synchronisation teilweise fehlgeschlagen', 'error');
        }
    }

    public async saveGameData(): Promise<void> {
        const currentUser = this.getCurrentUser();
        
        if (!currentUser) {
            // Not authenticated - save to localStorage only
            this.saveToLocalStorage();
            return;
        }

        if (!this.isOnline) {
            // Offline - save to localStorage and mark as pending
            this.saveToLocalStorage();
            this.pendingSave = true;
            this.game.ui.showSaveIndicator('📴 Offline gespeichert - wird später synchronisiert', 'success');
            return;
        }

        try {
            const gameData: FirebaseGameData = {
                coins: this.game.coins,
                collection: this.game.collection.map((card: any): MonsterData => {
                    // Check if card has toData method (Monster instance)
                    if (typeof card.toData === 'function') {
                        return card.toData();
                    }
                    // Fallback: card is already a plain object (MonsterData)
                    return {
                        id: card.id,
                        name: card.name,
                        emoji: card.emoji,
                        attack: card.attack,
                        defense: card.defense,
                        health: card.health,
                        rarity: card.rarity,
                        description: card.description,
                        image: card.image
                    } as MonsterData;
                }),
                deck: this.game.deck.map((card: any): MonsterData => {
                    // Check if card has toData method (Monster instance)
                    if (typeof card.toData === 'function') {
                        return card.toData();
                    }
                    // Fallback: card is already a plain object (MonsterData)
                    return {
                        id: card.id,
                        name: card.name,
                        emoji: card.emoji,
                        attack: card.attack,
                        defense: card.defense,
                        health: card.health,
                        rarity: card.rarity,
                        description: card.description,
                        image: card.image
                    } as MonsterData;
                }),
                lastSaved: new Date().toISOString()
            };

            // Clean data for Firestore (remove undefined values)
            const cleanedGameData = cleanDataForFirestore(gameData) as FirebaseGameData;
            
            // Save to Firebase
            await this.databaseService.saveGameData(currentUser.uid, cleanedGameData);
            
            // Also save to localStorage as backup
            this.saveToLocalStorage();
            
            this.pendingSave = false;
            this.lastSaveTime = gameData.lastSaved;
            this.updateSaveStatus('Firebase');
            
            console.log('💾 Game data saved to Firebase');
        } catch (error) {
            console.error('❌ Failed to save to Firebase:', error);
            
            // Fallback to localStorage
            this.saveToLocalStorage();
            this.pendingSave = true;
            
            this.game.ui.showSaveIndicator('⚠️ Cloud-Speicherung fehlgeschlagen - lokal gespeichert', 'error');
        }
    }

    private applyFirebaseGameData(data: FirebaseGameData): void {
        this.game.coins = data.coins || 100;
        
        this.game.collection = data.collection ? data.collection.map(cardData => 
            new Monster(cardData.name, cardData.emoji, cardData.attack, 
                       cardData.defense, cardData.health, cardData.rarity, cardData.description, cardData.image)
        ) : [];
        
        this.game.deck = data.deck ? data.deck.map(cardData => 
            new Monster(cardData.name, cardData.emoji, cardData.attack, 
                       cardData.defense, cardData.health, cardData.rarity, cardData.description, cardData.image)
        ) : [];

        this.lastSaveTime = data.lastSaved;

        // Initialize starter cards if collection is empty
        if (this.game.collection.length === 0) {
            this.game.initializeStarterCards();
        }
    }

    private loadFromLocalStorage(): void {
        try {
            const savedData = localStorage.getItem('monsterTCG-gameData');
            if (savedData) {
                const data: GameStateData = JSON.parse(savedData);
                
                this.game.coins = data.coins || 100;
                this.game.collection = data.collection ? data.collection.map(cardData => 
                    new Monster(cardData.name, cardData.emoji, cardData.attack, 
                               cardData.defense, cardData.health, cardData.rarity, cardData.description, cardData.image)
                ) : [];
                
                this.game.deck = data.deck ? data.deck.map(cardData => 
                    new Monster(cardData.name, cardData.emoji, cardData.attack, 
                               cardData.defense, cardData.health, cardData.rarity, cardData.description, cardData.image)
                ) : [];
                
                this.lastSaveTime = data.lastSaved;

                if (this.game.collection.length === 0) {
                    this.game.initializeStarterCards();
                }
            } else {
                this.game.initializeStarterCards();
            }
        } catch (error) {
            console.warn('Fehler beim Laden von localStorage:', error);
            this.game.initializeStarterCards();
        }
    }

    private saveToLocalStorage(): void {
        try {
            const gameData: GameStateData = {
                coins: this.game.coins,
                collection: this.game.collection.map((card: any): MonsterData => {
                    // Check if card has toData method (Monster instance)
                    if (typeof card.toData === 'function') {
                        return card.toData();
                    }
                    // Fallback: card is already a plain object (MonsterData)
                    return {
                        id: card.id,
                        name: card.name,
                        emoji: card.emoji,
                        attack: card.attack,
                        defense: card.defense,
                        health: card.health,
                        rarity: card.rarity,
                        description: card.description,
                        image: card.image
                    } as MonsterData;
                }),
                deck: this.game.deck.map((card: any): MonsterData => {
                    // Check if card has toData method (Monster instance)
                    if (typeof card.toData === 'function') {
                        return card.toData();
                    }
                    // Fallback: card is already a plain object (MonsterData)
                    return {
                        id: card.id,
                        name: card.name,
                        emoji: card.emoji,
                        attack: card.attack,
                        defense: card.defense,
                        health: card.health,
                        rarity: card.rarity,
                        description: card.description,
                        image: card.image
                    } as MonsterData;
                }),
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem('monsterTCG-gameData', JSON.stringify(gameData));
            this.updateSaveStatus('localStorage');
        } catch (error) {
            console.error('Fehler beim lokalen Speichern:', error);
        }
    }

    private hasLocalStorageData(): boolean {
        const savedData = localStorage.getItem('monsterTCG-gameData');
        return savedData !== null;
    }

    private getCurrentUser(): UserProfile | null {
        // Get current user from game's auth system
        return (this.game as any).authManager?.getCurrentUser() || null;
    }

    public startAutoSave(): void {
        // Auto-Save every 30 seconds (increased from 10 for Firebase)
        this.autoSaveInterval = setInterval(() => {
            this.saveGameData();
        }, 30000);
    }

    public stopAutoSave(): void {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    public async manualSave(): Promise<void> {
        await this.saveGameData();
        
        const currentUser = this.getCurrentUser();
        const saveLocation = currentUser && this.isOnline ? 'Cloud' : 'lokal';
        
        this.game.ui.showSaveIndicator(`💾 Spiel ${saveLocation} gespeichert!`, 'success');
    }

    public exportSaveData(): void {
        try {
            const gameData = {
                coins: this.game.coins,
                collection: this.game.collection.map((card: Monster) => card.toData()),
                deck: this.game.deck.map((card: Monster) => card.toData()),
                exportDate: new Date().toISOString(),
                exportType: 'Monster TCG Save File',
                version: '2.0'
            };
            
            const dataStr = JSON.stringify(gameData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `monster-tcg-save-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.game.ui.showSaveIndicator('📤 Spielstand exportiert!', 'success');
        } catch (error) {
            this.game.ui.showSaveIndicator('❌ Export fehlgeschlagen!', 'error');
        }
    }

    public importSaveData(file: File): void {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e: ProgressEvent<FileReader>) => {
            try {
                if (!e.target?.result) return;
                
                const data = JSON.parse(e.target.result as string);
                
                this.game.coins = data.coins || 100;
                
                // Convert imported data to Monster instances
                this.game.collection = (data.collection || []).map((cardData: MonsterData) => 
                    new Monster(cardData.name, cardData.emoji, cardData.attack, 
                               cardData.defense, cardData.health, cardData.rarity, cardData.description, cardData.image)
                );
                
                this.game.deck = (data.deck || []).map((cardData: MonsterData) => 
                    new Monster(cardData.name, cardData.emoji, cardData.attack, 
                               cardData.defense, cardData.health, cardData.rarity, cardData.description, cardData.image)
                );
                
                // Update UI
                this.game.ui.updateDisplay();
                this.game.deckManager.updateDeckBuilder();
                
                // Save the imported data
                await this.saveGameData();
                
                this.game.ui.showSaveIndicator('📥 Spielstand erfolgreich importiert!', 'success');
            } catch (error) {
                console.error('Import error:', error);
                this.game.ui.showSaveIndicator('❌ Import fehlgeschlagen - Ungültige Datei!', 'error');
            }
        };
        reader.readAsText(file);
    }

    public async resetGame(): Promise<void> {
        const currentUser = this.getCurrentUser();
        const resetMessage = currentUser 
            ? '🔄 Möchtest du wirklich das komplette Spiel zurücksetzen? Alle Cloud- und lokalen Fortschritte gehen verloren!'
            : '🔄 Möchtest du wirklich das komplette Spiel zurücksetzen? Alle lokalen Fortschritte gehen verloren!';
            
        if (confirm(resetMessage)) {
            try {
                // Clear localStorage
                localStorage.removeItem('monsterTCG-gameData');
                
                // If authenticated, reset Firebase data too
                if (currentUser) {
                    const emptyGameData: FirebaseGameData = {
                        coins: 100,
                        collection: [],
                        deck: [],
                        lastSaved: new Date().toISOString()
                    };
                    await this.databaseService.saveGameData(currentUser.uid, emptyGameData);
                }
                
                // Reload page
                location.reload();
            } catch (error) {
                console.error('Reset failed:', error);
                this.game.ui.showSaveIndicator('❌ Reset fehlgeschlagen!', 'error');
            }
        }
    }

    public setupRealTimeSync(user: UserProfile): void {
        // Subscribe to real-time updates from Firebase
        this.databaseService.subscribeToGameData(user.uid, (gameData: FirebaseGameData | null) => {
            if (gameData && gameData.lastSaved !== this.lastSaveTime) {
                console.log('🔄 Received real-time update from Firebase');
                this.applyFirebaseGameData(gameData);
                this.game.ui.updateDisplay();
                this.game.ui.showSaveIndicator('🔄 Daten automatisch synchronisiert', 'success');
            }
        });
    }

    public stopRealTimeSync(user: UserProfile): void {
        this.databaseService.unsubscribeFromGameData(user.uid);
    }

    private updateSaveStatus(location: 'Firebase' | 'localStorage'): void {
        const statusElement = document.getElementById('last-save-time');
        if (statusElement && this.lastSaveTime) {
            const saveTime = new Date(this.lastSaveTime);
            const locationIcon = location === 'Firebase' ? '☁️' : '💻';
            statusElement.textContent = `${locationIcon} ${saveTime.toLocaleTimeString()}`;
        }
        
        // Update auto-save status
        const autoSaveElement = document.getElementById('auto-save-status');
        if (autoSaveElement) {
            const status = this.isOnline && this.getCurrentUser() ? 'Cloud-Sync Aktiv' : 'Lokal Aktiv';
            const statusClass = this.isOnline && this.getCurrentUser() ? 'save-status-active' : 'save-status-local';
            autoSaveElement.textContent = status;
            autoSaveElement.className = statusClass;
        }
    }

    public getSaveStatus(): { location: string; isOnline: boolean; lastSaved?: string } {
        const currentUser = this.getCurrentUser();
        return {
            location: currentUser && this.isOnline ? 'Firebase' : 'localStorage',
            isOnline: this.isOnline,
            lastSaved: this.lastSaveTime || undefined
        };
    }

    public destroy(): void {
        this.stopAutoSave();
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            this.stopRealTimeSync(currentUser);
        }
        this.databaseService.unsubscribeAll();
    }
}