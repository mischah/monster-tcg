import { Monster } from './models/Monster.js';
import { getRandomMonsterByRarity } from './data/MonsterDatabase.js';
import { ShopManager } from './managers/ShopManager.js';
import { BattleManager } from './managers/BattleManager.js';
import { DeckManager } from './managers/DeckManager.js';
import { CollectionManager } from './managers/CollectionManager.js';
import { SaveManager } from './managers/SaveManager.js';
import { UIManager } from './ui/UIManager.js';

export class Game {
    constructor() {
        // Game State
        this.coins = 100;
        this.collection = [];
        this.deck = [];
        
        // Initialize Managers
        this.ui = new UIManager(this);
        this.shopManager = new ShopManager(this);
        this.battleManager = new BattleManager(this);
        this.deckManager = new DeckManager(this);
        this.collectionManager = new CollectionManager(this);
        this.saveManager = new SaveManager(this);
        
        // Load game data or initialize starter cards
        this.saveManager.loadGameData();
        this.ui.initializeEventListeners();
        this.ui.updateDisplay();
        
        // Initialize shop displays
        this.shopManager.initializeBoosterDisplays();
        
        // Initialize drag & drop for deck builder
        this.deckManager.initializeDragAndDrop();
        
        // Start auto-save
        this.saveManager.startAutoSave();
    }

    initializeStarterCards() {
        // Starter-Deck mit 5 Karten
        for (let i = 0; i < 5; i++) {
            const monsterData = getRandomMonsterByRarity("common");
            this.collection.push(new Monster(
                monsterData.name, monsterData.emoji, monsterData.attack,
                monsterData.defense, monsterData.health, monsterData.rarity,
                monsterData.description, monsterData.image
            ));
        }
    }

    switchTab(tab) {
        // Tab-Buttons aktualisieren
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Tab-Content aktualisieren
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tab).classList.add('active');

        // Spezielle Updates für verschiedene Tabs
        if (tab === 'collection') {
            this.collectionManager.displayCollection();
        } else if (tab === 'battle') {
            this.battleManager.updateBattleMonsterSelect();
        } else if (tab === 'deck') {
            this.deckManager.updateDeckBuilder();
        } else if (tab === 'shop') {
            this.updateShopDisplay();
        }
    }

    updateShopDisplay() {
        // Überprüfe ob Displays initialisiert sind
        const basicDisplay = document.querySelector('.basic-display');
        if (!basicDisplay || basicDisplay.children.length === 0) {
            this.shopManager.initializeBoosterDisplays();
        }
        
        // Update Verfügbarkeit basierend auf Münzen
        this.shopManager.updatePackAvailability();
        
        // Update Shop-Statistiken
        this.shopManager.updateShopStats();
    }
}
