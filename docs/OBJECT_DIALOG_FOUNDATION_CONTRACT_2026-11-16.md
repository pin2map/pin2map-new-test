# Verbindlicher Objekt-Dialog-Vertrag – Pin, Gebiet, See und Fluss

**Beschlossen durch Nutzer am 16.11.2026. Status: verbindliche Zielarchitektur.**

## Geltung und Primärreferenz
Dieser Vertrag betrifft ausschließlich die vier Objektbearbeitungsdialoge Pin, Gebiet/Fläche, See und Fluss. Andere Dialoge, Karten-Popups und Ebenenverwaltungsdialoge sind nicht Gegenstand dieses Vertrages. Funktionale und visuelle Referenz ist der aktuell abgenommene Pin-Bearbeitungsdialog. Ein neues Objektmerkmal wird als Konfiguration oder eingesteckte objektspezifische Zeile umgesetzt, niemals als zweite Implementierung einer identischen Dialogfunktion.

## Strukturelle Zeilen und Größen
Ein Dialog ist ein positioniertes Panel mit einer Namenszeile, optionalen objektspezifischen Zusatzzeilen, einer Notizzeile und genau einer Funktionszeile. Die Zeilen legen die feste Layout-Gesamthöhe ihres jeweiligen Objekttyps fest; keine willkürlichen, versteckten Platzhalter oder separaten River-Kurzdialoge. Alle vier besitzen dieselbe Breite, Oberflächenfarben, Radius-/Schatten-/Kontur-, Positionierungs- und mobilen Viewport-Verträge wie der Pin-Dialog. Gerätespezifische Layoutregeln kommen aus einem gemeinsamen Eigentümer.

## Namenszeile und Löschmodus
Links ein runder roter Objekt-Löschbutton mit dem durchgestrichenen **kanonischen Symbol der Suche**, rechts das gleichartig beschriftete Namensfeld. Die Suche ist alleiniger Eigentümer der Objekttyp-Symbole (Pin: Lucide map-pin; Gebiet: assets/region.svg; See: assets/lake.svg; Fluss: assets/river.svg). Symboländerungen an dieser Quelle müssen ohne zweite Asset-Tabelle in die Dialoge wirken.

Der Löschbutton ist ein Ein-/Ausschalter: bei geöffnetem Löschmodus **blauer Hintergrund und weißes Symbol**, erneuter Klick deaktiviert ihn; Escape ebenso. Der Löschmodus überdeckt die übrigen Zeilen **unterhalb der Namenszeile** durch eine deckende Fläche, ohne den Header zu verdecken. Mittig steht die Frage „<Objekttyp> „<aktueller Name>“ wirklich löschen?“; zentriert darunter von links nach rechts **Löschen** (rot) und **Abbrechen**. Die gewählte Objekt-ID ist bis zur Bestätigung geschützt; keine Löschung durch bloßes Öffnen. Beim Schließen werden sämtliche aktiven Zustände zurückgesetzt.

## Notizzeile
Alle vier Typen besitzen denselben mehrzeiligen Notiz-Editor und dieselbe kleine explizit nicht-runde Vergrößern-Taste. Die rechte und untere **Außenkante des Symbols** liegen exakt auf den gleichnamigen Begrenzungslinien des Notizfeldes. Klick öffnet dieselbe PinNoteEditor-Implementierung mit Datum/Zeit/Fertig und unverändertem iOS-/iPad-/Desktop-Visual-Viewport-, Tastatur-, Fokus- und Auswahlverhalten. Nur Titel und Persistenzport variieren.

## Funktionszeile
Immer vorhandene Funktionen, in der Reihenfolge: **Ebenenwahl**, **URL**, **Wikipedia**, **OK**. Das gemeinsame grüne OK ist ein zentral definiertes Control (Text jetzt „OK“); eine künftige Umbenennung oder Ersetzung durch Haken ist eine einzige zentrale Änderung. Die Objekt-Dialoge verwenden dieselben runden Größeninvarianten; objektabhängige Buttons dürfen als zusätzliche spezifizierte Einträge eingefügt werden (Pin: Verschieben vor Ebenenwahl, Meteo vor OK). Ein Bereich „Navi extern / pin2map Routing“ existiert nur im Pin-Dialog.

