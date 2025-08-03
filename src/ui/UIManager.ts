import type { MonsterData, SaveIndicatorType, GameManagerType, CollectionStats } from '../types.js';

interface RarityCount {
    common: number;
    rare: number;
    epic: number;
    legendary: number;
    'ultra-rare': number;
}

export class UIManager {
    private game: GameManagerType;

    constructor(game: GameManagerType) {
        this.game = game;
    }

    public updateDisplay(): void {
        const coinsElement = document.getElementById('coins') as HTMLSpanElement;
        const cardCountElement = document.getElementById('card-count') as HTMLSpanElement;

        if (coinsElement) coinsElement.textContent = this.game.coins.toString();
        if (cardCountElement) cardCountElement.textContent = this.game.collection.length.toString();
        
        // Update Collection Statistics
        this.updateCollectionStats();
        
        // Update collection value
        if (this.game.collectionManager) {
            this.game.collectionManager.updateCollectionValue();
        }
    }

    private updateCollectionStats(): void {
        const rarityCount: RarityCount = { common: 0, rare: 0, epic: 0, legendary: 0, 'ultra-rare': 0 };
        
        this.game.collection.forEach(card => {
            const cardRarity = card.rarity as keyof RarityCount;
            rarityCount[cardRarity]++;
        });
        
        // Update collection header stats if they exist
        Object.keys(rarityCount).forEach(rarity => {
            const element = document.getElementById(`collection-${rarity}-count`) as HTMLSpanElement;
            if (element) {
                element.textContent = rarityCount[rarity as keyof RarityCount].toString();
            }
        });
    }

