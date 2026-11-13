# CSS-Architekturregeln – pin2map NEW

**Status:** verbindlicher Migrations- und Entwicklungsvertrag für den Branch `feature/leaflet-modular-core` (10.11.2026). Die vorhandene Oberfläche gilt als Referenz, nicht die Historie ihrer CSS-Overrides.

## Grundprinzip

**Eine Zuständigkeit pro Eigenschaft und Komponente.** Ältere, überholte Deklarationen werden an der Quelle entfernt; neue visuelle Änderungen dürfen nicht als weitere pauschale `!important`-Overrides am Dateiende angehängt werden.

Die derzeitige Datei `styles.css` ist noch ein Übergangszustand und enthält historische Ausnahmen. Sie wird komponentenweise konsolidiert, ohne das bestehende, manuell abgenommene UI zu verändern.

## Zuständigkeiten

| Bereich | Zentrale Festlegung | Erlaubte Ausnahmen |
| --- | --- | --- |
| Runde Kartenbuttons | `--p2m-map-circle-size` und gemeinsamer Map-Control-Vertrag | Buttonposition, semantische Farben; keine eigenen Durchmesser |
| Suchbutton innerhalb der Suchkapsel | 42px große Antippfläche (`--p2m-search-tap-size`), davon unabhängiger 30px-Sichtkreis (`--p2m-search-ring-size`) über `::before`, Lupensymbol 18px (`--p2m-search-icon-size`) | Nur der Ring wird optisch kleiner; die Antippfläche bleibt gut bedienbar. Der Button ist kein Mitglied des allgemeinen Map-Button-Selectors |
| Untere Kartenbuttons | `--p2m-bottom-control-baseline` | Seitlicher Abstand und eigenständiges Karten-Credit-Layout |
| Obere Eckbuttons | `--p2m-top-corner-inset`, `--p2m-top-corner-offset` | Mobile Werte desselben Tokens |
| Suchkapsel zwischen Eckbuttons | `--p2m-top-search-clearance` | Inhalt, Suchergebnisse |
| Pin-Dialog-Aktionen | `--p2m-pin-dialog-action-size`, gemeinsamer `#pinPanel button:is(...)`-Vertrag | Löschen-/OK-Farben, Icon und Zustandsdarstellung |
| Panels/Ebenenliste | bestehende, abgenommene Endregeln | Anpassungen nur mit gezieltem Vertrags- und Browsertest |

**CSS-Besitzregeln:** Ein Modul darf nur seine Darstellung steuern. Fachliche Zustände gehören in das Zustands-/Anwendungsmodell; CSS darf auf explizite Zustandsklassen/Attribute reagieren. Inline-Styling ist auf wirklich dynamische, geometrische Laufzeitwerte zu begrenzen und muss explizit dokumentiert werden.

## Änderungen und Tests

1. **Vorher** die aktuell wirksame CSS-Regel anhand Selektorspezifität, `!important`, Reihenfolge und Media Queries bestimmen. Gleichnamige Selektoren sind nicht automatisch gleich wirksam.
2. Redundante Deklarationen **entfernen statt überlagern**. Bestehende Tokens benutzen, keine zweite Token-Definition erstellen. Semantische Ausnahmen explizit erhalten.
3. Einen fokussierten Regressionstest für die geänderte Zuständigkeit hinzufügen. Bestehende CSS-Tests müssen weiter bestehen; `tests/css-design-token-ownership.test.js` schützt zentrale Token und bereits entfernte Altwerte.
4. `tests/css-debt-budget.test.js` verbietet das stille Wachstum der `!important`-Altlasten (aktuelle Grenze: **298**). Den Grenzwert nach verifizierter Bereinigung senken; niemals nur zur Beschwichtigung eines Fehlers erhöhen.
5. GitHub Actions führt `node --test tests/*.test.js` aus. Ein gespeicherter Test ist **kein Nachweis für einen erfolgreichen CI-Lauf**. Bei Änderungen an `styles.css` auch die Service-Worker-Releasekennung fortschreiben, die öffentliche Preview-Datei verifizieren und die betroffenen Geräteansichten prüfen.
6. Manuelle iPhone-, iPad- und Desktop-Freigaben, CI-Erfolg, HTTPS-Auslieferung und aktiver Service-Worker-Stand sind **getrennt zu dokumentieren**. Das letzte iPhone-OK ersetzt keine technische Versionsermittlung.

