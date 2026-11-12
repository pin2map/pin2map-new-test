# v157 – verbindlicher Umsetzungsauftrag: Pin-Dialog, Wetter, Marker und iPad-Editor

**Status:** GEPLANT / NICHT IMPLEMENTIERT  
**Ausgangsbasis:** v156, `feature/leaflet-modular-core`  
**Referenz:** Screenshots aus dem Nutzerfeedback 2026-11-12; bestätigte Ebenenauswahl und mobile iPhone-Notizbedienung bleiben erhalten.  
**Ziel:** Berechenbare, elegante, verlässlich klick- und tastbare UI statt neuer ad-hoc-Overrides.

## 1. Verbindliche UI-Entscheidungen

### 1.1 URL-Popup horizontal ausschließlich über dem Pin-Dialog

- `#pinUrlBlock` bleibt ein unabhängiges DOM-Portal; **seine x-Position wird ausschließlich aus `#pinPanel.getBoundingClientRect()` und dem Visual Viewport berechnet**, nicht aus `#pinUrlButton.getBoundingClientRect().left` und nicht aus freiem Platz links/rechts.
- `popupWidth = min(260px, panel.width - 2×panelInnerMargin, viewport.width - 2×viewportMargin)`; `popupLeft` innerhalb `[panel.left + margin, panel.right - popupWidth - margin]`, zusätzlich innerhalb des sichtbaren Viewports. Eine erlaubte Standardausrichtung ist rechtsbündig **innerhalb** des Panels (wie auf dem akzeptierten iPhone-Screenshot).
- Vertikal: Popup überlagert den Notizbereich, nahe dem unteren Aktionsbereich und mit Priorität auf vollständiger Sichtbarkeit. Auf kleinen Geräten darf es oberhalb der Footerbuttons vor der Notizfläche schweben. Bei Keyboard/Viewportänderung neu innerhalb des *sichtbaren* Viewports einpassen; keine Popups oder Aktionsbuttons unter der Tastatur.
- Notizdaten, Mehrzeilen-Textarea, URL-Protokollregeln, OK/„URL öffnen“, Statuspunkt und blauer aktiver URL-Button bleiben erhalten. Ebenen-Popup darf nicht verändert werden, außer wenn ein gemeinsam getesteter Positionierungshelfer sinnvoll ist.
- Kein seitlicher Popup-Ausbruch, keine horizontale Scrollleiste. Auf den Testgrößen 320, 375, 768 und 1280px explizit den Überlappungsbereich und die Panelgrenzen messen.

### 1.2 Dialog-Button-Hover und Symbolstrichstärke

- Ein zentraler **dialoglokaler CSS-Eigentümer** regelt Hover für `#pinPanel` und seine Dialog-Familie; keine neuen globalen Overrides. Für `@media(hover:hover) and (pointer:fine)`:
  - normale helle **und** farbige, aktivierte Buttons: Hover-Hintergrund einheitlich dunkelgrau (vorgeschlagen `#52606d`), Vordergrund und Lucide-Strokes weiß;
  - inklusive rotem Pin-Löschen, blauem Navi-`+`, Ebenenauswahl, URL, Wetter, grüner OK-Schaltfläche;
  - **deaktivierte** Buttons behalten ihren deaktivierten Zustand, keine irreführende Hover-Reaktion;
  - `:focus-visible` bleibt unabhängig klar erkennbar; Touch hat **keinen** künstlich festhängenden Hover-Stil.
- Spezifische alte Regeln wie `button.p2m-icon-control:not(#searchButton):hover` und `.pin-actions button:hover` auf Konflikte prüfen und **im ursprünglichen Eigentümer** ersetzen oder so begrenzen, dass keine weiß-auf-weiß-Kombination entstehen kann.
- Lucide-SVG-Piktogramme in Dialogen einheitlich auf ca. **1.7–1.9** Stroke-Width kalibrieren, mit notwendigen Ausnahmen für sehr kleine Konturen und gefüllte Markenlogos. Icon-`viewBox` und zentrierte Iconbox bleiben unverzerrt; kein pauschales `transform: scale()`.
- Testfälle für alle Grund- und Aktivfarben: Kontrast bei Hover, Mouseout, disabled, Fokus und wechselndem Popup-Zustand (visuelle Screenshots plus `getComputedStyle`).

### 1.3 Wetteransicht: überlagern statt den Dialog höher machen

