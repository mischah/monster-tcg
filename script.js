// Monster TCG Game Logic

class Monster {
    constructor(name, emoji, attack, defense, health, rarity, description) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.emoji = emoji;
        this.attack = attack;
        this.defense = defense;
        this.health = health;
        this.maxHealth = health;
        this.rarity = rarity;
        this.description = description;
    }

    takeDamage(damage) {
        const actualDamage = Math.max(1, damage - this.defense);
        this.health = Math.max(0, this.health - actualDamage);
        return actualDamage;
    }

    isAlive() {
        return this.health > 0;
    }

    heal() {
        this.health = this.maxHealth;
    }
}

class Game {
    constructor() {
        this.coins = 100;
        this.collection = [];
        this.deck = [];
        this.currentBattleMonster = null;
        this.enemyMonster = null;
        this.battleInProgress = false;
        
        this.initializeStarterCards();
        this.initializeEventListeners();
        this.updateDisplay();
        
        // Initialisiere Booster Displays
        this.initializeBoosterDisplays();
    }

    // Monster-Datenbank
    getRandomMonster() {
        const monsters = [
            // Häufige Monster
            { name: "Feuerdrache", emoji: "🐉", attack: 25, defense: 15, health: 80, rarity: "common", description: "Ein kleiner aber mutiger Drache mit feurigem Temperament." },
            { name: "Waldgeist", emoji: "🌲", attack: 20, defense: 20, health: 90, rarity: "common", description: "Ein friedlicher Waldgeist, der die Natur beschützt." },
            { name: "Blitzwolf", emoji: "⚡", attack: 30, defense: 10, health: 70, rarity: "common", description: "Schnell wie der Blitz und genauso gefährlich." },
            { name: "Steingigant", emoji: "🗿", attack: 15, defense: 30, health: 120, rarity: "common", description: "Langsam aber unglaublich robust und stark." },
            { name: "Wasserschlange", emoji: "🌊", attack: 22, defense: 18, health: 85, rarity: "common", description: "Gleitet durch Wasser wie durch Luft." },
            
            // Seltene Monster
            { name: "Kristallbär", emoji: "💎", attack: 35, defense: 25, health: 110, rarity: "rare", description: "Mit Kristallen gepanzerter Bär von magischer Macht." },
            { name: "Schattenrabe", emoji: "🌙", attack: 40, defense: 15, health: 95, rarity: "rare", description: "Meister der Schatten und nächtlicher Jäger." },
            { name: "Flammenphönix", emoji: "🔥", attack: 45, defense: 20, health: 100, rarity: "rare", description: "Wiedergeboren aus der Asche mit erneuterter Macht." },
            { name: "Eiswächter", emoji: "❄️", attack: 30, defense: 35, health: 130, rarity: "rare", description: "Hüter der ewigen Gletscher des Nordens." },
            
            // Epische Monster
            { name: "Sternendrache", emoji: "⭐", attack: 55, defense: 30, health: 150, rarity: "epic", description: "Ein legendärer Drache, der die Macht der Sterne nutzt." },
            { name: "Urzeittytan", emoji: "🦕", attack: 50, defense: 40, health: 180, rarity: "epic", description: "Ein Gigant aus vergangenen Zeitaltern." },
            { name: "Geisterherr", emoji: "👻", attack: 60, defense: 20, health: 120, rarity: "epic", description: "Beherrscher der Unterwelt und Geister." },
            
            // Legendäre Monster
            { name: "Regenbogeneinhorn", emoji: "🦄", attack: 70, defense: 50, health: 200, rarity: "legendary", description: "Das seltenste und mächtigste aller magischen Wesen." },
            { name: "Kosmosdrache", emoji: "🌌", attack: 80, defense: 45, health: 220, rarity: "legendary", description: "Hüter des Universums mit unermesslicher Macht." },
            { name: "Zeitwächter", emoji: "⏰", attack: 75, defense: 55, health: 250, rarity: "legendary", description: "Manipuliert die Zeit selbst und ist quasi unsterblich." }
        ];

        return monsters[Math.floor(Math.random() * monsters.length)];
    }