## Status der CSS-Sanierung und Übergabe an die Anwendungsarchitektur

**Beschluss 2026-11-11: CSS-Arbeit nach B38/v100 vorläufig pausiert, nicht als abgeschlossen bewertet.** Die bislang wirksamen Komponentenverträge, die Oberflächenreferenz und das `!important`-Budget von **298** bleiben verbindlich. Bis zur Wiederaufnahme keine neuen CSS-Overrides ohne fachlich/visuell begründete Notwendigkeit; bei Änderungen weiterhin Eigentümer-/Regressionstests und reale Preview-Freigabe.

Eine **vollständige CSS-Abnahme** erfordert weiterhin: dokumentierte Eigentümer der Komponentenregeln, keine ungeklärten konkurrierenden Regeln, bestandene automatische Tests, verifizierte Preview sowie erneut bestätigte Layouts für iPhone, iPad und Desktop. Diese Bedingungen sind **noch nicht erfüllt bzw. nicht nachgewiesen**.

**Geänderte Arbeitsreihenfolge:** Statt auf vollständige kosmetische CSS-Bereinigung zu warten, wird nach nachzuholender technischer Baseline-Prüfung die inkrementelle Entflechtung von `app.js` als nächstes Architekturthema aufgenommen. Die Änderbarkeit des Codes hat Vorrang; größere CSS-Umstrukturierung und `app.js`-Refactoring werden nicht gleichzeitig vorgenommen. Die CSS-Komplettsanierung bleibt ein offener späterer Arbeitsauftrag.

Die Vorgänger-App dient als funktionale und visuelle Referenz, nicht als Quellcode- oder CSS-Architekturvorlage. Die stabile Anwendung auf `main` bleibt unberührt.

## Audit- und Vorbereitungsbaseline v148 (2026-11-12)

Die aktuelle `styles.css` ist für die Architektur-Stabilisierung **nicht** verändert worden: **293** `!important`-Vorkommen bei weiter gültigem Limit **298**. B38 bleibt bewusst **pausiert**, die vollständige visuelle CSS-Abnahme ist weiterhin offen. Ein niedrigerer Grenzwert ist erst nach einer tatsächlich getesteten Komponentenbereinigung legitim.

**Pflicht vor einer größeren Feature-UI:** betroffene CSS-Eigentümer ermitteln (bereits wirksame Selektoren und Media Queries), bestehende Tokens/Map-Button-Verträge beibehalten, keine neue globale Kaskadenebene und keine zusätzlichen `!important`-Regeln, sondern nur für das Feature relevante Komponentenregeln an ihrer Quelle konsolidieren und mit gezielten Node-/Chromium-/Geräte-Gates prüfen. Ein allgemeines Refactoring ohne konkreten visuellen oder funktionalen Bedarf bleibt unzulässig. Für die Preview-Paketgrenze gilt `docs/ARCHITEKTUR_STABILISIERUNG_2026-11-12.md`.


## v149 – gezielte Konsolidierung des Pin-Dialog-Eigentümers (2026-11-12)

Für den sechsteiligen Button-Footer wurde der bisherige expandierende Ebenenselektor am bestehenden Eigentümer in einen runden Trigger überführt. Die weggefallenen, spezialisierten Picker-Overrides wurden im ursprünglichen Regelbereich entfernt; neue Regeln für Notizfeld, Datum, URL und Buttons bleiben in der `#pinPanel`-Komponente. Die textuelle `!important`-Zahl beträgt im v149-Quellstand **260** statt 293; das bestehende konservative Testbudget **298** wird vor einer vollständig bestätigten Veröffentlichungs-/Geräteabnahme nicht eigenmächtig geändert. CSS-B38 und die übrige sanierungsbedürftige CSS-Architektur bleiben pausiert; daraus folgt **keine** neue allgemeine CSS-Freigabe. Auf iOS sind für editierbare Notizen und URL 16 px gegen Eingabezoom vorgesehen.


