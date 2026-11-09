# Modularisierung – Karten- und Pin-Gesten (2026-11-09)

**Entwicklungszweig:** `feature/leaflet-modular-core`. Kein Merge nach `main`, keine Änderung an der geschützten Leaflet-Referenz.

## Ziel und Umsetzung

Die bisher in `app.js` vorhandene Pointer- und Langdrucksteuerung wurde nach **`ui/map-gesture-controller.js`** übertragen. Der Controller kapselt:
- Lange Kartenberührung (650 ms), Bewegungstoleranz, Mehrfinger-Schutz und alternativ Desktop-Kontextmenü.
- Pin-Berührung und langes Drücken (550 ms) mit Zoom 18/14 und Topokarten-Maximum 17; kein direktes Pin-Dragging.
- Unterdrückung von Folge-Klicks, überlappenden Eingaben und doppelten Aktionen, Wiederherstellung des Karten-Pannings nach Pin-Ereignissen.
- Touch-/Pen-Erkennung und Schutz vor iOS-synthetisiertem Kontextmenü.

`app.js` bleibt für fachliche Aktionen verantwortlich: Pin erstellen/auswählen, Karte und Labels neu rendern, Viewport persistieren. Der Controller bekommt ausschließlich **abstrakte Kartenadapter-Methoden**, Callback-Funktionen sowie einen Zeitgeber-/Vibrationsport. Insbesondere enthält er keine Leaflet-`L`-Aufrufe, keine IndexedDB-, HTTP- oder Projektdomänen-Abhängigkeiten.

**Integration:** `index.html` lädt den UI-Controller vor `app.js`; `app.js` verbindet den Controller nach Karteninitialisierung mit dem Leaflet-Adapter und gibt die UI-Callbacks hinein. Im bisherigen `app.js` entfielen ca. 123 Zeilen langdruckbezogener Gestenlogik. Karten-/Marker-Eventhandler prüfen jetzt die Statusabfragen des Controllers statt globale Gestenzustände.

**PWA-Offline:** `sw.js` Cache-Version `pin2map-new-v21` ergänzt `ui/map-gesture-controller.js` zum obligatorischen Offline-App-Shell-Cache. Kartendienst- und Tile-Cache-Policy unverändert.

## Prüfungen / offene Qualitätsgates

- Neu: `tests/map-gesture-controller.test.js` mit sieben deterministischen Fällen: Kartengedrückthalten, Bewegungsabbruch, Mehrfinger- und Verschiebemodus-Schutz, Marker-Tap mit Wiederaktivieren des Karten-Pannings, Zoom 18/14, Topografie-Zoomlimit, Markerbewegungsabbruch.
- Statische Repository-Kontrolle bestätigt: Alle von `index.html` eingebundenen lokalen JS-Dateien stehen in der Offline-Cacheliste; keine Leaflet-Globals im Gestencontroller und keine Alt-Gestenfunktionen in `app.js`.
- Der bestehende Workflow `.github/workflows/modular-core.yml` soll Syntax und Node-Regressionstests ausführen.
- **Noch offen und nicht als bestanden ausgeben:** erfolgreicher CI-Lauf sowie praktischer Test im Browser und auf iPhone/iPad (Touch, Multi-Touch, langes Drücken, Pin-Zoom, Karten-Zoom und PWA-Offline-Neustart).

## Nächste Trennstelle

Die visuelle Pin-/Marker-Platzierung, Label-Kollisionslogik und Pin-Verschiebevorschau sind weiterhin teilweise in `app.js` konzentriert. Als nächstes **separates, testbares Pin-Overlay-/Preview-Modul** erwägen. Dabei Pin-Fachregeln unverändert belassen und die Schnittstelle zum Map-Adapter respektieren.

Spätere Routing-, Gewässer-, Wetter- und weitere Filterdetails werden durch diesen Schritt nicht vorweggenommen.
