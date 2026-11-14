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


## v166 – alle internen Pin-Dialog-Buttons sind echte Ein-/Ausschalter (2026-11-13)

Jeder `#pinPanel`-Button, der eine interne Zusatzansicht öffnet, **schließt sie bei einem zweiten Klick/Tipp auf exakt denselben Button** wieder. Blau `#1764bf` mit weißem Icon bedeutet **eingeschaltet/geöffnet**; das Zurückschalten auf die individuelle Standardfarbe bedeutet **ausgeschaltet/geschlossen**. Dies gilt ausdrücklich auch für `#deletePin`. Alle Zustandsattribute `aria-expanded`/`aria-pressed` und `.is-active` müssen synchron mit dem tatsächlich offenen Zusatzdialog wechseln; bloßer Farbwechsel genügt nicht.

Die Einzel-Pin-Löschbestätigung wurde gezielt von `showModal()` zu `show()` geändert, weil native modale Top-Layer-Dialoge den **sichtbaren ursprünglichen Trigger in der Pin-Kopfzeile inert schalten**, sodass ein zweiter Tipp technisch unmöglich wäre. Ihr eigenständiger `#deleteDialog`-Overlay bleibt mit `z-index:1350` über dem Pin-Panel (1250) geometrisch unverändert. Nur ein ausdrückliches `returnValue=confirm` löscht die beim Öffnen fixierte Pin-ID; erneutes Trigger-Tippen, `Abbrechen`, Escape, externe Schließung und Dispose dürfen nicht löschen. `ui/pin-delete-dialog.js` kontrolliert die zustandsabhängige Schaltlogik und Escape für den nichtmodalen Dialog. Die Buttons des Bestätigungsdialogs bleiben semantisch unterschiedlich: „Löschen“ bestätigt destruktiv, „Abbrechen“ schließt. Farb-/Hintergrund-/Schattenwerte der v165-Dialoge werden nicht geändert.

**Verbindliche Tests:** `tests/pin-delete-dialog.test.js` prüft Schalten, sicheres Zurücksetzen, Escape und Confirm-ID-Snapshot; `tests/pin-dialog-visual.cjs` klickt im echten Chromium auf iPhone 320/375px, iPad 768px und Desktop auf denselben Entfernen-Button zum Öffnen/Schließen und prüft `aria-expanded`, Blau, sichtbare Position sowie erneutes Öffnen, Abbrechen und Escape. Auf realem iPhone-Safari ist die haptische Abnahme gesondert erforderlich. Keine globalen CSS-Regeln, keine Änderung an anderen Dialogen oder gespeicherten Daten.


## v167 – Überlappende Pin-Trefferflächen und bedingte Auswahlliste (2026-11-13)

**UI-Vertrag:** Die vorhandene 52×56px-Leaflet-Hitbox (sichtbarer Pin unverändert 30×40px) bleibt die **einzige** Referenz für die Unterscheidung „überlagert/isoliert“. Erforderlicher Abstand nach Autozoom: 6px zusätzlich zu dieser Hitbox. Nicht visuell kleinere Pin-SVGs, Tooltip-Breite oder die temporäre gelbe Markierung dürfen den Überlappungstest verfälschen. Nur der echte Pin-Tipp kann den Autozoom auslösen; eine einfache Kartenberührung und die programmatische Pin-Erstellung/-Auswahl tun dies nicht. Automatisch maximal auf topo 17, andere Provider 19 und nach Möglichkeit minimal hineinzoomen; noch verbleibende Überlappung ist **kein** Anlass für wiederholte Autozoom-Schleifen.

Die **eigenständige** `#app .pin-overlap-chooser`-Komponente ist nur bei nicht auflösbarer Überlappung sichtbar; auf exakt gleichen Koordinaten wird sie ohne Zoom geöffnet. Sie besitzt eigene, lokal begrenzte CSS-Regeln für Positionierung/Scrollbarkeit/Buttons und verändert weder `#pinPanel`, die zentralen Kartenbuttons, das gelbe temporäre Hitbox-CSS noch die 94px-Pin-Dialog-Spitzengeometrie. Die App setzt die geometrisch ermittelten Pixelkoordinaten lediglich als `left/top` (dynamische UI-Position); statische Farb-/Größenkonstanten bleiben im CSS-Eigentümer. Die Auswahlliste darf bei vielen Pins nur **innerhalb ihrer eigenen Fläche** scrollen; keine globale Dokument-Scrollverschiebung auf iOS.

