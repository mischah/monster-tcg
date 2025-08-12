import type { MonsterData, Rarity, GameManagerType, FilterOptions } from '../types.js';

interface PerformanceMetrics {
    renderTime: number;
    cardsRendered: number;
    lastRenderTime: number;
}

export class CollectionManager {
    private game: GameManagerType;
    public sellModeActive: boolean = false;
    public tradingModeActive: boolean = false;
    private currentSellCard: MonsterData | null = null;
    public selectedCards: Set<string> = new Set(); // Für Multi-Selection
    
    // Virtualisierung für Performance
    private cardsPerPage: number;
    private currentPage: number = 1;
    private isLoading: boolean = false;
    private filteredCards: MonsterData[] = [];
    
    // Intersection Observer für Lazy Loading
    private observer: IntersectionObserver | null = null;
    private placeholderObserver: IntersectionObserver | null = null;
    
    // Performance Monitoring
    private performanceMetrics: PerformanceMetrics = {
        renderTime: 0,
        cardsRendered: 0,
        lastRenderTime: Date.now()
    };

    constructor(game: GameManagerType) {
        this.game = game;
        
        // Virtualisierung für Performance
        this.cardsPerPage = this.getOptimalCardsPerPage();
        
        // Intersection Observer für Lazy Loading
        this.setupIntersectionObserver();
    }

