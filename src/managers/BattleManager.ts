import { Monster } from '../models/Monster.js';
import { getRandomMonsterByRarity } from '../data/MonsterDatabase.js';
import type { MonsterState, GameManagerType } from '../types.js';

export class BattleManager {
    private game: GameManagerType;
    private currentBattleMonster: Monster | null = null;
    private enemyMonster: Monster | null = null;
    private battleInProgress: boolean = false;

    constructor(game: GameManagerType) {
        this.game = game;
    }

    public updateBattleMonsterSelect(): void {
        const select = document.getElementById('monster-select') as HTMLSelectElement;
        if (!select) return;

        select.innerHTML = '<option value="">Monster wählen...</option>';
        
        this.game.collection.forEach((monster: Monster) => {
            if (monster.isAlive()) {
                const option = document.createElement('option');
                option.value = monster.id;
                option.textContent = `${monster.name} (${monster.health}/${monster.maxHealth} HP)`;
                select.appendChild(option);
            }
        });
    }

    public selectPlayerMonster(monsterId: string): void {
        this.currentBattleMonster = this.game.collection.find((m: Monster) => m.id === monsterId) || null;
        
        if (this.currentBattleMonster) {
            const playerMonsterDiv = document.getElementById('player-monster') as HTMLDivElement;
            if (!playerMonsterDiv) return;

            playerMonsterDiv.innerHTML = '';
            playerMonsterDiv.classList.add('has-monster');
            
            const cardElement = this.game.ui.createCardElement(this.currentBattleMonster);
            playerMonsterDiv.appendChild(cardElement);
            
            const attackBtn = document.getElementById('attack-btn') as HTMLButtonElement;
            if (attackBtn) {
                attackBtn.disabled = !this.enemyMonster;
            }
        }
    }

    public findOpponent(): void {
        // Zufälliges Gegner-Monster generieren
        const enemyData = getRandomMonsterByRarity();
        this.enemyMonster = new Monster(
            enemyData.name, enemyData.emoji, enemyData.attack,
            enemyData.defense, enemyData.health, enemyData.rarity,
            enemyData.description, enemyData.image
        );
        
        const enemyMonsterDiv = document.getElementById('enemy-monster') as HTMLDivElement;
        if (enemyMonsterDiv) {
            enemyMonsterDiv.innerHTML = '';
            enemyMonsterDiv.classList.add('has-monster');
            
            const cardElement = this.game.ui.createCardElement(this.enemyMonster);
            enemyMonsterDiv.appendChild(cardElement);
        }
        
        const findOpponentBtn = document.getElementById('find-opponent-btn') as HTMLButtonElement;
        if (findOpponentBtn) {
            findOpponentBtn.textContent = 'Neuer Gegner';
        }

        const attackBtn = document.getElementById('attack-btn') as HTMLButtonElement;
        if (attackBtn) {
            attackBtn.disabled = !this.currentBattleMonster;
        }
        
        this.addBattleLog(`Wilder ${this.enemyMonster.name} erscheint!`);
    }

    public performAttack(): void {
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
            if (!this.currentBattleMonster || !this.enemyMonster) return;

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

    private updateBattleDisplay(): void {
        if (this.currentBattleMonster) {
            const playerMonsterDiv = document.getElementById('player-monster') as HTMLDivElement;
            if (playerMonsterDiv) {
                playerMonsterDiv.innerHTML = '';
                const cardElement = this.game.ui.createCardElement(this.currentBattleMonster);
                playerMonsterDiv.appendChild(cardElement);
            }
        }
        
        if (this.enemyMonster) {
            const enemyMonsterDiv = document.getElementById('enemy-monster') as HTMLDivElement;
            if (enemyMonsterDiv) {
                enemyMonsterDiv.innerHTML = '';
                const cardElement = this.game.ui.createCardElement(this.enemyMonster);
                enemyMonsterDiv.appendChild(cardElement);
            }
        }
    }

    private addBattleLog(message: string): void {
        const log = document.getElementById('battle-log') as HTMLDivElement;
        if (!log) return;

        const logEntry = document.createElement('div');
        logEntry.textContent = `> ${message}`;
        log.appendChild(logEntry);
        log.scrollTop = log.scrollHeight;
    }

    public resetBattle(): void {
        this.currentBattleMonster = null;
        this.enemyMonster = null;
        this.battleInProgress = false;
        
        const playerMonsterDiv = document.getElementById('player-monster') as HTMLDivElement;
        const enemyMonsterDiv = document.getElementById('enemy-monster') as HTMLDivElement;
        const monsterSelect = document.getElementById('monster-select') as HTMLSelectElement;
        const attackBtn = document.getElementById('attack-btn') as HTMLButtonElement;
        const findOpponentBtn = document.getElementById('find-opponent-btn') as HTMLButtonElement;

        if (playerMonsterDiv) {
            playerMonsterDiv.innerHTML = '';
            playerMonsterDiv.classList.remove('has-monster');
        }

        if (enemyMonsterDiv) {
            enemyMonsterDiv.innerHTML = '';
            enemyMonsterDiv.classList.remove('has-monster');
        }

        if (monsterSelect) {
            monsterSelect.value = '';
        }

        if (attackBtn) {
            attackBtn.disabled = true;
        }

        if (findOpponentBtn) {
            findOpponentBtn.textContent = 'Gegner finden';
        }
        
        // Alle Monster heilen
        this.game.collection.forEach((monster: Monster) => monster.heal());
        this.updateBattleMonsterSelect();
        
        // Speichere nach Kampf-Reset (Heilung)
        this.game.saveManager.saveGameData();
    }
}