Die Ebenenwahl ist ein Ein-/Ausschalter: derselbe farbige Indikator im Eck und dasselbe Lucide-Layer-Symbol. Der Popup enthält Filtereingabe, die **funktionierende** case-insensitive Filterung und einen unabhängig davon **wirklich kreisrunden** Filter-Reset mit `funnel-x`; Farbpunkt, Sichtbarkeitssymbol, Ebenenname in dieser Reihenfolge. Ausgeblendete Ebenen bleiben auswählbar, werden aber rot und durchgestrichen. Das schwebende Auswahlmenü bleibt vollständig innerhalb der sichtbaren Hauptdialoggrenzen; nur die Liste scrollt bei vielen Einträgen. Der gemeinsame Popup-Eigentümer gilt allen vier Objekttypen.

Der URL-Button ist ein Ein-/Ausschalter. Der editierbare URL-Popup liegt vollständig innerhalb des Hauptdialogs oberhalb der Funktionszeile, mit **linksbündiger Objekttyp-URL-Legende**, Eingabefeld, OK (übernimmt und schließt) und URL öffnen (nur bei gültiger URL; öffnet neues Fenster). Escape und andere Aktionen schließen ohne ungesicherte Änderungen zu übernehmen. Das gleiche Protokoll-Validierungs- und mobile Keyboard-Handling ist für alle vier identisch.

Wikipedia startet für alle Objekte den vorhandenen Namens-Suchworkflow; das gemeinsame lokale Wikipedia-Asset bleibt für alle gleich. Ein aktives anderes Untermenü schließt beim Aufruf.

## In Dialogflächen auftauchende Zusatzfunktionen
Der sogenannte Meteo-Dialog ist ein wiederverwendbares **Mittelzeilen-Overlay** zwischen Header und Funktionszeile, nicht automatisch ein Wetterdienst für alle Objekte. Zusätzliche Objektaktionen können denselben Overlay-Mechanismus explizit beauftragen.

## Technische Zuständigkeiten und Akzeptanz
Ein gemeinsames UI-Modul besitzt die Struktur-/Steuerelement-Verträge, ein gemeinsames Layerpicker-Modul die vollständige Filter-/Zeilen-/Geometrie-Logik, ein gemeinsames URL-Modul die Eingabe-/Persistenz-/Fokus-/Keyboard-Funktion und eine gemeinsame Löschbestätigung das Sicherheits-/Toggle-Verhalten. Die vier Typen liefern nur Typdescriptor, optionale Zusatzzeilen, Fach-Callbacks und Position/Name/Layer/Notiz/URL. Keine Datenbank-, Leaflet- oder Fetch-Zugriffe in UI-Module. Keine doppelten CSS-Owner und keine neuen pauschalen `!important`-Overrides. Pin-Referenz darf bei der Extraktion weder funktional noch optisch regressieren.

Tests: Node-Dom- und Vertragstests für alle vier Typen und gemeinsame Module, reale Chromium-Bounding-Rects/Focus/Filter-Reset/Escape/Löschen/URL/Note und Touch-/Viewport-Tests für 320/375/390-iPhone, iPad und Desktop. Architektur- und CSS-Gates, Pages-HTTPS-Version sowie gesonderte reale iOS-Abnahme. Bis zur vollständigen bestandenen Live-Prüfung ist die Umstellung *nicht* abgenommen. `main`, `reference/*`, IndexedDB-/Tile-Daten unverändert.

## Präzisierung v256 – ein einziger Ebenenauswahl-Layoutvertrag (17.11.2026)

