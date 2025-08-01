export class CollectionManager {
    constructor(game) {
        this.game = game;
        this.sellModeActive = false;
        this.currentSellCard = null;
    }

    displayCollection() {
        const grid = document.getElementById('card-grid');
        const filteredCards = this.getFilteredCards();
        
        grid.innerHTML = '';
        
        // Toggle sell mode class on grid
        if (this.sellModeActive) {
            grid.classList.add('sell-mode');
        } else {
            grid.classList.remove('sell-mode');
        }
        
        filteredCards.forEach((monster, index) => {
            const cardElement = this.game.ui.createCardElement(monster);
            
            if (this.sellModeActive) {
                cardElement.addEventListener('click', () => this.showSellConfirmation(monster));
            } else {
                cardElement.addEventListener('click', () => this.game.ui.showCardDetails(monster));
            }
            
            grid.appendChild(cardElement);
        });
        
        // Update collection value display
        this.updateCollectionValue();
    }

    getFilteredCards() {
        let filtered = [...this.game.collection];
        
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

    filterCards() {
        this.displayCollection();
    }

    updateCollectionValue() {
        const totalValue = this.game.collection.reduce((sum, card) => {
            return sum + this.getCardValue(card);
        }, 0);
        
        const valueElement = document.getElementById('collection-value');
        if (valueElement) {
            valueElement.textContent = totalValue;
        }
    }

    getCardValue(card) {
        // Verkaufswerte basierend auf Seltenheit
        const rarityValues = {
            common: 15,
            rare: 40,
            epic: 80,
            legendary: 150
        };
        return rarityValues[card.rarity] || 10;
    }

    toggleSellMode() {
        this.sellModeActive = !this.sellModeActive;
        
        const toggleBtn = document.getElementById('toggle-sell-mode');
        if (toggleBtn) {
            if (this.sellModeActive) {
                toggleBtn.classList.add('active');
                toggleBtn.textContent = '❌ Abbrechen';
                toggleBtn.title = 'Verkaufsmodus deaktivieren';
            } else {
                toggleBtn.classList.remove('active');
                toggleBtn.textContent = '💰 Verkaufen';
                toggleBtn.title = 'Verkaufsmodus aktivieren';
            }
        }
        
        this.displayCollection();
    }

    showSellConfirmation(card) {
        this.currentSellCard = card;
        
        const modal = document.getElementById('card-sell-modal');
        const preview = document.getElementById('sell-card-preview');
        const priceValue = document.getElementById('sell-price-value');
        
        if (!modal || !preview || !priceValue) {
            return;
        }
        
        // Karte im Modal anzeigen
        preview.innerHTML = '';
        const cardElement = this.game.ui.createCardElement(card);
        cardElement.style.maxWidth = '300px';
        cardElement.style.margin = '0 auto';
        preview.appendChild(cardElement);
        
        // Verkaufspreis anzeigen
        const sellPrice = this.getCardValue(card);
        priceValue.textContent = `${sellPrice} Münzen`;
        
        // Modal öffnen
        modal.style.display = 'block';
    }

    confirmSell() {
        if (!this.currentSellCard) {
            console.log('No card selected for selling');
            return;
        }
        
        const sellPrice = this.getCardValue(this.currentSellCard);
        console.log('Selling card:', this.currentSellCard.name, 'for:', sellPrice);
        
        // Finde Karte in der Sammlung - einfache Suche nach Name und Rarity
        const cardIndex = this.game.collection.findIndex(card => 
            card.name === this.currentSellCard.name && card.rarity === this.currentSellCard.rarity
        );
        
        if (cardIndex === -1) {
            this.game.ui.showSaveIndicator('❌ Karte nicht gefunden!', 'error');
            console.log('Card not found in collection');
            return;
        }
        
        // Karte aus Sammlung entfernen
        const soldCard = this.game.collection.splice(cardIndex, 1)[0];
        console.log('Removed card from collection:', soldCard.name);
        
        // Karte auch aus Deck entfernen falls vorhanden
        const deckIndex = this.game.deck.findIndex(deckCard => 
            deckCard.name === soldCard.name && deckCard.rarity === soldCard.rarity
        );
        if (deckIndex !== -1) {
            this.game.deck.splice(deckIndex, 1);
            console.log('Removed card from deck');
        }
        
        // Münzen hinzufügen
        this.game.coins += sellPrice;
        console.log('Added coins:', sellPrice, 'Total coins:', this.game.coins);
        
        // UI Updates
        this.game.ui.updateDisplay();
        this.displayCollection();
        if (this.game.deckManager) {
            this.game.deckManager.updateDeckBuilder();
        }
        
        // Speichern
        this.game.saveManager.saveGameData();
        
        // Feedback anzeigen
        this.game.ui.showSaveIndicator(`💰 ${soldCard.name} für ${sellPrice} Münzen verkauft!`, 'success');
        
        // Modal schließen
        this.closeSellModal();
    }

    closeSellModal() {
        const modal = document.getElementById('card-sell-modal');
        modal.style.display = 'none';
        this.currentSellCard = null;
    }

    // Test-Funktion für Debugging
    testSellSystem() {
        console.log('Testing sell system...');
        console.log('Toggle button:', document.getElementById('toggle-sell-mode'));
        console.log('Sell modal:', document.getElementById('card-sell-modal'));
        console.log('Confirm button:', document.getElementById('confirm-sell-btn'));
        console.log('Collection value element:', document.getElementById('collection-value'));
        
        // Teste Collection Value Update
        this.updateCollectionValue();
    }
}