    // Seltenheits-basierte Zufallsgenerierung
    getRandomMonsterByRarity(guaranteedRarity = null) {
        let rarity;
        
        if (guaranteedRarity) {
            rarity = guaranteedRarity;
        } else {
            const rand = Math.random();
            if (rand < 0.6) rarity = "common";      // 60%
            else if (rand < 0.85) rarity = "rare"; // 25%
            else if (rand < 0.97) rarity = "epic"; // 12%
            else rarity = "legendary";              // 3%
        }

        const monsters = [];
        for (let i = 0; i < 50; i++) { // Genug Versuche
            const monster = this.getRandomMonster();
            if (monster.rarity === rarity) {
                return new Monster(
                    monster.name,
                    monster.emoji,
                    monster.attack,
                    monster.defense,
                    monster.health,
                    monster.rarity,
                    monster.description
                );
            }
        }
        
        // Fallback
        const fallback = this.getRandomMonster();
        return new Monster(
            fallback.name,
            fallback.emoji,
            fallback.attack,
            fallback.defense,
            fallback.health,
            fallback.rarity,
            fallback.description
        );
    }

    initializeStarterCards() {
        // Starter-Deck mit 5 Karten
        for (let i = 0; i < 5; i++) {
            this.collection.push(this.getRandomMonsterByRarity("common"));
        }
    }

