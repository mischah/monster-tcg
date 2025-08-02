export class CollectionManager {
    constructor(game) {
        this.game = game;
        this.sellModeActive = false;
        this.currentSellCard = null;
        
        // Virtualisierung für Performance
        this.cardsPerPage = this.getOptimalCardsPerPage();
        this.currentPage = 1;
        this.isLoading = false;
        this.filteredCards = [];
        
        // Intersection Observer für Lazy Loading
        this.observer = null;
        this.setupIntersectionObserver();
        
        // Performance Monitoring
        this.performanceMetrics = {
            renderTime: 0,
            cardsRendered: 0,
            lastRenderTime: Date.now()
        };
    }

    getOptimalCardsPerPage() {
        // Dynamische Anpassung basierend auf Gerät
        const userAgent = navigator.userAgent;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isIpad = /iPad/i.test(userAgent);
        
        if (isIpad) {
            return 12; // Weniger für iPad
        } else if (isMobile) {
            return 8; // Sehr wenig für Smartphones
        } else {
            return 20; // Desktop kann mehr
        }
    }

    setupIntersectionObserver() {
        // Lazy Loading Setup
        if ('IntersectionObserver' in window) {
            // Observer für Load-More-Trigger
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadMoreCards();
                    }
                });
            }, {
                root: null,
                rootMargin: '100px',
                threshold: 0.1
            });

            // Observer für Platzhalter (Re-Hydration)
            this.placeholderObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.rehydratePlaceholder(entry.target);
                    }
                });
            }, {
                root: null,
                rootMargin: '200px', // Größerer Bereich für frühe Re-Hydration
                threshold: 0.1
            });
        }
    }

    displayCollection() {
        const grid = document.getElementById('card-grid');
        this.filteredCards = this.getFilteredCards();
        
        // Reset pagination
        this.currentPage = 1;
        grid.innerHTML = '';
        
        // Toggle sell mode class on grid
        if (this.sellModeActive) {
            grid.classList.add('sell-mode');
        } else {
            grid.classList.remove('sell-mode');
        }
        
        // Initial load mit weniger Karten
        this.loadInitialCards();
        
        // Update collection value display
        this.updateCollectionValue();
    }

    loadInitialCards() {
        const grid = document.getElementById('card-grid');
        const startIndex = 0;
        const endIndex = Math.min(this.cardsPerPage, this.filteredCards.length);
        
        // Performance: RequestAnimationFrame für smooth rendering
        this.renderCardsInBatches(grid, startIndex, endIndex);
        
        // Setup load more trigger
        this.setupLoadMoreTrigger(grid);
    }

    renderCardsInBatches(grid, startIndex, endIndex, batchSize = 3) {
        const startTime = performance.now();
        const batch = [];
        
        for (let i = startIndex; i < endIndex; i++) {
            if (i >= this.filteredCards.length) break;
            batch.push(this.filteredCards[i]);
        }
        
        // Render in sehr kleinen Batches für iPad-Performance
        const renderBatch = (cards, index = 0) => {
            if (index >= cards.length) {
                this.setupLoadMoreTrigger(grid);
                
                // Performance Metrics
                const endTime = performance.now();
                this.performanceMetrics.renderTime = endTime - startTime;
                this.performanceMetrics.cardsRendered += cards.length;
                this.performanceMetrics.lastRenderTime = Date.now();
                
                console.log(`🎮 Rendered ${cards.length} cards in ${(endTime - startTime).toFixed(2)}ms`);
                return;
            }
            
            const endBatch = Math.min(index + batchSize, cards.length);
            const fragment = document.createDocumentFragment();
            
            for (let i = index; i < endBatch; i++) {
                const monster = cards[i];
                const cardElement = this.game.ui.createCardElement(monster);
                
                // Event Listener mit Performance-Optimierung
                cardElement.addEventListener('click', () => {
                    if (this.sellModeActive) {
                        this.showSellConfirmation(monster);
                    } else {
                        this.game.ui.showCardDetails(monster);
                    }
                }, { passive: true });
                
                fragment.appendChild(cardElement);
            }
            
            grid.appendChild(fragment);
            
            // Nächste Batch mit längerer Pause für iPad
            if (endBatch < cards.length) {
                setTimeout(() => renderBatch(cards, endBatch), 16); // ~60fps
            } else {
                this.setupLoadMoreTrigger(grid);
                
                // Performance Metrics
                const endTime = performance.now();
                this.performanceMetrics.renderTime = endTime - startTime;
                this.performanceMetrics.cardsRendered += cards.length;
                this.performanceMetrics.lastRenderTime = Date.now();
                
                console.log(`🎮 Rendered ${cards.length} cards in ${(endTime - startTime).toFixed(2)}ms`);
            }
        };
        
        renderBatch(batch);
    }

    setupLoadMoreTrigger(grid) {
        // Entferne alte Trigger
        const existingTrigger = grid.querySelector('.load-more-trigger');
        if (existingTrigger) {
            existingTrigger.remove();
        }
        
        // Wenn mehr Karten vorhanden sind, erstelle Load-More-Trigger
        const totalLoaded = grid.children.length;
        if (totalLoaded < this.filteredCards.length) {
            const trigger = document.createElement('div');
            trigger.className = 'load-more-trigger';
            trigger.style.height = '20px';
            trigger.style.width = '100%';
            trigger.style.gridColumn = '1 / -1';
            
            grid.appendChild(trigger);
            
            // Observer für Lazy Loading
            if (this.observer) {
                this.observer.observe(trigger);
            }
        }
    }

    loadMoreCards() {
        if (this.isLoading) return;
        
        const grid = document.getElementById('card-grid');
        const currentlyLoaded = grid.children.length - 1; // -1 für trigger
        
        if (currentlyLoaded >= this.filteredCards.length) return;
        
        // Memory Management: Entferne Karten außerhalb des sichtbaren Bereichs
        this.cleanupOffscreenCards(grid);
        
        this.isLoading = true;
        
        // Loading indicator
        const trigger = grid.querySelector('.load-more-trigger');
        if (trigger) {
            trigger.innerHTML = '<div style="text-align: center; color: #ffd700; padding: 10px;">🔄 Lade weitere Karten...</div>';
        }
        
        // Längere Delay für iPad
        setTimeout(() => {
            const startIndex = currentlyLoaded;
            const endIndex = Math.min(startIndex + this.cardsPerPage, this.filteredCards.length);
            
            this.renderCardsInBatches(grid, startIndex, endIndex);
            this.isLoading = false;
        }, 500); // Längere Pause für iPad
    }

    cleanupOffscreenCards(grid) {
        // Entferne Karten die sehr weit oben sind (Memory Management)
        const cards = grid.querySelectorAll('.monster-card');
        const viewportHeight = window.innerHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        cards.forEach((card, index) => {
            const cardTop = card.offsetTop;
            const cardBottom = cardTop + card.offsetHeight;
            
            // Entferne Karten die mehr als 4 Bildschirmhöhen nach oben sind
            if (cardBottom < scrollTop - (viewportHeight * 4)) {
                // Finde den Index in filteredCards
                const cardIndex = Array.from(grid.children).indexOf(card);
                if (cardIndex < this.filteredCards.length) {
                    // Erstelle Platzhalter mit gespeicherten Daten
                    const placeholder = document.createElement('div');
                    placeholder.className = 'card-placeholder';
                    placeholder.style.height = card.offsetHeight + 'px';
                    placeholder.style.width = card.offsetWidth + 'px';
                    placeholder.style.background = 'rgba(255, 255, 255, 0.05)';
                    placeholder.style.borderRadius = '15px';
                    placeholder.style.display = 'flex';
                    placeholder.style.alignItems = 'center';
                    placeholder.style.justifyContent = 'center';
                    placeholder.style.color = '#666';
                    placeholder.style.fontSize = '0.8rem';
                    placeholder.innerHTML = '📱 Karte virtualisiert';
                    
                    // Speichere Monster-Daten im Platzhalter
                    placeholder.dataset.cardIndex = cardIndex;
                    placeholder.dataset.monsterData = JSON.stringify(this.filteredCards[cardIndex]);
                    
                    card.parentNode.replaceChild(placeholder, card);
                    
                    // Observer für Re-Hydration hinzufügen
                    if (this.placeholderObserver) {
                        this.placeholderObserver.observe(placeholder);
                    }
                }
            }
        });
    }

    rehydratePlaceholder(placeholder) {
        try {
            // Monster-Daten aus Platzhalter wiederherstellen
            const monsterData = JSON.parse(placeholder.dataset.monsterData);
            
            // Neue Karte erstellen
            const cardElement = this.game.ui.createCardElement(monsterData);
            
            // Event Listener hinzufügen
            cardElement.addEventListener('click', () => {
                if (this.sellModeActive) {
                    this.showSellConfirmation(monsterData);
                } else {
                    this.game.ui.showCardDetails(monsterData);
                }
            }, { passive: true });
            
            // Platzhalter durch echte Karte ersetzen
            placeholder.parentNode.replaceChild(cardElement, placeholder);
            
            // Observer entfernen
            if (this.placeholderObserver) {
                this.placeholderObserver.unobserve(placeholder);
            }
            
            console.log(`🔄 Re-hydrated card: ${monsterData.name}`);
        } catch (error) {
            console.error('Failed to rehydrate placeholder:', error);
        }
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
        // Reset pagination und neu laden
        this.currentPage = 1;
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
            legendary: 150,
            'ultra-rare': 500  // Ultra-rare monsters are extremely valuable
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
        
        // Performance: Nur neu rendern, nicht komplett neu laden
        this.refreshSellMode();
    }

    refreshSellMode() {
        const grid = document.getElementById('card-grid');
        
        // Toggle CSS-Klasse für Verkaufsmodus
        if (this.sellModeActive) {
            grid.classList.add('sell-mode');
        } else {
            grid.classList.remove('sell-mode');
        }
        
        // Event Listener für existierende Karten aktualisieren
        const cardElements = grid.querySelectorAll('.monster-card');
        cardElements.forEach((cardElement, index) => {
            if (index < this.filteredCards.length) {
                const monster = this.filteredCards[index];
                
                // Entferne alte Event Listener (clone-Trick)
                const newCardElement = cardElement.cloneNode(true);
                
                // Neue Event Listener hinzufügen
                newCardElement.addEventListener('click', () => {
                    if (this.sellModeActive) {
                        this.showSellConfirmation(monster);
                    } else {
                        this.game.ui.showCardDetails(monster);
                    }
                }, { passive: true });
                
                cardElement.parentNode.replaceChild(newCardElement, cardElement);
            }
        });

        // Auch Platzhalter-Bereiche berücksichtigen
        const placeholders = grid.querySelectorAll('.card-placeholder');
        placeholders.forEach(placeholder => {
            // Re-hydrate placeholder to apply sell mode
            if (placeholder.dataset.monsterData) {
                this.rehydratePlaceholder(placeholder);
            }
        });
    }

    showSellConfirmation(card) {
        this.currentSellCard = card;
        
        // Special warning for ultra-rare cards
        if (card.rarity === 'ultra-rare') {
            const ultraWarning = confirm('⚠️ ACHTUNG: Dies ist eine ULTRA-SELTENE Karte (1 in 10.000)! Bist du dir absolut sicher, dass du sie verkaufen möchtest?');
            if (!ultraWarning) {
                this.currentSellCard = null;
                return;
            }
        }
        
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
        
        // Ultra-rare styling for the modal if needed
        if (card.rarity === 'ultra-rare') {
            modal.classList.add('ultra-rare-modal');
        } else {
            modal.classList.remove('ultra-rare-modal');
        }
        
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
