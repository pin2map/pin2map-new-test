# app.js – Bestandsaufnahme und erster Entflechtungsschritt

**Datum:** 2026-11-11  
**Quelle:** `app.js` und vorhandene Module auf `feature/leaflet-modular-core` (Quellstand v100).  
**Status:** Architektur-/Umsetzungsplanung, noch keine Programmänderung und keine bestandene CI-/Browserabnahme.

## 1. Iststand

`app.js` umfasst derzeit 18.536 Zeichen und enthält weiterhin die zentrale Closure, die Initialisierung und Ereignisverdrahtung. Die Datei erzeugt/verdrahtet die bereits vorhandenen Domain-, Application-, UI-, Karten- und Speicherbausteine und enthält zugleich DOM-Menülogik, Render-Koordination und Speicher-Timing.

| Verantwortung in `app.js` | Vorhandene Abgrenzung | Noch zentral |
| --- | --- | --- |
| Start, Fehlerfall, Composition Root | `domain/project-model.js`, `map-adapter-leaflet.js`, IndexedDB-Adapter | `init()`, Modulinstanziierung, Script-/SW-Start |
| Projektpersistenz | `adapters/storage/indexeddb-project-store.js` | `save()`, `dbWrite()`, `persistViewport()` |
| Pins und Ebenen | `application/pin-operations.js`, `application/layer-operations.js`, Filter-Operationen | UI-Ereignisse, Modaldialog-Text, Speicher- und Render-Folge |
| Suche | `application/place-search-service.js`, `domain/place-search.js`, `ui/search-results.js` | `runSearch()`, `choosePlace()`, Meldungen/Selektion |
| Karte und Pinbewegung | `map-adapter-leaflet.js`, Marker-, Gesten-, Move-/Positionierungscontroller | Ereignisbindung, Fit-all, Synchronisierung der Panels |
| UI-Zustand und Panels | `ui/ui-state.js`, `ui/shell.js`, `ui/pin-editor.js`, `ui/layer-view.js` | Basiskarten-Menü, vereinzelte direkte DOM-/ARIA-Aktionen |

Die Fachmodule verwenden teilweise globale `window.Pin2Map...`-Exporte und werden über `index.html` geladen. Bei jeder neuen Datei deshalb Skriptreihenfolge, Service-Worker-`CORE`, Vorschau-Packaging und CommonJS-Tests synchron behandeln.

## 2. Erste empfohlene vertikale Extraktion: Basiskarten-Menü

**Vorgesehenes neues Modul:** `ui/basemap-menu.js` (name bei Implementierung verbindlich beibehalten).

**Ziel:** Rein visuelle Menüsteuerung aus `app.js` lösen. Das Modul darf DOM/ARIA kennen, aber weder Karte/Leaflet noch Projektzustand/IndexedDB verändern.

**Schmale Schnittstelle** als Vorschlag:

- Konstruktor mit `getElement`, `document`, `onSelect(value)`, `onOpening()` und optional `allowedValues` (nur `street`/`topo`).
- `render(selectedBasemap)`: `aria-pressed` und `is-selected` für die Menüeinträge.
- `open()/close()/toggle()`: `hidden` und `aria-expanded`; `onOpening` schließt andere Panels und Suchtreffer ausschließlich über injizierte Callbacks.
- `bind()/dispose()`: ausschließlich eigene Klick-, Escape- und Außenklick-Listener; Tastaturfokus wiederherstellen.
- `onSelect` meldet nur die erlaubte Auswahl. **`app.js` bleibt verantwortlich** für `state.basemap`, `mapAdapter.setBasemap()`, `save()` und die weitere Komposition.

**Ersetzbare Stellen in `app.js`:** `setTileLayer()` (nur DOM-Menüteil), `closeBasemapMenu()`, die Basemap-Click-/Escape-Bindings in `bind()` und die entsprechenden Outside-Click-Zweige. Die tatsächlichen bisherigen Öffnungs-/Schließkonventionen, Panel-/Suchtreffer-Sperren und Fokus-Rückgabe müssen identisch bleiben.

