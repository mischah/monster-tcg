import { Monster } from './models/Monster.js';
import { getRandomMonsterByRarity } from './data/MonsterDatabase.js';
import { ShopManager } from './managers/ShopManager.js';
import { BattleManager } from './managers/BattleManager.js';
import { DeckManager } from './managers/DeckManager.js';
import { CollectionManager } from './managers/CollectionManager.js';
import { SaveManager } from './managers/SaveManager.js';
import { FirebaseSaveManager } from './managers/FirebaseSaveManager.js';
import { AuthManager } from './managers/AuthManager.js';
import { UIManager } from './ui/UIManager.js';
import { FriendsTab } from './ui/FriendsTab.js';

export class Game {
    // Game State
    public coins: number = 100;
    public collection: Monster[] = [];
    public deck: Monster[] = [];
    
    // Initialize Managers
    public ui: UIManager;
    public shopManager: ShopManager;
    public battleManager: BattleManager;
    public deckManager: DeckManager;
    public collectionManager: CollectionManager;
    public saveManager: SaveManager;
    public firebaseSaveManager: FirebaseSaveManager;
    public authManager: AuthManager;
    public friendsTab: FriendsTab;

    constructor() {
        // Initialize Managers
        this.ui = new UIManager(this);
        this.shopManager = new ShopManager(this);
        this.battleManager = new BattleManager(this);
        this.deckManager = new DeckManager(this);
        this.collectionManager = new CollectionManager(this);
        this.saveManager = new SaveManager(this);
        this.firebaseSaveManager = new FirebaseSaveManager(this);
        this.authManager = new AuthManager(this);
        this.friendsTab = new FriendsTab();
        
        // Load game data - will be handled by Firebase integration
        this.initializeGameData();
        
        // Verzögere Event-Listener Setup um sicherzustellen dass DOM bereit ist
        setTimeout(() => {
            this.ui.initializeEventListeners();
            // Nach dem Setup prüfen welcher Tab aktiv ist und entsprechend initialisieren
            this.initializeActiveTab();
        }, 100);
        
        this.ui.updateDisplay();
        
        // Update collection value
        this.collectionManager.updateCollectionValue();
        
        // Test sell system
        setTimeout(() => {
            this.collectionManager.testSellSystem();
        }, 500);
        
        // Initialize shop displays
        this.shopManager.initializeBoosterDisplays();
        
        // Initialize drag & drop for deck builder
        this.deckManager.initializeDragAndDrop();
        
        // Start auto-save with Firebase support
        this.firebaseSaveManager.startAutoSave();
        
        // Make game instance globally accessible
        (window as any).game = this;
        
        // Globale Test-Funktion für Browser-Konsole
        (window as any).testSell = () => {
            console.log('=== SELL SYSTEM TEST ===');
            console.log('Game instance:', this);
            console.log('Collection size:', this.collection.length);
            console.log('Current coins:', this.coins);
            console.log('Sell mode active:', this.collectionManager.sellModeActive);
            
            // Teste Toggle-Button
            const toggleBtn = document.getElementById('toggle-sell-mode');
            console.log('Toggle button:', toggleBtn);
            if (toggleBtn) {
                console.log('Toggle button text:', toggleBtn.textContent);
                console.log('Toggle button classList:', toggleBtn.classList.toString());
            }
            
            // Teste Modal
            const sellModal = document.getElementById('card-sell-modal');
            console.log('Sell modal:', sellModal);
            if (sellModal) {
                console.log('Modal display style:', (sellModal as HTMLElement).style.display);
            }
            
            // Teste Collection Value
            const valueElement = document.getElementById('collection-value');
            console.log('Collection value element:', valueElement);
            if (valueElement) {
                console.log('Collection value text:', valueElement.textContent);
            }
            
            // Teste Event-Listener
            if (toggleBtn) {
                console.log('Testing toggle button click...');
                toggleBtn.click();
            }
        };
        
        // Trading-System Test-Funktion
        (window as any).testTrading = () => {
            console.log('=== TRADING SYSTEM TEST ===');
            console.log('Game instance:', this);
            console.log('Trading mode active:', this.collectionManager.tradingModeActive);
            
            // Teste Trading Toggle-Button
            const tradingBtn = document.getElementById('toggle-trading-mode');
            console.log('Trading button:', tradingBtn);
            if (tradingBtn) {
                console.log('Trading button text:', tradingBtn.textContent);
                console.log('Trading button classList:', tradingBtn.classList.toString());
                console.log('Trading button onclick:', tradingBtn.onclick);
            }
            
            // Teste Trading Bar
            const tradingBar = document.getElementById('trading-bar');
            console.log('Trading bar:', tradingBar);
            if (tradingBar) {
                console.log('Trading bar display:', (tradingBar as HTMLElement).style.display);
                console.log('Trading bar classList:', tradingBar.classList.toString());
            }
            
            // Teste Event-Listener
            if (tradingBtn) {
                console.log('Testing trading button click...');
                tradingBtn.click();
            }
            
            // Teste Collection Manager Methoden
            console.log('toggleTradingMode method:', this.collectionManager.toggleTradingMode);
            
            // Test CollectionManager direkt
            console.log('Direct test: calling toggleTradingMode() …');
            this.collectionManager.toggleTradingMode();
        };
    }

