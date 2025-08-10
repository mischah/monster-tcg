// Central Type Definitions for Monster TCG

export type Rarity = "common" | "rare" | "epic" | "legendary";

export type MonsterData = {
    id?: string;
    name: string;
    emoji: string;
    attack: number;
    defense: number;
    health: number;
    rarity: Rarity;
    description: string;
    image?: string;
};

export type MonsterState = {
    id: string;
    name: string;
    emoji: string;
    image: string;
    attack: number;
    defense: number;
    health: number;
    maxHealth: number;
    rarity: Rarity;
    description: string;
};

export type GameStateData = {
    coins: number;
    collection: MonsterData[];
    deck: MonsterData[];
    lastSaved?: string;
};

export type PackType = "basic" | "premium" | "legendary";

export type SaveIndicatorType = "success" | "error";

export type DragEventData = {
    monsterId: string;
};

export type BattleState = {
    currentBattleMonster: MonsterState | null;
    enemyMonster: MonsterState | null;
    battleInProgress: boolean;
};

export type CollectionStats = {
    total: number;
    common: number;
    rare: number;
    epic: number;
    legendary: number;
    value: number;
};

export type DeckAnalysis = {
    averageAttack: number;
    averageDefense: number;
    averageHealth: number;
    totalPower: number;
    rarityDistribution: Record<Rarity, number>;
};

export type ShopStats = {
    basicAvailable: number;
    premiumAvailable: number;
    legendaryAvailable: number;
};

export type FilterOptions = {
    rarity: Rarity | "all";
    searchTerm: string;
};

export type SortOption = "name" | "attack" | "defense" | "health" | "rarity";

export type EventHandler<T = Event> = (event: T) => void;

export type GameManagerType = {
    coins: number;
    collection: MonsterData[];
    deck: MonsterData[];
    ui: any; // UIManager - keeping as any to avoid circular dependency
    shopManager: any; // ShopManager
    battleManager: any; // BattleManager  
    deckManager: any; // DeckManager
    collectionManager: any; // CollectionManager
    saveManager: any; // SaveManager
    switchTab: (tab: string) => void;
    initializeStarterCards: () => void;
};

// Firebase & Authentication Types
export type UserProfile = {
    uid: string;
    email: string;
    nickname: string;
    friendCode: string;
    createdAt: string;
    lastActive: string;
};

export type FirebaseGameData = {
    coins: number;
    collection: MonsterData[];
    deck: MonsterData[];
    lastSaved: string;
};

export type AuthState = {
    user: UserProfile | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
};

export type LoginState = {
    isLoading: boolean;
    isEmailSent: boolean;
    error: string | null;
};

export type FirestoreUserDocument = {
    email: string;
    nickname: string;
    friendCode: string;
    gameData: FirebaseGameData;
    createdAt: string;
    lastActive: string;
};

export type EmailLinkAuthResult = {
    success: boolean;
    error?: string;
    needsSignIn?: boolean;
};