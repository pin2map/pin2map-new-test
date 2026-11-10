# CSS-Sanierung – Etappe A: Bestandsaufnahme und Referenzvertrag

**Stand:** 2026-11-10 · **Branch:** `feature/leaflet-modular-core` · **Status:** Quellcodeinventur gesichert; Live-Browser-/iPhone-Referenz ist ausdrücklich noch offen.

## Ziel und verbindliche Reihenfolge

Die existierende Darstellung soll **nicht neu gestaltet** werden. Wir beseitigen systematisch CSS-Kaskadenprobleme und dokumentieren eindeutige Zuständigkeiten. Kein bloßes Verschieben sämtlicher alter Regeln in mehrere Dateien. Erst nach belastbarer CSS-Basis folgt als zweites Architekturthema die Bereinigung der zentralen Anwendungssteuerung `app.js`.

1. **A – Inventur und verifizierbare Referenz:** bestehende Selektoren, Media Queries, Überschreibungen, JavaScript-Inlinestyles, Kontrollpositionen und Nutzerabläufe erfassen; mobiles und Desktop-Live-Verhalten dokumentieren.
2. **B – CSS-Vertrag und Tokens:** klares Ownership pro Komponente, globale Variablen und wenige begründete Ausnahmen. Zuerst Kartenbuttons, Kopf-/Suchleiste, Safe Areas.
3. **C – Komponentenmigration:** Suche, Menüs, Panels und Pin-Dialog in kleinen getesteten Schritten; dynamische Pin-Geometrie unverändert erhalten.
4. **D – Marker/Labels sowie restliche Darstellung:** alte Regeln durch die neuen Verantwortlichkeiten ersetzen.
5. **E – Alt-CSS entfernen:** keine konkurrierenden, per Dateireihenfolge kaschierten Regeln stehen lassen.
6. **F – Architekturschutz:** Stylelint/AST-Prüfungen, definierte Ausnahmen, CI-Regeln, tatsächliche Browser-Geometrie- und mobile Regressionstests.

**Gate je App-Änderung:** Syntax-/Modultests + Browser-Regression + nachgewiesen erfolgreiche Preview-Veröffentlichung + Prüfung der **ausgelieferten** Version und geänderten Funktion. Keine Fertigmeldung allein nach einem Commit. Stabiler `main`, Daten und `reference/*` bleiben unangetastet.

## Quellcodeinventur (Messstand vor der Sanierung)

Die aktive Entwicklung lädt **eine** eigene `styles.css` sowie die externe Leaflet-CSS aus `index.html`. Einzelne isolierte Kartenexperimente sind **nicht** Teil der aktiven HTML-Startseite.

| Merkmal | Befund |
|---|---:|
| `styles.css` | 999 Zeilen, 48.103 Zeichen |
| `!important` | 402 Vorkommen |
| `@media` | 16 Vorkommen |
| `.topbar{` | 5 wörtliche Regelanfänge (zuzüglich spezifischer Varianten) |
| `.search-results` | mehrfach in der Kaskade definiert |
| `.panel` | mehrfach in der Kaskade definiert |
| `#layersButton` | 8 Erwähnungen |
| `#layersPanel` | 4 Erwähnungen |
| `#map{` | 6 wörtliche Erwähnungen |

Die Zahlen basieren auf einer reproduzierbaren **Textinventur** und sind weder eine syntaktische CSS-AST-Auswertung noch der Nachweis, dass jede Wiederholung ein Fehler ist. Media-Query-spezifische Überschreibungen können legitim sein; kollidierende aktive Deklarationen müssen später pro Viewport nach der echten CSS-Kaskade geprüft werden. `!important` allein ist kein Fehlerbeweis, ist in dieser Konzentration jedoch ein klarer Wartungsrisiko-Indikator.

Ausführung der Inventur: `node tests/css-inventory.cjs`. Dieses Skript liest nur Dateien; es ändert weder Anwendung noch Styles.

## Bekannte Kaskadenrisiken