## v151 – reparierte CSS-Eigentümerschaft für Pin-Dialog (2026-11-12)

Der misslungene sichtbare v149-Pin-Dialog beruhte insbesondere auf einer alten `.pin-panel`-Regel mit `max-height:min(320px,... )!important` und `overflow-y:auto!important`, die trotz neuer Komponentenstile den Scrollbalken erzwang. Diese alte Vorschrift wurde **an der ursprünglichen Quelle entfernt**, ebenso alte `!important`-Regeln für alle Pin-Labels und die 15px-Namenseingabe. Die mobile Basishöhe richtet sich nun nach der tatsächlichen Komponente; nur auf extrem flachen Viewports ist kontrolliertes vertikales Scrollen vorgesehen.

Der neue `#pinLayerMenu` ist eine durch `ui/pin-layer-picker.js` an `document.body` gehängte, feste Viewport-Überlagerung mit eigenen Stilen und alleiniger innerer vertikaler Listen-Scrollbarkeit bei acht oder mehr Ebenen. Die übrigen lokalen Dialogstile bleiben `#pinPanel`-bezogen. Einziger Größen-Token `--p2m-pin-dialog-action-size:38px`, nicht pro Breakpoint neu zu definieren. `!important` im aktuellen Quellstand: **245** gegenüber v149 **260** und dem weiterhin gültigen Höchstbudget **298**. Die generelle CSS-Sanierung B38 bleibt pausiert; die Bereinigung gilt nur diesem Dialog.

`tests/pin-dialog-visual.cjs` ist verbindlicher Browser-Gate für kompakte 320/375px und 768px Gerätebreiten, normale Notizen, URL und eine lange achtteilige Ebenenliste; Screenshots sowohl aus dem Node/Chromium-Workflow als auch von der tatsächlich veröffentlichten Preview. Ein grüner Strukturtest ohne sichtbares Browserlayout genügt für Dialogänderungen nicht mehr.


## v153 – geschlossene Pin-Dialog-CSS-Eigentümerschaft (2026-11-12)

Der Standarddurchmesser **38px** ist **einmal** unter `:root{--p2m-pin-dialog-action-size:38px}` definiert; der gemeinsame komponenteneigene Größenvertrag umfasst rote Löschen-Aktion, fünf neue deaktivierte Navigations-/Routing-Aktionen, sechs Footer-Aktionen und drei URL-Popup-Aktionen. Render-/Hitbox- und SVG-Größen sind getrennt: Icon-SVGs haben ein unverändertes `viewBox`; kein Font-Glyph-Zwang. Die Fieldset-`legend`-Regeln liegen in `#pinPanel`, URL-Popup-Regeln in `#pinUrlBlock.pin-url-popup`. Die korrigierte Touch-Typografie verwendet dieselbe Selektor-Spezifität wie das Basisnotizfeld (`#pinPanel .pin-detail-region #pinNotes`) und erzwingt 16px.

Der zugrunde liegende, visuell fehlgeschlagene v149-/v151-Prototyp wurde **nicht** mit neuen pauschalen Override-Schichten repariert: Alte abweichende Beschriftungen/Dimensionen wurden am bisherigen Komponenteneigentümer ersetzt; die normale Kartenmarker- und Namenslabel-Sichtbarkeit ist keine verhandelbare Nebenwirkung des Dialogs. `tests/pin-dialog-visual.cjs` und die bestehende Chromium-Regression messen die echten 38px-Geometrien, 106px Notizfeldhöhe, komplett inaktive Routingzeile, URL-Popup im sichtbaren Viewport und sichtbare übrige Pins/Labels auf 320px, 375px und iPad und archivieren gerenderte Screenshots. **Die allgemeine CSS-Sanierung B38 bleibt weiterhin pausiert**; das ursprüngliche Budget max. 298 `!important` gilt weiterhin.


