# PMTiles: dauerhafter Regionsspeicher und Offline-Ressourcen

Stand: 2026-11-09. **Vorbereitende isolierte Implementierung, keine Offline-Freigabe.**

## Gesicherter Ausgangspunkt

- Originale Leaflet-V18-Referenz: `reference/leaflet-v18-2026-11-09`.
- Abgenommene vollständige MapLibre-Integration: `reference/maplibre-full-integration-accepted-2026-11-09` und separat `pin2map-maplibre-preview/reference/maplibre-integration-v2-accepted-2026-11-09`.
- Eigene Stuttgart-Datei: `stuttgart-z12.pmtiles`, 2.866.574 Bytes, MVT, Zoom 0–12, durch `pmtiles verify` und SHA-256 geprüft; Browserdarstellung mit Protomaps-Light auf Nutzergerät bestätigt.

## Inkrement A: Persistenz einer lokalen PMTiles-Datei

Die isolierte Seite `https://pin2map.github.io/pin2map-maplibre-preview/pmtiles-persistent-lab-v1.html` erlaubt:

1. PMTiles-Datei auswählen und Header/Bereich/Größe vor dem Import prüfen.
2. Bewusst auf **„Datei lokal speichern“** klicken; Dateiblob per IndexedDB *structured clone* in der separaten Datenbank `pin2map-pmtiles-persistent-lab-v1` speichern.
3. Nach Abschluss der Schreibtransaktion Datei erneut lesen und Größe kontrollieren.
4. Per `navigator.storage.persist()` nach einer persistenteren Browser-Speicherzuordnung fragen; Ablehnung ist kein Fehler, muss aber sichtbar bleiben.
5. Über **„Gespeicherte Karte öffnen“** bei einem späteren Laden über `pmtiles.FileSource` rendern.
6. Über **„Gespeicherte Karte entfernen“** nur die Testkartendatei aus dieser Testdatenbank löschen.

Der Import lädt keine Datei hoch. **Kein** Service Worker und **kein** Offline-Start in dieser Testversion. Der Browser kann Daten wegen Quota, Nutzereinstellungen oder Speicherbereinigung entfernen. `navigator.storage.persist()` ist kein absoluter Löschschutz. Der Test ist auf höchstens 40 MiB je ausgewählter Datei und einen separaten Testdatensatz begrenzt. Die produktive Kartenverwaltung mit mehreren Regionen, Metadaten und Synchronisationsausnahmen bleibt offen.

## Inkrement B: Ressourcenpaket zum späteren Offline-Betrieb

Im öffentlichen Preview-Repository liegt `.github/workflows/package-offline-map-assets.yml`. Dieser unabhängige Workflow sammelt, prüft und verpackt:

- MapLibre GL JS 6.16.0: `maplibre-gl.mjs` und `maplibre-gl.css`.
- PMTiles 4.5.0: `pmtiles.js`.
- Protomaps-Basemap-Bibliothek 5.7.2: `basemaps.js`.
- Aus dem Upstream-`protomaps/basemaps-assets`-Repository: Glyph-PBF-Dateien (Noto Sans) einschließlich OFL-Lizenzdateien und `sprites/v4/light` als PNG/JSON (1x und 2x), soweit im Repository vorhanden.

Der Paketinhalt wird auf maximal 100 MiB begrenzt, mit SHA-256-Manifest und protokolliertem Git-Commit des Upstream-Asset-Repositories. Die Bibliotheksversionen sind festgelegt; **der basemaps-assets Upstream-Stand ist noch nicht auf eine konkrete Commit-SHA gepinnt** und muss vor Produktionsfreigabe fixiert werden. Die tatsächliche Ausführung des Workflows und ein erzeugtes Paket sind noch nicht bestätigt. Das Artefakt wird weder in GitHub Pages publiziert noch in die PWA integriert.

Quellen:
- <https://docs.protomaps.com/basemaps/maplibre> – Fonts-/Sprite-Anforderungen
- <https://github.com/protomaps/basemaps-assets> – Assets und jeweilige Lizenzdateien
- <https://pmtiles.io/typedoc/classes/FileSource.html> – lokale FileSource

## Offene Freigabegates