**Verbindliche Gates:** `tests/pin-overlap-zoom.test.js` prüft Geometrie, Grenzen, isolierte Pins, identische Koordinaten, zusammenhängende Gruppen und Massendaten; `tests/pin-overlap-browser.cjs` prüft echte mobile Touch-/Desktop-Marker-Taps, die anschließende gezielte Pin-Auswahl und die unveränderte Einzel-Pin-Bedienung. Tests laufen sowohl auf dem lokalen Branch als auch gegen die **tatsächlich veröffentlichte HTTPS-Preview**; beide bewahren Bildbelege auf. Das bestehende Pin-Dialog-/iPhone-Pan-/Offline-Gate bleibt zusätzlich verbindlich. Die reale Safari-Geräteabnahme des neuen Workflows ist durch Chromium nicht ersetzt.


## v168 – gestufte Pin-Gruppenentflechtung und Kartenansichts-Rücksprung (2026-11-13)

Bei tatsächlicher Überlappung bleibt die ursprüngliche zusammenhängende Trefferflächen-Gruppe bei der ersten Vergrößerung innerhalb des Viewports (mit konservativem Rand). Die Karten-/Marker-Geometrie bleibt unverändert; weitere Restüberlappungen dürfen durch einen folgenden Marker-Tipp stufenweise getrennt werden. Identische Koordinaten führen aus einer Übersicht zuerst zu einer zentrierten Kartenvergrößerung und erst beim erneuten Tipp zu einer namentlichen Auswahl. Die Auswahl zeigt die zur Laufzeit aus den sichtbaren Layerdaten abgeleiteten Ebenennamen sowie die eindeutige Positionsnummer – ohne zusätzliche Persistenz. 

Der Leaflet-Kartenzoom-Steuerung wird **oberhalb des Plus-Buttons** ein gemeinsamer kreisförmiger Button mit dem lokal ausgelieferten Lucide-Symbol `undo-2` hinzugefügt. Er stellt den exakt vor dem letzten automatischen Überlappungszoom aktiven Viewport (Mittelpunkt und Zoomstufe) wieder her. Ohne vorherigen Autozoom ist er deaktiviert. Er übernimmt vollständig den bisherigen zentralen Kartenbutton-Designvertrag; die einzige neue CSS-Regel kennzeichnet seinen deaktivierten Zustand. Keine Änderung an den globalen Zoom-Buttons, am Pin-Panel oder dessen Ankergeometrie, an der temporär gelben Marker-Trefferfläche, am IndexedDB-Schema oder an gespeicherten Pins.

**Technische Abnahme ausstehend:** lokale Node-/Chromium- und HTTPS-Live-Gates sowie reale Safari-Geräteprüfung bleiben getrennte Nachweise, bis ihre tatsächlichen Ergebnisse verifiziert sind.

## v169 – Separater Favoriten-Panelvertrag und Kartencontrols (2026-11-13)

Der Favoriten-Trigger `#favoritesButton` ist ein gewöhnlicher gemeinsam dimensionierter runder Kartenbutton rechts neben dem unten links platzierten Fit-all-Zoom-Button. Er definiert **keinen** neuen Durchmesser- oder Farbtoken. Die schmale `#favoritesPanel`-Liste liegt randverankert oberhalb des Auslösers mit viewportbegrenzter Höhe und internem Scrollbereich. Die Bestätigung zum Ersetzen eines belegten Platzes wird als `.favorite-confirm` **innerhalb des Listeninhalts** gerendert, niemals über `showModal()` in der Bildschirmmitte. Beim Öffnen liegt `body.favorites-open` an; nur UI-Controls, Menüs und Scale werden ausgeblendet, nicht Leaflet-Panes, Marker, Tooltip-/Informationslabels, Raster-/Flächen-/Linienlayer oder Attribution. Im Gegensatz zum Pin-Dialog wird keine Karten-/Pin-/Dialoggeometrie verändert. Die bereits wirksamen `!important`-Verträge bleiben erhalten, der CSS-Debt-Budgetwert wurde nicht angehoben. Keyboard-Fokus liegt nach Overlay-Cleanup auf dem eigenen Schließen-Button.

## v170 – Eigentümerregeln für Favoriten-Zeilen und rechteckige Textaktionen (2026-11-13)