- Die Steuerung der `topbar`, Suche und Panels ist über ältere und neuere Styleabschnitte verteilt. Frühere mobile Grid-Regeln und spätere Flex-/Overlay-Regeln koexistieren.
- Die früher unten zentrierte Ebenensteuerung wurde später über spezifischere Selektoren rechts oben platziert; vorhandene Unterseiten-Positionierungen sind weiter im Stylesheet.
- Gemeinsame 42-px-Buttons und die Safe-Area-Baseline sind eingeführt, aber noch nicht vollständig an einer eindeutigen Stelle konsolidiert.
- `!important` und die Kaskadenreihenfolge dienen stellenweise als unbeabsichtigte Architekturgrenze.
- Größere Layoutänderungen lassen sich derzeit nicht durch ausschließlich lokale Komponentenregeln vornehmen.

## Dynamische Geometrie: **nicht** als Alt-CSS löschen

- `ui/pin-panel-positioner.js` setzt per Inline-Styles die dynamischen Pixelkoordinaten und die Breite des Pin-Dialogs/der Dialogspitze.
- `ui/pin-move-preview.js` positioniert die Bestätigungsleiste beim Verschieben.
- `ui/layer-view.js` und `ui/pin-layer-picker.js` setzen individuelle Ebenenfarben.
- `app.js` setzt den Karten-Cursor abhängig vom Verschiebemodus.

Diese Zuweisungen sind teils fachlich notwendig. **Vertrag:** CSS verantwortet Design, Größen und feste Anker; die jeweiligen UI-/Kartenmodule verantworten nur wirklich dynamische Geometrie oder Datenfarben. Für jede verbleibende Inline-Zuweisung dokumentieren, warum sie sich nicht durch eine Klasse oder CSS-Variable ausdrücken lässt.

## Vorgesehene Zuständigkeiten (vorläufig)

`styles/tokens.css` (Designvariablen), `styles/base.css` (Reset/Grundelemente), `styles/layout.css` (Viewport/Safe Areas), `styles/map-controls.css`, `styles/search.css`, `styles/panels.css`, `styles/markers.css`, `styles/utilities.css`.

Die **genaue** Aufteilung folgt erst nach vollständiger Inventur, insbesondere dem effektiven CSS-Kaskaden- und Browserabgleich. Layout-/CSS-Architektur gehört zum bestehenden UI-Modulvertrag und ist kein Anlass für Fachlogikänderungen.

## Noch zu prüfende Live-Referenz – keine voreilige Abnahme

- Aktive Preview-Version und Asset-Version live verifizieren. Quellcode-`sw.js` ist derzeit `pin2map-new-v58`; das ist **kein Nachweis**, dass v58 öffentlich veröffentlicht wurde.
- Screenshots und berechnete Bounding-Rects für iPhone-Viewport (~390×844), kleineren Bildschirm, iPad und Desktop (~1280×800) sichern.
- Oben: Einstellungen und Ebenen auf gemeinsamer Höhe, Suchleiste dazwischen ohne Überdeckung.
- Rechts unten: Info über Kartenwahl; links unten Zoom/Fit; Attribution bleibt sichtbar und nicht von Schaltflächen verdeckt.
- Ebenen-, Karten- und Einstellungsmenüs öffnen/schließen korrekt; Pin-Dialog ist randnah sichtbar, Verschiebevorschau und Bestätigung bleiben bedienbar.
- Safari-Browser und installierte iPhone-PWA gesondert visuell kontrollieren; tatsächlicher iPhone-Test kann nicht durch Chromium simuliert werden.
- Vor CSS-Refactor einen reproduzierbaren Browser-Baseline-Test und optional visuelle Screenshots als Golden Masters aufnehmen. Vorher keine kosmetischen Änderungen am Ausgangslayout.

**Benötigte Nutzerprüfung, sobald die tatsächliche Preview-Version feststeht:** iPhone Safari + installierte PWA jeweils oben (drei Elemente) und unten (Buttons/Attribution), danach Ebenendialog und randnaher Pin-Dialog. Unterschiede per Screenshot melden. Dieser Schritt wird gezielt angefragt und nicht als schon erfolgreich behauptet.

