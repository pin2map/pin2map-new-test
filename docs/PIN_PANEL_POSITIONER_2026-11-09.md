# Modularisierung – Positionierung des Pin-Dialogs (2026-11-09)

**Entwicklungszweig:** `feature/leaflet-modular-core` · **nicht** nach `main` zusammengeführt. Die geschützte Referenzversion bleibt unverändert.

## Abgeschlossene technische Trennung

Neu ist `ui/pin-panel-positioner.js`. Das Modul trennt **Berechnung der Bildschirmgeometrie** und **Anbringung von Dialog und Verbindungsspitze** von der zentralen `app.js`.

- `anchorGeometry` ist eine reine, einzeln testbare Berechnung für die Position des Dialogs über einem ausgewählten Pin und seine Spitze. Das bestehende Layout mit 76 Pixeln Abstand und einer maximalen Breite von 310 Pixeln bleibt erhalten.
- `openingCorrection` bestimmt aus den Bildschirm-Rechtecken des Dialogs, der Spitze und des App-Fensters, ob ein **einmaliger** Pan beim Öffnen nötig ist. Die bestehende Reihenfolge der Randkorrekturen und 12-Pixel-Marge wurde beibehalten.
- `PinPanelPositioner.layout({pin,moving})` aktualisiert Dialog und Spitze bei Kartenbewegungen, **ohne** zu pannen oder die Pin-Koordinaten zu verändern. Der Dialog bleibt dabei am Pin verankert, auch wenn er anschließend am Bildschirmrand teilweise außerhalb liegt.
- `PinPanelPositioner.keepVisibleAtOpen({pin,moving})` versucht **nur beim erstmaligen Öffnen** den Dialog vollständig sichtbar zu machen. Dafür verschiebt es die **Karte**, nicht den Pin.
- Keine Leaflet-Globals, Pin-Domänenoperationen, Netzwerk-, Speicher- oder Providerzugriffe im Modul. Alle Kartenzugriffe erfolgen über den vorhandenen Kartenadapter.

Die bisher umfangreichen Funktionen `updatePanelLayout` und `keepSelectedAbovePanel` in `app.js` sind jetzt schlanke Aufrufe des Positionierers. **`app.js`: 410 → 370 Zeilen.** Die weiterhin vorhandene Orchestrierung (Auswahl, Gesten, Verschiebemodus) bleibt vorerst bewusst außerhalb dieses rein darstellenden Moduls.

## Integration und Offline-Verhalten

`index.html` lädt `ui/pin-panel-positioner.js` vor `app.js`. `sw.js` cachet das neue Modul als Bestandteil der obligatorischen App-Shell; Cache-Version **`pin2map-new-v23`**.

## Nachweise und offene Qualitätsgates

- Neu: `tests/pin-panel-positioner.test.js`, **7 isolierte Tests**, unter anderem für Ankergeometrie, enge Bildschirme, oberen/unteren Rand, keine unnötige Kartenbewegung, einmalige Öffnungskorrektur, Erhalt der Pin-Koordinaten und ausgeblendete Dialoge.
- Die **7 Tests** wurden in einer testkompatiblen JavaScript-Umgebung isoliert ausgeführt: **7/7 erfolgreich**.
- Syntaxprüfung für die betroffenen JS-Dateien sowie statischer Vergleich der lokal eingebundenen `index.html`-Skripte mit der PWA-Offline-Dateiliste erfolgreich.
- **Nicht bestätigt:** vollständiger Node-GitHub-Actions-Lauf, vollständige Browser-Integration, reale mobile Darstellung (insbesondere iPhone/iPad-Bildschirmränder und Keyboard/Safe-Area), Offline-PWA-Neustart. Erst nach erfolgreichem Qualitätstor kann die Änderung in einen stabilen Stand übergehen.

## Nächste technische Trennstelle

`app.js` enthält weiterhin übergreifende UI-Ereignisbindung (Dialoge, Einstellungen, Refresh, Kartenereignisse) und die Orchestrierung des Pin-Verschiebemodus. Ein nächster sinnvoller Schnitt ist ein eigener Anwendungscontroller für den **Pin-Verschiebe-Workflow** (Beginn, Vorschau, Bestätigung, Abbruch), ohne die reine grafische Vorschau oder den Pin-Fachdienst zu vermischen. Vor weiteren größeren Umbauten empfiehlt sich ein echter Browser-Regressionsdurchlauf über die bisherigen modularen Gesten-, Marker- und Dialogänderungen.