`#favoritesPanel` besitzt die gesamte Darstellung von Namen/Datum, der `copy-plus`-Ersetzen-Aktion und der roten `star-off`-Löschaktion. Innerhalb der Liste liegen alle Bestätigungs- und Namens-Editoren im vorhandenen Scrollbereich, mit roter Hintergrund-/Button-Semantik für tatsächliches Löschen. Die untere `.favorites-footer` enthält zwei **rechteckige Textbuttons** mit definierter Mindestbreite, Icon-/Textabstand und Höhe; sie erben niemals die quadratische Form der normalen Kartencontrols. Gerade diese Trennung behebt den im Nutzer-Screenshot dokumentierten falschen Umbruch und das zu große Symbol von „Aktuelle Ansicht speichern“. Das Schließen durch Außenklick verändert weder Leaflet-Panes noch dargestellte Karteninhalte. Keine neuen generischen `!important`-Ausnahmen oder Token-Duplizierung.

## v171 – Favoritenposition, Aktivstatus und exakte Kreisgeometrie (2026-11-13)

Die aktuelle Position von `#favoritesButton` ist **unterhalb von `#layersButton` rechts oben**. Geschlossen liegt er mit gewöhnlichem Kartencontrol-z-index **unter geöffneten fremden Panels**, damit er beispielsweise nicht deren Schließen-Button überlagert; nur mit `aria-expanded=true` steigt er über das Favoriten-Panel. Der zentrale blaue Aktivzustand ist Teil des gemeinsamen Menü-Trigger-Vertrags, keine neu erfundene Farbpalette. Bei `body.favorites-open` bleiben ausschließlich dieser Stern und das Favoritenpanel bedienbar; alle anderen Map-Controls werden verborgen. Die CSS-Zeilenaktionsbuttons `.favorite-icon` haben identische min/max Breite und Höhe, `aspect-ratio:1`, `border-radius:50%`; das rote `star-off`-SVG erhält die Farbe selbst, nicht nur sein Hintergrund. Die beiden Footer-Buttons verwenden ein gemeinsames zweispaltiges Grid und rechteckige Form. Die Hinzufügen-Aktion hat einen echten `:disabled`-Zustand.

`#favoritesPanel.is-editing` ist während der Eingabe an die **VisualViewport-Geometrie** gebunden, nicht an die unveränderte Layoutviewport-Höhe bei offener iPhone-Tastatur. Der Listeninhalt scrollt **intern** zum Editor, ohne Karte oder Dokument zu bewegen; die Footer-Aktionen werden während des Eingabefokus temporär verborgen. Der zuvor beschlossene randintegrierte Bestätigungsdialog und alle bestehenden Map-/Pin-Dialog-Geometrien bleiben unangetastet. Der alte CSS-Stand mit Favoriten unten links beziehungsweise Footerbuttons übereinander ist ausdrücklich überholt.

## v172 – Automatisch geprüfte, unverformbare Kreisbuttons und Foreground-Eigentümer (2026-11-13)

Der zentrale Owner `button.p2m-icon-control` erzwingt nun `box-sizing:border-box`, `aspect-ratio:1`, `flex-shrink:0`, gleiche `width/height` sowie passende `min/max-width/height` aus `--p2m-button-size`. Lokale Größenkontrakte (z. B. 32px close/layer-delete, 36px Favoritenzeilen-Icons, 42px Kartencontrols) behalten ihren jeweiligen Wert; es sind **keine** uneinheitlichen ovale Formen zulässig. Der bewusst rechteckige Mini-Notiz-Expand-Button und beschriftete Textbuttons sind keine runden Steuerungen.

`#app .favorites-panel` erhält eine höhere Stapelpriorität (`z-index:1350`) als sein offener Stern-Trigger (`z-index:1300`), sodass die Liste mit Inline-Editor optisch vor dem Auslöser bleibt. Die beiden CSS-Owner bleiben getrennt; keine Veränderung am Menüort unter dem Ebenen-Button. Tests: `tests/round-button-geometry.test.js` überwacht zentrale CSS-Invarianten und den Stapelvertrag; `tests/pin-overlap-browser.cjs` misst alle sichtbaren runden Favoriten-/Kartenbuttons im emulierten Browser; `tests/browser-smoke.cjs` ergänzt die runden Buttons in Kartenstart, Pin-Editor und Ebenenpanel. Ein späteres optisches Oval wird damit zum CI-Fehler.

## v173 – Nichtdestruktive Sichtbarkeit der gelben Pin-Hitbox-Testfarbe (2026-11-13)

