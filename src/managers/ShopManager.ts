import { Monster } from '../models/Monster.js';
import { getRandomMonsterByRarity } from '../data/MonsterDatabase.js';
import type { PackType, Rarity, SaveIndicatorType } from '../types.js';

type PackConfig = {
    cost: number;
    cardCount: number;
    guaranteedRare: boolean | Rarity;
};

export class ShopManager {
    private game: any;
    private autoRestockTimers: Map<PackType, NodeJS.Timeout> = new Map();
    private autoRestockEnabled: boolean = true;
    private restockDelay: number = 60000; // 1 Minute in Millisekunden

    constructor(game: any) {
        this.game = game;
    }

    public initializeBoosterDisplays(): void {
        // Generiere 30 Booster für jeden Typ
        this.generateBoosterDisplay('basic', 30);
        this.generateBoosterDisplay('premium', 30);
        this.generateBoosterDisplay('legendary', 30);
    }

    public generateBoosterDisplay(packType: PackType, count: number): void {
        const display = document.querySelector(`.${packType}-display`);
        if (!display) return;
        
        display.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const pack = this.createDisplayPack(packType, i);
            display.appendChild(pack);
        }
    }

    private createDisplayPack(packType: PackType, index: number): HTMLElement {
        const pack = document.createElement('div');
        pack.className = `display-pack ${packType}-pack`;
        pack.dataset.packType = packType;
        pack.dataset.packIndex = index.toString();
        
        // Pack-spezifische Icons mit CSS-Klassen
        const packIcons: Record<PackType, string> = {
            'basic': '<div class="pack-icon pack-basic">📦</div>',
            'premium': '<div class="pack-icon pack-premium">✨</div>',
            'legendary': '<div class="pack-icon pack-legendary">🌟</div>'
        };
        
        pack.innerHTML = `
            ${packIcons[packType]}
            <div class="pack-number">#${index + 1}</div>
        `;
        
        pack.addEventListener('click', () => {
            if (!pack.classList.contains('sold-out')) {
                this.buyPackFromDisplay(packType, pack);
            }
        });
        
        return pack;
    }

    public updatePackAvailability(): void {
        this.updatePackAvailabilityByType('basic', 50);
        this.updatePackAvailabilityByType('premium', 100);
        this.updatePackAvailabilityByType('legendary', 250);
    }

    private updatePackAvailabilityByType(packType: PackType, cost: number): void {
        document.querySelectorAll(`.${packType}-pack`).forEach(pack => {
            if (!pack.classList.contains('sold-out')) {
                const htmlElement = pack as HTMLElement;
                if (this.game.coins < cost) {
                    htmlElement.style.opacity = '0.5';
                    htmlElement.style.cursor = 'not-allowed';
                } else {
                    htmlElement.style.opacity = '1';
                    htmlElement.style.cursor = 'pointer';
                }
            }
        });
    }

    public buyPack(packType: PackType): boolean {
        const config = this.getPackConfig(packType);
        
        if (this.game.coins < config.cost) {
            this.game.ui.showSaveIndicator('💸 Nicht genügend Münzen!', 'error');
            return false;
        }

        this.game.coins -= config.cost;
        
        // Karten generieren basierend auf Pack-Typ
        const newCards = this.generatePackCards(packType, config.cardCount, config.guaranteedRare);

        // Karten zur Sammlung hinzufügen
        this.game.collection.push(...newCards);
        
        // Pack-Opening Animation starten
        this.showPackOpening(newCards, packType);
        this.game.ui.updateDisplay();
        
        return true;
    }

    private getPackConfig(packType: PackType): PackConfig {
        const configs: Record<PackType, PackConfig> = {
            'basic': { cost: 50, cardCount: 5, guaranteedRare: false },
            'premium': { cost: 100, cardCount: 5, guaranteedRare: true },
            'legendary': { cost: 250, cardCount: 3, guaranteedRare: 'legendary' }
        };
        
        return configs[packType];
    }

    private generatePackCards(packType: PackType, cardCount: number, guaranteedRare: boolean | Rarity): Monster[] {
        const newCards: Monster[] = [];
        
        for (let i = 0; i < cardCount; i++) {
            let rarity: Rarity | null = null;
            
            if (packType === 'premium' && i === 0) {
                // Premium-Pack: Erste Karte garantiert selten+
                const rand = Math.random();
                if (rand < 0.6) rarity = "rare";
                else if (rand < 0.85) rarity = "epic";
                else rarity = "legendary";
            } else if (packType === 'legendary') {
                // Legendärer Pack: Höhere Qualität
                if (i === 0) {
                    rarity = "legendary"; // Erste Karte garantiert legendär
                } else {
                    const rand = Math.random();
                    if (rand < 0.5) rarity = "epic";
                    else rarity = "legendary";
                }
            }
            
            const monsterData = getRandomMonsterByRarity(rarity);
            newCards.push(new Monster(
                monsterData.name, monsterData.emoji, monsterData.attack,
                monsterData.defense, monsterData.health, monsterData.rarity,
                monsterData.description, monsterData.image
            ));
        }
        
        return newCards;
    }

    private showPackOpening(cards: Monster[], packType: PackType): void {
        const modal = document.getElementById('pack-opening');
        const revealedCardsContainer = document.getElementById('revealed-cards');
        const collectBtn = document.getElementById('collect-cards');
        
        if (!modal || !revealedCardsContainer || !collectBtn) return;
        
        // Modal anzeigen
        modal.classList.remove('hidden');
        
        // Container leeren
        revealedCardsContainer.innerHTML = '';
        collectBtn.classList.add('hidden');
        
        // Pack-Type spezifische Nachrichten
        const messages: Record<PackType, string> = {
            'basic': '📦 Basis-Booster wird geöffnet...',
            'premium': '✨ Premium-Booster wird geöffnet...',
            'legendary': '🌟 Legendärer Booster wird geöffnet...'
        };
        
        const titleElement = document.querySelector('.pack-opening-content h3');
        if (titleElement) {
            titleElement.textContent = messages[packType];
        }
        
        // Animation mit Verzögerung
        setTimeout(() => {
            this.revealCards(cards);
        }, 2000);
    }

    private revealCards(cards: Monster[]): void {
        const revealedCardsContainer = document.getElementById('revealed-cards');
        const collectBtn = document.getElementById('collect-cards');
        
        if (!revealedCardsContainer || !collectBtn) return;
        
        // Spinner verstecken
        const spinner = document.querySelector('.opening-animation') as HTMLElement;
        if (spinner) {
            spinner.style.display = 'none';
        }
        
        // Titel ändern
        const titleElement = document.querySelector('.pack-opening-content h3');
        if (titleElement) {
            titleElement.textContent = '🎉 Deine neuen Karten!';
        }
        
        // Karten nacheinander enthüllen
        cards.forEach((card, index) => {
            setTimeout(() => {
                const cardElement = document.createElement('div');
                cardElement.className = `revealed-card ${card.rarity}`;
                cardElement.style.animationDelay = `${index * 0.2}s`;
                
                cardElement.innerHTML = `
                    <div class="card-emoji monster-image ${card.image}">
                        <div class="monster-symbol">${card.emoji}</div>
                    </div>
                    <div class="card-name">${card.name}</div>
                    <div class="card-rarity">${this.getRarityText(card.rarity)}</div>
                `;
                
                revealedCardsContainer.appendChild(cardElement);
                
                // Spezielle Effekte für seltene Karten
                if (card.rarity === 'legendary') {
                    this.playLegendaryEffect();
                } else if (card.rarity === 'epic') {
                    this.playEpicEffect();
                }
                
                // Nach der letzten Karte den Sammeln-Button anzeigen
                if (index === cards.length - 1) {
                    setTimeout(() => {
                        collectBtn.classList.remove('hidden');
                        this.setupCollectButton();
                    }, 500);
                }
            }, index * 600);
        });
    }

    private buyPackFromDisplay(packType: PackType, packElement: HTMLElement): void {
        const config = this.getPackConfig(packType);
        
        if (this.game.coins < config.cost) {
            this.showPurchaseIndicator(`💸 Nicht genügend Münzen! Benötigt: ${config.cost}`, 'error');
            // Shaking Animation für nicht genügend Münzen
            packElement.style.animation = 'pack-denied 0.5s ease-in-out';
            setTimeout(() => {
                packElement.style.animation = '';
            }, 500);
            return;
        }
        
        // Purchase Animation hinzufügen
        packElement.classList.add('purchasing');
        
        // Nach kurzer Animation das Pack kaufen
        setTimeout(() => {
            // Erst Pack kaufen
            const purchaseSuccess = this.buyPack(packType);
            
            if (purchaseSuccess) {
                // Pack als verkauft markieren
                packElement.classList.remove('purchasing');
                packElement.classList.add('sold-out');
                packElement.innerHTML = `
                    <div class="pack-icon sold">❌</div>
                    <div class="pack-status">Verkauft</div>
                `;
                
                // Shop-Statistiken aktualisieren
                this.updateShopStats();
                
                // Auto-Restock prüfen
                this.checkAndStartAutoRestock(packType);
                
                this.showPurchaseIndicator(`${this.getPackTypeName(packType)} gekauft!`, 'success');
            } else {
                // Bei Fehler Animation entfernen
                packElement.classList.remove('purchasing');
            }
        }, 600);
    }

    public restockBoosterDisplays(): void {
        this.initializeBoosterDisplays();
        this.game.ui.showSaveIndicator('🔄 Alle Booster-Displays wurden aufgefüllt!', 'success');
    }

    public updateShopStats(): void {
        // Zähle verfügbare Packs
        const basicAvailable = document.querySelectorAll('.basic-pack:not(.sold-out)').length;
        const premiumAvailable = document.querySelectorAll('.premium-pack:not(.sold-out)').length;
        const legendaryAvailable = document.querySelectorAll('.legendary-pack:not(.sold-out)').length;
        
        // Update UI falls Shop-Stats-Elemente existieren
        const basicCountElement = document.getElementById('basic-pack-count');
        const premiumCountElement = document.getElementById('premium-pack-count');
        const legendaryCountElement = document.getElementById('legendary-pack-count');
        
        if (basicCountElement) basicCountElement.textContent = basicAvailable.toString();
        if (premiumCountElement) premiumCountElement.textContent = premiumAvailable.toString();
        if (legendaryCountElement) legendaryCountElement.textContent = legendaryAvailable.toString();
    }

    private getPackTypeName(packType: PackType): string {
        const names: Record<PackType, string> = {
            'basic': 'Basis-Booster',
            'premium': 'Premium-Booster',
            'legendary': 'Legendärer Booster'
        };
        return names[packType] || 'Booster';
    }

    private showPurchaseIndicator(message: string, type: SaveIndicatorType = 'success'): void {
        if (type === 'success') {
            // Erstelle eine spezielle Purchase Success Anzeige
            const indicator = document.createElement('div');
            indicator.className = 'pack-purchase-success';
            indicator.innerHTML = `✅ ${message}`;
            document.body.appendChild(indicator);
            
            // Entferne nach Animation
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 2500);
        } else {
            // Für Fehler verwende das normale System
            this.game.ui.showSaveIndicator(message, type);
        }
    }

    private getRarityText(rarity: Rarity): string {
        const rarityTexts: Record<Rarity, string> = {
            'common': 'Häufig',
            'rare': 'Selten',
            'epic': 'Episch',
            'legendary': 'Legendär'
        };
        return rarityTexts[rarity] || 'Unbekannt';
    }

    private playLegendaryEffect(): void {
        // Erstelle temporäre Partikel-Effekte
        const effects = ['✨', '⭐', '🌟', '💫'];
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.textContent = effects[Math.floor(Math.random() * effects.length)];
                particle.style.position = 'fixed';
                particle.style.left = Math.random() * window.innerWidth + 'px';
                particle.style.top = Math.random() * window.innerHeight + 'px';
                particle.style.fontSize = '2rem';
                particle.style.zIndex = '9999';
                particle.style.pointerEvents = 'none';
                particle.style.animation = 'particle-float 2s ease-out forwards';
                
                document.body.appendChild(particle);
                
                setTimeout(() => {
                    particle.remove();
                }, 2000);
            }, i * 100);
        }
    }

    private playEpicEffect(): void {
        // Bildschirm-Flash-Effekt für epische Karten
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100vw';
        flash.style.height = '100vh';
        flash.style.background = 'rgba(156, 39, 176, 0.3)';
        flash.style.zIndex = '9998';
        flash.style.pointerEvents = 'none';
        flash.style.animation = 'flash 0.3s ease-out';
        
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.remove();
        }, 300);
    }

    private setupCollectButton(): void {
        const collectBtn = document.getElementById('collect-cards');
        if (!collectBtn) return;
        
        // Entferne vorherige Event Listener
        collectBtn.replaceWith(collectBtn.cloneNode(true));
        const newCollectBtn = document.getElementById('collect-cards');
        if (!newCollectBtn) return;
        
        newCollectBtn.addEventListener('click', () => {
            // Modal schließen
            const modal = document.getElementById('pack-opening');
            if (modal) {
                modal.classList.add('hidden');
            }
            
            // Spinner wieder anzeigen für nächstes Mal
            const spinner = document.querySelector('.opening-animation') as HTMLElement;
            if (spinner) {
                spinner.style.display = 'block';
            }
            
            // Zur Sammlung wechseln
            this.game.switchTab('collection');
        });
    }

    // Auto-Restock System
    private checkAndStartAutoRestock(packType: PackType): void {
        if (!this.autoRestockEnabled) return;
        
        const display = document.querySelector(`.${packType}-display`);
        if (!display) return;
        
        const availablePacks = display.querySelectorAll(`.${packType}-pack:not(.sold-out)`);
        
        // Wenn Display leer ist, starte Timer
        if (availablePacks.length === 0) {
            console.log(`🔄 ${packType} Display ist leer - Auto-Restock in 1 Minute`);
            
            // Clear existing timer if any
            if (this.autoRestockTimers.has(packType)) {
                const existingTimer = this.autoRestockTimers.get(packType);
                if (existingTimer) {
                    clearTimeout(existingTimer);
                }
            }
            
            // Start countdown timer
            this.startRestockCountdown(packType);
            
            // Set restock timer
            const timer = setTimeout(() => {
                this.autoRestockDisplay(packType);
                this.autoRestockTimers.delete(packType);
            }, this.restockDelay);
            
            this.autoRestockTimers.set(packType, timer);
        }
    }

    private startRestockCountdown(packType: PackType): void {
        const display = document.querySelector(`.${packType}-display`);
        if (!display) return;
        
        // Create countdown display
        const countdown = document.createElement('div');
        countdown.className = 'restock-countdown';
        countdown.innerHTML = `
            <div class="countdown-content">
                <div class="countdown-icon">🔄</div>
                <div class="countdown-text">Wird wieder aufgefüllt in:</div>
                <div class="countdown-timer" id="countdown-${packType}">01:00</div>
            </div>
        `;
        
        display.innerHTML = '';
        display.appendChild(countdown);
        
        // Start countdown
        let timeLeft = 60;
        const countdownInterval = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const timerElement = document.getElementById(`countdown-${packType}`);
            
            if (timerElement) {
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }

    private autoRestockDisplay(packType: PackType): void {
        console.log(`✅ Auto-Restock: ${packType} Display wird wieder aufgefüllt`);
        
        // Generate new packs
        this.generateBoosterDisplay(packType, 30);
        
        // Update UI stats
        this.updateShopStats();
        
        // Show notification
        this.showRestockNotification(packType);
        
        // Update pack availability
        this.updatePackAvailability();
    }

    private showRestockNotification(packType: PackType): void {
        const packNames: Record<PackType, string> = {
            'basic': 'Basis-Booster',
            'premium': 'Premium-Booster', 
            'legendary': 'Legendäre-Booster'
        };
        
        const notification = document.createElement('div');
        notification.className = 'restock-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">🆕</div>
                <div class="notification-text">${packNames[packType]} Display wieder aufgefüllt!</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Settings für Auto-Restock
    public setAutoRestockEnabled(enabled: boolean): void {
        this.autoRestockEnabled = enabled;
        if (!enabled) {
            // Clear all timers
            this.autoRestockTimers.forEach(timer => clearTimeout(timer));
            this.autoRestockTimers.clear();
        }
    }

    public setRestockDelay(delayInMinutes: number): void {
        this.restockDelay = delayInMinutes * 60 * 1000;
    }

    // Manual restock (existing functionality)
    public restockAllDisplays(): void {
        console.log('🔄 Manueller Restock aller Displays');
        
        // Clear any auto-restock timers
        this.autoRestockTimers.forEach(timer => clearTimeout(timer));
        this.autoRestockTimers.clear();
        
        // Restock all displays
        this.generateBoosterDisplay('basic', 30);
        this.generateBoosterDisplay('premium', 30);
        this.generateBoosterDisplay('legendary', 30);
        
        this.updateShopStats();
        this.updatePackAvailability();
        
        // Show feedback
        this.game.ui.showSaveIndicator('🔄 Alle Displays wurden wieder aufgefüllt!', 'success');
    }
}