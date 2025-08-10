# Audio Files für Notifications

## Benötigte Audio-Dateien:

1. **ding.mp3** - Für neue eingehende Freundschaftsanfragen
   - Kurzer, freundlicher "Ding"-Sound 
   - ~0.5 Sekunden
   - Nicht zu aufdringlich

2. **success.mp3** - Für positive Events (Anfrage akzeptiert, neuer Freund)
   - Positive, erfolgreiche Audio-Sequenz
   - ~0.8 Sekunden  
   - Froher/fröhlicher Ton

3. **neutral.mp3** - Für neutrale Events (Anfrage abgelehnt)
   - Neutraler, dezenter Sound
   - ~0.5 Sekunden
   - Nicht negativ, aber auch nicht positiv

## Audio-Spezifikationen:
- Format: MP3
- Länge: Max 1 Sekunde
- Lautstärke: Moderat (wird auf 30% reduziert)
- Kleine Dateigröße (< 50KB pro Datei)

## Temporäre Lösung:
Da keine echten Audio-Dateien vorhanden sind, wird das System graceful degradieren:
- Console-Log anstatt Audio
- Alle anderen Features funktionieren normal
- Audio kann später nachträglich hinzugefügt werden

## Audio-Quellen (Vorschläge):
- FreeSounds.org
- Zapsplat (kostenlose Sounds)
- Eigene Aufnahmen
- KI-generierte Sounds