**Nicht in diesem Schritt ändern:** `styles.css`, Pin-/Ebenenmodell, IndexedDB-Schema, Tile-/Leaflet-Adapter, Service-Worker-Cachepolicy, Synchronisation, `main`.

## 3. Absicherung und Gates vor und nach Umsetzung

1. Vor dem Codeeingriff v100-Baseline verifizieren: Node-22-`node --test tests/*.test.js`, alle `tests/check-*.mjs`, GitHub Actions/Pages, HTTPS-Preview und Browser-Smoke. Fehlende Belege **offen**, nicht bestanden werten.
2. Modul mit DOM-Fakes ohne Browser-Kartenbibliothek testen: Öffnen, Schließen, Auswahl, ungültige Werte, `aria-pressed`, `aria-expanded`, Escape, Außenklick, Fokus und `dispose`.
3. Integration mit der echten Komposition testen: Basiskarte wechseln/erneut wählen, persistieren, Menü und andere Panels schließen, Trefferliste schließen, keine unbeabsichtigte Pin-/Datenänderung.
4. `index.html`-Skriptreihenfolge, `sw.js`-`CORE`, neue Version und Preview-Isolation kontrollieren. CSS bleibt exakt unverändert.
5. Erst nach erfolgreichen tatsächlichen Tests und verifizierter `/preview/`-Auslieferung als fertig und sichtbar abgenommen markieren.

**Nächste Implementierungsaufgabe:** kleine Extraktion des Basiskarten-Menüs nach `ui/basemap-menu.js`, **nur wenn Qualitäts-Baseline/Prüfzugriff eine verlässliche Validierung erlauben**. Das ist keine Freigabe zum ungeprüften Merge nach `main`.


## 4. Erste Umsetzung – Basiskarten-Menü in eigenem UI-Modul (v101, 2026-11-11)

- **Im Feature-Branch implementiert:** `ui/basemap-menu.js` (DOM-/ARIA-only, `render`, `open`, `close`, `toggle`, `bind`, `dispose`, Tastatur/Escape, Klick außerhalb, Fokus, Auswahl). Die Auswahl und die `onOpening`-Aktion werden mittels injizierter Callbacks an `app.js` weitergegeben; keine Kartendaten oder IndexedDB im UI-Modul.
- `app.js`: Basiskarten-Menü-Events und direkte ARIA-/Menü-DOM-Steuerung ersetzt; `mapAdapter.setBasemap(state.basemap)`, Projektzustand und `save()` bleiben ausdrücklich im Kompositionscode. Die übrigen Ereignis-/Pin-/Ebenen-Flows unverändert.
- `index.html`: `ui/basemap-menu.js` nach `ui/shell.js` und vor `app.js` geladen. `sw.js`: neue Datei im App-Shell-`CORE`, Release **pin2map-new-v101** (im Preview-Workflow zu pin2map-preview-v101 umbenannt, tatsächliche Auslieferung nicht belegt).
- Neuer `tests/basemap-menu.test.js`: isolierte DOM-Fakes für Auswahl, Zustand/ARIA, ungültige Werte, Offen/Schließen, Escape, Außenklick, Fokus, Listener-`dispose` sowie HTML-/SW-/Kompositionsverdrahtung.
- **Nach dem Commit erneut statisch aus GitHub gelesen:** Modul, Delegation, fehlende alte Menühörer, Skriptreihenfolge, `CORE` und v101. `app.js` schrumpfte von 18.536 auf 17.467 Zeichen. CSS und persistierte Daten unverändert; `main` nicht geändert.
- **Noch NICHT unabhängig nachgewiesen:** vollständiger `node --test tests/*.test.js`, `tests/check-*.mjs`, erfolgreicher Preview-Push-Workflow, öffentliche v101-HTTPS-Auslieferung, echter Browserwechsel der Basiskarte (inklusive gespeichertem Zustand) und mobile Abnahme. Die Quelldatei ist vorhanden, aber eine vollständig getestete/live freigegebene Anwendung wird hieraus nicht abgeleitet.
- **Nächster Schritt:** technischen Validierungsrückstand schließen. Erst danach nächste `app.js`-Verantwortlichkeit auswählen. CSS-Pause bleibt unverändert.


