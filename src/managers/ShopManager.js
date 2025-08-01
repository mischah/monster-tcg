import { Monster } from '../models/Monster.js';
import { getRandomMonsterByRarity } from '../data/MonsterDatabase.js';

export class ShopManager {
    constructor(game) {
        this.game = game;
    }

    initializeBoosterDisplays() {
        // Generiere 30 Booster für jeden Typ
        this.generateBoosterDisplay('basic', 30);
        this.generateBoosterDisplay('premium', 30);
        this.generateBoosterDisplay('legendary', 30);
    }

    generateBoosterDisplay(packType, count) {
        const display = document.querySelector(`.${packType}-display`);
        if (!display) return;
        
        display.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const pack = this.createDisplayPack(packType, i);
            display.appendChild(pack);
        }
    }

    createDisplayPack(packType, index) {
        const pack = document.createElement('div');
        pack.className = `display-pack ${packType}-pack`;
        pack.dataset.packType = packType;
        pack.dataset.packIndex = index;
        
        // Pack-spezifische Icons mit CSS-Klassen
        const packIcons = {
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

    updatePackAvailability() {
        // Basic Packs (50 Münzen)
        document.querySelectorAll('.basic-pack').forEach(pack => {
            if (!pack.classList.contains('sold-out')) {
                if (this.game.coins < 50) {
                    pack.style.opacity = '0.5';
                    pack.style.cursor = 'not-allowed';
                } else {
                    pack.style.opacity = '1';
                    pack.style.cursor = 'pointer';
                }
            }
        });

        // Premium Packs (100 Münzen)
        document.querySelectorAll('.premium-pack').forEach(pack => {
            if (!pack.classList.contains('sold-out')) {
                if (this.game.coins < 100) {
                    pack.style.opacity = '0.5';
                    pack.style.cursor = 'not-allowed';
                } else {
                    pack.style.opacity = '1';
                    pack.style.cursor = 'pointer';
                }
            }
        });

        // Legendary Packs (250 Münzen)
        document.querySelectorAll('.legendary-pack').forEach(pack => {
            if (!pack.classList.contains('sold-out')) {
                if (this.game.coins < 250) {
                    pack.style.opacity = '0.5';
                    pack.style.cursor = 'not-allowed';
                } else {
                    pack.style.opacity = '1';
                    pack.style.cursor = 'pointer';
                }
            }
        });
    }

    buyPack(packType) {
        let cost, cardCount, guaranteedRare;
        
        if (packType === 'basic') {
            cost = 50;
            cardCount = 5;
            guaranteedRare = false;
        } else if (packType === 'premium') {
            cost = 100;
            cardCount = 5;
            guaranteedRare = true;
        } else if (packType === 'legendary') {
            cost = 250;
            cardCount = 3;
            guaranteedRare = 'legendary';
        }

        if (this.game.coins < cost) {
            this.game.ui.showSaveIndicator('💸 Nicht genügend Münzen!', 'error');
            return false;
        }

        this.game.coins -= cost;
        
        // Karten generieren basierend auf Pack-Typ
        const newCards = this.generatePackCards(packType, cardCount, guaranteedRare);

        // Karten zur Sammlung hinzufügen
        this.game.collection.push(...newCards);
        
        // Pack-Opening Animation starten
        this.showPackOpening(newCards, packType);
        this.game.ui.updateDisplay();
        
        return true;
    }

    generatePackCards(packType, cardCount, guaranteedRare) {
        const newCards = [];
        
        if (packType === 'basic') {
            // Basis-Pack: Standard-Wahrscheinlichkeiten
            for (let i = 0; i < cardCount; i++) {
                const monsterData = getRandomMonsterByRarity();
                newCards.push(new Monster(
                    monsterData.name, monsterData.emoji, monsterData.attack,
                    monsterData.defense, monsterData.health, monsterData.rarity,
                    monsterData.description, monsterData.image
                ));
            }
        } else if (packType === 'premium') {
            // Premium-Pack: Erste Karte garantiert selten+
            for (let i = 0; i < cardCount; i++) {
                let rarity = null;
                if (i === 0) {
                    // Erste Karte ist garantiert selten oder besser
                    const rand = Math.random();
                    if (rand < 0.6) rarity = "rare";
                    else if (rand < 0.85) rarity = "epic";
                    else rarity = "legendary";
                }
                const monsterData = getRandomMonsterByRarity(rarity);
                newCards.push(new Monster(
                    monsterData.name, monsterData.emoji, monsterData.attack,
                    monsterData.defense, monsterData.health, monsterData.rarity,
                    monsterData.description, monsterData.image
                ));
            }
        } else if (packType === 'legendary') {
            // Legendärer Pack: Höhere Qualität, weniger Karten
            for (let i = 0; i < cardCount; i++) {
                let rarity = null;
                if (i === 0) {
                    rarity = "legendary"; // Erste Karte garantiert legendär
                } else {
                    const rand = Math.random();
                    if (rand < 0.5) rarity = "epic";
                    else rarity = "legendary";
                }
                const monsterData = getRandomMonsterByRarity(rarity);
                newCards.push(new Monster(
                    monsterData.name, monsterData.emoji, monsterData.attack,
                    monsterData.defense, monsterData.health, monsterData.rarity,
                    monsterData.description, monsterData.image
                ));
            }
        }
        
        return newCards;
    }

    showPackOpening(cards, packType) {
        const modal = document.getElementById('pack-opening');
        const revealedCardsContainer = document.getElementById('revealed-cards');
        const collectBtn = document.getElementById('collect-cards');
        
        // Modal anzeigen
        modal.classList.remove('hidden');
        
        // Container leeren
        revealedCardsContainer.innerHTML = '';
        collectBtn.classList.add('hidden');
        
        // Pack-Type spezifische Nachrichten
        const messages = {
            'basic': '📦 Basis-Booster wird geöffnet...',
            'premium': '✨ Premium-Booster wird geöffnet...',
            'legendary': '🌟 Legendärer Booster wird geöffnet...'
        };
        
        document.querySelector('.pack-opening-content h3').textContent = messages[packType];
        
        // Animation mit Verzögerung
        setTimeout(() => {
            this.revealCards(cards);
        }, 2000);
    }

    revealCards(cards) {
        const revealedCardsContainer = document.getElementById('revealed-cards');
        const collectBtn = document.getElementById('collect-cards');
        
        // Spinner verstecken
        document.querySelector('.opening-animation').style.display = 'none';
        
        // Titel ändern
        document.querySelector('.pack-opening-content h3').textContent = '🎉 Deine neuen Karten!';
        
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

    buyPackFromDisplay(packType, packElement) {
        // Prüfe zuerst ob genügend Münzen vorhanden sind
        let cost;
        if (packType === 'basic') cost = 50;
        else if (packType === 'premium') cost = 100;
        else if (packType === 'legendary') cost = 250;
        
        if (this.game.coins < cost) {
            this.showPurchaseIndicator(`💸 Nicht genügend Münzen! Benötigt: ${cost}`, 'error');
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
                
                this.showPurchaseIndicator(`${this.getPackTypeName(packType)} gekauft!`, 'success');
            } else {
                // Bei Fehler Animation entfernen
                packElement.classList.remove('purchasing');
            }
        }, 600);
    }

    restockBoosterDisplays() {
        this.initializeBoosterDisplays();
        this.game.ui.showSaveIndicator('🔄 Alle Booster-Displays wurden aufgefüllt!', 'success');
    }

    updateShopStats() {
        // Zähle verfügbare Packs
        const basicAvailable = document.querySelectorAll('.basic-pack:not(.sold-out)').length;
        const premiumAvailable = document.querySelectorAll('.premium-pack:not(.sold-out)').length;
        const legendaryAvailable = document.querySelectorAll('.legendary-pack:not(.sold-out)').length;
        
        // Update UI falls Shop-Stats-Elemente existieren
        const basicCountElement = document.getElementById('basic-pack-count');
        const premiumCountElement = document.getElementById('premium-pack-count');
        const legendaryCountElement = document.getElementById('legendary-pack-count');
        
        if (basicCountElement) basicCountElement.textContent = basicAvailable;
        if (premiumCountElement) premiumCountElement.textContent = premiumAvailable;
        if (legendaryCountElement) legendaryCountElement.textContent = legendaryAvailable;
    }

    getPackTypeName(packType) {
        const names = {
            'basic': 'Basis-Booster',
            'premium': 'Premium-Booster',
            'legendary': 'Legendärer Booster'
        };
        return names[packType] || 'Booster';
    }

    showPurchaseIndicator(message, type = 'success') {
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

    getRarityText(rarity) {
        const rarityTexts = {
            'common': 'Häufig',
            'rare': 'Selten',
            'epic': 'Episch',
            'legendary': 'Legendär'
        };
        return rarityTexts[rarity] || 'Unbekannt';
    }

    playLegendaryEffect() {
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

    playEpicEffect() {
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

    setupCollectButton() {
        const collectBtn = document.getElementById('collect-cards');
        
        // Entferne vorherige Event Listener
        collectBtn.replaceWith(collectBtn.cloneNode(true));
        const newCollectBtn = document.getElementById('collect-cards');
        
        newCollectBtn.addEventListener('click', () => {
            // Modal schließen
            document.getElementById('pack-opening').classList.add('hidden');
            
            // Spinner wieder anzeigen für nächstes Mal
            document.querySelector('.opening-animation').style.display = 'block';
            
            // Zur Sammlung wechseln
            this.game.switchTab('collection');
        });
    }
}
