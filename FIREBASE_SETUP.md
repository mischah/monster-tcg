# 🔥 Firebase Integration Setup

## Übersicht

Diese Anleitung führt Sie durch die Einrichtung der Firebase-Backend-Integration für Monster TCG. Das Backend bietet:

1. **Passwordless Email Authentication** - Login per E-Mail-Link ohne Passwort
2. **Cloud-Speicherung** - Ihre Kartenpakete und Fortschritte werden in der Cloud gespeichert
3. **User Profile Management** - E-Mail, Nickname und Freundschaftscode verwalten

## Firebase Projekt Setup

### 1. Firebase Projekt erstellen

1. Besuchen Sie [Firebase Console](https://console.firebase.google.com/)
2. Klicken Sie auf "Projekt erstellen"
3. Geben Sie einen Projektnamen ein (z.B. "monster-tcg")
4. Folgen Sie den Setup-Schritten

### 2. Authentication konfigurieren

1. Gehen Sie zu **Authentication** > **Sign-in method**
2. Aktivieren Sie **E-Mail/Password**
3. Aktivieren Sie **E-Mail-Link (passwordless sign-in)**
4. Fügen Sie Ihre Domain zur autorisierten Domain-Liste hinzu:
   - `localhost` (für lokale Entwicklung)
   - Ihre Produktions-Domain

### 3. Firestore Database einrichten

1. Gehen Sie zu **Firestore Database**
2. Klicken Sie auf "Datenbank erstellen"
3. Wählen Sie **Testmodus starten** (für Entwicklung)
4. Wählen Sie eine Region (z.B. europe-west3)

### 4. Web App konfigurieren

1. Gehen Sie zu **Projekteinstellungen** (Zahnrad-Symbol)
2. Scrollen Sie zu "Ihre Apps" und klicken Sie auf "Web App hinzufügen" (`</>`)
3. Geben Sie einen App-Namen ein (z.B. "Monster TCG Web")
4. Kopieren Sie die Firebase-Konfiguration

## Lokale Konfiguration

### 1. Environment Variables einrichten

Erstellen Sie eine `.env` Datei im Projektverzeichnis mit Ihren Firebase-Credentials:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Beispiel (mit Dummy-Werten):**
```bash
VITE_FIREBASE_API_KEY=AIzaSyDpO1234567890abcdefghijklmnopqrstu
VITE_FIREBASE_AUTH_DOMAIN=monster-tcg-12345.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=monster-tcg-12345
VITE_FIREBASE_STORAGE_BUCKET=monster-tcg-12345.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890abcdef
```

### 2. Firestore Security Rules

Setzen Sie diese Firestore-Regeln in der Firebase Console unter **Firestore Database** > **Regeln**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Friend codes are readable by authenticated users for friend lookup
    match /friendCodes/{friendCode} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (resource == null || resource.data.uid == request.auth.uid);
    }
  }
}
```

### 3. Anwendung starten

```bash
# Abhängigkeiten installieren (falls noch nicht geschehen)
npm install

# Entwicklungsserver starten
npm run dev

# Oder für Produktion builden
npm run build
```

## Funktionen

### 🔑 Passwordless Login

1. Klicken Sie auf den **Login**-Button
2. Geben Sie Ihre E-Mail-Adresse ein
3. Prüfen Sie Ihre E-Mails und klicken Sie auf den Login-Link
4. Sie werden automatisch eingeloggt

### 👤 Profil-Management

Nach dem Login können Sie:
- **E-Mail-Adresse** ändern
- **Nickname** bearbeiten  
- **Freundschaftscode** einsehen und kopieren

### ☁️ Cloud-Synchronisation

- Ihre Kartenpakete werden automatisch in der Cloud gespeichert
- **Real-time Sync** - Änderungen werden sofort synchronisiert
- **Offline-Unterstützung** - Spiel funktioniert auch offline
- **Automatische Migration** - Lokale Daten werden beim ersten Login übertragen

### 💾 Speicher-Status

Das Spiel zeigt den aktuellen Speicher-Status an:
- 🌐 **Cloud-Sync Aktiv** - Online mit Firebase verbunden
- 💻 **Lokal Aktiv** - Offline-Modus oder nicht angemeldet

## Troubleshooting

### Häufige Probleme

**Problem: "Missing Firebase configuration"**
- Lösung: Prüfen Sie, ob alle Environment Variables in der `.env` Datei korrekt gesetzt sind

**Problem: "Firebase initialization failed"**
- Lösung: Prüfen Sie die Firebase-Konfiguration und Project ID

**Problem: "Permission denied" beim Datenzugriff**
- Lösung: Prüfen Sie die Firestore Security Rules

**Problem: E-Mail-Link funktioniert nicht**
- Lösung: Prüfen Sie, ob Ihre Domain in den Firebase Authentication-Einstellungen autorisiert ist

### Debug-Modus

Öffnen Sie die Browser-Konsole für detaillierte Logging-Informationen:
- `🔥 Firebase initialized successfully` - Firebase ist korrekt konfiguriert
- `🔓 User authenticated` - Login erfolgreich
- `💾 Game data saved to Firebase` - Daten erfolgreich gespeichert

## Datenstruktur

### Firestore Collections

```
users/{uid}
├── email: string
├── nickname: string  
├── friendCode: string
├── gameData: {
│   ├── coins: number
│   ├── collection: MonsterData[]
│   ├── deck: MonsterData[]
│   └── lastSaved: string
├── createdAt: timestamp
└── lastActive: timestamp

friendCodes/{friendCode}
├── uid: string
├── nickname: string
└── email: string
```

## Sicherheit

- Alle Daten werden verschlüsselt übertragen (HTTPS)
- Nutzer können nur auf ihre eigenen Daten zugreifen
- E-Mail-Adressen werden sicher in Firebase Auth gespeichert
- Keine Passwörter - sicherere E-Mail-Link-Authentifizierung

## Support

Bei Problemen:
1. Prüfen Sie die Browser-Konsole auf Fehlermeldungen
2. Stellen Sie sicher, dass alle Firebase-Services aktiviert sind
3. Kontrollieren Sie die Environment Variables

Die Firebase-Integration ist vollständig optional - das Spiel funktioniert auch weiterhin ohne Anmeldung mit lokalem Speicher.