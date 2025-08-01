// Monster Model Class
export class Monster {
    constructor(name, emoji, attack, defense, health, rarity, description, image = null) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.emoji = emoji;
        this.image = image || name.toLowerCase().replace(/[^a-z0-9]/g, '');
        this.attack = attack;
        this.defense = defense;
        this.health = health;
        this.maxHealth = health;
        this.rarity = rarity;
        this.description = description;
    }

    takeDamage(damage) {
        const actualDamage = Math.max(1, damage - this.defense);
        this.health = Math.max(0, this.health - actualDamage);
        return actualDamage;
    }

    isAlive() {
        return this.health > 0;
    }

    heal() {
        this.health = this.maxHealth;
    }
}