- `Pin2MapObjectDialogCore.layerMenuLayout` berechnet die Layoutmaße für **alle vier** Objekt-Ebenenwahlen; `Pin2MapObjectLayerPicker` besitzt allein Filter, Optionen, Selektion und das Anwenden der berechneten Fläche. Es gibt keine zweite spezifische Breiten-/Höhenformel im Geometrie-Editor.
- Positionierung hängt ausschließlich von den **echten Rechtecken des Objekteditors und seines Layer-Buttons**, dem sichtbaren `VisualViewport` und der Anzahl sichtbarer Optionen ab. Weder externe Karten-/OSM-Geometrien noch Notiz-Textlänge, GeoJSON oder Kartenzoom gehen in die Menügröße ein.
- Bei einer kurzen Liste und ausreichendem Raum bleibt die Ebenenwahl zwischen Header und Funktionszeile; bei vielen Ebenen überlagert dieselbe Auswahlliste die Notizzeile innerhalb des Objekt-Dialogs. Die Mindestfläche für lange Listen muss auswählbare Zeilen zeigen; Schrift-/Filterstreifen allein ist kein zulässiger Zustand. Das Menü ist unabhängig scrollfähig.
- **Stacking-Kontext ist Teil des zentralen Portalvertrags, keine neue Layoutformel:** Der Pin nutzt weiterhin das bewährte Body-Portal außerhalb seines scrollbaren Panels. Gebiet/See/Fluss verwenden den `#app`-Portalhost, weil ein Body-Portal auf iOS hinter dem App-Stacking-Kontext geraten kann. Beide Hosts verwenden dasselbe Layoutverfahren und dieselbe Bedienkomponente.
- Dialog-/Popup-Verträge umfassen reale CSS-Bounding-Rects, Hit-Testing (`elementFromPoint`), auswählbare Zeilen, WebKit und Chromium, iPhone-/iPad-Breiten und die veröffentlichte PWA mit aktiviertem Service Worker. Eine grüne lokale Einheitstest-Suite allein ist keine Freigabe.
- Der Hauptdialog bleibt durch seine Positionierungslogik am jeweiligen Kartenobjekt verankert. **Die Objektgeometrie darf nur den Ankerpunkt**, nicht die intern verfügbare Höhe oder die Anzahl anzeigbarer Ebenen bestimmen. Änderungen an Karten-Geometrie-Providern müssen diese Entkopplung respektieren.


## Architekturpräzisierung v257 – Objektanker und historischer Layer-Restweg (17.11.2026)

Die vier Objekteditoren dürfen ihre Position nicht anhand der Form, Topologie, GeoJSON-Größe, Kartendienst-Antwort oder Stützpunktzahl einer Geometrie berechnen. Nur der bereits durch den Map-Adapter projizierte **Bildschirmpunkt** ist eine zulässige Eingabe. Gemeinsamer Ankereigentümer ist `ui/pin-panel-positioner.js` mit `anchorGeometry` und der für Geometrieobjekte erforderlichen `clampedObjectAnchor`-Variante. Die Geometrie-Ansicht führt keine lokalen doppelten Positionsformeln.

Auch ältere Aufrufe von `ObjectDialogCore.positionPopup` mit `kind="layer"` müssen die kanonische `layerMenuLayout`-Funktion verwenden. Insbesondere sind der frühere 260px-Breitenzweig und die auf 45px reduzierbare Menüfläche verboten. Filter, Zeilen, Sichtbarkeit, Popup-Layout und Portale müssen weiterhin die bestehenden gemeinsamen Controller-/CSS-Verträge erfüllen. Die echten iPhone-PWA-/Service-Worker-Gerätedaten sind ein separates Abnahme-Gate.


## Nachtrag v259 – unveränderliche Objekt-Dialogmaße beim Layer-Overlay (17.11.2026)

**Verbindlich für alle vier Objektarten:** Öffnen, Filtern, Scrollen, Auswählen und Schließen der Ebenenliste verändern weder `x`, `y`, Breite noch Höhe des Hauptdialogs. Ein Popup darf die Karte optisch nicht über die bestehende Panelaußenkante hinaus vergrößern. Lange Ebenenlisten scrollen innerhalb des bereits definierten Hauptdialog-Footprints; die Fußzeile bleibt funktional erhalten.

**Unterschiedliche Portalhosts sind ausschließlich technische Stacking-Strategie:** Das Pin-Menü bleibt fest im BODY als unabhängig positionierter Overlay ohne Einfluss auf seinen scrollbaren Elternbereich; seine berechnete Fläche ist dennoch strikt auf den unveränderten Pin-Dialog begrenzt. Das gemeinsame Geometrie-Menü wird als `position:absolute`-Kind des jeweiligen `position:fixed`-Geometrieeditors eingebunden, lokale Position = globaler Layout-Rect minus Panel-Rect. Ein Portal als `#app`-Geschwister ist für den Geometrie-Picker nicht mehr zulässig: Es konnte auf iOS trotz scheinbar richtiger Rechtecke nur einen schmalen Streifen sichtbar lassen. Ein Menü bleibt unabhängig scrollbar und darf als absolut positionierter DOM-Knoten niemals eine Flex-Zeile des Dialogs bilden.

