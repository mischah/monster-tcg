import type { MonsterData, Rarity, GameManagerType, DeckAnalysis, SortOption } from '../types.js';

interface RarityCount {
    common: number;
    rare: number;
    epic: number;
    legendary: number;
    'ultra-rare': number;
}

export class DeckManager {
    private game: GameManagerType;
    private readonly maxDeckSize: number = 10;

    constructor(game: GameManagerType) {
        this.game = game;
    }

    public updateDeckBuilder(): void {
        // Update Deck-Anzeige
        this.displayCurrentDeck();
        
        // Update verfügbare Karten
        this.displayDeckBuilderCards();
        
        // Update Deck-Analyse
        this.updateDeckAnalysis();
    }

    private displayCurrentDeck(): void {
        const deckContainer = document.getElementById('deck-cards') as HTMLDivElement;
        const deckCountElement = document.getElementById('deck-count') as HTMLSpanElement;
        
        if (!deckContainer) return;

        // Update Deck-Count
        if (deckCountElement) {
            deckCountElement.textContent = this.game.deck.length.toString();
        }
        
        if (this.game.deck.length === 0) {
            deckContainer.innerHTML = `
                <div class="empty-deck-message">
                    <div class="empty-icon">🎴</div>
                    <p>Dein Deck ist leer!</p>
                    <p class="empty-hint">Klicke auf Karten aus deiner Sammlung, um sie hinzuzufügen.</p>
                </div>
            `;
            return;
        }
        
        deckContainer.innerHTML = '';
        
        this.game.deck.forEach((monster, index) => {
            const cardElement = this.game.ui.createDeckCardElement(monster, index);
            deckContainer.appendChild(cardElement);
        });
    }

    private displayDeckBuilderCards(): void {
        const container = document.getElementById('deck-builder-cards') as HTMLDivElement;
        if (!container) return;

        const filteredCards = this.getFilteredDeckBuilderCards();
        
        container.innerHTML = '';
        
        filteredCards.forEach(monster => {
            const cardElement = this.game.ui.createDeckBuilderCardElement(monster);
            container.appendChild(cardElement);
        });
    }

