#!/usr/bin/env python3
"""
Monster Image Generator für das Monster TCG Spiel
Erstellt Platzhalter-Bilder für alle Monster
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Monster-Definitionen
monsters = [
    # Häufige Monster
    {"name": "feuerdrache", "color": "#ff4444", "rarity": "common"},
    {"name": "waldgeist", "color": "#44aa44", "rarity": "common"},
    {"name": "blitzwolf", "color": "#ffff44", "rarity": "common"},
    {"name": "steingigant", "color": "#888888", "rarity": "common"},
    {"name": "wasserschlange", "color": "#4444ff", "rarity": "common"},
    
    # Seltene Monster
    {"name": "kristallbaer", "color": "#ff44ff", "rarity": "rare"},
    {"name": "schattenrabe", "color": "#444444", "rarity": "rare"},
    {"name": "flammenphoenix", "color": "#ff8800", "rarity": "rare"},
    {"name": "eiswaechter", "color": "#88ffff", "rarity": "rare"},
    
    # Epische Monster
    {"name": "sternendrache", "color": "#ffaa00", "rarity": "epic"},
    {"name": "urzeittytan", "color": "#aa8844", "rarity": "epic"},
    {"name": "geisterherr", "color": "#aa44aa", "rarity": "epic"},
    
    # Legendäre Monster
    {"name": "regenbogeneinhorn", "color": "#ff88ff", "rarity": "legendary"},
    {"name": "kosmosdrache", "color": "#4488ff", "rarity": "legendary"},
    {"name": "zeitwaechter", "color": "#ffaa88", "rarity": "legendary"}
]

def create_monster_image(monster, size=128):
    """Erstellt ein Platzhalter-Bild für ein Monster"""
    
    # Neue Bild erstellen
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Farbe konvertieren
    color = monster["color"].lstrip('#')
    rgb = tuple(int(color[i:i+2], 16) for i in (0, 2, 4))
    
    # Rarity-spezifische Rahmen
    border_colors = {
        "common": "#6b7280",
        "rare": "#3b82f6", 
        "epic": "#a855f7",
        "legendary": "#f59e0b"
    }
    
    border_color = border_colors.get(monster["rarity"], "#ffffff")
    border_rgb = tuple(int(border_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
    
    # Gradient-ähnlicher Effekt
    for i in range(size):
        for j in range(size):
            # Distanz vom Zentrum
            dx = i - size // 2
            dy = j - size // 2
            distance = (dx * dx + dy * dy) ** 0.5
            max_distance = size // 2
            
            if distance < max_distance:
                # Gradient von hell zu dunkel
                factor = 1 - (distance / max_distance) * 0.7
                new_rgb = tuple(int(c * factor) for c in rgb)
                img.putpixel((i, j), new_rgb + (255,))
    
    # Rahmen zeichnen
    border_width = 4
    for i in range(border_width):
        draw.rectangle([i, i, size-1-i, size-1-i], outline=border_rgb + (255,), width=1)
    
    # Monster-Name als Text (vereinfacht)
    try:
        font = ImageFont.load_default()
        text = monster["name"][:3].upper()
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        text_x = (size - text_width) // 2
        text_y = (size - text_height) // 2
        
        # Schatten-Effekt
        draw.text((text_x + 2, text_y + 2), text, fill=(0, 0, 0, 200), font=font)
        draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font)
    except:
        pass
    
    return img

def main():
    """Hauptfunktion - generiert alle Monster-Bilder"""
    
    # Stelle sicher, dass der Ordner existiert
    os.makedirs(".", exist_ok=True)
    
    print("Generiere Monster-Bilder...")
    
    for monster in monsters:
        # Erstelle Bild
        img = create_monster_image(monster)
        
        # Speichere Bild
        filename = f"{monster['name']}.png"
        img.save(filename)
        print(f"✓ {filename} erstellt")
    
    print(f"\n🎉 {len(monsters)} Monster-Bilder erfolgreich generiert!")
    print("Die Bilder sind bereit für das Monster TCG!")

if __name__ == "__main__":
    main()
