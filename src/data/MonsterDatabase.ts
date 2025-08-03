import type { MonsterData, Rarity } from '../types.js';

export const MONSTER_DATABASE: MonsterData[] = [
    // Häufige Monster (Original + 50 neue)
    { name: "Feuerdrache", image: "feuerdrache", emoji: "🐉", attack: 25, defense: 15, health: 80, rarity: "common", description: "Ein kleiner aber mutiger Drache mit feurigem Temperament." },
    { name: "Waldgeist", image: "waldgeist", emoji: "🌲", attack: 20, defense: 20, health: 90, rarity: "common", description: "Ein friedlicher Waldgeist, der die Natur beschützt." },
    { name: "Blitzwolf", image: "blitzwolf", emoji: "⚡", attack: 30, defense: 10, health: 70, rarity: "common", description: "Schnell wie der Blitz und genauso gefährlich." },
    { name: "Steingigant", image: "steingigant", emoji: "🗿", attack: 15, defense: 30, health: 120, rarity: "common", description: "Langsam aber unglaublich robust und stark." },
    { name: "Wasserschlange", image: "wasserschlange", emoji: "🌊", attack: 22, defense: 18, health: 85, rarity: "common", description: "Gleitet durch Wasser wie durch Luft." },
    
    // Neue häufige Monster (50)
    { name: "Glutkäfer", image: "glutkaefer", emoji: "🪲", attack: 18, defense: 12, health: 65, rarity: "common", description: "Ein feuriger Käfer, der heiße Flammen spuckt." },
    { name: "Steinmaus", image: "steinmaus", emoji: "🐭", attack: 12, defense: 25, health: 75, rarity: "common", description: "Eine winzige Maus mit steinhartem Panzer." },
    { name: "Windvogel", image: "windvogel", emoji: "🕊️", attack: 28, defense: 8, health: 60, rarity: "common", description: "Segelt geschickt durch die Lüfte." },
    { name: "Erdwurm", image: "erdwurm", emoji: "🪱", attack: 16, defense: 22, health: 95, rarity: "common", description: "Gräbt sich blitzschnell durch die Erde." },
    { name: "Lichtfalter", image: "lichtfalter", emoji: "🦋", attack: 24, defense: 14, health: 70, rarity: "common", description: "Bestäubt Blumen mit magischem Lichtstaub." },
    { name: "Frostfrosch", image: "frostfrosch", emoji: "🐸", attack: 20, defense: 16, health: 80, rarity: "common", description: "Springt zwischen Eisschollen umher." },
    { name: "Wüstenskink", image: "wuestenskink", emoji: "🦎", attack: 26, defense: 12, health: 72, rarity: "common", description: "Überlebt in der heißesten Wüste." },
    { name: "Dunkelspinne", image: "dunkelspinne", emoji: "🕷️", attack: 22, defense: 10, health: 68, rarity: "common", description: "Webt klebrige Netze im Schatten." },
    { name: "Schneehase", image: "schneehase", emoji: "🐰", attack: 19, defense: 18, health: 78, rarity: "common", description: "Hüpft schnell durch Schneelandschaften." },
    { name: "Steinbock", image: "steinbock", emoji: "🐐", attack: 23, defense: 20, health: 88, rarity: "common", description: "Klettert mühelos steile Felswände hinauf." },
    { name: "Glutschlange", image: "glutschlange", emoji: "🐍", attack: 27, defense: 13, health: 74, rarity: "common", description: "Ihre Haut glüht wie heiße Kohle." },
    { name: "Nebelkatze", image: "nebelkatze", emoji: "🐱", attack: 21, defense: 15, health: 76, rarity: "common", description: "Verschwindet geschickt im Nebel." },
    { name: "Donnerbär", image: "donnerbaer", emoji: "🐻", attack: 24, defense: 19, health: 92, rarity: "common", description: "Sein Brüllen klingt wie Donner." },
    { name: "Kristallmotte", image: "kristallmotte", emoji: "🦋", attack: 17, defense: 11, health: 63, rarity: "common", description: "Ihre Flügel schimmern wie Kristalle." },
    { name: "Sandgeist", image: "sandgeist", emoji: "👻", attack: 25, defense: 14, health: 71, rarity: "common", description: "Formt sich aus Wüstensand." },
    { name: "Wasserkäfer", image: "wasserkaefer", emoji: "🪲", attack: 15, defense: 21, health: 82, rarity: "common", description: "Schwimmt geschickt unter Wasser." },
    { name: "Bergziege", image: "bergziege", emoji: "🐐", attack: 20, defense: 17, health: 85, rarity: "common", description: "Springt sicher von Fels zu Fels." },
    { name: "Flammenameise", image: "flammenameise", emoji: "🐜", attack: 14, defense: 16, health: 58, rarity: "common", description: "Arbeitet in feurigen Kolonien." },
    { name: "Eispinguin", image: "eispinguin", emoji: "🐧", attack: 18, defense: 24, health: 89, rarity: "common", description: "Rutscht elegant über das Eis." },
    { name: "Waldspinne", image: "waldspinne", emoji: "🕷️", attack: 23, defense: 12, health: 67, rarity: "common", description: "Baut kunstvolle Netze zwischen Bäumen." },
    { name: "Feuerameise", image: "feuerameise", emoji: "🐜", attack: 16, defense: 13, health: 61, rarity: "common", description: "Ihre Bisse brennen wie Feuer." },
    { name: "Schneeeule", image: "schneeeule", emoji: "🦉", attack: 26, defense: 11, health: 69, rarity: "common", description: "Jagt lautlos in der Nacht." },
    { name: "Wassersalamander", image: "wassersalamander", emoji: "🦎", attack: 19, defense: 15, health: 77, rarity: "common", description: "Regeneriert sich im Wasser." },
    { name: "Steinechse", image: "steinechse", emoji: "🦎", attack: 17, defense: 23, health: 91, rarity: "common", description: "Tarnt sich perfekt als Felsen." },
    { name: "Windwiesel", image: "windwiesel", emoji: "🦫", attack: 29, defense: 9, health: 64, rarity: "common", description: "Rennt schneller als der Wind." },
    { name: "Glühkäfer", image: "gluehkaefer", emoji: "🪲", attack: 13, defense: 14, health: 56, rarity: "common", description: "Leuchtet hell in der Dunkelheit." },
    { name: "Lehmgolem", image: "lehmgolem", emoji: "🗿", attack: 21, defense: 26, health: 98, rarity: "common", description: "Geformt aus magischem Lehm." },
    { name: "Blasenfisch", image: "blasenfisch", emoji: "🐠", attack: 22, defense: 16, health: 73, rarity: "common", description: "Spuckt explosive Wasserblasen." },
    { name: "Kieselkrabbe", image: "kieselkrabbe", emoji: "🦀", attack: 18, defense: 22, health: 84, rarity: "common", description: "Knackt Kiesel mit ihren Scheren." },
    { name: "Glutmader", image: "glutmader", emoji: "🦫", attack: 25, defense: 10, health: 66, rarity: "common", description: "Ihr Fell glüht vor Hitze." },
    { name: "Eisbär", image: "eisbaer", emoji: "🐻‍❄️", attack: 27, defense: 18, health: 93, rarity: "common", description: "Herrscher der arktischen Eisfelder." },
    { name: "Schattenmaus", image: "schattenmaus", emoji: "🐭", attack: 15, defense: 12, health: 59, rarity: "common", description: "Huscht unsichtbar durch Schatten." },
    { name: "Wassermolch", image: "wassermolch", emoji: "🦎", attack: 16, defense: 19, health: 81, rarity: "common", description: "Schwimmt elegant in klaren Bächen." },
    { name: "Steinratte", image: "steinratte", emoji: "🐭", attack: 20, defense: 15, health: 70, rarity: "common", description: "Nagt an den härtesten Steinen." },
    { name: "Windmotte", image: "windmotte", emoji: "🦋", attack: 24, defense: 8, health: 62, rarity: "common", description: "Fliegt mit den stärksten Winden mit." },
    { name: "Glutwurm", image: "glutwurm", emoji: "🪱", attack: 17, defense: 17, health: 75, rarity: "common", description: "Hinterlässt glühende Tunnelspuren." },
    { name: "Frostmücke", image: "frostmuecke", emoji: "🦟", attack: 12, defense: 9, health: 45, rarity: "common", description: "Summt in eisigen Höhen." },
    { name: "Bergmurmel", image: "bergmurmel", emoji: "🐹", attack: 14, defense: 20, health: 79, rarity: "common", description: "Sammelt Nüsse in Berghöhlen." },
    { name: "Wasserwanze", image: "wasserwanze", emoji: "🪲", attack: 19, defense: 13, health: 65, rarity: "common", description: "Läuft geschickt über Wasseroberflächen." },
    { name: "Sandkäfer", image: "sandkaefer", emoji: "🪲", attack: 21, defense: 14, health: 68, rarity: "common", description: "Gräbt sich durch heißen Wüstensand." },
    { name: "Nachtfalter", image: "nachtfalter", emoji: "🦋", attack: 16, defense: 11, health: 57, rarity: "common", description: "Aktiv nur bei Mondschein." },
    { name: "Steinwurm", image: "steinwurm", emoji: "🪱", attack: 13, defense: 25, health: 87, rarity: "common", description: "Bohrt sich durch härteste Felsen." },
    { name: "Glutfalke", image: "glutfalke", emoji: "🦅", attack: 28, defense: 12, health: 71, rarity: "common", description: "Jagt mit feurigen Krallen." },
    { name: "Schmelzschnecke", image: "schmelzschnecke", emoji: "🐌", attack: 11, defense: 18, health: 83, rarity: "common", description: "Ihr Schleim ist brennend heiß." },
    { name: "Windspinne", image: "windspinne", emoji: "🕷️", attack: 22, defense: 7, health: 54, rarity: "common", description: "Webt Netze aus solidem Wind." },
    { name: "Kristallwurm", image: "kristallwurm", emoji: "🪱", attack: 15, defense: 21, health: 76, rarity: "common", description: "Frisst sich durch Kristallformationen." },
    { name: "Nachtechse", image: "nachtechse", emoji: "🦎", attack: 23, defense: 13, health: 69, rarity: "common", description: "Ihre Schuppen leuchten im Dunkeln." },
    { name: "Wasserfloh", image: "wasserfloh", emoji: "🦠", attack: 9, defense: 8, health: 42, rarity: "common", description: "Winzig aber zahlreich vorhanden." },
    { name: "Glutgecko", image: "glutgecko", emoji: "🦎", attack: 18, defense: 16, health: 74, rarity: "common", description: "Klettert an heißen Vulkanwänden." },
    { name: "Bergfink", image: "bergfink", emoji: "🐦", attack: 20, defense: 10, health: 58, rarity: "common", description: "Singt in hohen Bergregionen." },
    { name: "Schattenwurm", image: "schattenwurm", emoji: "🪱", attack: 14, defense: 16, health: 72, rarity: "common", description: "Versteckt sich in tiefsten Schatten." },
    { name: "Eisfuchs", image: "eisfuchs", emoji: "🦊", attack: 25, defense: 17, health: 78, rarity: "common", description: "Überlebt in eisiger Kälte." },
    { name: "Steinmotte", image: "steinmotte", emoji: "🦋", attack: 17, defense: 19, health: 73, rarity: "common", description: "Ihre Flügel sehen aus wie Stein." },
    
    // Seltene Monster (Original + 30 neue)
    { name: "Kristallbär", image: "kristallbaer", emoji: "💎", attack: 35, defense: 25, health: 110, rarity: "rare", description: "Mit Kristallen gepanzerter Bär von magischer Macht." },
    { name: "Schattenrabe", image: "schattenrabe", emoji: "🌙", attack: 40, defense: 15, health: 95, rarity: "rare", description: "Meister der Schatten und nächtlicher Jäger." },
    { name: "Flammenphönix", image: "flammenphoenix", emoji: "🔥", attack: 45, defense: 20, health: 100, rarity: "rare", description: "Wiedergeboren aus der Asche mit erneuterter Macht." },
    { name: "Eiswächter", image: "eiswaechter", emoji: "❄️", attack: 30, defense: 35, health: 130, rarity: "rare", description: "Hüter der ewigen Gletscher des Nordens." },
    
    // Neue seltene Monster (30)
    { name: "Blitzjäger", image: "blitzjaeger", emoji: "⚡", attack: 42, defense: 18, health: 105, rarity: "rare", description: "Jagt mit der Geschwindigkeit des Blitzes." },
    { name: "Magmagolem", image: "magmagolem", emoji: "🌋", attack: 38, defense: 32, health: 125, rarity: "rare", description: "Aus geschmolzenem Gestein geborener Wächter." },
    { name: "Sturmadler", image: "sturmadler", emoji: "🌪️", attack: 44, defense: 16, health: 98, rarity: "rare", description: "Beherrscht die Winde und Stürme." },
    { name: "Tiefseekraken", image: "tiefseekraken", emoji: "🐙", attack: 36, defense: 28, health: 135, rarity: "rare", description: "Herrscher der abyssalen Tiefen." },
    { name: "Nebelgeist", image: "nebelgeist", emoji: "👻", attack: 33, defense: 22, health: 108, rarity: "rare", description: "Manifestiert sich aus ewigem Nebel." },
    { name: "Lavadrache", image: "lavadrache", emoji: "🔥", attack: 41, defense: 24, health: 115, rarity: "rare", description: "Speit glühende Lava statt Feuer." },
    { name: "Frostlöwe", image: "frostloewe", emoji: "❄️", attack: 39, defense: 26, health: 118, rarity: "rare", description: "König der arktischen Wildnis." },
    { name: "Donnerfalke", image: "donnerfalke", emoji: "⚡", attack: 43, defense: 17, health: 102, rarity: "rare", description: "Seine Schreie erzeugen Donnerschläge." },
    { name: "Erdriese", image: "erdriese", emoji: "🗿", attack: 34, defense: 38, health: 142, rarity: "rare", description: "Gigantischer Wächter der Berge." },
    { name: "Wassernixe", image: "wassernixe", emoji: "🧜", attack: 37, defense: 23, health: 112, rarity: "rare", description: "Verzaubert mit ihrem melodischen Gesang." },
    { name: "Windgeist", image: "windgeist", emoji: "💨", attack: 40, defense: 19, health: 96, rarity: "rare", description: "Unstofflicher Geist der Lüfte." },
    { name: "Steinphönix", image: "steinphoenix", emoji: "🗿", attack: 35, defense: 30, health: 128, rarity: "rare", description: "Wiedergeboren aus zerfallenem Gestein." },
    { name: "Mondwolf", image: "mondwolf", emoji: "🌙", attack: 38, defense: 21, health: 107, rarity: "rare", description: "Heult bei Vollmond mit magischer Kraft." },
    { name: "Korallenwächter", image: "korallenwachter", emoji: "🪸", attack: 32, defense: 33, health: 133, rarity: "rare", description: "Beschützer der Meeresriffe." },
    { name: "Blütentiger", image: "bluetentiger", emoji: "🌸", attack: 41, defense: 20, health: 109, rarity: "rare", description: "Seine Streifen sind lebende Blüten." },
    { name: "Glasspinne", image: "glasspinne", emoji: "🕸️", attack: 36, defense: 15, health: 89, rarity: "rare", description: "Webt Netze aus reinem Kristallglas." },
    { name: "Schneeleopard", image: "schneeleopard", emoji: "❄️", attack: 40, defense: 22, health: 111, rarity: "rare", description: "Jäger der höchsten Gipfel." },
    { name: "Sonnenechse", image: "sonnenechse", emoji: "☀️", attack: 42, defense: 18, health: 104, rarity: "rare", description: "Speichert Sonnenlicht als Energie." },
    { name: "Nebeldrache", image: "nebeldrache", emoji: "🌫️", attack: 37, defense: 25, health: 116, rarity: "rare", description: "Versteckt sich in dichtem Nebel." },
    { name: "Kristallwolf", image: "kristallwolf", emoji: "💎", attack: 39, defense: 24, health: 113, rarity: "rare", description: "Sein Fell schimmert wie Diamanten." },
    { name: "Feuervogel", image: "feuervogel", emoji: "🔥", attack: 44, defense: 16, health: 101, rarity: "rare", description: "Hinterlässt Feuerspuren am Himmel." },
    { name: "Tiefenhai", image: "tiefenhai", emoji: "🦈", attack: 41, defense: 19, health: 106, rarity: "rare", description: "Jäger der dunkelsten Meerestiefen." },
    { name: "Berggeist", image: "berggeist", emoji: "⛰️", attack: 33, defense: 31, health: 124, rarity: "rare", description: "Wächter uralter Berggeheimnisse." },
    { name: "Lichtwiesel", image: "lichtwiesel", emoji: "✨", attack: 38, defense: 17, health: 94, rarity: "rare", description: "Bewegt sich mit Lichtgeschwindigkeit." },
    { name: "Glutbär", image: "glutbaer", emoji: "🔥", attack: 36, defense: 29, health: 121, rarity: "rare", description: "Sein Fell brennt mit ewiger Flamme." },
    { name: "Sturmrabe", image: "sturmrabe", emoji: "🌩️", attack: 40, defense: 18, health: 103, rarity: "rare", description: "Bringt Gewitter und Blitze mit sich." },
    { name: "Wasserlöwe", image: "wasserloewe", emoji: "🌊", attack: 37, defense: 27, health: 119, rarity: "rare", description: "Majestätischer Herrscher der Flüsse." },
    { name: "Steinadler", image: "steinadler", emoji: "🗿", attack: 35, defense: 23, health: 108, rarity: "rare", description: "Nistet in den höchsten Felsklippen." },
    { name: "Nachtjäger", image: "nachtjaeger", emoji: "🌃", attack: 43, defense: 20, health: 110, rarity: "rare", description: "Pirsch in absoluter Dunkelheit." },
    { name: "Regenbogenfisch", image: "regenbogenfisch", emoji: "🌈", attack: 34, defense: 26, health: 117, rarity: "rare", description: "Schwimmt in allen Farben des Spektrums." },
    { name: "Winddrache", image: "winddrache", emoji: "💨", attack: 42, defense: 21, health: 108, rarity: "rare", description: "Segelt auf unsichtbaren Luftströmen." },
    { name: "Lavaschlange", image: "lavaschlange", emoji: "🌋", attack: 39, defense: 22, health: 114, rarity: "rare", description: "Schwimmt durch flüssige Lava." },
    { name: "Eiskristall", image: "eiskristall", emoji: "❄️", attack: 31, defense: 34, health: 131, rarity: "rare", description: "Lebender Kristall aus ewigem Eis." },
    { name: "Glutwolf", image: "glutwolf", emoji: "🔥", attack: 41, defense: 23, health: 112, rarity: "rare", description: "Seine Augen brennen wie Kohle." },
    
    // Epische Monster (Original + 15 neue)
    { name: "Sternendrache", image: "sternendrache", emoji: "⭐", attack: 55, defense: 30, health: 150, rarity: "epic", description: "Ein legendärer Drache, der die Macht der Sterne nutzt." },
    { name: "Urzeittytan", image: "urzeittytan", emoji: "🦕", attack: 50, defense: 40, health: 180, rarity: "epic", description: "Ein Gigant aus vergangenen Zeitaltern." },
    { name: "Geisterherr", image: "geisterherr", emoji: "👻", attack: 60, defense: 20, health: 120, rarity: "epic", description: "Beherrscher der Unterwelt und Geister." },
    
    // Neue epische Monster (15)
    { name: "Galaxienphönix", image: "galaxienphoenix", emoji: "🌌", attack: 65, defense: 25, health: 145, rarity: "epic", description: "Wiedergeboren aus Sternenstaub und kosmischer Energie." },
    { name: "Chaosdrache", image: "chaosdrache", emoji: "🌀", attack: 58, defense: 28, health: 155, rarity: "epic", description: "Meister der Entropie und des Chaos." },
    { name: "Plasmageist", image: "plasmageist", emoji: "⚡", attack: 62, defense: 22, health: 140, rarity: "epic", description: "Reine Energie in geisterhafter Form." },
    { name: "Voidkraken", image: "voidkraken", emoji: "🕳️", attack: 56, defense: 32, health: 165, rarity: "epic", description: "Verschlingt Licht und Materie gleichermaßen." },
    { name: "Elementarlord", image: "elementarlord", emoji: "🔥", attack: 54, defense: 35, health: 170, rarity: "epic", description: "Beherrscht alle vier Grundelemente." },
    { name: "Traumwandler", image: "traumwandler", emoji: "💭", attack: 61, defense: 24, health: 135, rarity: "epic", description: "Wandelt zwischen Traum und Realität." },
    { name: "Schattentitan", image: "schattentitan", emoji: "🌑", attack: 59, defense: 29, health: 160, rarity: "epic", description: "Verkörperung der Finsternis selbst." },
    { name: "Kristalldrache", image: "kristalldrache", emoji: "💎", attack: 52, defense: 38, health: 175, rarity: "epic", description: "Sein Körper besteht aus reinem Kristall." },
    { name: "Seelensammler", image: "seelensammler", emoji: "👻", attack: 63, defense: 21, health: 125, rarity: "epic", description: "Sammelt die Essenz gefallener Krieger." },
    { name: "Feuertitan", image: "feuertitan", emoji: "🔥", attack: 57, defense: 31, health: 158, rarity: "epic", description: "Wandelnder Vulkan mit unendlicher Hitze." },
    { name: "Eisherrscher", image: "eisherrscher", emoji: "❄️", attack: 51, defense: 39, health: 172, rarity: "epic", description: "Herr über alle Gletscher und Kälte." },
    { name: "Blitzkaiser", image: "blitzkaiser", emoji: "⚡", attack: 64, defense: 23, health: 138, rarity: "epic", description: "Verkörperung des Donners und Blitzes." },
    { name: "Naturgeist", image: "naturgeist", emoji: "🌿", attack: 53, defense: 36, health: 168, rarity: "epic", description: "Hüter aller Wälder und Pflanzen." },
    { name: "Sturmkönig", image: "sturmkoenig", emoji: "🌪️", attack: 60, defense: 26, health: 148, rarity: "epic", description: "Beherrscher aller Winde und Stürme." },
    { name: "Lichtbringer", image: "lichtbringer", emoji: "✨", attack: 55, defense: 33, health: 162, rarity: "epic", description: "Bringt Hoffnung in die dunkelsten Stunden." },
    { name: "Erdmutter", image: "erdmutter", emoji: "🌍", attack: 49, defense: 41, health: 185, rarity: "epic", description: "Urquell allen Lebens auf der Erde." },
    { name: "Leerwandler", image: "leerwandler", emoji: "🌌", attack: 58, defense: 27, health: 152, rarity: "epic", description: "Reist zwischen den Dimensionen." },
    { name: "Zeitsturm", image: "zeitsturm", emoji: "⏰", attack: 56, defense: 30, health: 156, rarity: "epic", description: "Wirbelwind aus vergangenen Zeitaltern." },
    
    // Legendäre Monster (Original + 10 neue)
    { name: "Regenbogeneinhorn", image: "regenbogeneinhorn", emoji: "🦄", attack: 70, defense: 50, health: 200, rarity: "legendary", description: "Das seltenste und mächtigste aller magischen Wesen." },
    { name: "Kosmosdrache", image: "kosmosdrache", emoji: "🌌", attack: 80, defense: 45, health: 220, rarity: "legendary", description: "Hüter des Universums mit unermesslicher Macht." },
    { name: "Zeitwächter", image: "zeitwaechter", emoji: "⏰", attack: 75, defense: 55, health: 250, rarity: "legendary", description: "Manipuliert die Zeit selbst und ist quasi unsterblich." },
    
    // Neue legendäre Monster (10)
    { name: "Omnimacht", image: "omnimacht", emoji: "👁️", attack: 85, defense: 60, health: 280, rarity: "legendary", description: "Das allsehende Auge der Schöpfung." },
    { name: "Realitätsweber", image: "realitaetsweber", emoji: "🕸️", attack: 78, defense: 52, health: 240, rarity: "legendary", description: "Webt die Fäden der Realität selbst." },
    { name: "Urkraft", image: "urkraft", emoji: "💥", attack: 90, defense: 40, health: 210, rarity: "legendary", description: "Die Urgewalt aus der alles entstanden ist." },
    { name: "Ewigkeitsherr", image: "ewigkeitsherr", emoji: "♾️", attack: 82, defense: 58, health: 270, rarity: "legendary", description: "Herrscher über Vergangenheit und Zukunft." },
    { name: "Seelenfürst", image: "seelenfuerst", emoji: "👑", attack: 77, defense: 53, health: 245, rarity: "legendary", description: "Gebieter über alle Seelen im Universum." },
    { name: "Chaosimperator", image: "chaosimperator", emoji: "🌀", attack: 88, defense: 42, health: 225, rarity: "legendary", description: "Bringt Ordnung durch perfektes Chaos." },
    { name: "Lebensspender", image: "lebensspender", emoji: "🌱", attack: 72, defense: 65, health: 300, rarity: "legendary", description: "Quelle allen Lebens im Multiversum." },
    { name: "Todesfürst", image: "todesfuerst", emoji: "💀", attack: 95, defense: 35, health: 200, rarity: "legendary", description: "Herr über das Ende aller Dinge." },
    { name: "Dimensional", image: "dimensional", emoji: "🚪", attack: 80, defense: 50, health: 235, rarity: "legendary", description: "Wächter zwischen allen Dimensionen." },
    { name: "Unendlichkeit", image: "unendlichkeit", emoji: "♾️", attack: 76, defense: 56, health: 260, rarity: "legendary", description: "Verkörperung der Unendlichkeit selbst." },
    { name: "Schöpfergott", image: "schoepfergott", emoji: "✨", attack: 100, defense: 70, health: 350, rarity: "legendary", description: "Der Erschaffer aller Monster und Welten." },
    
    // Zusätzliche häufige Monster (15)
    { name: "Blumengeist", image: "blumengeist", emoji: "🌺", attack: 19, defense: 17, health: 73, rarity: "common", description: "Erweckt verwelkte Blumen zum Leben." },
    { name: "Metallkäfer", image: "metallkaefer", emoji: "🪲", attack: 22, defense: 19, health: 78, rarity: "common", description: "Sein Panzer glänzt wie poliertes Metall." },
    { name: "Schaumfrosch", image: "schaumfrosch", emoji: "🐸", attack: 16, defense: 14, health: 67, rarity: "common", description: "Produziert heilenden Schaum." },
    { name: "Rauchgeist", image: "rauchgeist", emoji: "💨", attack: 21, defense: 11, health: 62, rarity: "common", description: "Löst sich in Rauch auf bei Gefahr." },
    { name: "Kristallbiene", image: "kristallbiene", emoji: "🐝", attack: 18, defense: 13, health: 59, rarity: "common", description: "Sammelt kristallinen Nektar." },
    { name: "Steinpilz", image: "steinpilz", emoji: "🍄", attack: 12, defense: 28, health: 94, rarity: "common", description: "Hart wie Fels aber trotzdem lebendig." },
    { name: "Windrose", image: "windrose", emoji: "🌹", attack: 20, defense: 15, health: 71, rarity: "common", description: "Ihre Dornen sind scharf wie Klingen." },
    { name: "Salzkristall", image: "salzkristall", emoji: "🧂", attack: 14, defense: 24, health: 86, rarity: "common", description: "Konserviert sich selbst für die Ewigkeit." },
    { name: "Nebelschleier", image: "nebelschleier", emoji: "🌫️", attack: 17, defense: 12, health: 64, rarity: "common", description: "Verschleiert die Sicht der Gegner." },
    { name: "Mondstaub", image: "mondstaub", emoji: "✨", attack: 15, defense: 16, health: 69, rarity: "common", description: "Glitzert silbern im Mondlicht." },
    { name: "Regentropfen", image: "regentropfen", emoji: "💧", attack: 13, defense: 18, health: 75, rarity: "common", description: "Erfrischt alle Lebewesen um sich herum." },
    { name: "Sonnenschein", image: "sonnenschein", emoji: "☀️", attack: 25, defense: 10, health: 66, rarity: "common", description: "Wärmt die Herzen aller Kreaturen." },
    { name: "Sternlicht", image: "sternlicht", emoji: "⭐", attack: 23, defense: 12, health: 68, rarity: "common", description: "Leuchtet sanft in der Dunkelheit." },
    { name: "Wolkentanz", image: "wolkentanz", emoji: "☁️", attack: 19, defense: 14, health: 72, rarity: "common", description: "Schwebt leicht durch die Lüfte." },
    { name: "Meeresrauschen", image: "meeresrauschen", emoji: "🌊", attack: 24, defense: 16, health: 79, rarity: "common", description: "Bringt die Ruhe des Ozeans mit sich." }
];

export function getRandomMonster(): MonsterData {
    return MONSTER_DATABASE[Math.floor(Math.random() * MONSTER_DATABASE.length)];
}

export function getRandomMonsterByRarity(guaranteedRarity: Rarity | null = null): MonsterData {
    let rarity: Rarity;
    
    if (guaranteedRarity) {
        rarity = guaranteedRarity;
    } else {
        const rand = Math.random();
        if (rand < 0.6) rarity = "common";      // 60%
        else if (rand < 0.85) rarity = "rare";  // 25%
        else if (rand < 0.97) rarity = "epic";  // 12%
        else rarity = "legendary";              // 3%
    }

    for (let i = 0; i < 100; i++) {
        const monster = getRandomMonster();
        if (monster.rarity === rarity) {
            return monster;
        }
    }
    
    // Fallback
    return getRandomMonster();
}