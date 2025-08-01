# 🔧 Verkaufssystem Debug-Anleitung

## Testen des Verkaufssystems

### 1. Browser-Konsole öffnen
- Drücke `F12` oder `Cmd+Option+I` (Mac)
- Gehe zum "Console" Tab

### 2. Debug-Befehle ausführen

```javascript
// Teste das gesamte Verkaufssystem
testSell()

// Direkter Test des Toggle-Buttons
document.getElementById('toggle-sell-mode').click()

// Teste Collection Value Update
game.collectionManager.updateCollectionValue()

// Zeige alle verfügbaren DOM-Elemente
console.log('Toggle:', document.getElementById('toggle-sell-mode'))
console.log('Modal:', document.getElementById('card-sell-modal'))
console.log('Value:', document.getElementById('collection-value'))
```

### 3. Manueller Test-Ablauf

1. **Verkaufsmodus aktivieren:**
   - Gehe zur "📚 Sammlung"
   - Klicke auf "💰 Verkaufen" Button
   - Button sollte zu "❌ Abbrechen" wechseln

2. **Karte verkaufen:**
   - Bewege Maus über eine Karte
   - Münzsymbol sollte erscheinen
   - Klicke auf die Karte
   - Modal sollte sich öffnen mit Verkaufspreis

3. **Verkauf bestätigen:**
   - Klicke "Verkaufen" im Modal
   - Münzen sollten hinzugefügt werden
   - Karte sollte verschwinden

## Häufige Probleme & Lösungen

### Problem: "💰 Verkaufen" Button reagiert nicht
**Lösung:** Event-Listener nicht gesetzt
```javascript
// Manual Fix:
document.getElementById('toggle-sell-mode').addEventListener('click', () => {
    game.collectionManager.toggleSellMode()
})
```

### Problem: Verkaufspreis wird nicht angezeigt
**Lösung:** Element nicht gefunden
```javascript
// Check Element:
console.log(document.getElementById('sell-price-value'))

// Manual Fix:
const element = document.getElementById('sell-price-value')
if (element) element.textContent = '50 Münzen'
```

### Problem: Collection Value zeigt 0
**Lösung:** Funktion manuell aufrufen
```javascript
// Manual Update:
game.collectionManager.updateCollectionValue()
```

### Problem: Modal öffnet sich nicht
**Lösung:** Modal manuell öffnen
```javascript
// Manual Open:
document.getElementById('card-sell-modal').style.display = 'block'
```

## Vollständige Neu-Initialisierung

Falls das System nicht funktioniert:

```javascript
// 1. Restart Event Listeners
game.ui.initializeEventListeners()

// 2. Update Collection Value
game.collectionManager.updateCollectionValue()

// 3. Reset Sell Mode
game.collectionManager.sellModeActive = false
game.collectionManager.toggleSellMode()

// 4. Manual Modal Setup
const modal = document.getElementById('card-sell-modal')
const confirmBtn = document.getElementById('confirm-sell-btn')
const cancelBtn = document.getElementById('cancel-sell-btn')

if (confirmBtn) {
    confirmBtn.onclick = () => game.collectionManager.confirmSell()
}
if (cancelBtn) {
    cancelBtn.onclick = () => game.collectionManager.closeSellModal()
}
```

## Direkter Karten-Verkauf Test

```javascript
// Verkaufe erste Karte direkt:
const firstCard = game.collection[0]
if (firstCard) {
    const price = game.collectionManager.getCardValue(firstCard)
    console.log(`Verkaufe ${firstCard.name} für ${price} Münzen`)
    
    game.collectionManager.currentSellCard = firstCard
    game.collectionManager.confirmSell()
}
```

---

**Nach jedem Test:** Seite neu laden (`Cmd+R` / `Ctrl+R`) um sauberen Zustand zu haben.