    public showSaveIndicator(message: string, type: SaveIndicatorType = 'success'): void {
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

    public createCardElement(monster: MonsterData, isSmall: boolean = false): HTMLElement {
        // Performance: Template-basierte Erstellung mit DocumentFragment
        const template = document.createElement('template');
        template.innerHTML = `
            <div class="monster-card ${monster.rarity}">
                <div class="card-rarity rarity-${monster.rarity}">${monster.rarity}</div>
                <div class="card-image monster-image ${monster.image || ''}">
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
                        <span class="stat-value">${monster.health}/${monster.health}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Typ</span>
                        <span class="stat-value">${monster.rarity}</span>
                    </div>
                </div>
                <div class="card-description">${monster.description}</div>
            </div>
        `;
        
        // Performance: Clone template statt innerHTML
        const card = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
        card.classList.add('card-reveal');
        
        // Lazy Loading für Bilder
        const imageElement = card.querySelector('.card-image') as HTMLElement;
        if (imageElement) {
            imageElement.style.opacity = '0';
            // Simuliere Bild-Laden
            setTimeout(() => {
                imageElement.style.opacity = '1';
                imageElement.style.transition = 'opacity 0.3s ease';
            }, Math.random() * 200);
        }
        
        return card;
    }

    public showCardDetails(monster: MonsterData): void {
        const modal = document.getElementById('card-modal') as HTMLDivElement;
        const details = document.getElementById('modal-card-details') as HTMLDivElement;
        
        if (!modal || !details) return;

        details.innerHTML = `
            <div class="monster-card ${monster.rarity}" style="max-width: none; margin: 20px 0;">
                <div class="card-rarity rarity-${monster.rarity}">${monster.rarity}</div>
                <div class="card-image monster-image ${monster.image || ''}" style="height: 150px;">
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
                        <span class="stat-value">${monster.health}/${monster.health}</span>
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

    public createDeckCardElement(monster: MonsterData, index: number): HTMLElement {
        const card = document.createElement('div');
        card.className = `deck-card monster-card ${monster.rarity}`;
        
        card.innerHTML = `
            <button class="remove-from-deck" data-index="${index}" title="Aus Deck entfernen">×</button>
            <div class="card-rarity rarity-${monster.rarity}">${monster.rarity}</div>
            <div class="card-image monster-image ${monster.image || ''}">
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
        const removeBtn = card.querySelector('.remove-from-deck') as HTMLButtonElement;
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.game.deckManager.removeFromDeck(index);
            });
        }
        
        return card;
    }

    public createDeckBuilderCardElement(monster: MonsterData): HTMLElement {
        const card = document.createElement('div');
        const isInDeck = this.game.deck.some(deckCard => deckCard.id === monster.id);
        
        card.className = `deck-builder-card monster-card ${monster.rarity}`;
        if (isInDeck) {
            card.classList.add('in-deck');
        }

        // Drag & Drop Funktionalität hinzufügen
        card.draggable = true;
        card.dataset.monsterId = monster.id || '';
        
        card.innerHTML = `
            <div class="card-rarity rarity-${monster.rarity}">${monster.rarity}</div>
            <div class="card-image monster-image ${monster.image || ''}">
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
            ${!isInDeck ? `<button class="add-to-deck-btn" data-monster-id="${monster.id || ''}" title="Zum Deck hinzufügen">+</button>` : ''}
        `;

        // Drag Event Listeners
        card.addEventListener('dragstart', (e: DragEvent) => {
            if (!isInDeck && e.dataTransfer) {
                e.dataTransfer.setData('text/plain', monster.id || '');
                card.classList.add('dragging');
            } else {
                e.preventDefault();
            }
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });
        
        // Event Listener für Add-to-Deck-Button
        const addBtn = card.querySelector('.add-to-deck-btn') as HTMLButtonElement;
        if (addBtn) {
            addBtn.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                this.game.deckManager.addToDeck(monster.id || '');
            });
        }
        
        // Karten-Details bei Klick anzeigen
        card.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            if (!target.classList.contains('add-to-deck-btn')) {
                this.showCardDetails(monster);
            }
        });
        
        return card;
    }

    public initializeEventListeners(): void {
        // Warte darauf, dass DOM vollständig geladen ist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
            });
        } else {
            this.setupEventListeners();
        }
    }

    private setupEventListeners(): void {
        // Tab-Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                const tab = target.dataset.tab;
                if (tab) {
                    this.game.switchTab(tab);
                }
            });
        });

        // Filter und Suche
        const rarityFilter = document.getElementById('rarity-filter') as HTMLSelectElement;
        if (rarityFilter) {
            rarityFilter.addEventListener('change', () => {
                this.game.collectionManager.filterCards();
            });
        }

        const searchCards = document.getElementById('search-cards') as HTMLInputElement;
        if (searchCards) {
            searchCards.addEventListener('input', () => {
                this.game.collectionManager.filterCards();
            });
        }

        // Restock Button
        const restockBtn = document.getElementById('restock-btn') as HTMLButtonElement;
        if (restockBtn) {
            restockBtn.addEventListener('click', () => {
                this.game.shopManager.restockBoosterDisplays();
            });
        }

        // Import Save Button
        const importSaveBtn = document.getElementById('import-save-btn') as HTMLButtonElement;
        const importSaveInput = document.getElementById('import-save-input') as HTMLInputElement;
        
        if (importSaveBtn && importSaveInput) {
            importSaveBtn.addEventListener('click', () => {
                importSaveInput.click();
            });

            importSaveInput.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLInputElement;
                const file = target.files?.[0];
                if (file) {
                    this.game.saveManager.importSaveData(file);
                }
            });
        }

        // Collection Selling
        const toggleSellBtn = document.getElementById('toggle-sell-mode') as HTMLButtonElement;
        if (toggleSellBtn) {
            toggleSellBtn.addEventListener('click', () => {
                this.game.collectionManager.toggleSellMode();
            });
        }

        // Multi-Selection Controls
        const selectAllBtn = document.getElementById('select-all-cards') as HTMLButtonElement;
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.game.collectionManager.selectAllCards();
            });
        }

        const clearSelectionBtn = document.getElementById('clear-selection-btn') as HTMLButtonElement;
        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', () => {
                this.game.collectionManager.clearSelection();
            });
        }

        const sellSelectedBtn = document.getElementById('sell-selected-btn') as HTMLButtonElement;
        if (sellSelectedBtn) {
            sellSelectedBtn.addEventListener('click', () => {
                console.log('🔄 Sell Selected Button clicked!');
                console.log('🔄 Selected cards:', this.game.collectionManager.selectedCards.size);
                this.game.collectionManager.showMultiSellConfirmation();
            });
        }

        // Save/Load Controls
        const manualSaveBtn = document.getElementById('manual-save-btn') as HTMLButtonElement;
        if (manualSaveBtn) {
            manualSaveBtn.addEventListener('click', () => {
                this.game.saveManager.manualSave();
            });
        }

        const exportSaveBtn = document.getElementById('export-save-btn') as HTMLButtonElement;
        if (exportSaveBtn) {
            exportSaveBtn.addEventListener('click', () => {
                this.game.saveManager.exportSaveData();
            });
        }

        const resetGameBtn = document.getElementById('reset-game-btn') as HTMLButtonElement;
        if (resetGameBtn) {
            resetGameBtn.addEventListener('click', () => {
                this.game.saveManager.resetGame();
            });
        }

        // Deck Builder Controls
        const clearDeckBtn = document.getElementById('clear-deck-btn') as HTMLButtonElement;
        if (clearDeckBtn) {
            clearDeckBtn.addEventListener('click', () => {
                this.game.deckManager.clearDeck();
            });
        }

        const autoBuildDeckBtn = document.getElementById('auto-build-deck-btn') as HTMLButtonElement;
        if (autoBuildDeckBtn) {
            autoBuildDeckBtn.addEventListener('click', () => {
                this.game.deckManager.autoBuildDeck();
            });
        }

        const saveDeckBtn = document.getElementById('save-deck-btn') as HTMLButtonElement;
        if (saveDeckBtn) {
            saveDeckBtn.addEventListener('click', () => {
                this.game.deckManager.saveDeck();
            });
        }

        // Deck Builder Filters
        const deckRarityFilter = document.getElementById('deck-rarity-filter') as HTMLSelectElement;
        if (deckRarityFilter) {
            deckRarityFilter.addEventListener('change', () => {
                this.game.deckManager.updateDeckBuilder();
            });
        }

        const deckSortFilter = document.getElementById('deck-sort-filter') as HTMLSelectElement;
        if (deckSortFilter) {
            deckSortFilter.addEventListener('change', () => {
                this.game.deckManager.updateDeckBuilder();
            });
        }

        // Kampf
        const monsterSelect = document.getElementById('monster-select') as HTMLSelectElement;
        if (monsterSelect) {
            monsterSelect.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLSelectElement;
                if (target.value) {
                    this.game.battleManager.selectPlayerMonster(target.value);
                }
            });
        }

        const attackBtn = document.getElementById('attack-btn') as HTMLButtonElement;
        if (attackBtn) {
            attackBtn.addEventListener('click', () => {
                this.game.battleManager.performAttack();
            });
        }

        const findOpponentBtn = document.getElementById('find-opponent-btn') as HTMLButtonElement;
        if (findOpponentBtn) {
            findOpponentBtn.addEventListener('click', () => {
                this.game.battleManager.findOpponent();
            });
        }

        // Modal
        const closeBtn = document.querySelector('.close') as HTMLElement;
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const cardModal = document.getElementById('card-modal') as HTMLDivElement;
                if (cardModal) {
                    cardModal.style.display = 'none';
                }
            });
        }

        // Sell Modal Event Listeners
        const sellModal = document.getElementById('card-sell-modal') as HTMLDivElement;
        if (sellModal) {
            const sellModalClose = sellModal.querySelector('.close') as HTMLElement;
            const confirmSellBtn = document.getElementById('confirm-sell-btn') as HTMLButtonElement;
            const cancelSellBtn = document.getElementById('cancel-sell-btn') as HTMLButtonElement;
            
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

        window.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const cardModal = document.getElementById('card-modal') as HTMLDivElement;
            const sellModal = document.getElementById('card-sell-modal') as HTMLDivElement;
            
            if (target === cardModal) {
                cardModal.style.display = 'none';
            }
            if (target === sellModal) {
                this.game.collectionManager.closeSellModal();
            }
        });
    }
}