## v154 – gezielter Pin/URL-Stil und Textfeld-Platzierung (2026-11-12)

Die sichtbare Pin-Metazeile wurde samt ihrem bestehenden lokalen CSS-Eigentümer entfernt. Die Navigation nutzt `#pinPanel .pin-navigation-row` mit größerem oberem/unterem Abstand; es entstehen keine weiteren Layout-Zeilen. Für URL-Eingabe gilt allein `#pinUrlBlock`: rechts verankerte `fieldset legend` „Pin-URL“, 75px hohes, dreizeiliges `textarea` mit Umbruch, zwei rechteckige, rechtsbündige Buttons. Der bisherige URL-Kreisbutton-Selektor ist am eigenen CSS-Eigentümer entfernt, **die einheitlichen 38px-Kreise im eigentlichen Pin-Dialog bleiben unberührt**. Der vorhandene konservative CSS-Budgetrahmen max. 298 `!important` bleibt verbindlich; aktuelle textuelle Zahl **243**. B38 bleibt pausiert. Reale iPhone-Keyboard-/Safari-Abnahme nicht durch Chromium-Emulation ersetzen.


## v155 – einheitlicher Pin-Dialog-Eigentümer und Marker-Statusleiste (2026-11-12)

Der neue breite Marker wird durch den bestehenden `.pin-marker`-Eigentümer und eine einzige `.pin-status-column` mit identischen 17px-Statusplättchen gestaltet. Keine getrennten Rasterpositionen pro Note/URL/GPX, dadurch unabhängig von der Kombination vertikal bündig. Die Trefferfläche liegt beim Leaflet-Adapter (68×64px), nicht als globaler CSS-Override. Die Markernamen erhalten vom Adapter einen passenden größeren Versatz.

Pin-Dialoggrößen bleiben im `#pinPanel`-Komponenten-Eigentümer: ein zentraler 42px-Aktionstoken, 145px Notizen, 390px Breitenmaximum in der Positionierungsansicht, zusätzliche CSS-Zustände für Wetter und GPX. Das mobile Editor-Overlay besitzt ausschließlich `.pin-note-editor`-bezogene Stile und die dynamischen Visual-Viewport-Größen. Für die iPhone-Namenseingabe besitzt der Dialog den eng begrenzten Zustand `.pin-keyboard-mode` mit kompakter Maximalhöhe und sticky Footer. Bereits bewährte Ebenenauswahl bleibt unverändert. **Aktuell 246 textuelle `!important`-Vorkommen**, innerhalb des bestehenden Budgets 298. Allgemeine CSS-Sanierung B38 bleibt weiterhin pausiert. Auch bei zukünftigen Flächen werden vorhandene Komponentenverträge verwendet, keine pauschalen neuen Overrides.


## v156 – Markerabmessungen, Wetterhöhe und kontextabhängiger Notizeditor (2026-11-12)

Die bestehende Marker-CSS-Eigentümerschaft wurde an der Quelle auf den 36×46px sichtbaren Körper und die 14px-Statusplättchen angepasst. Der Leaflet-Adapter besitzt weiterhin exklusiv Hitbox und Anker. `#pinUrlBlock` behält den eigenständigen Popup-Stil, dessen Position in der DOM-Komponente analog zur akzeptierten Ebenenauswahl berechnet wird. Der Wetterplatzhalter erhält im `#pinPanel`-Eigentümer mehr Höhe; ein einziges gezieltes Media Query begrenzt sie auf schmalen Screens. Der Notizfeld-Vergrößern-Button erscheint nur bei großem Viewport und feinem Zeigegerät; der vorhandene `.pin-note-editor`-Eigentümer gestaltet zusätzlich `.is-desktop` bzw. `.is-keyboard-visible`. Keine allgemeine B38-Sanierung und keine pauschale globale Override-Schicht.