    private async initializeGameData(): Promise<void> {
        // Wait a bit for auth state to be determined
        setTimeout(async () => {
            const currentUser = this.authManager.getCurrentUser();
            await this.firebaseSaveManager.loadGameData(currentUser);
            
            // Update UI after loading
            this.ui.updateDisplay();
            this.collectionManager.updateCollectionValue();
        }, 500);
    }

    private initializeActiveTab(): void {
        // Finde heraus, welcher Tab aktuell aktiv ist
        const activeTab = document.querySelector('.tab-content.active') as HTMLElement;
        if (activeTab) {
            const tabId = activeTab.id;
            console.log('Initializing active tab:', tabId);
            
            // Rufe entsprechende Initialisierung für den aktiven Tab auf
            if (tabId === 'collection') {
                this.collectionManager.displayCollection();
            } else if (tabId === 'battle') {
                this.battleManager.updateBattleMonsterSelect();
            } else if (tabId === 'deck') {
                this.deckManager.updateDeckBuilder();
            } else if (tabId === 'shop') {
                this.updateShopDisplay();
            }
        }
    }

    public initializeStarterCards(): void {
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

    public switchTab(tab: string): void {
        console.log('🔧 DEBUG: switchTab called with:', tab);
        
        // Tab-Buttons aktualisieren
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const tabButton = document.querySelector(`[data-tab="${tab}"]`);
        console.log('🔧 DEBUG: Found tab button:', !!tabButton);
        if (tabButton) {
            tabButton.classList.add('active');
        }

        // Tab-Content aktualisieren
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const tabContent = document.getElementById(tab);
        console.log('🔧 DEBUG: Found tab content element:', !!tabContent);
        if (tabContent) {
            tabContent.classList.add('active');
        }

        // Spezielle Updates für verschiedene Tabs
        if (tab === 'collection') {
            this.collectionManager.displayCollection();
        } else if (tab === 'battle') {
            this.battleManager.updateBattleMonsterSelect();
        } else if (tab === 'deck') {
            this.deckManager.updateDeckBuilder();
        } else if (tab === 'shop') {
            this.updateShopDisplay();
        } else if (tab === 'friends') {
            console.log('🔧 DEBUG: Calling initializeFriendsTab()');
            this.initializeFriendsTab();
        }
    }

    private updateShopDisplay(): void {
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

    private initializeFriendsTab(): void {
        console.log('🔧 DEBUG: initializeFriendsTab called');
        console.log('🔧 DEBUG: friendsTab instance:', this.friendsTab);
        this.friendsTab.initialize();
        console.log('🔧 DEBUG: friendsTab.initialize() completed');
    }
}