    private getFilteredDeckBuilderCards(): MonsterData[] {
        let filtered = [...this.game.collection];
        
        // Seltenheits-Filter
        const rarityFilterElement = document.getElementById('deck-rarity-filter') as HTMLSelectElement;
        const rarityFilter = rarityFilterElement?.value || 'all';
        if (rarityFilter !== 'all') {
            filtered = filtered.filter(card => card.rarity === rarityFilter);
        }
        
        // Sortierung
        const sortFilterElement = document.getElementById('deck-sort-filter') as HTMLSelectElement;
        const sortFilter = (sortFilterElement?.value || 'name') as SortOption;
        filtered.sort((a, b) => {
            switch(sortFilter) {
                case 'attack':
                    return b.attack - a.attack;
                case 'defense':
                    return b.defense - a.defense;
                case 'health':
                    return b.health - a.health;
                case 'rarity':
                    const rarityOrder: Record<Rarity | 'ultra-rare', number> = { 
                        common: 1, 
                        rare: 2, 
                        epic: 3, 
                        legendary: 4, 
                        'ultra-rare': 5 
                    };
                    return rarityOrder[b.rarity as keyof typeof rarityOrder] - rarityOrder[a.rarity as keyof typeof rarityOrder];
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });
        
        return filtered;
    }

    public initializeDragAndDrop(): void {
        const deckCardsContainer = document.getElementById('deck-cards') as HTMLDivElement;
        if (!deckCardsContainer) return;
        
        // Drop Zone für das Deck
        deckCardsContainer.addEventListener('dragover', (e: DragEvent) => {
            e.preventDefault();
            deckCardsContainer.classList.add('drag-over');
        });

        deckCardsContainer.addEventListener('dragleave', (e: DragEvent) => {
            if (!deckCardsContainer.contains(e.relatedTarget as Node)) {
                deckCardsContainer.classList.remove('drag-over');
            }
        });

        deckCardsContainer.addEventListener('drop', (e: DragEvent) => {
            e.preventDefault();
            deckCardsContainer.classList.remove('drag-over');
            
            const monsterId = e.dataTransfer?.getData('text/plain');
            if (monsterId) {
                this.addToDeck(monsterId);
            }
        });
    }

    public addToDeck(monsterId: string): void {
        if (this.game.deck.length >= this.maxDeckSize) {
            this.game.ui.showSaveIndicator(`⚠️ Deck ist voll! Maximum: ${this.maxDeckSize} Karten`, 'error');
            return;
        }
        
        const monster = this.game.collection.find(m => m.id === monsterId);
        if (!monster) return;
        
        // Prüfe ob Karte bereits im Deck ist
        if (this.game.deck.some(deckCard => deckCard.id === monsterId)) {
            this.game.ui.showSaveIndicator('⚠️ Karte ist bereits im Deck!', 'error');
            return;
        }
        
        // Füge Karte zum Deck hinzu
        this.game.deck.push(monster);
        
        // Update Displays
        this.updateDeckBuilder();
        
        // Speichere Änderungen
        this.game.saveManager.saveGameData();
        
        this.game.ui.showSaveIndicator(`✅ ${monster.name} zum Deck hinzugefügt!`, 'success');
    }

    public removeFromDeck(index: number): void {
        if (index >= 0 && index < this.game.deck.length) {
            const removedMonster = this.game.deck.splice(index, 1)[0];
            
            // Update Displays
            this.updateDeckBuilder();
            
            // Speichere Änderungen
            this.game.saveManager.saveGameData();
            
            this.game.ui.showSaveIndicator(`🗑️ ${removedMonster.name} aus Deck entfernt!`, 'success');
        }
    }

    public clearDeck(): void {
        if (this.game.deck.length === 0) {
            this.game.ui.showSaveIndicator('⚠️ Deck ist bereits leer!', 'error');
            return;
        }
        
        if (confirm('🗑️ Möchtest du wirklich das gesamte Deck leeren?')) {
            this.game.deck = [];
            this.updateDeckBuilder();
            this.game.saveManager.saveGameData();
            this.game.ui.showSaveIndicator('🗑️ Deck wurde geleert!', 'success');
        }
    }

    public autoBuildDeck(): void {
        if (this.game.collection.length < this.maxDeckSize) {
            this.game.ui.showSaveIndicator('⚠️ Nicht genügend Karten für Auto-Build!', 'error');
            return;
        }
        
        // Leere aktuelles Deck
        this.game.deck = [];
        
        // Sortiere Karten nach Power (Angriff + Verteidigung + Gesundheit)
        const sortedCards = [...this.game.collection].sort((a, b) => {
            const powerA = a.attack + a.defense + a.health;
            const powerB = b.attack + b.defense + b.health;
            return powerB - powerA;
        });
        
        // Nehme die besten Karten, aber achte auf Balance
        const rarityLimits: Record<Rarity | 'ultra-rare', number> = {
            'ultra-rare': Math.min(1, Math.floor(this.maxDeckSize * 0.1)), // Only 1 ultra-rare max
            legendary: Math.min(3, Math.floor(this.maxDeckSize * 0.3)),
            epic: Math.min(3, Math.floor(this.maxDeckSize * 0.3)),
            rare: Math.min(4, Math.floor(this.maxDeckSize * 0.4)),
            common: this.maxDeckSize
        };
        
        const deckByRarity: Record<Rarity | 'ultra-rare', MonsterData[]> = { 
            'ultra-rare': [], 
            legendary: [], 
            epic: [], 
            rare: [], 
            common: [] 
        };
        
        // Verteile Karten nach Seltenheit
        for (const card of sortedCards) {
            const cardRarity = card.rarity as keyof typeof deckByRarity;
            if (deckByRarity[cardRarity].length < rarityLimits[cardRarity]) {
                deckByRarity[cardRarity].push(card);
            }
        }
        
        // Fülle Deck mit den besten Karten jeder Seltenheit
        this.game.deck = [
            ...deckByRarity['ultra-rare'],
            ...deckByRarity.legendary,
            ...deckByRarity.epic,
            ...deckByRarity.rare,
            ...deckByRarity.common
        ].slice(0, this.maxDeckSize);
        
        this.updateDeckBuilder();
        this.game.saveManager.saveGameData();
        this.game.ui.showSaveIndicator('🤖 Auto-Build abgeschlossen!', 'success');
    }

    public saveDeck(): void {
        if (this.game.deck.length === 0) {
            this.game.ui.showSaveIndicator('⚠️ Deck ist leer - nichts zu speichern!', 'error');
            return;
        }
        
        this.game.saveManager.saveGameData();
        this.game.ui.showSaveIndicator('💾 Deck erfolgreich gespeichert!', 'success');
    }

    private updateDeckAnalysis(): void {
        if (this.game.deck.length === 0) {
            this.resetDeckAnalysis();
            return;
        }
        
        // Berechne Durchschnittswerte
        const totalAttack = this.game.deck.reduce((sum, card) => sum + card.attack, 0);
        const totalDefense = this.game.deck.reduce((sum, card) => sum + card.defense, 0);
        const totalHealth = this.game.deck.reduce((sum, card) => sum + card.health, 0);
        
        const avgAttack = Math.round(totalAttack / this.game.deck.length);
        const avgDefense = Math.round(totalDefense / this.game.deck.length);
        const avgHealth = Math.round(totalHealth / this.game.deck.length);
        
        // Update Durchschnittswerte
        const avgAttackElement = document.getElementById('avg-attack') as HTMLSpanElement;
        const avgDefenseElement = document.getElementById('avg-defense') as HTMLSpanElement;
        const avgHealthElement = document.getElementById('avg-health') as HTMLSpanElement;
        
        if (avgAttackElement) avgAttackElement.textContent = avgAttack.toString();
        if (avgDefenseElement) avgDefenseElement.textContent = avgDefense.toString();
        if (avgHealthElement) avgHealthElement.textContent = avgHealth.toString();
        
        // Update Deck-Power
        const deckPower = totalAttack + totalDefense + totalHealth;
        const deckPowerElement = document.getElementById('deck-power') as HTMLSpanElement;
        if (deckPowerElement) {
            deckPowerElement.textContent = deckPower.toString();
            
            // Füge Deck-Qualitäts-Indikator hinzu
            this.updateDeckQualityIndicator(deckPower, this.game.deck.length);
        }
        
        // Update Seltenheits-Verteilung
        const rarityCount: RarityCount = { common: 0, rare: 0, epic: 0, legendary: 0, 'ultra-rare': 0 };
        this.game.deck.forEach(card => {
            const cardRarity = card.rarity as keyof RarityCount;
            rarityCount[cardRarity]++;
        });
        
        Object.keys(rarityCount).forEach(rarity => {
            const countElement = document.getElementById(`${rarity}-count`) as HTMLSpanElement;
            const barElement = document.getElementById(`${rarity}-bar`) as HTMLDivElement;
            
            if (countElement) countElement.textContent = rarityCount[rarity as keyof RarityCount].toString();
            if (barElement) {
                const percentage = (rarityCount[rarity as keyof RarityCount] / this.game.deck.length) * 100;
                barElement.style.width = `${percentage}%`;
            }
        });
    }

    private resetDeckAnalysis(): void {
        // Reset alle Werte auf 0
        ['avg-attack', 'avg-defense', 'avg-health', 'deck-power'].forEach(id => {
            const element = document.getElementById(id) as HTMLSpanElement;
            if (element) element.textContent = '0';
        });
        
        ['common', 'rare', 'epic', 'legendary', 'ultra-rare'].forEach(rarity => {
            const countElement = document.getElementById(`${rarity}-count`) as HTMLSpanElement;
            const barElement = document.getElementById(`${rarity}-bar`) as HTMLDivElement;
            
            if (countElement) countElement.textContent = '0';
            if (barElement) barElement.style.width = '0%';
        });
    }

    private updateDeckQualityIndicator(deckPower: number, deckSize: number): void {
        const avgPowerPerCard = deckPower / deckSize;
        let quality = '';
        let color = '';
        
        if (avgPowerPerCard < 100) {
            quality = 'Schwach';
            color = '#f44336';
        } else if (avgPowerPerCard < 150) {
            quality = 'Durchschnittlich';
            color = '#ff9800';
        } else if (avgPowerPerCard < 200) {
            quality = 'Gut';
            color = '#4caf50';
        } else {
            quality = 'Exzellent';
            color = '#9c27b0';
        }
        
        const qualityElement = document.getElementById('deck-quality') as HTMLSpanElement;
        if (qualityElement) {
            qualityElement.textContent = quality;
            qualityElement.style.color = color;
        }
    }
}