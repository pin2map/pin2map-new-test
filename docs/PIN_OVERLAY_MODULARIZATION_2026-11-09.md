# Modularisierung – Pin-Marker und Verschiebevorschau (2026-11-09)

**Entwicklungszweig:** `feature/leaflet-modular-core`. Keine Änderungen an `main` oder der geschützten Leaflet-Referenz.

## Neu: getrennte Visualisierungspakete

### `ui/pin-marker-view.js`

- Rein präsentationsorientiert, ohne Fachzustandsmutation, IndexedDB, Netzwerk oder Leaflet-Globals.
- Besitzt ausschließlich die aktuell dargestellten Marker-Handles und führt diese anhand stabiler Pin-IDs weiter.
- Berechnet Beschriftungstext, Seitenlage und Kollisionen mit dem **bereits vorhandenen Anzeigeregelsatz** (selektierter Pin zuerst, Unterdrückung überlappender unselektierter Labels).
- Escaped Pin-Namen vor der Aufnahme in Marker-HTML; Farben kommen aus der Ebenenansicht.
- Kartenadapter-Methoden `createMarker`, `setMarkerPosition`, `setMarkerAppearance`, `removeOverlay` statt direkter Leaflet-Aufrufe.
- Klick auf einen Marker wird über `onSelect(pinId)` an die Anwendung gemeldet; der Gestencontroller ist über `attachGesture` angebunden.

### `ui/pin-move-preview.js`

- Besitzt ausschließlich **temporären** Vorschau-Marker, Verbindungslinie und Bestätigungsleiste.
- `show(position,pin)` zeichnet eine reversible Vorschau, `current()` liefert eine Kopie des Vorschaupunkts, `clear()` entfernt nur temporäre Overlays.
- `barPlacement` ist eine unabhängig testbare Berechnung der Position der Bestätigungsleiste mit Berücksichtigung des sichtbaren Viewports.
- Das Modul verändert **weder Koordinaten noch Pin-Identität oder Datenbankinhalt**. Erst der vorhandene Anwendungsfall `pinOps.movePin` übernimmt eine bestätigte Position.

### `app.js` und Kartenadapter

- `app.js` delegiert Markerrendering und Vorschauzeichung, führt nur noch den Pin-Workflow (Auswahl, Beginn/Bestätigung/Abbruch, Speichern) und die UI-Koordination aus.
- Reduzierung `app.js` von 483 auf **410 Zeilen**.
- Bestehende Kartenadapter-Schnittstelle unverändert; keine neuen Leaflet-Interna in den neuen Modulen.
- Nebenbei zwei überholte Kartenprüfungen in `updatePanelLayout` und `keepSelectedAbovePanel` von der nicht vorhandenen Variable `map` auf `mapAdapter` korrigiert. Das entspricht der bestehenden beabsichtigten Bedingung, ist aber im Browser unbedingt zu prüfen.

## Offline-Betrieb und Tests

- `index.html` bindet beide Module vor dem Einstiegsskript ein.
- `sw.js` erhöht den App-Shell-Cache auf **`pin2map-new-v22`** und enthält beide neuen Moduldateien.
- Neue `tests/pin-overlays.test.js` mit **6 isolierten Tests**: HTML-Escaping, Labelkollision/Selektion, Abschalten von Labels, Marker-Wiederverwendung und Entfernung, Viewport-Positionierung der Verschiebeleiste, temporäre Overlay-Lebensdauer ohne Pin-Mutation.
- Isolierte Ausführung der sechs Tests über eine testkompatible JavaScript-Umgebung: **6/6 bestanden**. Syntaxprüfung der geänderten Dateien und die Gegenüberstellung der `index.html`-Skripte mit `sw.js` waren ebenfalls erfolgreich.
- **Nicht als bestanden ausgegeben:** vollständiger Node-CI-Workflow, Browser-Integration, iOS-/Android-Touchverhalten, PWA-Offline-Neustart. Erst nach diesen Prüfungen in den stabilen Teststand übernehmen.

## Nächste technische Trennstelle

Die Panel-Ankerpositionierung und das automatische Ausweichen beim Öffnen des Pin-Dialogs sind noch direkt in `app.js`. Sie können als eigenständiges `ui/pin-panel-positioner.js` mit reiner Screen-Space-Geometrie isoliert werden. **Keine neuen Fachfunktionen** vor der gemeinsamen UI-Phase freigegeben.
