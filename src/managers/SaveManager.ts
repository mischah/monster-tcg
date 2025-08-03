import { Monster } from '../models/Monster.js';
import type { GameStateData, MonsterData } from '../types.js';

export class SaveManager {
    private game: any;
    private autoSaveInterval: NodeJS.Timeout | null = null;

    constructor(game: any) {
        this.game = game;
    }

    public loadGameData(): void {
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
                
                // Wenn keine Sammlung vorhanden, Starter-Karten initialisieren
                if (this.game.collection.length === 0) {
                    this.game.initializeStarterCards();
                }
            } else {
                // Neues Spiel - Starter-Karten initialisieren
                this.game.initializeStarterCards();
            }
        } catch (error) {
            console.warn('Fehler beim Laden der Spielstände:', error);
            this.game.initializeStarterCards();
        }
    }

    public saveGameData(): void {
        try {
            const gameData: GameStateData = {
                coins: this.game.coins,
                collection: this.game.collection.map((card: Monster): MonsterData => card.toData()),
                deck: this.game.deck.map((card: Monster): MonsterData => card.toData()),
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem('monsterTCG-gameData', JSON.stringify(gameData));
            this.updateSaveStatus();
        } catch (error) {
            console.error('Fehler beim Speichern:', error);
        }
    }

    public startAutoSave(): void {
        // Auto-Save alle 10 Sekunden
        this.autoSaveInterval = setInterval(() => {
            this.saveGameData();
        }, 10000);
    }

    public stopAutoSave(): void {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    public manualSave(): void {
        this.saveGameData();
        this.game.ui.showSaveIndicator('💾 Spiel manuell gespeichert!', 'success');
    }

    public exportSaveData(): void {
        try {
            const gameData = {
                coins: this.game.coins,
                collection: this.game.collection,
                deck: this.game.deck,
                exportDate: new Date().toISOString()
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
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                if (!e.target?.result) return;
                
                const data = JSON.parse(e.target.result as string);
                
                this.game.coins = data.coins || 100;
                this.game.collection = data.collection || [];
                this.game.deck = data.deck || [];
                
                this.game.ui.updateDisplay();
                this.game.deckManager.updateDeckBuilder();
                this.saveGameData();
                
                this.game.ui.showSaveIndicator('📥 Spielstand importiert!', 'success');
            } catch (error) {
                this.game.ui.showSaveIndicator('❌ Import fehlgeschlagen!', 'error');
            }
        };
        reader.readAsText(file);
    }

    public resetGame(): void {
        if (confirm('🔄 Möchtest du wirklich das komplette Spiel zurücksetzen? Alle Fortschritte gehen verloren!')) {
            localStorage.removeItem('monsterTCG-gameData');
            location.reload();
        }
    }

    private updateSaveStatus(): void {
        const statusElement = document.getElementById('save-status');
        if (statusElement) {
            const now = new Date();
            statusElement.textContent = `Zuletzt gespeichert: ${now.toLocaleTimeString()}`;
        }
    }
}