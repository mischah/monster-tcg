import { Monster } from '../models/Monster.js';

export class SaveManager {
    constructor(game) {
        this.game = game;
        this.autoSaveInterval = null;
    }

    loadGameData() {
        try {
            const savedData = localStorage.getItem('monsterTCG-gameData');
            if (savedData) {
                const data = JSON.parse(savedData);
                
                this.game.coins = data.coins || 100;
                this.game.collection = data.collection ? data.collection.map(cardData => 
                    new Monster(cardData.name, cardData.emoji, cardData.attack, 
                               cardData.defense, cardData.maxHealth, cardData.rarity, cardData.description)
                ) : [];
                
                this.game.deck = data.deck ? data.deck.map(cardData => 
                    new Monster(cardData.name, cardData.emoji, cardData.attack, 
                               cardData.defense, cardData.maxHealth, cardData.rarity, cardData.description)
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

    saveGameData() {
        try {
            const gameData = {
                coins: this.game.coins,
                collection: this.game.collection.map(card => ({
                    name: card.name,
                    emoji: card.emoji,
                    attack: card.attack,
                    defense: card.defense,
                    maxHealth: card.maxHealth,
                    rarity: card.rarity,
                    description: card.description
                })),
                deck: this.game.deck.map(card => ({
                    name: card.name,
                    emoji: card.emoji,
                    attack: card.attack,
                    defense: card.defense,
                    maxHealth: card.maxHealth,
                    rarity: card.rarity,
                    description: card.description
                })),
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem('monsterTCG-gameData', JSON.stringify(gameData));
            this.updateSaveStatus();
        } catch (error) {
            console.error('Fehler beim Speichern:', error);
        }
    }

    startAutoSave() {
        // Auto-Save alle 10 Sekunden
        this.autoSaveInterval = setInterval(() => {
            this.saveGameData();
        }, 10000);
    }

    manualSave() {
        this.saveGameData();
        this.game.ui.showSaveIndicator('💾 Spiel manuell gespeichert!', 'success');
    }

    exportSaveData() {
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

    importSaveData(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
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

    resetGame() {
        if (confirm('🔄 Möchtest du wirklich das komplette Spiel zurücksetzen? Alle Fortschritte gehen verloren!')) {
            localStorage.removeItem('monsterTCG-gameData');
            location.reload();
        }
    }

    updateSaveStatus() {
        const statusElement = document.getElementById('save-status');
        if (statusElement) {
            const now = new Date();
            statusElement.textContent = `Zuletzt gespeichert: ${now.toLocaleTimeString()}`;
        }
    }
}
