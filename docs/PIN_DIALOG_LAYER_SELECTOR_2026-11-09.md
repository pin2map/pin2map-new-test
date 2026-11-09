# pin2map NEW – Ebenenauswahl im Pin-Dialog

**Stand:** 2026-11-09 · **Status:** Entwicklungsversuch · **Entwicklungszweig:** `feature/leaflet-modular-core`

## Gewünschte Darstellung

- Kleinere Schrift für die Auswahl der Pin-Ebene: **13 px**.
- **Farbkreis (12 px)** vor jedem Ebenennamen, entsprechend `layer.color` aus den Projektdaten.
- Pro auswählbarer Ebene eindeutiger Status **„Sichtbar“** oder **„Ausgeblendet“**.
- Derselbe Aufbau auch im geschlossenen Auswahlfeld für die aktuell zugewiesene Ebene.
- Weder die Sichtbarkeit noch die Ebene selbst wird allein durch Öffnen der Liste verändert.

## Technische Umsetzung

Der bisherige native `select#pinLayer` bleibt als **einzige Schnittstelle für den Ebenenwechsel** und bestehende Anwendungsereignisse erhalten, wird aber nicht mehr unmittelbar angezeigt. Die Darstellung übernimmt `ui/pin-layer-picker.js`, ein reines UI-Modul ohne Zugriff auf Projektlogik, Kartenrenderer oder Speicherung. Es erzeugt DOM-Knoten mit `textContent`, nicht aus dynamischen HTML-Zeichenfolgen.

Beim Auswählen eines Eintrags aktualisiert das Modul den Wert des bestehenden Selects und löst dessen vorhandenes `change`-Ereignis aus. Die bestehende Zuweisungslogik prüft und speichert weiterhin die Ebene des Pins. Sichtbarkeitsstatus und Farben werden aus `state.layers` bei jedem Rendering neu übernommen.

Die Auswahlliste ist über Button und Tastatur erreichbar und lässt sich mit Escape oder einem Klick außerhalb schließen. Die gesamte Darstellung ist auf den Pin-Dialog begrenzt und verändert nicht die übrigen Karten- und Layer-Steuerelemente.

## Tests / Veröffentlichung

- **3/3 gezielte Tests** des neuen UI-Moduls bestanden: Farbdarstellung und Sichtbarkeitsstatus, Zuordnung mit einmaligem Change-Event, Abbruch ohne Zuordnung.
- Syntax der geänderten JS-Dateien geprüft; sämtliche **24** lokalen Anwendungsskripte sind im Offline-App-Shell-Cache enthalten.
- Service Worker: `pin2map-new-v36`. Visuelle Prüfung auf tatsächlichen Geräten und kompletter CI-Lauf stehen noch aus.
- `main` und Referenzstände sind unverändert.

Vorschau nach erfolgreicher Veröffentlichung: https://pin2map.github.io/pin2map-new-test/preview/
