export class UIManager {
    constructor(game) {
        this.game = game;
    }

    updateDisplay() {
        document.getElementById('coins').textContent = this.game.coins;
        document.getElementById('card-count').textContent = this.game.collection.length;
        
        // Update Collection Statistics
        this.updateCollectionStats();
        
        // Update collection value
        if (this.game.collectionManager) {
            this.game.collectionManager.updateCollectionValue();
        }
    }

    updateCollectionStats() {
        const rarityCount = { common: 0, rare: 0, epic: 0, legendary: 0 };
        
        this.game.collection.forEach(card => {
            rarityCount[card.rarity]++;
        });
        
        // Update collection header stats if they exist
        Object.keys(rarityCount).forEach(rarity => {
            const element = document.getElementById(`collection-${rarity}-count`);
            if (element) {
                element.textContent = rarityCount[rarity];
            }
        });
    }

    showSaveIndicator(message, type = 'success') {
        // Erstelle Anzeige-Element
        const indicator = document.createElement('div');
        indicator.className = `save-indicator ${type}`;
        indicator.textContent = message;
        
        // Styling
        Object.assign(indicator.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '10px 20px',
            borderRadius: '5px',
            zIndex: '10000',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
        });
        
        if (type === 'success') {
            indicator.style.background = '#4CAF50';
            indicator.style.color = 'white';
        } else if (type === 'error') {
            indicator.style.background = '#f44336';
            indicator.style.color = 'white';
        }
        
        document.body.appendChild(indicator);
        