**Freigabevertrag:** Für Pin, Fläche, See und Fluss muss der *sichtbare reale Dialog* mit unveränderten Bounding-Rects, sichtbaren anklickbaren Ebenenzeilen, korrekter Stapelreihenfolge, mindestens iPhone 320/390 und iPad WebKit/Chromium und aktivem PWA-Service-Worker getestet werden. Die konkrete Benutzerinstallation in Safari bleibt eine gesonderte reale Geräteabnahme.



## Verbindliche Nutzerpräzisierung vom 18.11.2026 – Unterdialoge oberhalb der Funktionsbuttons und geräteübergreifende Parität

**1. Funktionszeile bleibt vollständig sichtbar und bedienbar.** Alle zusätzlichen Dialoge, Popups, Auswahlmenüs und Mittelzeilen-Overlays, die durch einen Button der **unteren Funktions-/Button-Leiste** eines Objekt-Dialogs geöffnet werden (insbesondere Ebenenwahl, URL und ausdrücklich konfigurierte Zusatzdialoge), müssen **oberhalb dieser unteren Button-Leiste enden**. Ihre sichtbare Unterkante darf die obere Kante des von der Funktionszeile belegten Button-Bereichs nicht überschreiten. Die auslösenden Buttons einschließlich ihres aktiven Ein-/Aus-Zustands bleiben während des geöffneten Unterdialogs **sichtbar und per Touch/Maus/Tastatur erreichbar**, damit erneutes Betätigen das Untermenü jederzeit schließen kann. Ein Overlay darf die Fußleiste weder verdecken noch Klicks auf sie abfangen; auch keine unsichtbaren Hitboxen darüber. Ein Unterdialog kann die Mittel-/Notizzeile überlagern, jedoch nicht die untere Funktionszeile. Für viele Einträge ist die Liste innerhalb des verfügbaren Raums eigenständig scrollbar. Weder die Hauptdialog-Außenmaße noch seine Position werden durch Öffnen, Schließen, Filtern oder Scrollen verändert. **Diese präzisere untere Grenze ergänzt und verschärft v259**: `innerhalb des Hauptdialogs` allein reicht nicht, wenn die Leistenbuttons zugedeckt werden. Auf extrem kleinen Viewports muss die gemeinsame Layoutlogik mindestens die Bedienbarkeit des auslösenden Schalters und der Fußzeile erhalten; kein Abschneiden und kein eigenmächtiges Vergrößern des Hauptdialogs.

**2. Einheitliches Look-and-Feel auf allen Geräten.** Pin-, Flächen-, See- und Fluss-Objekt-Dialoge müssen auf **iPhone, iPad und Desktop** unabhängig von Displaygröße grundsätzlich dasselbe gemeinsame Gestaltungs- und Bedienkonzept verwenden: identische Struktur und Reihenfolge gemeinsamer Zeilen/Controls, typografische Hierarchie, Farben, Rahmen, Radius, Schatten, Symbolsprache, Button-Formen und -Zustände sowie funktionale Abläufe. Anpassungen an verfügbare Breite, Höhe, Safe Areas, Eingabetastatur und Pointer-/Touch-Bedienung dienen **nur der responsiven Einpassung** und dürfen keine unbeschlossene separate mobile/tablet/desktop Dialogvariante schaffen. Abweichungen müssen **ausdrücklich und nachvollziehbar beschlossen** sein; der **separate Vollbild-Notizeditor** ist eine bereits ausdrücklich definierte Ausnahme, nicht Vorbild für einen generellen Umbau des Objekt-Dialogs. Objektspezifische zusätzliche Zeilen/Funktionen bleiben nach dem ursprünglichen Objekt-Dialog-Vertrag erlaubt, dürfen die gemeinsamen Controls aber nicht anders aussehen oder bedienen lassen.