## Qualitätsschutz nach der Sanierung

1. Ein Eigentümer pro Komponenten-Selektor; keine zusätzlichen Overrides am Ende globaler Dateien.
2. Zentrale Tokens für Farben, Dimensionen, horizontale Anker, z-index-Schichten und Safe-Area-Abstände.
3. Responsive Varianten unmittelbar beim zuständigen Komponentenmodul; so wenige Breakpoints wie möglich.
4. Neue globale Selektoren und `!important` standardmäßig untersagt, begründete Leaflet-/Browser-Ausnahmen dokumentiert.
5. CI prüft nicht nur CSS-Textmuster, sondern über Parser/Stylelint deklarierte Zuständigkeiten und echte Browser-Kaskaden-/Geometrieeffekte.
6. Jede Etappe liefert **eine nachweislich getestete und veröffentlichte Preview-Version**; bei Fehlschlag bleibt die Etappe offen.

## Zweites Architekturthema nach CSS-Abnahme

Die weitere Bereinigung von `app.js` (Kompositionswurzel, UI-Events, Zustands- und Persistenzkoordination) folgt **erst nachdem die CSS-Sanierung vollständig abgenommen ist**. Das Thema ist als nächste Priorität vorgemerkt; während CSS-Etappen keine ungeprüfte gleichzeitige Umstrukturierung der Anwendungssteuerung.

## Sichtabnahme der bisherigen Darstellung durch den Auftraggeber (2026-11-10)

**Befund: visuelle Referenz ausdrücklich bestätigt.** Der Auftraggeber hat vier Screenshots der Entwicklungsvorschau unter https://pin2map.github.io/pin2map-new-test/preview/ für Desktop, iPhone und iPad bereitgestellt und erklärt: „Ja, auf allen Geräten entspricht die Darstellung meinen Vorstellungen.“

Folgende Elemente werden **als bestehende, zu bewahrende Darstellung** festgehalten:

- **Oben:** Einstellungs-Button links; Suchfeld dazwischen; Ebenen-Button rechts. Zahnrad und Ebenen-Button befinden sich auf derselben Höhe.
- **Ebenenpanel:** Rechtsbündig zum Auslöser; auf kleineren mobilen Viewports ausreichend breit und innerhalb der sichtbaren Kartenfläche, mit weißem Hintergrund, Schließen-Schaltfläche, Ebenenliste und „Neue Ebene“.
- **Unten:** Zoom-/Fit-Tasten links; Info-Taste oberhalb der Kartenwahl rechts; Leaflet-/OSM-Attribution sichtbar am Kartenrand.
- **Unterschiedliche Viewports:** Breite Desktopansicht, iPhone-Safari, iPhone ohne sichtbare Safari-Browserleisten (PWA-/Vollbildansicht) und iPad-Ansicht. Der Wechsel zwischen Straßen- und Topografiekarte ist visuell kompatibel.
- **Wichtig:** Unterschiede in angezeigten Pins und Kartenausschnitten auf den Screenshots stammen von unterschiedlichen lokalen Datensätzen bzw. Viewport-Ständen und sind **keine** CSS-Zielvorgabe.

**Abnahmeumfang:** Dies ist eine **manuelle, visuelle Freigabe** des vom Nutzer gesehenen Layouts. Nicht belegt sind die exakte ausgelieferte Service-Worker-Version, der Erfolg eines aktuellen GitHub-Actions-Laufs, eine automatisierte Live-Prüfung aller Interaktionen oder die Zukunftssicherheit der CSS-Regeln. Diese Nachweise werden nicht aus Screenshots abgeleitet.

**Konsequenz für Etappe B:** Die Sanierung verändert *nicht* die gewünschten Positionen, Farben, Buttonmaße oder Dialoggrößen. Jede Abweichung bedarf einer ausdrücklichen neuen Entscheidung. Vor einem größeren Abbau von Overrides die aktuellen Positionen in Chromium als tatsächliche Geometrie erfassen; für iPhone-spezifische WebKit-Effekte bleibt die obige Nutzerabnahme maßgeblich.