## v157 – CSS-Eigentümer und Hover-Prüfung (2026-11-12)

Der bisherige Eigentümer der Pin-Marker entfernt sämtliche `.pin-status-column`-/`.pin-status-badge`-Regeln und zeichnet den 30×40px-Pin samt drei SVG-Innensegmenten; 44px-Hitbox ausschließlich im Adapter. `#pinPanel.pin-weather-mode` tauscht den gesamten Mittelbereich aus, anstatt den Dialog zu vergrößern. Ein dialoglokaler `@media(hover:hover) and (pointer:fine)`-Vertrag setzt `#52606d` und weiße Iconfarbe auch auf farbige Dialogbuttons; konkurrierender grüner OK-Hover am Ursprung entfernt. Keine neue globale Override-Schicht. Lucide-Strokes 1.8–1.9. `.pin-note-editor.is-tablet-keyboard` setzt 16px iPad-Abstand, iPhone bleibt 4px. **249** `!important`-Vorkommen bei höchstens **298**. B38 bleibt pausiert. Browser-Hover und visuelle Regressionen sind Teil des Gates.


## v165 – verbindliche Zusatzdialog-Button-Zustände und identische Dialogflächen (2026-11-13)

**Verbindlicher Pin-Dialog-Zustandsvertrag:** Jeder Button innerhalb von `#pinPanel`, der eine interne zusätzliche Dialogansicht oder ein Untermenü öffnet, verwendet während deren Öffnung **exakt** `#1764bf` als Hintergrund und Rahmen, **weiß** als Icon-/Textfarbe, unabhängig von `hover`, `active`, Touch, Desktop, iPhone und iPad. Der Zustand wird über explizite `aria-expanded="true"`, `aria-pressed="true"` oder `.is-active` signalisiert und bei Schließen/Abbrechen/Escape/Bestätigen zurückgesetzt. Normale inaktive Aktionsfarben (weinroter Pin-Entfernen-Auslöser, grünes OK) bleiben erhalten. Die finale destruktive **Löschen-Bestätigung** im Unterdialog bleibt rot; sie öffnet selbst keinen weiteren Unterdialog. Die 20×20px Notizeditor-Ecke bleibt die bestätigte Ausnahme zu den kreisförmigen Buttons.

Das komponenteneigene CSS bündelt diesen Vertrag unter `#pinPanel button:is([aria-expanded="true"],[aria-pressed="true"],.is-active)`; die bestehende Desktop-Hover-Regel greift **nur ohne** offenen Unterdialog und darf das Blau nicht verdrängen. `ui/pin-delete-dialog.js` setzt und entfernt den dokumentierten Zustand am Entfernen-Auslöser. `tests/pin-dialog-visual.cjs` prüft unter echten gerenderten 320px/375px/iPad-/Desktop-Ansichten die Farbwerte, Rücknahme und das Ausblenden der Bestätigung; `tests/pin-delete-dialog.test.js` prüft Bestätigung, Cancel, Escape-Äquivalent und Dispose.

**Oberflächenvertrag:** Pin-Panel, Lösch-Panel und Pin-Dialogspitze verwenden denselben einzigen **opaken** CSS-Farbtoken `--p2m-pin-dialog-surface:#f7f8fa` (RGB 247,248,250), ohne nachgemischte Löschdialog-Farben; `#deleteDialog::backdrop` ist transparent. Der gerenderte Farbwert wird in jedem responsiven Chromium-Kontext in beiden Dialogen geprüft. Wenn Safari trotz identischer Berechnungswerte eine sichtbare Abweichung zeigt, zusätzliche iPhone-Safari-Geräte-/Pixelkontrolle verlangen; CSS-Gleichheit alleine ist **kein** optischer iOS-Nachweis.
