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