- [ ] Erfolgreiche Ausführung des Asset-Paket-Builds und Überprüfung aller Style-Glyph-Familien, Unicode-Ranges, Sprite-Dichten und Lizenzen.
- [ ] Ressourcen unter derselben Origin bzw. explizit kontrollierten URLs zur Verfügung stellen; keine CDN-URLs in der Offline-Kartenstilkonfiguration.
- [ ] Separater Service Worker precacht die App-Shell, JS und CSS **ohne pauschal fremde Kartentile-Downloads zu cachen**; sauberer Versionswechsel und klarer Fehler-/Updatepfad.
- [ ] Einmaligen vollständigen Kartenregions-Import einschließlich Integritäts-/Metadatenprüfung und Transaktionsabschluss vor der Offline-Freigabe gewährleisten.
- [ ] Offline-Start und Kartendarstellung bei **aktivem Flugmodus** auf iPhone; Kartenbewegungen innerhalb der gespeicherten Region, Beschriftungen und Symbole prüfen.
- [ ] Mehrere Regionen, gezieltes Löschen, Speicherlimits und Bereinigung in iOS/Safari/Brave prüfen.
- [ ] Nach Abnahme adapterseitige Integration in den eigentlichen pin2map-Entwicklungszweig; `main` und Referenz V18 bis dahin unverändert.

**Statusentscheidung:** Gespeicherte Datei ≠ vollständige Offlinefähigkeit. Erst wenn Shell, Kartendaten, Stilbibliothek, Schriftkacheln und Symbole offline verfügbar sind, kann die gesamte PWA ohne Netzwerkverbindung starten und eine Karte zeichnen.

## Inkrement C: eigenständiges Offline-Labor als Build-Artefakt (2026-11-09)

Im Preview-Repository ist das Skript `scripts/assemble-offline-lab.py` ergänzt. Der Workflow `package-offline-map-assets.yml` nutzt es nach dem Herunterladen der festgelegten Bibliotheken und Kopieren der Protomaps-Assets, um ein **separates, als ZIP/Artifact herunterladbares Testpaket** zusammenzustellen.

Das Paket enthält:

- `index.html` mit auf `./vendor/` umgeschriebenen JS-/CSS-Bibliotheken.
- Eine eigene Kopie der lokalen PMTiles-Speicherprobe: IndexedDB `pin2map-pmtiles-persistent-lab-v1`, Datei bewusst importieren, öffnen und löschen.
- Den Protomaps-Light-Stil mit auf `./assets/fonts/` und `./assets/sprites/v4/light` umgestellten URLs.
- Einen auf den eigenen Test-Unterordner begrenzten Service Worker `offline-stuttgart-sw.js` mit vollständigem Install-Precache des eingebundenen Ressourcenpakets. Die Installation scheitert, wenn eine erforderliche Datei nicht geladen wird; fremde Origins werden nicht abgefangen, und PMTiles-Dateien bleiben ausschließlich in IndexedDB.
- Manifest mit SHA-256 und Bytezahl jeder im Paket enthaltenen Datei. Der Build kontrolliert die Bibliotheks-Dateien, Schrift-/Sprite-Pfade sowie die Maximalgröße des Testpakets (100 MiB).

Das Paket ist **noch nicht erzeugt, nicht online bereitgestellt und nicht auf einem iPhone im Flugmodus getestet**. Außerdem ist ein kompletter Voll-Precache der Schriftressourcen auf iOS wegen Speichergrenzen noch zu überprüfen. Weitere Produktionsvoraussetzungen: Quell-Asset-Commit fest pinnen, Herkunft und Lizenzen prüfen, korrekte Offline-Start-/Update- und Recovery-Meldungen und dauerhafte Datenhaltung nachweisen.

Der Build erzeugt nur das Artefakt `pin2map-stuttgart-offline-lab-package` (14 Tage), keine automatische Änderung der GitHub-Pages-Veröffentlichung. Die Ausgabe muss in einem **eigenen Unterordner** einer HTTPS-Website bereitgestellt werden, damit der Service Worker nicht die bestehende MapLibre-PWA beeinflusst. Die Karte `stuttgart-z12.pmtiles` ist aus Datenschutz- und Größengründen weiterhin **nicht Teil des Pakets** und wird beim Test lokal importiert.

Automatische statische Regression: `tests/check-pmtiles-offline-package.mjs` kontrolliert die URL-Umstellung, den begrenzten Service-Worker-Scope und die isolierte Persistenzschnittstelle. Der tatsächliche GitHub-Actions-Lauf und sein Ergebnis stehen noch aus.
