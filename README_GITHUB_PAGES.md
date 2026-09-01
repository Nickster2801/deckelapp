# DeckelApp als GitHub Pages / PWA veröffentlichen

Diese Version ist eine reine Web-App/PWA. Sie braucht keinen Server, keine Datenbank und keine APK.

## Was enthalten ist

- `index.html` – Einstieg der App
- `styles.css` – Design
- `app.js` – App-Logik, Artikel, Bestellungen, Historie, Statistik, lokale Speicherung
- `manifest.webmanifest` – Installierbarkeit als App
- `service-worker.js` – Offline-Funktion
- `icons/` – App-Icons

## Lokal testen

Ein Doppelklick auf `index.html` reicht für einen ersten Blick. Für die echte Offline-/PWA-Funktion sollte die App aber über einen kleinen lokalen Webserver oder GitHub Pages laufen.

Ein einfacher lokaler Test geht zum Beispiel mit Python:

```powershell
cd DeckelApp_PWA_GitHub
python -m http.server 8080
```

Dann im Browser öffnen:

```text
http://localhost:8080
```

## Auf GitHub Pages veröffentlichen

1. Neues Repository auf GitHub erstellen, z. B. `deckelapp`.
2. Alle Dateien aus diesem Ordner in das Repository hochladen.
3. Auf GitHub im Repository öffnen:
   - `Settings`
   - `Pages`
   - `Build and deployment`
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
4. Speichern.
5. GitHub zeigt danach eine Adresse an, z. B.:

```text
https://DEINNAME.github.io/deckelapp/
```

## Auf Android installieren

1. Link auf dem Android-Handy in Chrome öffnen.
2. Menü `⋮` öffnen.
3. `App installieren` oder `Zum Startbildschirm hinzufügen` wählen.
4. Danach kann die App wie eine normale App gestartet werden.

## Offline-Nutzung

Nach dem ersten erfolgreichen Öffnen speichert der Service Worker die App-Dateien im Browser-Cache. Danach kann die App auch ohne Internet starten.

Die Daten werden lokal im Browser des Geräts gespeichert (`localStorage`). Das bedeutet:

- Daten bleiben auf dem Gerät.
- Kein Server wird benötigt.
- Wenn Browserdaten gelöscht werden, können auch App-Daten gelöscht werden.
- Unter Einstellungen gibt es Export/Import für eine Datensicherung.

## Updates

Wenn du Dateien auf GitHub ersetzt, lädt die PWA beim nächsten Online-Besuch die neue Version nach. Falls Änderungen nicht sofort sichtbar sind, Browser einmal schließen/neu öffnen oder Cache leeren.
