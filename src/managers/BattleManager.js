import { Monster } from '../models/Monster.js';
import { getRandomMonsterByRarity } from '../data/MonsterDatabase.js';

export class BattleManager {
    constructor(game) {
        this.game = game;
        this.currentBattleMonster = null;
        this.enemyMonster = null;
        this.battleInProgress = false;
    }

    updateBattleMonsterSelect() {
        const select = document.getElementById('monster-select');
        select.innerHTML = '<option value="">Monster wählen...</option>';
        
        this.game.collection.forEach(monster => {
            if (monster.isAlive()) {
                const option = document.createElement('option');
                option.value = monster.id;
                option.textContent = `${monster.name} (${monster.health}/${monster.maxHealth} HP)`;
                select.appendChild(option);
            }
        });
    }

    selectPlayerMonster(monsterId) {
        this.currentBattleMonster = this.game.collection.find(m => m.id === monsterId);
        
        if (this.currentBattleMonster) {
            const playerMonsterDiv = document.getElementById('player-monster');
            playerMonsterDiv.innerHTML = '';
            playerMonsterDiv.classList.add('has-monster');
            
            const cardElement = this.game.ui.createCardElement(this.currentBattleMonster);
            playerMonsterDiv.appendChild(cardElement);
            
            document.getElementById('attack-btn').disabled = !this.enemyMonster;
        }
    }

    findOpponent() {
        // Zufälliges Gegner-Monster generieren
        const enemyData = getRandomMonsterByRarity();
        this.enemyMonster = new Monster(
            enemyData.name, enemyData.emoji, enemyData.attack,
            enemyData.defense, enemyData.health, enemyData.rarity,
            enemyData.description, enemyData.image
        );
        
        const enemyMonsterDiv = document.getElementById('enemy-monster');
        enemyMonsterDiv.innerHTML = '';
        enemyMonsterDiv.classList.add('has-monster');
        
        const cardElement = this.game.ui.createCardElement(this.enemyMonster);
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
            this.game.coins += 25;
            this.game.ui.updateDisplay();
            
            // Speichere nach Kampf-Sieg
            this.game.saveManager.saveGameData();
            
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
            const cardElement = this.game.ui.createCardElement(this.currentBattleMonster);
            playerMonsterDiv.appendChild(cardElement);
        }
        
        if (this.enemyMonster) {
            const enemyMonsterDiv = document.getElementById('enemy-monster');
            enemyMonsterDiv.innerHTML = '';
            const cardElement = this.game.ui.createCardElement(this.enemyMonster);
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
        this.game.collection.forEach(monster => monster.heal());
        this.updateBattleMonsterSelect();
        
        // Speichere nach Kampf-Reset (Heilung)
        this.game.saveManager.saveGameData();
    }
}
