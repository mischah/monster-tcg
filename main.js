import { Game } from './src/Game.js';

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
    console.log('🎮 Monster TCG initialized with modular architecture!');
});
