# UI-Erprobung: kreisrunder Button „Pin verschieben“

**Datum:** 2026-11-09 · **Status:** UI-Prototyp im Entwicklungszweig, nicht in `main` oder der geschützten Referenz.

## Konkreter Nutzerwunsch

Der bisherige Textbutton **„Pin verschieben“** wird ersetzt durch **eine ausschließlich kreisrunde, weiße Symbolschaltfläche ohne sichtbaren Text**.

Das projektinterne Kombi-SVG `pin-relocate` zeigt:
- links den **roten** Pin (alte Position, `#cf3444`);
- rechts den **grünen** Pin (neue Position, `#16864f`);
- eine **grau gestrichelte Verbindung** (`#78838c`) zwischen ihnen.

Es orientiert sich an der Lucide-Linienführung (2 px Strichstärke, runde Enden), ist aber bewusst ein pin2map-Spezialicon. Originale Lucide-Icons bleiben die Regel für alle sonstigen Standardfunktionen.

## Umsetzung

- `ui/lucide-icons.js`: `svg("pin-relocate")` erzeugt ein dreifarbiges lokales SVG (36 × 24 ViewBox).
- `index.html`: `#movePin` ausschließlich als Icon-Button mit `data-pin-icon="pin-relocate"`; kein Text im sichtbaren Button. `aria-label` und `title` bleiben **„Pin verschieben“**.
- `styles.css`: kreisrunde Schaltfläche mit **44 px** Durchmesser, weißem Hintergrund, dünnem grauen Rahmen. Der SVG-Inhalt nutzt 34 × 23 px.
- `ui/pin-editor.js`: aktualisiert nur noch `aria-label` und `title`, nicht `textContent`; das Icon bleibt bei jedem Render erhalten.
- `tests/check-pin-editor.mjs` und `tests/lucide-button-design.test.js`: entsprechend angepasst und ergänzt.
- `sw.js`: App-Shell-Version `v30`; das SVG ist Bestandteil der lokal gecachten `ui/lucide-icons.js` und damit offline verfügbar.

## Funktionsverhalten

Die ID `movePin` und der vorhandene Klickhandler bleiben unverändert. Es ändert sich **nur die Darstellung**, nicht die Art, wie eine Position vorgeschlagen, bestätigt, abgebrochen oder gespeichert wird.

## Prüfung und Ausprobieren

Die **4/4 isoliert ausgeführten Icon-Design-Tests** waren erfolgreich (vor dem letzten expliziten No-Text-Testupdate); Syntax der betroffenen JS-Module und Aufnahme aller **22/22** Skripte im Offline-Cache wurden geprüft. Ein erfolgreicher vollständiger CI-/Browserlauf nach der gesamten Änderung ist weiterhin zu verifizieren.

Nach erfolgreichem Workflow `Deploy modular development preview alongside stable site`:
`https://pin2map.github.io/pin2map-new-test/preview/`

Das ist ein **visueller Versuch**: Icon-/Buttongröße und Pin-/Verbindungsform können nach der Sichtprobe noch angepasst werden. Keine Änderungen an `main` oder den gesicherten Referenzständen.
