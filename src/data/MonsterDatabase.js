// Monster Database
export const MONSTER_DATABASE = [
    // Häufige Monster
    { name: "Feuerdrache", image: "feuerdrache", emoji: "🐉", attack: 25, defense: 15, health: 80, rarity: "common", description: "Ein kleiner aber mutiger Drache mit feurigem Temperament." },
    { name: "Waldgeist", image: "waldgeist", emoji: "🌲", attack: 20, defense: 20, health: 90, rarity: "common", description: "Ein friedlicher Waldgeist, der die Natur beschützt." },
    { name: "Blitzwolf", image: "blitzwolf", emoji: "⚡", attack: 30, defense: 10, health: 70, rarity: "common", description: "Schnell wie der Blitz und genauso gefährlich." },
    { name: "Steingigant", image: "steingigant", emoji: "🗿", attack: 15, defense: 30, health: 120, rarity: "common", description: "Langsam aber unglaublich robust und stark." },
    { name: "Wasserschlange", image: "wasserschlange", emoji: "🌊", attack: 22, defense: 18, health: 85, rarity: "common", description: "Gleitet durch Wasser wie durch Luft." },
    
    // Seltene Monster
    { name: "Kristallbär", image: "kristallbaer", emoji: "💎", attack: 35, defense: 25, health: 110, rarity: "rare", description: "Mit Kristallen gepanzerter Bär von magischer Macht." },
    { name: "Schattenrabe", image: "schattenrabe", emoji: "🌙", attack: 40, defense: 15, health: 95, rarity: "rare", description: "Meister der Schatten und nächtlicher Jäger." },
    { name: "Flammenphönix", image: "flammenphoenix", emoji: "🔥", attack: 45, defense: 20, health: 100, rarity: "rare", description: "Wiedergeboren aus der Asche mit erneuterter Macht." },
    { name: "Eiswächter", image: "eiswaechter", emoji: "❄️", attack: 30, defense: 35, health: 130, rarity: "rare", description: "Hüter der ewigen Gletscher des Nordens." },
    
    // Epische Monster
    { name: "Sternendrache", image: "sternendrache", emoji: "⭐", attack: 55, defense: 30, health: 150, rarity: "epic", description: "Ein legendärer Drache, der die Macht der Sterne nutzt." },
    { name: "Urzeittytan", image: "urzeittytan", emoji: "🦕", attack: 50, defense: 40, health: 180, rarity: "epic", description: "Ein Gigant aus vergangenen Zeitaltern." },
    { name: "Geisterherr", image: "geisterherr", emoji: "👻", attack: 60, defense: 20, health: 120, rarity: "epic", description: "Beherrscher der Unterwelt und Geister." },
    
    // Legendäre Monster
    { name: "Regenbogeneinhorn", image: "regenbogeneinhorn", emoji: "🦄", attack: 70, defense: 50, health: 200, rarity: "legendary", description: "Das seltenste und mächtigste aller magischen Wesen." },
    { name: "Kosmosdrache", image: "kosmosdrache", emoji: "🌌", attack: 80, defense: 45, health: 220, rarity: "legendary", description: "Hüter des Universums mit unermesslicher Macht." },
    { name: "Zeitwächter", image: "zeitwaechter", emoji: "⏰", attack: 75, defense: 55, health: 250, rarity: "legendary", description: "Manipuliert die Zeit selbst und ist quasi unsterblich." }
];

export function getRandomMonster() {
    return MONSTER_DATABASE[Math.floor(Math.random() * MONSTER_DATABASE.length)];
}

export function getRandomMonsterByRarity(guaranteedRarity = null) {
    let rarity;
    
    if (guaranteedRarity) {
        rarity = guaranteedRarity;
    } else {
        const rand = Math.random();
        if (rand < 0.6) rarity = "common";      // 60%
        else if (rand < 0.85) rarity = "rare"; // 25%
        else if (rand < 0.97) rarity = "epic"; // 12%
        else rarity = "legendary";              // 3%
    }

    for (let i = 0; i < 50; i++) { // Genug Versuche
        const monster = getRandomMonster();
        if (monster.rarity === rarity) {
            return monster;
        }
    }
    
    // Fallback
    return getRandomMonster();
}