## 5. Prüfrunde v101 – isolierte Ausführung, offene Gates (2026-11-11)

- Aus dem aktuellen Feature-Branch wurde `ui/basemap-menu.js` bezogen und in einem getrennten JavaScript-V8-Kontext mit DOM-Doubles tatsächlich ausgeführt. **12 Checks bestanden:** ARIA, Auswahl-Rendern, Klick/Toggle, gültige/ungültige Auswahl, Fokus, Innen-/Außenklick, Escape, Enter, Listener-Entfernung sowie statische Integrationsverträge für `app.js`, `index.html` und `sw.js`.
- Dies ist ausdrücklich **nicht** `node --test tests/*.test.js`; die vollständige Node-22-Suite und `tests/check-*.mjs` bleiben ungetestet. Ebenso nicht durchgeführt: echter Browser-/Leaflet-/Speicher-Smoke oder Endgeräteprüfung.
- GitHub-Abfragen zum Code-Test-Commit `809d6d8f3a12a6f2ee08c2326a73257ddc2cf31f` lieferten keine Commit-Statuses und keine PR-gefilterten Workflow-Runs; damit ist kein push-getriggerter Pages-Erfolg belegt oder widerlegt. HTTP(S)-Abrufe der Preview-URL und der v101-Assets waren aus der verfügbaren Umgebung nicht erfolgreich, direkter git-Zugriff scheiterte an DNS.
- **Status:** Modulfunktion isoliert positiv, veröffentlichte Gesamtanwendung **weiterhin nicht freigegeben**. Keine Quellcode-Änderungen, kein Merge, keine Datenoperationen.


## 6. Verifizierte v101-Gates nach Reparatur zweier veralteter Tests (2026-11-11)

- Zunächst bei `Modular core checks` **135/137** Tests erfolgreich; historische, gegen die inzwischen gelöschte CSS-Mobile-Regel und die ausgelagerte Basiskartensteuerung gerichtete Assertions waren die zwei Fehler. Nach Korrektur der Tests `tests/css-base-readability-contract.test.js` und `tests/lucide-button-design.test.js` keine Änderung an `styles.css`, `app.js`, UI-Modul oder Service Worker.
- **Bestätigter Node-Job:** 137/137 bestanden, <https://github.com/pin2map/pin2map-new-test/actions/runs/42981343397>.
- **Bestätigter Chromium-Job:** automatischer UI-Test für Pin-Selektion, Verschieben, Datenpersistenz und Offline-Reload erfolgreich; Basiskarten-Menüinteraktionen in diesem Smoke noch nicht explizit nachgewiesen.
- **Architektur-Gate:** erfolgreich, <https://github.com/pin2map/pin2map-new-test/actions/runs/42981343418>.
- **Preview-Gate:** erfolgreich, <https://github.com/pin2map/pin2map-new-test/actions/runs/42981343415>. Umfasst `node --test tests/*.test.js`, `tests/check-*.mjs`, Pages-Deploy, **über HTTPS geladene exakt versionierte Preview-Assets** sowie reale Chromium-Live-Start-/Reload-Checks für Telefon-, Tablet- und Desktop-Viewports einschließlich Tracking-URL. Freigegebene Preview-Quelle `pin2map-preview-v101` unter <https://pin2map.github.io/pin2map-new-test/preview/>.
- **Weiter offen:** gezielte funktionale Basiskarten-Menü-Interaktionen (street↔topo, ARIA, Escape, Außenklick, Fokus, Persistenz) im echten Browser und manuelle Geräteabnahme. Nicht nach `main` übernehmen ohne Freigabe.
