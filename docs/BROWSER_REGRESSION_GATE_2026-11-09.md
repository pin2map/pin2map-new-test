# Browser-Regressionsprüfung und Offline-Integration (2026-11-09)

**Branch:** `feature/leaflet-modular-core` · **nicht** in `main` übernommen; die geschützte Referenz bleibt unverändert.

## Anlass

Nach mehreren getrennten Änderungen an Layerverwaltung, Suche, Gesten, Markern, Verschiebevorschau und Pin-Dialog muss das **Zusammenspiel im echten Browser** abgesichert werden. Isolierte Modulprüfungen allein reichen dafür nicht.

## Ergänzte Prüfinfrastruktur

- `tests/browser-smoke.cjs`: ausführbares, **echtes Chromium-Playwright-Skript**, das den aktuellen Checkout über einen lokalen HTTP-Server lädt und ohne Nominatim-Netzwerkaufrufe folgende Abläufe prüft:
  1. App- und Leaflet-Start.
  2. Pin-Erstellung per langem Drücken auf der Karte, Auswahl und private Ebene.
  3. Verschieben mit Vorschau und **Abbruch ohne Koordinatenänderung**.
  4. Zweites Verschieben mit **ausdrücklicher Bestätigung** und aktualisierten Koordinaten.
  5. Persistenz über Reload mit erneutem Öffnen des Pins.
  6. Aktivierung des Service Workers, simulierte Offline-Verbindung und **Offline-Neustart mit lokalem Pin**.
  7. Unbehandelte Browser-JavaScript-Fehler.
- `.github/workflows/modular-core.yml`: zusätzlicher Job `chromium-smoke` neben den bisherigen Node-/Syntaxprüfungen. Nutzt Node 22, Playwright/Chromium und einen lokalen HTTP-Server.
- `tests/offline-shell.test.js`: permanente Integritätskontrolle: Alle lokalen `index.html`-Skripte müssen im obligatorischen PWA-Cache stehen; Dateien müssen im Checkout existieren.
- `app.js`: Service-Worker-Registrierung jetzt auch auf `localhost`/`127.0.0.1` (lokale vertrauenswürdige Test-Ursprünge) statt ausschließlich auf HTTPS. Öffentliche/produktive HTTP-Hosts bleiben ausgeschlossen.

## Teststand und noch ausstehende Freigabe

- Statischer Integritätsabgleich: **21/21 lokale JavaScript-Skripte im Offline-Cache**.
- Syntaxkontrolle für `app.js`, `sw.js` und Browser-Testskript: erfolgreich.
- GitHub-Workflow wurde im Feature-Zweig ergänzt. Zum Zeitpunkt dieses Eintrags liegen **keine verifizierten erfolgreichen CI-Laufergebnisse** vor. Das Vorhandensein des Testskripts ist **kein Nachweis**, dass der echte Browserlauf bereits erfolgreich war.
- Externer Leaflet-CDN muss bei der anfänglichen Online-Installation erreichbar sein; anschließend prüft der Test die Offline-Ladung. Anders als reale iOS-/Android-Tests deckt Chromium weder Safari-Gesten noch mobile Hardware-Sonderfälle vollständig ab.
- **Stabile UI-/Release-Freigabe weiterhin gesperrt**, bis Node-Tests, echter Chromium-Durchlauf und zumindest manueller Mobilgeräte-Test erfolgreich nachvollziehbar sind.

## Lokale Durchführung

```sh
npm install --no-save playwright@1.56.1
npx playwright install chromium
python3 -m http.server 8765 --bind 127.0.0.1 &
node tests/browser-smoke.cjs
```

Der Browser-Test erzeugt einen frischen Browserkontext und verwendet nur lokal gespeicherte Testpins. Nicht gegen einen Produktivdatensatz laufen lassen.

**Nächster Schritt:** Rückmeldungen der automatischen Chromium-/Node-Läufe auswerten und konkrete Fehler im Feature-Zweig beheben, statt weitere Module auf Verdacht auszulagern. Erst nach der integrierten Freigabe mit der Oberflächenentwicklung fortfahren.