Die bestehende v163-Entwicklungsregel `#map .leaflet-marker-icon.pin-icon` (gelber Hintergrund `rgba(255,224,0,.55)` und gestrichelter Rahmen) bleibt als **Standard** erhalten. Die ausschließlich präsentationale Body-Klasse `pin-hitboxes-hidden` überschreibt bei Deaktivierung in den Einstellungen nur `background:transparent` und `border-color:transparent`. **Nicht** erlaubt sind `display:none`, `visibility:hidden`, `pointer-events:none`, Änderungen an `width/height`/Icon-Anchor oder eine Entfernung der originalen Debug-CSS-Regel. Die Einstellung ist gerätelokal, außerhalb der synchronisierbaren Projektdaten, und wird im initialen UI-Binding noch vor dem ersten `renderMarkers()` geladen. Chromium-Tests prüfen tatsächliche berechnete Farben, unveränderte Hitbox-Dimensionen, weiterhin funktionierende Pin-Taps sowie Aufbewahrung des Checkbox-Zustands nach Reload.

## v175 – Filter-Kopfzeile der Favoritenliste (2026-11-13)

Die bisherige Textüberschrift weicht `.favorites-head-star` mit lokalem Lucide-`star`, dem flexiblen Suchfeld `#favoritesSearch` (min-width:0 für schmale iPhones) und dem echten runden `#favoritesSearchClear` (`funnel-x`). Das Zurücksetzen verwendet die gemeinsamen `--p2m-button-ink/bg/border`-Eigentümervariablen, damit die globale `button.p2m-icon-control`-Regel den roten aktiven beziehungsweise grauen deaktivierten Symbolzustand **nicht** überdeckt. Gleiche feste Breite/Höhe sowie `border-radius:50%` halten den Reset-Button geometrisch kreisrund. Keine neuen systemweiten Icon-Ausnahmen und keine Änderung an Karten-, Pin- oder Favoriten-Speicherdaten.

## v177 – Gelbe Farb-Eigentümer ausschließlich im Favoritenbereich (2026-11-14)

Die gelbliche Kartenbutton-Farbe wird ausschließlich über die bestehenden `--p2m-map-control-bg/pressed/border/ink`-Variablen im `#favoritesButton`-Owner gesteuert (geschlossen `#f7e2a0`, geöffnet `#e9c363`). Der Stern-Auslöser wird nicht mehr von der globalen blauen `[aria-expanded=true]`-Gruppe mitgefärbt; andere Menü-Controls bleiben unverändert blau. Die Favoritenleiste besitzt lokale Variablen für mittelgelbe Fläche (`--p2m-favorites-surface:#f0d78a`) und hellgelbe Karten/Buttons (`--p2m-favorites-light:#fff3ce`). Lucide-gemountete Zeilenaktionen bekommen die **kanonischen** `--p2m-button-bg`-/`--p2m-button-border`-Variablen; ein reiner `background`-Selektor würde wegen der gemeinsam vererbten `!important`-Regel sonst nicht wirken. Die Farben der rot markierten Löschsymbole und Filterlöschung bleiben rot; runde Button-Geometrie, Hitzonen und der Inline-Dialog-Owner bleiben unverändert. Tatsächlich gerenderte RGB-Werte in Chromium sind als Regression abgesichert.

## v178 – Zitronengelbe Flächen, nur runde Buttons weiß; Tastaturzustand auch für Suche (2026-11-14)

Scoped auf `#favoritesPanel` sind die Farbtoken `--p2m-favorites-surface:#f4e664` und `--p2m-favorites-light:#fff9cd` gültig. **Runde** Schaltflächen in Kopf und Favoritenzeilen erhalten `--p2m-button-bg:#fff` und bleiben geometrisch kreisrund. **Rechteckige** Footer- und In-Panel-Bestätigungsbuttons behalten hellgelbe Hintergründe. Die rote Symbolfarbe von `star-off` und aktivem `funnel-x` ist orthogonal zum weißen Kreis-Hintergrund. Die außerhalbliegende Stern-Menüschaltfläche ist zitronengelb; der warme Gelbton gehört nicht zu allgemeinen Kartenbuttons.

`#favoritesPanel.is-editing` verwendet weiterhin die aus `visualViewport` übernommenen CSS-Geometrievariablen. Die Klasse wird **auch bei Fokus in `#favoritesSearch`** gesetzt, nicht nur für Umbenennen-/Ersetzen-Editoren. Die Listenscroll-Korrektur wird nur bei einem tatsächlichen Inline-Editor angewandt. Der für die Tastatur verborgene Footer ist keine Fehlfunktion. Die bestehenden gemeinsamen Eigentümer für Icon-Farben und Kreisgeometrie bleiben erhalten; keine Änderung an Kartentiles, Markern oder Pin-Dialogen.