    private getOptimalCardsPerPage(): number {
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

    private setupIntersectionObserver(): void {
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
                        this.rehydratePlaceholder(entry.target as HTMLElement);
                    }
                });
            }, {
                root: null,
                rootMargin: '200px', // Größerer Bereich für frühe Re-Hydration
                threshold: 0.1
            });
        }
    }

    public displayCollection(): void {
        const grid = document.getElementById('card-grid') as HTMLDivElement;
        if (!grid) return;

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

    private loadInitialCards(): void {
        const grid = document.getElementById('card-grid') as HTMLDivElement;
        if (!grid) return;

        const startIndex = 0;
        const endIndex = Math.min(this.cardsPerPage, this.filteredCards.length);
        
        // Performance: RequestAnimationFrame für smooth rendering
        this.renderCardsInBatches(grid, startIndex, endIndex);
        
        // Setup load more trigger
        this.setupLoadMoreTrigger(grid);
    }

    private renderCardsInBatches(grid: HTMLDivElement, startIndex: number, endIndex: number, batchSize: number = 3): void {
        const startTime = performance.now();
        const batch: MonsterData[] = [];
        
        for (let i = startIndex; i < endIndex; i++) {
            if (i >= this.filteredCards.length) break;
            batch.push(this.filteredCards[i]);
        }
        
        // Render in sehr kleinen Batches für iPad-Performance
        const renderBatch = (cards: MonsterData[], index: number = 0): void => {
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
                cardElement.addEventListener('click', (e: Event) => {
                    e.preventDefault();
                    
                    if (this.sellModeActive || this.tradingModeActive) {
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

    private setupLoadMoreTrigger(grid: HTMLDivElement): void {
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

    private loadMoreCards(): void {
        if (this.isLoading) return;
        
        const grid = document.getElementById('card-grid') as HTMLDivElement;
        if (!grid) return;

        const currentlyLoaded = grid.children.length - 1; // -1 für trigger
        
        if (currentlyLoaded >= this.filteredCards.length) return;
        
        // Memory Management: Entferne Karten außerhalb des sichtbaren Bereichs
        this.cleanupOffscreenCards(grid);
        
        this.isLoading = true;
        
        // Loading indicator
        const trigger = grid.querySelector('.load-more-trigger') as HTMLDivElement;
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

    private cleanupOffscreenCards(grid: HTMLDivElement): void {
        // Entferne Karten die sehr weit oben sind (Memory Management)
        const cards = grid.querySelectorAll('.monster-card');
        const viewportHeight = window.innerHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        cards.forEach((card, index) => {
            const cardElement = card as HTMLElement;
            const cardTop = cardElement.offsetTop;
            const cardBottom = cardTop + cardElement.offsetHeight;
            
            // Entferne Karten die mehr als 4 Bildschirmhöhen nach oben sind
            if (cardBottom < scrollTop - (viewportHeight * 4)) {
                // Finde den Index in filteredCards
                const cardIndex = Array.from(grid.children).indexOf(cardElement);
                if (cardIndex < this.filteredCards.length) {
                    // Erstelle Platzhalter mit gespeicherten Daten
                    const placeholder = document.createElement('div');
                    placeholder.className = 'card-placeholder';
                    placeholder.style.height = cardElement.offsetHeight + 'px';
                    placeholder.style.width = cardElement.offsetWidth + 'px';
                    placeholder.style.background = 'rgba(255, 255, 255, 0.05)';
                    placeholder.style.borderRadius = '15px';
                    placeholder.style.display = 'flex';
                    placeholder.style.alignItems = 'center';
                    placeholder.style.justifyContent = 'center';
                    placeholder.style.color = '#666';
                    placeholder.style.fontSize = '0.8rem';
                    placeholder.innerHTML = '📱 Karte virtualisiert';
                    
                    // Speichere Monster-Daten im Platzhalter
                    placeholder.dataset.cardIndex = cardIndex.toString();
                    placeholder.dataset.monsterData = JSON.stringify(this.filteredCards[cardIndex]);
                    
                    cardElement.parentNode?.replaceChild(placeholder, cardElement);
                    
                    // Observer für Re-Hydration hinzufügen
                    if (this.placeholderObserver) {
                        this.placeholderObserver.observe(placeholder);
                    }
                }
            }
        });
    }

    private rehydratePlaceholder(placeholder: HTMLElement): void {
        try {
            // Monster-Daten aus Platzhalter wiederherstellen
            const monsterDataStr = placeholder.dataset.monsterData;
            if (!monsterDataStr) return;

            const monsterData: MonsterData = JSON.parse(monsterDataStr);
            
            // Neue Karte erstellen
            const cardElement = this.game.ui.createCardElement(monsterData);
            
            // Überprüfe ob Karte ausgewählt ist
            const cardKey = this.getCardKey(monsterData);
            if (this.selectedCards.has(cardKey)) {
                cardElement.classList.add('selected');
            }
            
            // Event Listener hinzufügen
            cardElement.addEventListener('click', (e: Event) => {
                e.preventDefault();
                
                if (this.sellModeActive || this.tradingModeActive) {
                    this.toggleCardSelection(monsterData, cardElement);
                } else {
                    this.game.ui.showCardDetails(monsterData);
                }
            }, { passive: false });
            
            // Platzhalter durch echte Karte ersetzen
            placeholder.parentNode?.replaceChild(cardElement, placeholder);
            
            // Observer entfernen
            if (this.placeholderObserver) {
                this.placeholderObserver.unobserve(placeholder);
            }
            
            console.log(`🔄 Re-hydrated card: ${monsterData.name}`);
        } catch (error) {
            console.error('Failed to rehydrate placeholder:', error);
        }
    }

    private getFilteredCards(): MonsterData[] {
        let filtered = [...this.game.collection];
        
        // Seltenheits-Filter
        const rarityFilterElement = document.getElementById('rarity-filter') as HTMLSelectElement;
        const rarityFilter = rarityFilterElement?.value || 'all';
        if (rarityFilter !== 'all') {
            filtered = filtered.filter(card => card.rarity === rarityFilter);
        }
        
        // Suchfilter
        const searchElement = document.getElementById('search-cards') as HTMLInputElement;
        const searchTerm = searchElement?.value.toLowerCase() || '';
        if (searchTerm) {
            filtered = filtered.filter(card => 
                card.name.toLowerCase().includes(searchTerm) ||
                card.description.toLowerCase().includes(searchTerm)
            );
        }
        
        return filtered;
    }

    public filterCards(): void {
        // Reset pagination und neu laden
        this.currentPage = 1;
        this.displayCollection();
    }

    public updateCollectionValue(): void {
        const totalValue = this.game.collection.reduce((sum, card) => {
            return sum + this.getCardValue(card);
        }, 0);
        
        const valueElement = document.getElementById('collection-value');
        if (valueElement) {
            valueElement.textContent = totalValue.toString();
        }
    }

    private getCardValue(card: MonsterData): number {
        // Verkaufswerte basierend auf Seltenheit
        const rarityValues: Record<Rarity | 'ultra-rare', number> = {
            common: 15,
            rare: 40,
            epic: 80,
            legendary: 150,
            'ultra-rare': 500  // Ultra-rare monsters are extremely valuable
        };
        return rarityValues[card.rarity as keyof typeof rarityValues] || 10;
    }

    public toggleSellMode(): void {
        this.sellModeActive = !this.sellModeActive;
        
        const toggleBtn = document.getElementById('toggle-sell-mode') as HTMLButtonElement;
        const selectAllBtn = document.getElementById('select-all-cards') as HTMLButtonElement;
        const multiSellBar = document.getElementById('multi-sell-bar') as HTMLDivElement;
        
        if (toggleBtn) {
            if (this.sellModeActive) {
                toggleBtn.classList.add('active');
                toggleBtn.textContent = '❌ Abbrechen';
                toggleBtn.title = 'Verkaufsmodus deaktivieren';
                
                // "Alle auswählen" Button anzeigen
                if (selectAllBtn) selectAllBtn.classList.remove('hidden');
                
                // Multi-Sell Bar vorbereiten
                if (multiSellBar) multiSellBar.classList.remove('hidden');
            } else {
                toggleBtn.classList.remove('active');
                toggleBtn.textContent = '💰 Verkaufen';
                toggleBtn.title = 'Verkaufsmodus aktivieren';
                
                // "Alle auswählen" Button verstecken
                if (selectAllBtn) selectAllBtn.classList.add('hidden');
                
                // Multi-Sell Bar verstecken
                if (multiSellBar) multiSellBar.classList.add('hidden');
                
                // Auswahl zurücksetzen
                this.clearSelection();
            }
        }
        
        // Performance: Nur neu rendern, nicht komplett neu laden
        this.refreshSellMode();
    }

    private refreshSellMode(): void {
        const grid = document.getElementById('card-grid') as HTMLDivElement;
        if (!grid) return;
        
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
                const newCardElement = cardElement.cloneNode(true) as HTMLElement;
                
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
                    
                    if (this.sellModeActive || this.tradingModeActive) {
                        this.toggleCardSelection(monster, newCardElement);
                    } else {
                        this.game.ui.showCardDetails(monster);
                    }
                }, { passive: false });
                
                cardElement.parentNode?.replaceChild(newCardElement, cardElement);
            }
        });

        // Auch Platzhalter-Bereiche berücksichtigen
        const placeholders = grid.querySelectorAll('.card-placeholder');
        placeholders.forEach(placeholder => {
            const placeholderElement = placeholder as HTMLElement;
            if (placeholderElement.dataset.monsterData) {
                try {
                    const monsterData: MonsterData = JSON.parse(placeholderElement.dataset.monsterData);
                    const cardKey = this.getCardKey(monsterData);
                    
                    // Überprüfe Auswahl-Status
                    if (this.sellModeActive && this.selectedCards.has(cardKey)) {
                        placeholderElement.classList.add('selected-placeholder');
                        placeholderElement.style.border = '3px solid #ffd700';
                        placeholderElement.style.background = 'rgba(255, 215, 0, 0.1)';
                        placeholderElement.innerHTML = '✅ Ausgewählt';
                    } else {
                        placeholderElement.classList.remove('selected-placeholder');
                        placeholderElement.style.border = '';
                        placeholderElement.style.background = 'rgba(255, 255, 255, 0.05)';
                        placeholderElement.innerHTML = '📱 Karte virtualisiert';
                    }
                } catch (error) {
                    console.error('Error updating placeholder selection:', error);
                }
            }
        });
        
        // Multi-Sell Bar aktualisieren
        this.updateMultiSellBar();
    }

    public toggleTradingMode(): void {
        
        // Wenn Sell-Modus aktiv ist, zuerst beenden
        if (this.sellModeActive) {
            this.toggleSellMode();
        }
        
        this.tradingModeActive = !this.tradingModeActive;
        
        const toggleBtn = document.getElementById('toggle-trading-mode') as HTMLButtonElement;
        const tradingBar = document.getElementById('trading-bar') as HTMLDivElement;
        
        if (toggleBtn) {
            if (this.tradingModeActive) {
                toggleBtn.classList.add('active');
                toggleBtn.textContent = '❌ Abbrechen';
                toggleBtn.title = 'Trading-Modus deaktivieren';
                
                // Trading Bar anzeigen
                if (tradingBar) tradingBar.classList.remove('hidden');
            } else {
                toggleBtn.classList.remove('active');
                toggleBtn.textContent = '🔄 Trading';
                toggleBtn.title = 'Trading-Modus aktivieren';
                
                // Trading Bar verstecken
                if (tradingBar) tradingBar.classList.add('hidden');
                
                // Auswahl löschen
                this.selectedCards.clear();
                this.updateTradingBar();
            }
        }
        
        // Collection neu rendern für visuelle Updates
        this.refreshTradingMode();
    }

    private refreshTradingMode(): void {
        const grid = document.getElementById('card-grid') as HTMLDivElement;
        if (!grid) return;
        
        // Toggle CSS-Klasse für Trading-Modus
        if (this.tradingModeActive) {
            grid.classList.add('trading-mode');
            grid.classList.remove('sell-mode'); // Sicherstellen dass Sell-Mode nicht aktiv ist
        } else {
            grid.classList.remove('trading-mode');
        }
        
        // Event Listener für existierende Karten aktualisieren (gleiche Logik wie refreshSellMode)
        const cardElements = grid.querySelectorAll('.monster-card');
        cardElements.forEach((cardElement, index) => {
            if (index < this.filteredCards.length) {
                const monster = this.filteredCards[index];
                
                // Entferne alte Event Listener (clone-Trick)
                const newCardElement = cardElement.cloneNode(true) as HTMLElement;
                
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
                    
                    if (this.sellModeActive || this.tradingModeActive) {
                        this.toggleCardSelection(monster, newCardElement);
                    } else {
                        this.game.ui.showCardDetails(monster);
                    }
                }, { passive: false });
                
                cardElement.parentNode?.replaceChild(newCardElement, cardElement);
            }
        });
        
        // Trading Bar aktualisieren
        this.updateTradingBar();
    }

    public showSellConfirmation(card: MonsterData): void {
        this.currentSellCard = card;
        
        // Special warning for ultra-rare cards
        if (card.rarity === 'ultra-rare' as any) {
            const ultraWarning = confirm('⚠️ ACHTUNG: Dies ist eine ULTRA-SELTENE Karte (1 in 10.000)! Bist du dir absolut sicher, dass du sie verkaufen möchtest?');
            if (!ultraWarning) {
                this.currentSellCard = null;
                return;
            }
        }
        
        const modal = document.getElementById('card-sell-modal') as HTMLDivElement;
        const preview = document.getElementById('sell-card-preview') as HTMLDivElement;
        const priceValue = document.getElementById('sell-price-value') as HTMLSpanElement;
        const modalTitle = document.getElementById('sell-modal-title') as HTMLHeadingElement;
        
        if (!modal || !preview || !priceValue) {
            return;
        }
        
        // Modal-Titel anpassen
        if (modalTitle) {
            modalTitle.textContent = '💰 Karte verkaufen';
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
        if (card.rarity === 'ultra-rare' as any) {
            modal.classList.add('ultra-rare-modal');
        } else {
            modal.classList.remove('ultra-rare-modal');
        }
        
        // Modal öffnen
        modal.style.display = 'block';
    }

    // Multi-Selection Methoden
    private getCardKey(card: MonsterData, collectionArray: MonsterData[] | null = null): string {
        // Verwende Array-Index für eindeutige Keys bei Duplikaten
        const sourceArray = collectionArray || this.game.collection;
        
        // Find card by matching all properties instead of object reference
        const cardIndex = sourceArray.findIndex(c => 
            c.name === card.name && 
            c.rarity === card.rarity && 
            c.attack === card.attack && 
            c.defense === card.defense && 
            c.health === card.health &&
            c.description === card.description
        );
        
        if (cardIndex === -1) {
            // Still use fallback, but make it deterministic
            console.warn('⚠️ Card not found in collection, using fallback key for:', card.name);
            return `fallback_${card.name}_${card.rarity}_${card.attack}_${card.defense}_${card.health}`;
        }
        
        return `card_${cardIndex}_${card.name}_${card.rarity}`;
    }

    private toggleCardSelection(card: MonsterData, cardElement: HTMLElement): void {
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
        
        // Update entsprechende Bar je nach aktivem Modus
        if (this.sellModeActive) {
            this.updateMultiSellBar();
        } else if (this.tradingModeActive) {
            this.updateTradingBar();
        }
    }

    public selectAllCards(): void {
        // Debug: Zeige aktuelle Filter-Situation
        const totalCards = this.game.collection.length;
        const filteredCards = this.filteredCards.length;
        
        console.log(`🔍 Filter-Debug: ${totalCards} Karten total, ${filteredCards} nach Filter`);
        
        // Prüfe ob Filter aktiv sind
        const rarityFilterElement = document.getElementById('rarity-filter') as HTMLSelectElement;
        const searchElement = document.getElementById('search-cards') as HTMLInputElement;
        const rarityFilter = rarityFilterElement?.value || 'all';
        const searchTerm = searchElement?.value.toLowerCase() || '';
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
            const keySet = new Set<string>();
            
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
            const placeholderElement = placeholder as HTMLElement;
            if (placeholderElement.dataset.monsterData) {
                try {
                    const monsterData: MonsterData = JSON.parse(placeholderElement.dataset.monsterData);
                    const cardKey = this.getCardKey(monsterData);
                    if (this.selectedCards.has(cardKey)) {
                        placeholderElement.classList.add('selected-placeholder');
                        placeholderElement.style.border = '3px solid #ffd700';
                        placeholderElement.style.background = 'rgba(255, 215, 0, 0.1)';
                        placeholderElement.innerHTML = '✅ Ausgewählt';
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

    public clearSelection(): void {
        this.selectedCards.clear();
        
        // Alle Karten deselektieren
        const cardElements = document.querySelectorAll('.sell-mode .monster-card.selected');
        cardElements.forEach(element => {
            element.classList.remove('selected');
        });
        
        // Platzhalter zurücksetzen
        const placeholders = document.querySelectorAll('.card-placeholder.selected-placeholder');
        placeholders.forEach(placeholder => {
            const placeholderElement = placeholder as HTMLElement;
            placeholderElement.classList.remove('selected-placeholder');
            placeholderElement.style.border = '';
            placeholderElement.style.background = 'rgba(255, 255, 255, 0.05)';
            placeholderElement.innerHTML = '📱 Karte virtualisiert';
        });
        
        this.updateMultiSellBar();
    }

    private updateMultiSellBar(): void {
        const selectedCount = document.getElementById('selected-count') as HTMLSpanElement;
        const selectedValue = document.getElementById('selected-value') as HTMLSpanElement;
        const sellSelectedBtn = document.getElementById('sell-selected-btn') as HTMLButtonElement;
        const multiSellBar = document.getElementById('multi-sell-bar') as HTMLDivElement;
        
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
        
        selectedCount.textContent = count.toString();
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
        if (multiSellBar) {
            if (count > 0 && this.sellModeActive) {
                multiSellBar.classList.remove('hidden');
            } else if (!this.sellModeActive) {
                multiSellBar.classList.add('hidden');
            }
        }
        
        // Debug-Info
        console.log(`🔄 Multi-Sell Bar Update: ${count} Karten ausgewählt, ${foundCards} gefunden, ${totalValue} Münzen`);
    }

    private updateTradingBar(): void {
        const selectedCount = document.getElementById('trading-selected-count') as HTMLSpanElement;
        const sendTradeBtn = document.getElementById('send-trade-btn') as HTMLButtonElement;
        const tradingBar = document.getElementById('trading-bar') as HTMLDivElement;
        
        if (!selectedCount || !sendTradeBtn) return;
        
        const count = this.selectedCards.size;
        
        selectedCount.textContent = count.toString();
        
        // Button aktivieren/deaktivieren
        if (count > 0) {
            sendTradeBtn.disabled = false;
            sendTradeBtn.classList.remove('disabled');
        } else {
            sendTradeBtn.disabled = true;
            sendTradeBtn.classList.add('disabled');
        }
        
        // Bar anzeigen/verstecken basierend auf Auswahl
        if (tradingBar) {
            if (count > 0 && this.tradingModeActive) {
                tradingBar.classList.remove('hidden');
            } else if (!this.tradingModeActive) {
                tradingBar.classList.add('hidden');
            }
        }
        
        console.log(`🔄 Trading: ${count} Karten für Tausch ausgewählt`);
    }

    public getSelectedCardsForTrading(): MonsterData[] {
        const selectedCards: MonsterData[] = [];
        
        this.selectedCards.forEach(cardKey => {
            const card = this.findCardByKeyInCollection(cardKey);
            if (card) {
                selectedCards.push(card);
            }
        });
        
        return selectedCards;
    }

    public clearTradingSelection(): void {
        this.selectedCards.clear();
        this.updateTradingBar();
        
        // Visuelle Auswahl entfernen
        const selectedElements = document.querySelectorAll('.monster-card.selected');
        selectedElements.forEach(element => {
            element.classList.remove('selected');
        });
    }

    private findCardByKey(cardKey: string): MonsterData | undefined {
        return this.filteredCards.find(card => this.getCardKey(card) === cardKey);
    }

    private findCardByKeyInCollection(cardKey: string): MonsterData | undefined {
        // Handle normal format: card_INDEX_name_rarity
        const indexMatch = cardKey.match(/^card_(\d+)_/);
        if (indexMatch) {
            const index = parseInt(indexMatch[1]);
            if (index >= 0 && index < this.game.collection.length) {
                return this.game.collection[index];
            }
        }
        
        // Handle fallback format: fallback_name_rarity_attack_defense_health
        const fallbackMatch = cardKey.match(/^fallback_(.+)_([^_]+)_(\d+)_(\d+)_(\d+)$/);
        if (fallbackMatch) {
            const [, name, rarity, attack, defense, health] = fallbackMatch;
            return this.game.collection.find(card => 
                card.name === name &&
                card.rarity === rarity &&
                card.attack === parseInt(attack) &&
                card.defense === parseInt(defense) &&
                card.health === parseInt(health)
            );
        }
        
        // Final fallback: Suche in der GESAMTEN Sammlung nach Key-Match
        return this.game.collection.find(card => this.getCardKey(card) === cardKey);
    }

    public showMultiSellConfirmation(): void {
        console.log('🔄 showMultiSellConfirmation called, selectedCards.size:', this.selectedCards.size);
        
        if (this.selectedCards.size === 0) {
            console.log('⚠️ No cards selected, aborting');
            return;
        }
        
        const selectedCardsArray = Array.from(this.selectedCards).map(key => 
            this.findCardByKeyInCollection(key)).filter(card => card) as MonsterData[];
        
        console.log('🔄 Found cards:', selectedCardsArray.length);
        
        const modal = document.getElementById('card-sell-modal') as HTMLDivElement;
        const preview = document.getElementById('sell-card-preview') as HTMLDivElement;
        const priceValue = document.getElementById('sell-price-value') as HTMLSpanElement;
        const modalTitle = document.getElementById('sell-modal-title') as HTMLHeadingElement;
        
        if (!modal || !preview || !priceValue) {
            console.log('⚠️ Modal elements not found!');
            return;
        }
        
        // Modal-Titel anpassen
        if (modalTitle) {
            modalTitle.textContent = `💰 ${selectedCardsArray.length} Karten verkaufen`;
        }
        
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
            
            const rarityBreakdown: Record<string, number> = {};
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

    private getRarityDisplayName(rarity: string): string {
        const names: Record<string, string> = {
            'common': 'Häufig',
            'rare': 'Selten',
            'epic': 'Episch',
            'legendary': 'Legendär',
            'ultra-rare': 'Ultra-Selten'
        };
        return names[rarity] || rarity;
    }

    public confirmSell(): void {
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
            card.name === this.currentSellCard!.name && card.rarity === this.currentSellCard!.rarity
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

    private confirmMultiSell(): void {
        if (this.selectedCards.size === 0) return;
        
        const selectedCardsArray = Array.from(this.selectedCards).map(key => 
            this.findCardByKeyInCollection(key)).filter(card => card) as MonsterData[];
        
        console.log(`🛒 Multi-Sell: Attempting to sell ${selectedCardsArray.length} cards`);
        console.log('Selected cards:', selectedCardsArray.map(c => c.name));
        
        let totalValue = 0;
        let soldCount = 0;
        const soldCards: MonsterData[] = [];
        
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
        const rarityBreakdown: Record<string, number> = {};
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

    public closeSellModal(): void {
        const modal = document.getElementById('card-sell-modal') as HTMLDivElement;
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentSellCard = null;
    }

    // Test-Funktion für Debugging
    public testSellSystem(): void {
        console.log('Testing sell system...');
        console.log('Toggle button:', document.getElementById('toggle-sell-mode'));
        console.log('Sell modal:', document.getElementById('card-sell-modal'));
        console.log('Confirm button:', document.getElementById('confirm-sell-btn'));
        console.log('Collection value element:', document.getElementById('collection-value'));
        
        // Teste Collection Value Update
        this.updateCollectionValue();
    }
}