- Die Vorgänger-Wetteransicht ist die **visuelle Referenz**: Der Wetterinhalt ersetzt den **gemeinsamen mittleren Bereich aus Navigationsgruppen und Notizen**, nicht nur das Notiz-Textarea mit zusätzlicher Höhe.
- `Pin Name` und untere Kernfunktions-Buttons bleiben an ihrem Platz. Beim Wechsel zur Wetteransicht sind `Navi extern` und `pin2map Routing` optisch **ausgeblendet** und der gesamte Platz gehört der Wetterfläche; Rückschalten zeigt die Navigationsgruppen und Notizen ohne Verlust der Eingabe.
- Konstante/geprüfte Dialogaußenhöhe bei Wechsel (außer bei sehr knappem sichtbaren Viewport); Wetterfläche besitzt gut nutzbare Höhe zwischen Kopf und Footer, darf **weder den gesamten Dialog nach oben verschieben noch andere Bereiche abschneiden**.
- Wetter bleibt ausschließlich Platzhalter, keine API, keine Prognose, keine erfundenen Daten; die vorhandene Schaltfläche `thermometer-snowflake` toggelt und erhält blaue Aktivdarstellung.

### 1.4 Mobiler Notizeditor: iPhone beibehalten, iPad auflockern

- Die **akzeptierte iPhone-Darstellung v156** bleibt bis auf Fehlerkorrekturen unverändert; die untere Aktionsleiste befindet sich direkt über der Systemtastatur.
- Auf iPad/Tablet-Touch bei eingeblendeter Tastatur **zusätzlicher komfortabler Abstand** (z. B. 12–20px, nach Gerätetest justieren) zwischen Buttonleiste und Tastaturoberkante; kein vergeudeter großer Leerraum und kein Absinken hinter die Tastatur.
- `ui/pin-note-editor.js` bleibt Eigentümer von `visualViewport`-/Keyboard-Layout, UI-Fokus, Datum/Zeit/Fertig. Nur eine eng begrenzte Klasse oder Layoutvariable für Tablet-Korrektur; keine Duplikat-Editorlogik. Desktop-Großeditor bleibt unverändert.

### 1.5 Kleinerer Pin und dreiteiliger Innenkreis anstelle externer Badges

- **Reale sichtbare Pin-Silhouette gegenüber 36×46px weiter verkleinern**, kräftige breite Tropfenform behalten; **Finger-Trefferfläche getrennt davon mindestens 44×44 CSS-Pixel** und mit dem Leaflet-Adapter abgestimmt. Ausgangsvorschlag zur Browserbeurteilung: **30×40px sichtbare Form**, 44×44px interaktive Fläche. Die endgültige Größe anhand Preview-Screenshots und Nutzertest kalibrieren.
- **Alte externe Statusbadge-Spalte vollständig entfernen.** Stattdessen den Innenkreis als **dreiteiligen Mercedes-Stern** mit drei gleichwertigen Sektoren zeichnen:
  - **oben links rot** = Notiz vorhanden;
  - **oben rechts blau** = URL vorhanden;
  - **unten grau** = GPX-Zuordnung vorhanden.
  - Der Nutzer hat versehentlich zweimal „rechtes oberes Segment“ verwendet; oben links = Notiz und oben rechts = URL ist die konsistente Platzierung. Vor der Implementierung an einer genauen Grafik kurz bestätigen lassen, falls sich die Position nicht eindeutig aus den letzten Bildern ergibt.
- Jedes Segment wird nur bei vorhandenem Inhalt farbig, sonst bleibt es hell-neutral. **Dünne weiße Trennlinien** zwischen Sektoren und eine **dünne weiße Kreisumrandung** gegenüber dem Pin-Körper; möglichst auch im ungefüllten Zustand visuell unterscheidbar (neutraler Hintergrund statt reines Weiß).
- Notiz/URL/GPX-Flags weiterhin **nur aus bestehenden Pin-Daten abgeleitet**; niemals neue persistierte Statusflags, keine Änderung der Pin-ID, keine IndexedDB-Migration.
- Höhenlabel/elevation overlay im `map-adapter-leaflet.js` etwas weiter **nach oben** setzen, dauerhaftes Namenslabel separat auf Kollisionen prüfen. Pin-Tropfen, Segment-Kreis, Höhenlabel, Namenslabel und ggf. weitere obere Info müssen bei ausgewähltem/unselektiertem Pin auf iPhone und Desktop lesbar bleiben.
- Tests: 8 Kombinationen aus 3 booleans (0–7), Markerfarben/Selected-State, 44px Touch-Hitbox, Tooltip-/Elevationsabstände, mehrere nahe Pins und dynamische Note/URL-Änderungen.

## 2. Technische Umsetzung nach Eigentümern

