export class CollectionManager {
    constructor(game) {
        this.game = game;
    }

    displayCollection() {
        const grid = document.getElementById('card-grid');
        const filteredCards = this.getFilteredCards();
        
        grid.innerHTML = '';
        
        filteredCards.forEach(monster => {
            const cardElement = this.game.ui.createCardElement(monster);
            cardElement.addEventListener('click', () => this.game.ui.showCardDetails(monster));
            grid.appendChild(cardElement);
        });
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
}