        // Entferne nach 3 Sekunden
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 300);
        }, 3000);
    }

    createCardElement(monster, isSmall = false) {
        const card = document.createElement('div');
        card.className = `monster-card ${monster.rarity}`;
        
        card.innerHTML = `
            <div class="card-rarity rarity-${monster.rarity}">${monster.rarity}</div>
            <div class="card-image monster-image ${monster.image}">
                <div class="monster-symbol">${monster.emoji}</div>
            </div>
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
                <div class="card-image monster-image ${monster.image}" style="height: 150px;">
                    <div class="monster-symbol" style="font-size: 4rem;">${monster.emoji}</div>
                </div>
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

    createDeckCardElement(monster, index) {
        const card = document.createElement('div');
        card.className = `deck-card monster-card ${monster.rarity}`;
        
        card.innerHTML = `
            <button class="remove-from-deck" data-index="${index}" title="Aus Deck entfernen">×</button>
            <div class="card-rarity rarity-${monster.rarity}">${monster.rarity}</div>
            <div class="card-image monster-image ${monster.image}">
                <div class="monster-symbol">${monster.emoji}</div>
            </div>
            <div class="card-name">${monster.name}</div>
            <div class="card-stats">
                <div class="stat-item">
                    <span class="stat-label">ATK</span>
                    <span class="stat-value">${monster.attack}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">DEF</span>
                    <span class="stat-value">${monster.defense}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">HP</span>
                    <span class="stat-value">${monster.health}</span>
                </div>
            </div>
        `;
        
        // Event Listener für Remove-Button
        const removeBtn = card.querySelector('.remove-from-deck');
        removeBtn.addEventListener('click', () => {
            this.game.deckManager.removeFromDeck(index);
        });
        
        return card;
    }

    createDeckBuilderCardElement(monster) {
        const card = document.createElement('div');
        const isInDeck = this.game.deck.some(deckCard => deckCard.id === monster.id);
        
        card.className = `deck-builder-card monster-card ${monster.rarity}`;
        if (isInDeck) {
            card.classList.add('in-deck');
        }

        // Drag & Drop Funktionalität hinzufügen
        card.draggable = true;
        card.dataset.monsterId = monster.id;
        
        card.innerHTML = `
            <div class="card-rarity rarity-${monster.rarity}">${monster.rarity}</div>
            <div class="card-image monster-image ${monster.image}">
                <div class="monster-symbol">${monster.emoji}</div>
            </div>
            <div class="card-name">${monster.name}</div>
            <div class="card-stats">
                <div class="stat-item">
                    <span class="stat-label">ATK</span>
                    <span class="stat-value">${monster.attack}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">DEF</span>
                    <span class="stat-value">${monster.defense}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">HP</span>
                    <span class="stat-value">${monster.health}</span>
                </div>
            </div>
            ${!isInDeck ? `<button class="add-to-deck-btn" data-monster-id="${monster.id}" title="Zum Deck hinzufügen">+</button>` : ''}
        `;

        // Drag Event Listeners
        card.addEventListener('dragstart', (e) => {
            if (!isInDeck) {
                e.dataTransfer.setData('text/plain', monster.id);
                card.classList.add('dragging');
            } else {
                e.preventDefault();
            }
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });
        
        // Event Listener für Add-to-Deck-Button
        const addBtn = card.querySelector('.add-to-deck-btn');
        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.game.deckManager.addToDeck(monster.id);
            });
        }
        
        // Karten-Details bei Klick anzeigen
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('add-to-deck-btn')) {
                this.showCardDetails(monster);
            }
        });
        
        return card;
    }

    initializeEventListeners() {
        // Warte darauf, dass DOM vollständig geladen ist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
            });
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Tab-Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.game.switchTab(tab);
            });
        });

        // Filter und Suche
        document.getElementById('rarity-filter').addEventListener('change', () => {
            this.game.collectionManager.filterCards();
        });

        document.getElementById('search-cards').addEventListener('input', () => {
            this.game.collectionManager.filterCards();
        });

        // Restock Button
        document.getElementById('restock-btn').addEventListener('click', () => {
            this.game.shopManager.restockBoosterDisplays();
        });

        // Import Save Button
        document.getElementById('import-save-btn').addEventListener('click', () => {
            document.getElementById('import-save-input').click();
        });

        document.getElementById('import-save-input').addEventListener('change', (e) => {
            this.game.saveManager.importSaveData(e.target.files[0]);
        });

        // Collection Selling
        const toggleSellBtn = document.getElementById('toggle-sell-mode');
        if (toggleSellBtn) {
            toggleSellBtn.addEventListener('click', () => {
                this.game.collectionManager.toggleSellMode();
            });
        }

        // Save/Load Controls
        document.getElementById('manual-save-btn').addEventListener('click', () => {
            this.game.saveManager.manualSave();
        });

        document.getElementById('export-save-btn').addEventListener('click', () => {
            this.game.saveManager.exportSaveData();
        });

        document.getElementById('reset-game-btn').addEventListener('click', () => {
            this.game.saveManager.resetGame();
        });

        // Deck Builder Controls
        document.getElementById('clear-deck-btn').addEventListener('click', () => {
            this.game.deckManager.clearDeck();
        });

        document.getElementById('auto-build-deck-btn').addEventListener('click', () => {
            this.game.deckManager.autoBuildDeck();
        });

        document.getElementById('save-deck-btn').addEventListener('click', () => {
            this.game.deckManager.saveDeck();
        });

        // Deck Builder Filters
        document.getElementById('deck-rarity-filter').addEventListener('change', () => {
            this.game.deckManager.updateDeckBuilder();
        });

        document.getElementById('deck-sort-filter').addEventListener('change', () => {
            this.game.deckManager.updateDeckBuilder();
        });

        // Kampf
        document.getElementById('monster-select').addEventListener('change', (e) => {
            if (e.target.value) {
                this.game.battleManager.selectPlayerMonster(e.target.value);
            }
        });

        document.getElementById('attack-btn').addEventListener('click', () => {
            this.game.battleManager.performAttack();
        });

        document.getElementById('find-opponent-btn').addEventListener('click', () => {
            this.game.battleManager.findOpponent();
        });

        // Modal
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('card-modal').style.display = 'none';
        });

        // Sell Modal Event Listeners
        const sellModal = document.getElementById('card-sell-modal');
        if (sellModal) {
            const sellModalClose = sellModal.querySelector('.close');
            const confirmSellBtn = document.getElementById('confirm-sell-btn');
            const cancelSellBtn = document.getElementById('cancel-sell-btn');
            
            if (sellModalClose) {
                sellModalClose.addEventListener('click', () => {
                    this.game.collectionManager.closeSellModal();
                });
            }

            if (confirmSellBtn) {
                confirmSellBtn.addEventListener('click', () => {
                    this.game.collectionManager.confirmSell();
                });
            }

            if (cancelSellBtn) {
                cancelSellBtn.addEventListener('click', () => {
                    this.game.collectionManager.closeSellModal();
                });
            }
        }

        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('card-modal')) {
                document.getElementById('card-modal').style.display = 'none';
            }
            if (e.target === sellModal) {
                this.game.collectionManager.closeSellModal();
            }
        });
    }
}