**Verbindliches neues QA-Gate:** Für jeden der vier Dialogtypen und für iPhone (320/375/390), iPad und Desktop im echten Chromium-/WebKit-Browser (zusätzlich zur realen Safari-Abnahme) die Dialogrechtecke vor/nach jedem offenen Untermenü vergleichen, die sichtbare Menüunterkante mit der **tatsächlich gemessenen Oberkante der unteren Funktionsleiste** vergleichen, Hit-Testing der auslösenden Schaltfläche und aller übrigen Footer-Aktionen durchführen, erneuten Klick/Tap zum Schließen testen sowie geräteübergreifende Style-/Bounding-Rect-/Interaktionsparität der gemeinsamen Elemente prüfen. Testdaten mit wenigen und vielen Ebenen und Tastatur-/VisualViewport-Zuständen einschließen. Dies ist ein **neuer Nutzervertrag**, kein bereits durch ältere grüne v259-Gates nachgewiesener Zustand; bis Implementierung und Prüfung offen.


## Verbindlicher Ausnahmekatalog A01–A08 – Objekt-Dialog-QS (18.11.2026)

Die folgenden acht bereits fachlich beschlossenen Unterschiede sind die **explizite Positivliste** für das Objekt-Dialog-QA-Audit. Sie genehmigen **keine** unterschiedlichen Standardlayouts oder parallelen Implementierungen gemeinsamer Funktionen. Die Pin-Bearbeitung ist die gemeinsame visuelle Referenz.

| ID | Ausdrücklich definierter Unterschied | Geltungsgrenze |
| --- | --- | --- |
| A01 | „Navi extern“ und „pin2map Routing“ | Nur Pin; keine Platzhalterzeile oder Höhe bei Fläche/See/Fluss. |
| A02 | „Pin verschieben“ vor der Ebenenwahl | Nur Pin; separater bewusst bestätigter Verschiebemodus. |
| A03 | Meteo-Button und Wetter-Mittelzeilen-Overlay | Bisher Pin-spezifischer Platzhalter; gemeinsamer Overlay-Port ist für explizit beauftragte Erweiterungen wiederverwendbar. |
| A04 | GPX-Zusatzfunktionen/-zeile | Pin-spezifisch und nur bei entsprechend vorhandener Verknüpfung; vorhandene deaktivierte Funktionen bleiben deaktiviert. |
| A05 | Kanonische Objekttyp-Symbole | Pin, Fläche, See und Fluss dürfen unterschiedliche, vom zentralen Suchsymbol-Eigentümer gelieferte Symbole verwenden. |
| A06 | Objektspezifische Texte | Namens-, Notiz-, URL-Legenden sowie Löschfrage benennen den tatsächlichen Objekttyp. Keine Sonderbreiten oder andere CSS-Gestaltung. |
| A07 | Separater vergrößerter Notizeditor | Touch: Tastatur-/Bildschirm-Editor; Desktop mit feinem Pointer: großes zentriertes Fenster nach bestehendem Vertrag. Gemeinsame Implementierung für alle vier. |
| A08 | Interner Overlay-Portalhost | Pin-Picker als unabhängiger BODY-Overlay, Geometrie-Picker als absolut positioniertes Kind des Objekt-Dialogs. **Reines Implementierungsdetail**, kein anderer Look und keine andere Funktion. |

**Verbotene stillschweigende Ausnahmen:** Unterschiedliche gemeinsame Buttongrößen, Farben, Rundungen, Zeilenreihenfolge, Ebenenfilter, URL-Verhalten, unkontrollierte Hauptdialoghöhe, verdeckte Footer-Buttons, eigenständige iPhone-/iPad-/Desktop-Dialogvarianten und objektspezifische Kopien des Popup-Layouts. Responsive Viewport-/Safe-Area-/Tastatur-Anpassungen dürfen ausschließlich die gemeinsame Dialogfamilie innerhalb verfügbarer Fläche bedienen.

**QA-Freigabebedingung:** Für alle vier Typen und iPhone 320/375/390 px, iPad sowie Desktop gilt `popup.bottom <= footer.top`, tatsächlich erreichbare Footer-Buttons (Hit-Testing), erneuter Klick/Tap schließt Unterdialog, unveränderte `x/y/width/height` des Hauptdialogs sowie Parität der gemeinsamen Style- und Bedien-Eigenschaften. Die gerade beschlossene Footer-Grenze ist strenger als v259 `popup innerhalb des Hauptdialogs`. Alte grüne Tests, die nur `panel.bottom` prüften, sind dafür kein Beweis.