| Bereich | Bisheriger Eigentümer | Geplante Änderung |
|---|---|---|
| URL-Positionsberechnung | `ui/pin-details.js` | horizontale Panel- statt Trigger-Klammerung; vertikale Keyboard-Sicherheit |
| URL-Popup-Styles | `styles.css` `#pinUrlBlock` | nur bedarfsgerechte Größen-/Positionierungsdetails |
| Wettermodus | `ui/pin-details.js`, `index.html` | Navi und Notizen als gemeinsamer austauschbarer Mittelteil; Wetter überlagert diesen Bereich |
| Pin-Dialog-Hover | `styles.css` `#pinPanel` und bestehende Buttonregeln | gemeinsamer Hover- und Fokus-Vertrag, konkurrierende Vorgängerregeln im Eigentümer entfernen |
| Lucide | `ui/lucide-icons.js` + Dialog-CSS | Konturen/Strichstärken ohne Formverzerrung korrigieren |
| iPad-Editor | `ui/pin-note-editor.js` + lokales CSS | tablet-spezifische Keyboard-Reserve; iPhone und Desktop schützen |
| Pin-SVG / Status | `ui/pin-marker-view.js` | segmentierter Kreismarker statt `pin-status-column` |
| Marker-Hitbox / Labels | `map-adapter-leaflet.js` | kompakter visuell, unabhängig ausreichend treffbar, Höhe-/Namenslabel versetzen |
| Komposition | `app.js` | nur benötigte UI-Callbacks verdrahten; keine Leaflet-/Persistenzlogik hinein |
| Regression | bestehende Tests + `tests/pin-dialog-visual.cjs` | Zustandsmatrix, Positionen, Hover, Tastatur, Tooltip, Marker-Segmente |

**Architekturschutz:** `main`, `reference/*`, Vorgänger-App, `domain/`/Pin-Datenschema, IndexedDB-Version, Offline-OSM-Kacheln, Server/Sync, bestehende Ebenenauswahl und GPX-/Wetter-Provider **nicht ändern**. Keine neuen Laufzeitmodule, sofern die bestehenden klaren UI-Eigentümer genügen. CSS-B38 bleibt pausiert und der geltende `!important`-Budgetrahmen bleibt verbindlich.

## 3. Inkremente und Abnahmekriterien

### v157-A – Dialog-Bedienbarkeit (kleine risikoarme Korrektur)

1. URL-Popup horizontal ins Pin-Panel klemmen und an die tatsächliche sichtbare Bildschirmfläche anpassen.
2. Gemeinsame Dialog-Hover-Farben inkl. sauberem Icon-Weiß und feinerem Lucide-Stroke.
3. iPad-Tastaturabstand im Note-Editor, ohne iPhone-/Desktop-Regression.
4. Node-/Architektur-/Chromium-Screenshots (inkl. Hover, URL/Keyboard, iPad), Deploy + HTTPS-Live-Validierung.

### v157-B – Wetter und Markerstatus (visuell separat prüfbar)

1. Wetter überlagert mittleren Navi-/Notizbereich, Footer und Name bleiben fix.
2. Marker proportional verkleinern, aber Touchziel mindestens 44px; externes Badge-System entfernen.
3. Dreifach-Segment-Status (oben links Notiz rot, oben rechts URL blau, unten GPX grau) und Höhenlabel über dem Pin.
4. 8 Statuskombinationen und dichte Pin-/Label-Szene in Chromium prüfen; echte gerenderte Screenshots vor Nutzerabnahme kontrollieren.
5. Alle zuvor bestandenen Funktionen erneut **automatisiert** regressionsprüfen; nur die neuen visuellen/Touch-Fragen beim Nutzer abfragen.

### Technisches Abschlussgate für jede veröffentlichte Stufe

- **Node-Tests grün**, Architektur- und CSS-Verträge bestanden.
- **Echter Chromium-Lauf**, nicht nur Code-/CSS-Syntax; Screenshots mindestens 320×568, 375×667, 768×1024 und 1280×800.
- Popup muss vollständig **in horizontaler Ausdehnung des Pin-Dialogs** und im sichtbaren Viewport liegen; kein zusätzlicher horizontaler Scrollbalken.
- Dialog-Button-Hover mit `getComputedStyle` und Screenshot: dunkelgrau/weiß, keine weißen Linien auf hellem Hintergrund.
- Wetterwechsel: Pin-Name und Footer behalten messbar ihre Bildschirmposition; Navi und Notizen sind nur im Notizmodus sichtbar; keine Datenverluste.
- Pin: Position, Touchhitbox, Segmentfarben, obere Info, Namenslabels und überlappungsfreie Darstellung in allen Statuskombinationen.
- Reale App vom GitHub-Pages-HTTPS-Preview starten, laden, reloaden und neu eingeführte Ansichten prüfen. GitHub-Actions-Artefakte/Screenshots verifizieren. Deployment fehlgeschlagen = **offen**, kein Abschluss.
- Reale Safari-iPhone-/iPad-Tastatur-/Touch-Abnahme zusätzlich, nicht durch Emulation behaupten.
- Verbindliche Dokumente (Projektstatus, Grundentscheidungen, Modulararchitektur, CSS-Regeln) pro freigegebenem Inkrement nachziehen.

## 4. Bewusst außerhalb v157

Keine Flächen-/Seen-/Flusssuche; keine GPS-Routenlogik; keine GPX-Dateiverarbeitung; keine Wetter-API; keine Datenmigration; keine Neugestaltung der bereits bestätigten Ebenenauswahl.

**Status dieser Datei:** Der Auftrag ist formuliert, aber v157 ist **noch nicht implementiert, getestet oder veröffentlicht**.
