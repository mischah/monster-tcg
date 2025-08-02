export class CollectionManager {
    constructor(game) {
        this.game = game;
        this.sellModeActive = false;
        this.currentSellCard = null;
        this.selectedCards = new Set(); // Für Multi-Selection
        
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
                
                // Überprüfe ob Karte ausgewählt ist
                const cardKey = this.getCardKey(monster);
                if (this.selectedCards.has(cardKey)) {
                    cardElement.classList.add('selected');
                }
                
                // Event Listener mit Performance-Optimierung
                cardElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (this.sellModeActive) {
                        this.toggleCardSelection(monster, cardElement);
                    } else {
                        this.game.ui.showCardDetails(monster);
                    }
                }, { passive: false });
                
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
            
            // Überprüfe ob Karte ausgewählt ist
            const cardKey = this.getCardKey(monsterData);
            if (this.selectedCards.has(cardKey)) {
                cardElement.classList.add('selected');
            }
            
            // Event Listener hinzufügen
            cardElement.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.sellModeActive) {
                    this.toggleCardSelection(monsterData, cardElement);
                } else {
                    this.game.ui.showCardDetails(monsterData);
                }
            }, { passive: false });
            
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
        const selectAllBtn = document.getElementById('select-all-cards');
        const multiSellBar = document.getElementById('multi-sell-bar');
        
        if (toggleBtn) {
            if (this.sellModeActive) {
                toggleBtn.classList.add('active');
                toggleBtn.textContent = '❌ Abbrechen';
                toggleBtn.title = 'Verkaufsmodus deaktivieren';
                
                // "Alle auswählen" Button anzeigen
                selectAllBtn.classList.remove('hidden');
                
                // Multi-Sell Bar vorbereiten
                multiSellBar.classList.remove('hidden');
            } else {
                toggleBtn.classList.remove('active');
                toggleBtn.textContent = '💰 Verkaufen';
                toggleBtn.title = 'Verkaufsmodus aktivieren';
                
                // "Alle auswählen" Button verstecken
                selectAllBtn.classList.add('hidden');
                
                // Multi-Sell Bar verstecken
                multiSellBar.classList.add('hidden');
                
                // Auswahl zurücksetzen
                this.clearSelection();
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
                
                // Überprüfe ob Karte ausgewählt ist
                const cardKey = this.getCardKey(monster);
                if (this.selectedCards.has(cardKey)) {
                    newCardElement.classList.add('selected');
                } else {
                    newCardElement.classList.remove('selected');
                }
                
                // Neue Event Listener hinzufügen
                newCardElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (this.sellModeActive) {
                        this.toggleCardSelection(monster, newCardElement);
                    } else {
                        this.game.ui.showCardDetails(monster);
                    }
                }, { passive: false });
                
                cardElement.parentNode.replaceChild(newCardElement, cardElement);
            }
        });

        // Auch Platzhalter-Bereiche berücksichtigen
        const placeholders = grid.querySelectorAll('.card-placeholder');
        placeholders.forEach(placeholder => {
            if (placeholder.dataset.monsterData) {
                try {
                    const monsterData = JSON.parse(placeholder.dataset.monsterData);
                    const cardKey = this.getCardKey(monsterData);
                    
                    // Überprüfe Auswahl-Status
                    if (this.sellModeActive && this.selectedCards.has(cardKey)) {
                        placeholder.classList.add('selected-placeholder');
                        placeholder.style.border = '3px solid #ffd700';
                        placeholder.style.background = 'rgba(255, 215, 0, 0.1)';
                        placeholder.innerHTML = '✅ Ausgewählt';
                    } else {
                        placeholder.classList.remove('selected-placeholder');
                        placeholder.style.border = '';
                        placeholder.style.background = 'rgba(255, 255, 255, 0.05)';
                        placeholder.innerHTML = '📱 Karte virtualisiert';
                    }
                } catch (error) {
                    console.error('Error updating placeholder selection:', error);
                }
            }
        });
        
        // Multi-Sell Bar aktualisieren
        this.updateMultiSellBar();
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
        const modalTitle = document.getElementById('sell-modal-title');
        
        if (!modal || !preview || !priceValue) {
            return;
        }
        
        // Modal-Titel anpassen
        modalTitle.textContent = '💰 Karte verkaufen';
        
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

    // Multi-Selection Methoden
    getCardKey(card, collectionArray = null) {
        // Verwende Array-Index für eindeutige Keys bei Duplikaten
        const sourceArray = collectionArray || this.game.collection;
        const cardIndex = sourceArray.indexOf(card);
        
        if (cardIndex === -1) {
            // Fallback für Karten die nicht direkt gefunden werden
            return `${card.name}_${card.rarity}_${card.attack}_${card.defense}_${card.health}_${Date.now()}_${Math.random()}`;
        }
        
        return `card_${cardIndex}_${card.name}_${card.rarity}`;
    }

    toggleCardSelection(card, cardElement) {
        const cardKey = this.getCardKey(card);
        
        if (this.selectedCards.has(cardKey)) {
            // Karte deselektieren
            this.selectedCards.delete(cardKey);
            cardElement.classList.remove('selected');
        } else {
            // Karte selektieren
            this.selectedCards.add(cardKey);
            cardElement.classList.add('selected');
        }
        
        this.updateMultiSellBar();
    }

    selectAllCards() {
        // Debug: Zeige aktuelle Filter-Situation
        const totalCards = this.game.collection.length;
        const filteredCards = this.filteredCards.length;
        
        console.log(`🔍 Filter-Debug: ${totalCards} Karten total, ${filteredCards} nach Filter`);
        
        // Prüfe ob Filter aktiv sind
        const rarityFilter = document.getElementById('rarity-filter').value;
        const searchTerm = document.getElementById('search-cards').value.toLowerCase();
        const hasActiveFilters = rarityFilter !== 'all' || searchTerm.length > 0;
        
        if (hasActiveFilters) {
            // Frage den User ob er alle oder nur gefilterte Karten verkaufen möchte
            const choice = confirm(
                `🤔 Filter sind aktiv!\n\n` +
                `Gefilterte Karten: ${filteredCards}\n` +
                `Gesamte Sammlung: ${totalCards}\n\n` +
                `Möchten Sie ALLE ${totalCards} Karten aus Ihrer Sammlung auswählen?\n\n` +
                `✅ OK = Alle ${totalCards} Karten\n` +
                `❌ Abbrechen = Nur gefilterte ${filteredCards} Karten`
            );
            
            if (choice) {
                // Alle Karten aus der kompletten Sammlung auswählen
                this.game.collection.forEach(card => {
                    const cardKey = this.getCardKey(card);
                    this.selectedCards.add(cardKey);
                });
                
                console.log(`✅ Alle ${totalCards} Karten aus Sammlung ausgewählt`);
                
                // Feedback
                this.game.ui.showSaveIndicator(
                    `✅ Alle ${totalCards} Karten aus Sammlung ausgewählt (Filter ignoriert)`, 
                    'success'
                );
            } else {
                // Nur gefilterte Karten auswählen
                this.filteredCards.forEach(card => {
                    const cardKey = this.getCardKey(card);
                    this.selectedCards.add(cardKey);
                });
                
                console.log(`✅ ${filteredCards} gefilterte Karten ausgewählt`);
                
                // Feedback
                this.game.ui.showSaveIndicator(
                    `✅ ${filteredCards} gefilterte Karten ausgewählt`, 
                    'success'
                );
            }
        } else {
            // Keine Filter aktiv - alle Karten auswählen
            console.log(`🔍 About to select ${totalCards} cards from collection`);
            
            let addedKeys = 0;
            const keySet = new Set();
            
            this.game.collection.forEach((card, index) => {
                const cardKey = this.getCardKey(card);
                
                if (keySet.has(cardKey)) {
                    console.warn(`⚠️ Duplicate key found: ${cardKey} (card ${index}: ${card.name})`);
                } else {
                    keySet.add(cardKey);
                }
                
                this.selectedCards.add(cardKey);
                addedKeys++;
                
                if (index < 5) {
                    console.log(`🔍 Card ${index}: ${card.name} -> Key: ${cardKey}`);
                }
            });
            
            console.log(`✅ Alle ${totalCards} Karten ausgewählt (keine Filter)`);
            console.log(`🔍 Added ${addedKeys} keys, unique keys: ${keySet.size}, selectedCards.size: ${this.selectedCards.size}`);
            
            // Feedback
            this.game.ui.showSaveIndicator(
                `✅ Alle ${totalCards} Karten ausgewählt`, 
                'success'
            );
        }
        
        console.log(`🎯 After selection logic - selectedCards.size: ${this.selectedCards.size}`);
        
        // Alle sichtbaren Karten als ausgewählt markieren
        const cardElements = document.querySelectorAll('.sell-mode .monster-card');
        cardElements.forEach(element => {
            element.classList.add('selected');
        });
        
        console.log(`🎯 After visual marking - selectedCards.size: ${this.selectedCards.size}`);
        
        // Auch Platzhalter als ausgewählt markieren
        const placeholders = document.querySelectorAll('.card-placeholder');
        placeholders.forEach(placeholder => {
            if (placeholder.dataset.monsterData) {
                try {
                    const monsterData = JSON.parse(placeholder.dataset.monsterData);
                    const cardKey = this.getCardKey(monsterData);
                    if (this.selectedCards.has(cardKey)) {
                        placeholder.classList.add('selected-placeholder');
                        placeholder.style.border = '3px solid #ffd700';
                        placeholder.style.background = 'rgba(255, 215, 0, 0.1)';
                        placeholder.innerHTML = '✅ Ausgewählt';
                    }
                } catch (error) {
                    console.error('Error parsing placeholder data:', error);
                }
            }
        });
        
        console.log(`🎯 After placeholder marking - selectedCards.size: ${this.selectedCards.size}`);
        
        this.updateMultiSellBar();
        
        // Debug: Finale Auswahl - VERWENDE COLLECTION-SUCHE!
        const totalSelected = this.selectedCards.size;
        const totalValue = Array.from(this.selectedCards).reduce((sum, cardKey) => {
            const card = this.findCardByKeyInCollection(cardKey);
            return card ? sum + this.getCardValue(card) : sum;
        }, 0);
        
        console.log(`🎯 Finale Auswahl: ${totalSelected} Karten, ${totalValue} Münzen`);
    }

    clearSelection() {
        this.selectedCards.clear();
        
        // Alle Karten deselektieren
        const cardElements = document.querySelectorAll('.sell-mode .monster-card.selected');
        cardElements.forEach(element => {
            element.classList.remove('selected');
        });
        
        // Platzhalter zurücksetzen
        const placeholders = document.querySelectorAll('.card-placeholder.selected-placeholder');
        placeholders.forEach(placeholder => {
            placeholder.classList.remove('selected-placeholder');
            placeholder.style.border = '';
            placeholder.style.background = 'rgba(255, 255, 255, 0.05)';
            placeholder.innerHTML = '📱 Karte virtualisiert';
        });
        
        this.updateMultiSellBar();
    }

    updateMultiSellBar() {
        const selectedCount = document.getElementById('selected-count');
        const selectedValue = document.getElementById('selected-value');
        const sellSelectedBtn = document.getElementById('sell-selected-btn');
        const multiSellBar = document.getElementById('multi-sell-bar');
        
        if (!selectedCount || !selectedValue || !sellSelectedBtn) return;
        
        const count = this.selectedCards.size;
        let totalValue = 0;
        let foundCards = 0;
        
        console.log(`🔍 Debug updateMultiSellBar: selectedCards.size = ${count}`);
        console.log(`🔍 Debug selectedCards contents:`, Array.from(this.selectedCards));
        
        // Berechne Gesamtwert der ausgewählten Karten - SUCHE IN GESAMTER SAMMLUNG!
        this.selectedCards.forEach(cardKey => {
            const card = this.findCardByKeyInCollection(cardKey);
            if (card) {
                totalValue += this.getCardValue(card);
                foundCards++;
            } else {
                console.warn('⚠️ Card not found in collection for key:', cardKey);
            }
        });
        
        selectedCount.textContent = count;
        selectedValue.textContent = `${totalValue} Münzen`;
        
        // Debug: Zeige Verhältnis von ausgewählten zu verfügbaren Karten
        const totalFilteredCards = this.filteredCards.length;
        const totalCollectionCards = this.game.collection.length;
        
        if (count > 0) {
            selectedCount.title = `${count} von ${totalCollectionCards} Karten ausgewählt (${totalFilteredCards} sichtbar)`;
        }
        
        // Button aktivieren/deaktivieren
        sellSelectedBtn.disabled = count === 0;
        
        // Bar anzeigen/verstecken basierend auf Auswahl
        if (count > 0 && this.sellModeActive) {
            multiSellBar.classList.remove('hidden');
        } else if (!this.sellModeActive) {
            multiSellBar.classList.add('hidden');
        }
        
        // Debug-Info
        console.log(`🔄 Multi-Sell Bar Update: ${count} Karten ausgewählt, ${foundCards} gefunden, ${totalValue} Münzen`);
    }

    findCardByKey(cardKey) {
        return this.filteredCards.find(card => this.getCardKey(card) === cardKey);
    }

    findCardByKeyInCollection(cardKey) {
        // Extrahiere Index aus dem Key (Format: card_INDEX_name_rarity)
        const indexMatch = cardKey.match(/^card_(\d+)_/);
        if (indexMatch) {
            const index = parseInt(indexMatch[1]);
            if (index >= 0 && index < this.game.collection.length) {
                return this.game.collection[index];
            }
        }
        
        // Fallback: Suche in der GESAMTEN Sammlung nach Key-Match
        return this.game.collection.find(card => this.getCardKey(card) === cardKey);
    }

    showMultiSellConfirmation() {
        console.log('🔄 showMultiSellConfirmation called, selectedCards.size:', this.selectedCards.size);
        
        if (this.selectedCards.size === 0) {
            console.log('⚠️ No cards selected, aborting');
            return;
        }
        
        const selectedCardsArray = Array.from(this.selectedCards).map(key => 
            this.findCardByKeyInCollection(key)).filter(card => card);
        
        console.log('🔄 Found cards:', selectedCardsArray.length);
        
        const modal = document.getElementById('card-sell-modal');
        const preview = document.getElementById('sell-card-preview');
        const priceValue = document.getElementById('sell-price-value');
        const modalTitle = document.getElementById('sell-modal-title');
        
        if (!modal || !preview || !priceValue) {
            console.log('⚠️ Modal elements not found!');
            return;
        }
        
        // Modal-Titel anpassen
        modalTitle.textContent = `💰 ${selectedCardsArray.length} Karten verkaufen`;
        
        // Ausgewählte Karten im Modal anzeigen
        preview.innerHTML = '';
        
        if (selectedCardsArray.length <= 6) {
            // Zeige alle Karten wenn wenige ausgewählt
            const cardsContainer = document.createElement('div');
            cardsContainer.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 10px;
                max-height: 300px;
                overflow-y: auto;
            `;
            
            selectedCardsArray.forEach(card => {
                const cardElement = this.game.ui.createCardElement(card);
                cardElement.style.cssText = 'transform: scale(0.7); margin: 0;';
                cardsContainer.appendChild(cardElement);
            });
            
            preview.appendChild(cardsContainer);
        } else {
            // Zeige Zusammenfassung bei vielen Karten
            const summary = document.createElement('div');
            summary.style.cssText = 'text-align: center; padding: 20px;';
            
            const rarityBreakdown = {};
            selectedCardsArray.forEach(card => {
                rarityBreakdown[card.rarity] = (rarityBreakdown[card.rarity] || 0) + 1;
            });
            
            summary.innerHTML = `
                <div style="font-size: 1.2rem; margin-bottom: 15px;">
                    ${selectedCardsArray.length} Karten ausgewählt
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px;">
                    ${Object.entries(rarityBreakdown).map(([rarity, count]) => `
                        <div class="rarity-summary ${rarity}">
                            <div>${count}x</div>
                            <div>${this.getRarityDisplayName(rarity)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            preview.appendChild(summary);
        }
        
        // Gesamtverkaufspreis anzeigen
        let totalValue = 0;
        selectedCardsArray.forEach(card => {
            totalValue += this.getCardValue(card);
        });
        
        priceValue.textContent = `${totalValue} Münzen`;
        
        console.log('🔄 Opening modal...');
        
        // Modal öffnen - FORCE SICHTBARKEIT!
        modal.style.display = 'block';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '10000';
        
        console.log('🔄 Modal should be visible now');
        console.log('🔄 Modal display:', modal.style.display);
        console.log('🔄 Modal visibility:', modal.style.visibility);
    }

    getRarityDisplayName(rarity) {
        const names = {
            'common': 'Häufig',
            'rare': 'Selten',
            'epic': 'Episch',
            'legendary': 'Legendär',
            'ultra-rare': 'Ultra-Selten'
        };
        return names[rarity] || rarity;
    }

    confirmSell() {
        // Multi-Sell oder Single-Sell?
        if (this.selectedCards.size > 0) {
            return this.confirmMultiSell();
        }
        
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

    confirmMultiSell() {
        if (this.selectedCards.size === 0) return;
        
        const selectedCardsArray = Array.from(this.selectedCards).map(key => 
            this.findCardByKeyInCollection(key)).filter(card => card);
        
        console.log(`🛒 Multi-Sell: Attempting to sell ${selectedCardsArray.length} cards`);
        console.log('Selected cards:', selectedCardsArray.map(c => c.name));
        
        let totalValue = 0;
        let soldCount = 0;
        const soldCards = [];
        
        // Verkaufe alle ausgewählten Karten
        selectedCardsArray.forEach(cardToSell => {
            const cardIndex = this.game.collection.findIndex(card => 
                card.name === cardToSell.name && 
                card.rarity === cardToSell.rarity &&
                card.attack === cardToSell.attack &&
                card.defense === cardToSell.defense &&
                card.health === cardToSell.health
            );
            
            if (cardIndex !== -1) {
                const soldCard = this.game.collection.splice(cardIndex, 1)[0];
                const sellPrice = this.getCardValue(soldCard);
                totalValue += sellPrice;
                soldCount++;
                soldCards.push(soldCard);
                
                // Karte auch aus Deck entfernen falls vorhanden
                const deckIndex = this.game.deck.findIndex(deckCard => 
                    deckCard.name === soldCard.name && deckCard.rarity === soldCard.rarity
                );
                if (deckIndex !== -1) {
                    this.game.deck.splice(deckIndex, 1);
                }
            }
        });
        
        console.log(`✅ Multi-Sell: Successfully sold ${soldCount} cards for ${totalValue} coins`);
        
        if (soldCount === 0) {
            this.game.ui.showSaveIndicator('❌ Keine Karten verkauft!', 'error');
            return;
        }
        
        // Münzen hinzufügen
        this.game.coins += totalValue;
        
        // Auswahl zurücksetzen
        this.clearSelection();
        
        // UI Updates
        this.game.ui.updateDisplay();
        this.displayCollection();
        if (this.game.deckManager) {
            this.game.deckManager.updateDeckBuilder();
        }
        
        // Speichern
        this.game.saveManager.saveGameData();
        
        // Detailliertes Feedback anzeigen
        const rarityBreakdown = {};
        soldCards.forEach(card => {
            rarityBreakdown[card.rarity] = (rarityBreakdown[card.rarity] || 0) + 1;
        });
        
        const breakdownText = Object.entries(rarityBreakdown)
            .map(([rarity, count]) => `${count}x ${this.getRarityDisplayName(rarity)}`)
            .join(', ');
        
        this.game.ui.showSaveIndicator(
            `💰 ${soldCount} Karten verkauft (${breakdownText}) für ${totalValue} Münzen!`, 
            'success'
        );
        
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
