import type { Rarity, MonsterData, MonsterState } from '../types.js';

export class Monster implements MonsterState {
    public id: string;
    public name: string;
    public emoji: string;
    public image: string;
    public attack: number;
    public defense: number;
    public health: number;
    public maxHealth: number;
    public rarity: Rarity;
    public description: string;

    constructor(name: string, emoji: string, attack: number, defense: number, health: number, rarity: Rarity, description: string, image?: string) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.emoji = emoji;
        this.image = image || name.toLowerCase()
            .replace(/ä/g, 'ae')
            .replace(/ö/g, 'oe')
            .replace(/ü/g, 'ue')
            .replace(/ß/g, 'ss')
            .replace(/[^a-z0-9]/g, '');
        this.attack = attack;
        this.defense = defense;
        this.health = health;
        this.maxHealth = health;
        this.rarity = rarity;
        this.description = description;
    }

    public takeDamage(damage: number): number {
        const actualDamage = Math.max(1, damage - this.defense);
        this.health = Math.max(0, this.health - actualDamage);
        return actualDamage;
    }

    public isAlive(): boolean {
        return this.health > 0;
    }

    public heal(): void {
        this.health = this.maxHealth;
    }

    public static fromData(data: MonsterData): Monster {
        return new Monster(
            data.name,
            data.emoji,
            data.attack,
            data.defense,
            data.health,
            data.rarity,
            data.description,
            data.image
        );
    }

    public toData(): MonsterData {
        return {
            name: this.name,
            emoji: this.emoji,
            attack: this.attack,
            defense: this.defense,
            health: this.maxHealth,
            rarity: this.rarity,
            description: this.description,
            image: this.image
        };
    }
}