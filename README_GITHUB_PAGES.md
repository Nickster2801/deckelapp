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


## Version 1.0.8
- Optimierte Bezahlansicht mit Schnellbeträgen, Passend-Button, eigenem Nummernblock und Live-Rückgeldanzeige.


### Änderungen in 1.0.8
- Pfandrückgabe ist mit 1,00 € pro Stück vorbelegt, kann bei Bedarf aber manuell geändert werden.
- Der globale Button „Letzte Bestellung stornieren“ bleibt entfernt.
- Jede Bestellung in der Historie hat weiterhin einen eigenen Stornieren-Button mit Sicherheitsabfrage.


## Version 1.0.9
- Umschaltbarer Darkmode/Hellmodus unter Einstellungen.
- Theme-Auswahl wird lokal auf dem Gerät gespeichert.


## Version 1.0.10
- Abstaende zwischen nebeneinanderliegenden Aktionsbuttons vergroessert.
- Vertikaler Abstand zwischen aufeinanderfolgenden Button-Zeilen erhoeht.
- Artikelstamm und Bestellansicht fuer Touch-Bedienung luftiger gestaltet.

## Version 1.1.0

Große Bedienungs- und Verwaltungsoptimierung:

- Artikelkacheln reagieren sichtbar auf Eingaben; langes Drücken entfernt ein Stück.
- Bestellbutton wird bei gefüllter Bestellung stärker hervorgehoben.
- Nach Abschluss erscheint eine kurze Erfolgsmeldung mit „Rückgängig“.
- Artikelstamm zeigt Status für Sichtbarkeit, Favorit und Pfand direkt an.
- Gruppen und Artikel lassen sich über Pfeile in der Reihenfolge verschieben.
- Eventwechsel wird bei einer offenen Bestellung abgesichert.
- Statistik erweitert um Durchschnittsbestellung, verkaufte Artikel und Pfandsaldo.
- Einstellungen in Darstellung, Bestellung, Daten & Backup, Verwaltungsschutz und App gegliedert.
- Backup mit Zeitstempel und Anzeige des letzten Backups.
- Update-Erkennung mit Hinweis „Neue Version verfügbar“.
- Optionaler Wake-Lock hält den Bildschirm während des Verkaufs aktiv, sofern unterstützt.
- Vollbild-Schaltfläche für Browserbetrieb, sofern unterstützt.
- Optionaler lokaler Verwaltungs-PIN für Event, Artikelstamm und Einstellungen.


## Version 1.1.2

- Schnelles mehrfaches Tippen auf Artikelkacheln zaehlt jetzt unmittelbar und stabil nach oben.
- Die Artikelansicht wird beim Hinzufuegen nicht mehr nach jedem Tap komplett neu aufgebaut; nur das Mengenbadge wird aktualisiert.
- Langes Druecken zum Entfernen reagiert erst nach ca. 0,9 Sekunden und wird bei Fingerbewegung abgebrochen.
- Browser-Kontextmenue/Touch-Callout auf Artikelkacheln unterdrueckt, damit langes Druecken nicht mit der Bedienung kollidiert.


### Eventverwaltung ab Version 1.1.2
- Events können umbenannt werden; vorhandene Bestellungen bleiben dem umbenannten Event zugeordnet.
- Events können zurückgesetzt werden. Dabei werden Bestellhistorie und Statistik dieses Events geleert, Artikel/Gruppen bleiben erhalten.
- Events können vollständig gelöscht werden. Die zugehörige Bestellhistorie wird nach Sicherheitsabfrage mit gelöscht.
- Wird das aktive Event gelöscht, aktiviert die App automatisch ein anderes Event; falls kein weiteres vorhanden ist, wird ein neues Standard-Event angelegt.