    initializeEventListeners() {
        // Tab-Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Filter und Suche
        document.getElementById('rarity-filter').addEventListener('change', () => {
            this.filterCards();
        });

        document.getElementById('search-cards').addEventListener('input', () => {
            this.filterCards();
        });

        // Restock Button
        document.getElementById('restock-btn').addEventListener('click', () => {
            this.restockBoosterDisplays();
        });

        // Kampf
        document.getElementById('monster-select').addEventListener('change', (e) => {
            if (e.target.value) {
                this.selectPlayerMonster(e.target.value);
            }
        });

        document.getElementById('attack-btn').addEventListener('click', () => {
            this.performAttack();
        });

        document.getElementById('find-opponent-btn').addEventListener('click', () => {
            this.findOpponent();
        });

        // Modal
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('card-modal').style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('card-modal')) {
                document.getElementById('card-modal').style.display = 'none';
            }
        });
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
            this.displayCollection();
        } else if (tab === 'battle') {
            this.updateBattleMonsterSelect();
        } else if (tab === 'deck') {
            this.updateDeckBuilder();
        } else if (tab === 'shop') {
            this.updateShopDisplay();
        }
    }

    updateShopDisplay() {
        // Überprüfe ob Displays initialisiert sind
        const basicDisplay = document.querySelector('.basic-display');
        if (!basicDisplay || basicDisplay.children.length === 0) {
            this.initializeBoosterDisplays();
        }
        
        // Update Verfügbarkeit basierend auf Münzen
        this.updatePackAvailability();
        
        // Update Shop-Statistiken
        this.updateShopStats();
    }

    updatePackAvailability() {
        // Basic Packs (50 Münzen)
        document.querySelectorAll('.basic-pack').forEach(pack => {
            if (!pack.classList.contains('sold-out')) {
                if (this.coins < 50) {
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
                if (this.coins < 100) {
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
                if (this.coins < 250) {
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

        if (this.coins < cost) {
            alert('💸 Nicht genügend Münzen!');
            return;
        }

        this.coins -= cost;
        
        // Karten generieren basierend auf Pack-Typ
        const newCards = this.generatePackCards(packType, cardCount, guaranteedRare);

        // Karten zur Sammlung hinzufügen
        this.collection.push(...newCards);
        
        // Pack-Opening Animation starten
        this.showPackOpening(newCards, packType);
        this.updateDisplay();
    }

    generatePackCards(packType, cardCount, guaranteedRare) {
        const newCards = [];
        
        if (packType === 'basic') {
            // Basis-Pack: Standard-Wahrscheinlichkeiten
            for (let i = 0; i < cardCount; i++) {
                newCards.push(this.getRandomMonsterByRarity());
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
                newCards.push(this.getRandomMonsterByRarity(rarity));
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
                newCards.push(this.getRandomMonsterByRarity(rarity));
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
                    <div class="card-emoji">${card.emoji}</div>
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
            this.switchTab('collection');
        });
    }

    displayCollection() {
        const grid = document.getElementById('card-grid');
        const filteredCards = this.getFilteredCards();
        
        grid.innerHTML = '';
        
        filteredCards.forEach(monster => {
            const cardElement = this.createCardElement(monster);
            cardElement.addEventListener('click', () => this.showCardDetails(monster));
            grid.appendChild(cardElement);
        });
    }

    getFilteredCards() {
        let filtered = [...this.collection];
        
        // Seltenheits-Filter
        const rarityFilter = document.getElementById('rarity-filter').value;
        if (rarityFilter !== 'all') {
            filtered = filtered.filter(card => card.rarity === rarityFilter);
        }
        
        // Suchfilter
        const searchTerm = document.getElementById('search-cards').value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(card => 
                card.name.toLowerCase().includes(searchTerm) ||
                card.description.toLowerCase().includes(searchTerm)
            );
        }
        
        return filtered;
    }

    createCardElement(monster, isSmall = false) {
        const card = document.createElement('div');
        card.className = `monster-card ${monster.rarity}`;
        
        card.innerHTML = `
            <div class="card-rarity rarity-${monster.rarity}">${monster.rarity}</div>
            <div class="card-image">${monster.emoji}</div>
            <div class="card-name">${monster.name}</div>
            <div class="card-stats">
                <div class="stat-item">
                    <span class="stat-label">Angriff</span>
                    <span class="stat-value">${monster.attack}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Verteidigung</span>
                    <span class="stat-value">${monster.defense}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Leben</span>
                    <span class="stat-value">${monster.health}/${monster.maxHealth}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Typ</span>
                    <span class="stat-value">${monster.rarity}</span>
                </div>
            </div>
            <div class="card-description">${monster.description}</div>
        `;
        
        card.classList.add('card-reveal');
        
        return card;
    }

    showCardDetails(monster) {
        const modal = document.getElementById('card-modal');
        const details = document.getElementById('modal-card-details');
        
        details.innerHTML = `
            <div class="monster-card ${monster.rarity}" style="max-width: none; margin: 20px 0;">
                <div class="card-rarity rarity-${monster.rarity}">${monster.rarity}</div>
                <div class="card-image" style="height: 150px; font-size: 4rem;">${monster.emoji}</div>
                <div class="card-name" style="font-size: 1.5rem;">${monster.name}</div>
                <div class="card-stats">
                    <div class="stat-item">
                        <span class="stat-label">Angriff</span>
                        <span class="stat-value">${monster.attack}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Verteidigung</span>
                        <span class="stat-value">${monster.defense}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Leben</span>
                        <span class="stat-value">${monster.health}/${monster.maxHealth}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Seltenheit</span>
                        <span class="stat-value">${monster.rarity}</span>
                    </div>
                </div>
                <div class="card-description" style="font-size: 1rem; margin-top: 15px;">${monster.description}</div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    updateBattleMonsterSelect() {
        const select = document.getElementById('monster-select');
        select.innerHTML = '<option value="">Monster wählen...</option>';
        
        this.collection.forEach(monster => {
            if (monster.isAlive()) {
                const option = document.createElement('option');
                option.value = monster.id;
                option.textContent = `${monster.emoji} ${monster.name} (${monster.health}/${monster.maxHealth} HP)`;
                select.appendChild(option);
            }
        });
    }

    selectPlayerMonster(monsterId) {
        this.currentBattleMonster = this.collection.find(m => m.id === monsterId);
        
        if (this.currentBattleMonster) {
            const playerMonsterDiv = document.getElementById('player-monster');
            playerMonsterDiv.innerHTML = '';
            playerMonsterDiv.classList.add('has-monster');
            
            const cardElement = this.createCardElement(this.currentBattleMonster);
            playerMonsterDiv.appendChild(cardElement);
            
            document.getElementById('attack-btn').disabled = !this.enemyMonster;
        }
    }

    findOpponent() {
        // Zufälliges Gegner-Monster generieren
        this.enemyMonster = this.getRandomMonsterByRarity();
        
        const enemyMonsterDiv = document.getElementById('enemy-monster');
        enemyMonsterDiv.innerHTML = '';
        enemyMonsterDiv.classList.add('has-monster');
        
        const cardElement = this.createCardElement(this.enemyMonster);
        enemyMonsterDiv.appendChild(cardElement);
        
        document.getElementById('find-opponent-btn').textContent = 'Neuer Gegner';
        document.getElementById('attack-btn').disabled = !this.currentBattleMonster;
        
        this.addBattleLog(`Wilder ${this.enemyMonster.name} erscheint!`);
    }

    performAttack() {
        if (!this.currentBattleMonster || !this.enemyMonster || this.battleInProgress) return;
        
        this.battleInProgress = true;
        
        // Spieler greift an
        const playerDamage = this.currentBattleMonster.attack;
        const actualDamage = this.enemyMonster.takeDamage(playerDamage);
        
        this.addBattleLog(`${this.currentBattleMonster.name} greift an und verursacht ${actualDamage} Schaden!`);
        
        // Prüfen ob Gegner besiegt wurde
        if (!this.enemyMonster.isAlive()) {
            this.addBattleLog(`${this.enemyMonster.name} wurde besiegt! Du gewinnst!`);
            this.coins += 25;
            this.updateDisplay();
            this.resetBattle();
            return;
        }
        
        // Gegner greift zurück
        setTimeout(() => {
            const enemyDamage = this.enemyMonster.attack;
            const actualDamage = this.currentBattleMonster.takeDamage(enemyDamage);
            
            this.addBattleLog(`${this.enemyMonster.name} greift zurück und verursacht ${actualDamage} Schaden!`);
            
            // Karten-Display aktualisieren
            this.updateBattleDisplay();
            
            // Prüfen ob Spieler-Monster besiegt wurde
            if (!this.currentBattleMonster.isAlive()) {
                this.addBattleLog(`${this.currentBattleMonster.name} wurde besiegt! Du verlierst...`);
                this.resetBattle();
                return;
            }
            
            this.battleInProgress = false;
        }, 1000);
    }

    updateBattleDisplay() {
        if (this.currentBattleMonster) {
            const playerMonsterDiv = document.getElementById('player-monster');
            playerMonsterDiv.innerHTML = '';
            const cardElement = this.createCardElement(this.currentBattleMonster);
            playerMonsterDiv.appendChild(cardElement);
        }
        
        if (this.enemyMonster) {
            const enemyMonsterDiv = document.getElementById('enemy-monster');
            enemyMonsterDiv.innerHTML = '';
            const cardElement = this.createCardElement(this.enemyMonster);
            enemyMonsterDiv.appendChild(cardElement);
        }
    }

    addBattleLog(message) {
        const log = document.getElementById('battle-log');
        const logEntry = document.createElement('div');
        logEntry.textContent = `> ${message}`;
        log.appendChild(logEntry);
        log.scrollTop = log.scrollHeight;
    }

    resetBattle() {
        this.currentBattleMonster = null;
        this.enemyMonster = null;
        this.battleInProgress = false;
        
        document.getElementById('player-monster').innerHTML = '';
        document.getElementById('player-monster').classList.remove('has-monster');
        document.getElementById('enemy-monster').innerHTML = '';
        document.getElementById('enemy-monster').classList.remove('has-monster');
        document.getElementById('monster-select').value = '';
        document.getElementById('attack-btn').disabled = true;
        document.getElementById('find-opponent-btn').textContent = 'Gegner finden';
        
        // Alle Monster heilen
        this.collection.forEach(monster => monster.heal());
        this.updateBattleMonsterSelect();
    }

    filterCards() {
        this.displayCollection();
    }

    updateDeckBuilder() {
        // Aktuelles Deck anzeigen
        const deckCards = document.getElementById('deck-cards');
        deckCards.innerHTML = '';
        
        // Verfügbare Karten anzeigen
        const builderCards = document.getElementById('deck-builder-cards');
        builderCards.innerHTML = '';
        
        this.collection.forEach(monster => {
            const cardElement = this.createCardElement(monster, true);
            cardElement.addEventListener('click', () => {
                // Deck-Building Logik hier implementieren
                alert('Deck-Building Feature kommt bald!');
            });
            builderCards.appendChild(cardElement);
        });
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

        display.innerHTML = ''; // Leere das Display

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

        // Pack-spezifische Emojis und Sparkles
        let emoji, sparkles;
        switch(packType) {
            case 'basic':
                emoji = '📦';
                sparkles = '✨';
                break;
            case 'premium':
                emoji = '✨';
                sparkles = '⭐💫';
                break;
            case 'legendary':
                emoji = '🌟';
                sparkles = '🌌💫⭐';
                break;
        }

        pack.innerHTML = `
            <div class="display-pack-emoji">${emoji}</div>
            <div class="display-pack-sparkles">${sparkles}</div>
        `;

        // Event Listener für Kauf
        pack.addEventListener('click', () => {
            this.buyPackFromDisplay(packType, pack);
        });

        return pack;
    }

    buyPackFromDisplay(packType, packElement) {
        // Prüfe ob Pack bereits gekauft oder ausverkauft ist
        if (packElement.classList.contains('purchasing') || 
            packElement.classList.contains('sold-out')) {
            return;
        }

        let cost;
        switch(packType) {
            case 'basic': cost = 50; break;
            case 'premium': cost = 100; break;
            case 'legendary': cost = 250; break;
        }

        if (this.coins < cost) {
            this.showPurchaseIndicator('💸 Nicht genügend Münzen!', 'error');
            return;
        }

        // Kaufanimation starten
        packElement.classList.add('purchasing');
        
        // Kurze Verzögerung für Animation
        setTimeout(() => {
            this.coins -= cost;
            
            // Karten generieren
            const cardCount = packType === 'legendary' ? 3 : 5;
            const newCards = this.generatePackCards(packType, cardCount);
            
            // Karten zur Sammlung hinzufügen
            this.collection.push(...newCards);
            
            // Pack-Opening Animation
            this.showPackOpening(newCards, packType);
            
            // Pack als verkauft markieren
            packElement.classList.remove('purchasing');
            packElement.classList.add('sold-out');
            
            // Update Display
            this.updateDisplay();
            
            // Update Shop Stats
            this.updateShopStats();
            
            // Erfolgs-Indikator
            this.showPurchaseIndicator(`🎉 ${this.getPackTypeName(packType)} gekauft!`, 'success');
            
        }, 400);
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
        const indicator = document.createElement('div');
        indicator.className = 'pack-purchase-indicator';
        indicator.textContent = message;
        
        if (type === 'error') {
            indicator.style.background = 'linear-gradient(45deg, #f44336, #d32f2f)';
        }
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            indicator.remove();
        }, 2000);
    }

    restockBoosterDisplays() {
        // Alle verkauften Packs wieder verfügbar machen
        document.querySelectorAll('.display-pack.sold-out').forEach(pack => {
            pack.classList.remove('sold-out');
        });
        
        // Shop-Statistiken aktualisieren
        this.updateShopStats();
        
        this.showPurchaseIndicator('🔄 Shop wurde aufgefüllt!', 'success');
    }

    updateShopStats() {
        // Zähle verfügbare Packs
        const basicAvailable = document.querySelectorAll('.basic-pack:not(.sold-out)').length;
        const premiumAvailable = document.querySelectorAll('.premium-pack:not(.sold-out)').length;
        const legendaryAvailable = document.querySelectorAll('.legendary-pack:not(.sold-out)').length;

        // Update Anzeige
        document.getElementById('basic-count').textContent = basicAvailable;
        document.getElementById('premium-count').textContent = premiumAvailable;
        document.getElementById('legendary-count').textContent = legendaryAvailable;
    }

    updateDisplay() {
        document.getElementById('coins').textContent = this.coins;
        document.getElementById('card-count').textContent = this.collection.length;
        
        // Aktive Tab aktualisieren
        const activeTab = document.querySelector('.tab-content.active').id;
        if (activeTab === 'collection') {
            this.displayCollection();
        }
    }
}

// Spiel initialisieren wenn die Seite geladen ist
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
    
    // Erste Anzeige der Kartensammlung
    window.game.switchTab('collection');
});

// Export für mögliche Erweiterungen
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Monster, Game };
}
