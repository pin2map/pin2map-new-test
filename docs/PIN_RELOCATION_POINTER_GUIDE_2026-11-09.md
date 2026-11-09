# pin2map NEW – Interaktive Pin-Verschiebung: Fadenkreuz, gestrichelte Linie und blinkender Ausgangspin

**Stand:** 2026-11-09 · **Zweig:** `feature/leaflet-modular-core` · **Version:** `pin2map-new-v31` · **Status:** im Entwicklungszweig implementiert; Sichtprüfung auf Mobilgerät steht aus.

## Nutzeranforderung und Bedienfolge

1. Der kreisrunde Spezialicon-Button (roter Pin – gestrichelte Linie – grüner Pin) startet den Verschiebemodus.
2. Der bisherige Pin **blinkt** als eindeutig erkennbarer Ausgangspunkt. Auf Geräten mit reduzierter Bewegung erscheint stattdessen eine kontrastierende gestrichelte Markierung.
3. Auf Desktop zeigt die Karte ein **Fadenkreuz**. Zwischen Ausgangspin und aktueller Mauszeigerposition erscheint eine **bewegliche, grau gestrichelte Linie**.
4. Auf Touch-Geräten gibt es keinen permanenten Mauszeiger: Ein Fingerkontakt bzw. das Bewegen des Fingers zeigt die Linie vom Ausgangspin bis zum Kontaktpunkt. Das Blinken signalisiert die Auswahlbereitschaft auch ohne Fingerbewegung.
5. **Beim ersten Kartenklick oder -tipp** endet die mitlaufende Führung und das Blinken. Die neue Position wird als **unverbindliche Vorschau** mit Marker und Verbindung gezeigt; die bestehenden Bestätigungs- und Abbruchbuttons bleiben erhalten.
6. **Bestätigen** speichert die neue Position über die vorhandene Pin-Domänenoperation, beendet den Verschiebemodus und **schließt die Pinauswahl**, sodass der Pin-Dialog nicht wieder öffnet.
7. **Abbrechen** verwirft die ungespeicherte Position und öffnet wie bisher den Dialog für den ursprünglichen Pin. Ohne ausdrückliche Bestätigung werden keine Koordinaten verändert.

Damit bleibt die bestehende Schutzregel erhalten: Ein versehentlicher Tap ist nicht bereits ein gespeichertes Verschieben.

## Technische Modulverantwortlichkeiten

- `ui/pin-move-guide.js`: Pointer-/Touch-Führung; temporäre, nicht interaktive gestrichelte Karte-Linie, Frame-Drosselung und vollständiger Listener-/Overlay-Cleanup.
- `ui/pin-marker-view.js`: temporäre `pin-relocation-source`-Klasse am bestehenden Ausgangsmarker; bleibt über Neurenderings konsistent.
- `styles.css`: Fadenkreuz und Pulsanimation, alternative Darstellung für `prefers-reduced-motion`.
- `app.js`: Präsentations-Wiring; beginnt und stoppt Guide/Markierung am richtigen Schritt.
- `application/pin-move-controller.js`: unterscheidet `onExit({committed:false})` beim Abbruch von `onExit({committed:true})` beim erfolgreichen Abschluss. **Nur** bestätigte Vorgänge löschen danach die UI-Selektion.
- `ui/pin-move-preview.js`: bisherige Kandidaten-Vorschau und Bestätigungsleiste bleiben unverändert.
- `sw.js`: `v31`, neue Datei in der obligatorischen Offline-App-Shell.
- `tests/pin-move-guide.test.js`: Maus, Touch, Trennung von Karte/Buttons, Sicherheit und Cleanup.
- `tests/pin-move-controller.test.js`: Abbruch- und Bestätigungszweig mit `committed`-Kennzeichen.
- `tests/browser-smoke.cjs`: Browserprobe für Fadenkreuz, gestrichelte Karte-Linie, blinkenden Ausgangsmarker und geschlossenen Dialog nach Bestätigung.

## Sicherheit / bestehende Architektur

Kein direkter Leaflet-Aufruf in `app.js`; alle Marker und Linien werden über den Map-Adapter erzeugt. Temporäre Pointer-Führung hat keinen Zugriff auf Speichern oder Domänenoperationen. Die Position wird erst nach dem weiterhin erforderlichen Bestätigungsklick persistiert. Bei Abbruch bleiben die ursprünglichen Koordinaten unverändert. Es werden keine neuen externen Dienste eingeführt.

**Teststand:** 11/11 isolierte Guide-/Controller-Tests erfolgreich ausgeführt, neue und angepasste JS-Syntax geprüft, alle 23 lokal eingebundenen Skripte im Offline-Cache vorhanden. Ein vollständiger GitHub-Actions-/Chromium-Lauf mit der endgültigen Version ist separat zu verifizieren.

`main` und die gesicherten Referenzen wurden nicht geändert. Vorschau nach grünem Workflow: https://pin2map.github.io/pin2map-new-test/preview/
