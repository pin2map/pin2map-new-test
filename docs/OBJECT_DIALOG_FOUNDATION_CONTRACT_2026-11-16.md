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
