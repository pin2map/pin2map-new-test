# Verbindliche Architektur: pin2map NEW

Status: beschlossen am 2026-11-09; technische Umsetzung wird schrittweise ergänzt. Dieses Dokument definiert **harte Modulgrenzen**, nicht nur Empfehlungen.

## Produktauftrag und Prioritäten

pin2map ist ein Informationswerkzeug zur räumlichen Verortung und Verknüpfung von Informationen durch **Pins, Flächen, Linien, Routen und Ebenen**. Es ist weder ein 3D-GIS noch ein Navigationssystem. Für die Hintergrundkarte hat die **Informationsdichte der bekannten OpenStreetMap-Standardkarte** Vorrang vor Offline-Experimenten. Ausgewählte Primärtechnik ist **Leaflet**. Der bestehende Protomaps-/MapLibre-Teststand bleibt als historische, getrennte Option erhalten. Keine Fotos.

**Die wichtigste Qualitätseigenschaft nach korrekter Funktion ist Änderbarkeit.** Eine Änderung an einer Funktion darf keine unerwarteten Änderungen in anderen Modulen erzwingen. Keine neue zentrale „Alles-in-einer-Datei“-Anwendung.

## Schichten und erlaubte Abhängigkeiten

```text
UI / Interaktionen / Dialoge
          │           │
          ▼           ▼
Use Cases / Anwendungsdienste ──► Karten-Port (Interface)
          │                               │
          ▼                               ▼
Domain: Pins/Ebenen/Geometrie      Leaflet-Adapter
          │
          ▼
Repository-Port (Interface) ───► IndexedDB-Adapter
          │
          └────► import/export (GeoJSON-kompatible Daten)
```

1. **domain/** enthält reine Datenstrukturen, Regeln und Geometriefunktionen. Keine Browser-APIs, DOM, Karte, Netzwerk, Uhrzeit, Persistenz oder UI-Texte. Eingaben und Ergebnisse sind einfache serialisierbare Daten; keine Leaflet-Objekte.
2. **application/** führt fachliche Anwendungsfälle aus (Pin erstellen/verschieben, Ebene ändern, Geometrie bearbeiten, Routen verwalten). Abhängigkeiten über explizite Konstruktor-Parameter bzw. Ports; keine direkte Kenntnis von HTML, Leaflet, IndexedDB oder Routing-Anbietern.
3. **adapters/map/** (vorläufig `map-adapter-leaflet.js`) setzt ausschließlich den Karten-Port um; nur hier dürfen Leaflet-API, Marker, Kartenereignisse und Raster-Layer auftreten. Der Adapter speichert **keine** Geschäftsobjekte und definiert **keine** Regeln für Pin-/Ebenenzugehörigkeit.
4. **adapters/storage/** stellt `loadProject`, `saveProject` und später versionierte Migrationen bereit. IndexedDB darf nur dort aufgerufen werden. Kein Modul darf die Persistenzstruktur stillschweigend ändern. Datenbankname, Version, Recovery und Migrationen sind dokumentierte Verträge.
5. **adapters/routing/** spricht später Valhalla/Transitous oder andere Routendienste an und gibt normalisierte GeoJSON-kompatible Geometrie und Metadaten zurück. Route ist **Fachdatenobjekt**, kein Leaflet-Polyline-Objekt.
6. **ui/** rendert Anzeigen, Dialoge, Menüs und Werkzeuge und meldet Aktionen an Anwendungsdienste. Ein UI-Element darf nicht unmittelbar in IndexedDB schreiben und keine Layer-/Pin-Geschäftsregel implementieren.
7. **app.js / composition root** verdrahtet Abhängigkeiten, lädt Module und registriert Start-/Fehlerbehandlung. Diese Datei soll beim weiteren Refactoring kleiner werden; neue Features gehören **nicht** direkt hier hinein.
8. Die **Service-Worker-/Offline-Schicht** darf lokale Fachdaten nicht als bloße Kartencache-Daten behandeln. Netz-, Karten- und Projektspeicher bleiben voneinander getrennt.

Das ist die Zielarchitektur. Die aktuelle Anwendung erfüllt noch nicht alle Grenzen (Stand 2026-11-09: `app.js` enthält insbesondere DOM, IndexedDB, Suche und Pin-/Ebenensteuerung). Dieses Defizit ist ausdrücklich bekannt und wird inkrementell in kleinen, getesteten Schritten abgebaut.

## Stabiler Datenvertrag

- Pin: stabile `id`, `layerId` als **einzelner** Ebenenbezeichner, WGS84 `lat`, `lng`, veränderbare Metadaten.
- Es gibt immer die private Ebene `private`; **ein Pin gehört genau einer Ebene**. Keine Mehrfachzuordnung.
- Geometrie: `Point`, `LineString`, `Polygon`, später Multi-Geometrien nur nach eigener Entscheidung. Interne Punktnotation `{lat,lng}`; GeoJSON `[lng,lat]`. Ein Geometrieobjekt gehört zum Projekt, nicht zum Karten-Renderer.
- Flächen, Linien und Routen dürfen eigene Fachmodelle/Schemaversionen haben, statt als besondere Leaflet-Marker kodiert zu werden.
- Routing-Berechnung, Anzeige und Speicherung sind drei voneinander unabhängige Verantwortlichkeiten.
- Datenänderungen benötigen Schema-Migration, Rückwärtskompatibilitätsprüfung und Verlustschutz, bevor der vorhandene Browser-Datenspeicher verändert wird.

## Konkrete Verbote

- Kein `L.*` und kein `maplibregl.*` außerhalb Kartenadapter oder explizit isolierter Kartenexperimente.
- Kein `indexedDB`, `localStorage`, `fetch` oder DOM in `domain/`.
- Keine direkten Imports von `ui/`, `app.js` oder `adapters/` in `domain/`.
- Keine Wiederverwendung privater Leaflet-Objekte (`_latlng`, `_map`, `_leaflet_id`) in Fachlogik.
- Kein direkter Datenbankzugriff aus Geometrie-, Such-, Karten- oder Pin-UI-Modulen.
- Kein Cross-Feature-Import ohne definiertes Interface; keine zyklischen Abhängigkeiten.
- Kein „schneller Fix“ durch Kopieren von Regeln in mehrere Module.
- Keine stillschweigende Einführung von Fotos, 3D, allgemeinen GIS-Analysen oder automatischen Offline-Karten-Downloads.

## Änderungsvorgang – verpflichtend

1. **Änderung zuordnen:** Ein neuer fachlicher Effekt kommt zuerst in die Domain-/Use-Case-Schicht. Änderungen am Kartenstil bleiben im Adapter; Dialoganpassungen in UI; Datenmigration im Repository.
2. **Verträge dokumentieren:** Ein- und Ausgaben sowie Fehlerfälle festlegen. Neue Abhängigkeit schriftlich begründen, bevor sie eingeführt wird.
3. **Modultest:** Neue Fachregeln ohne Browser/Kartenbibliothek testen.
4. **Integrationstest:** Karten-, Speicher- und UI-Seiten jeweils gegen ihren Port prüfen; berührte Basisfunktionen nachtesten.
5. **Abnahme:** Nutzerdaten auf dem bisherigen Branch nicht durch neue Testdatenbanken überschreiben. Bestehende stabile Referenzen unberührt lassen.
6. **Merge-Gate:** Keine Übernahme nach `main` ohne gesonderte Nutzerfreigabe und erfolgreiche Tests. Referenzstände nie rückwirkend verändern.

## Jetzt begonnener erster Refactoring-Schritt

Entwicklungszweig: `feature/leaflet-modular-core`, **nicht `main`**. Er wurde aus dem MapLibre-Entwicklungszweig abgezweigt, um den bereits vorhandenen `map-adapter-leaflet.js` zu übernehmen. Experimentdateien bleiben damit zunächst im Branch-Verlauf, werden aber nicht Teil der aktiven Leaflet-App; die Bereinigung erfolgt erst gezielt und kontrolliert.

- `domain/project-model.js`: reine Defaultdaten, Textnormalisierung, WGS84-/GeoJSON-Punktkonvertierung und Regel für genau eine Ebene je Pin.
- `app.js`: ruft Domain-Funktionen auf; enthält **keine** direkten `L.*`-Aufrufe mehr, muss aber für Speicherung, Suche, Fachfunktionen und UI noch aufgeteilt werden.
- `map-adapter-leaflet.js`: einzige aktive Leaflet-Implementierung im Startpfad.
- Automatisierte **Architektur-Wächter** und reine Domain-Tests werden an diesen Entwicklungszweig gebunden.

## Zusätzlicher technischer Entschluss

**Nicht zwischen Leaflet und MapLibre abstrahieren, nur um zwei Engines zu unterstützen.** Der Karten-Port bleibt gerade so klein wie die tatsächlichen Anforderungen an Pins, Flächen, Linien, Routen und Viewport. Seine Aufgabe ist, Fachlogik von einem Renderer zu entkoppeln, nicht ein vollständiges Universal-Kartenframework zu entwickeln.

Die bestehende informationsreiche Leaflet-V18-Referenz `reference/leaflet-v18-2026-11-09` und der abgenommene MapLibre-Integrationsstand `reference/maplibre-full-integration-accepted-2026-11-09` bleiben unverändert.

## Inkrement 2: Speicheradapter ohne Datenmigration (2026-11-09)

- `adapters/storage/indexeddb-project-store.js` kapselt die bereits existierende Projektdatenbank. **Unveränderte Kennungen:** Datenbank `pin2map-new-v1`, Version `1`, Object Store `kv`, Schlüssel `appState`. Kein Datenexport, keine Migration, keine Schemaänderung.
- Das Hauptprogramm greift nur noch über `Pin2MapIndexedDBProjectStore.open()`, `loadProject()` und `saveProject(state)` darauf zu. Weder `indexedDB.open()` noch `db.transaction()` sind noch im aktiven `app.js`.
- `index.html` lädt Domänenmodell, Speicheradapter und Kartenadapter vor `app.js`.
- `tests/check-project-store.mjs` prüft die Datenbankkennungen und das Lese-/Schreibverhalten gegen eine isolierte Testimplementierung; `tests/check-architecture.mjs` verhindert direkten IndexedDB-/Leaflet-Zugriff aus der Anwendung und Browser-Abhängigkeiten in `domain/`. Workflow `.github/workflows/leaflet-modular.yml` ist auf diesen Zweig begrenzt.
- **Noch ausstehend:** tatsächlicher GitHub-Actions-Lauf sowie Browser-/PWA-Test der neuen Modulversion. `main`, Leaflet-V18- und MapLibre-Referenzen bleiben vollständig unverändert.

## Inkrement 3: Erste eigenständige UI-Shell (2026-11-09)

Aus `app.js` sind die reinen Oberflächenfunktionen **temporäre Meldungen, Panel-Wechsel, Panel-Schließen und Pin-Beschriftungsbutton-Darstellung** in `ui/shell.js` ausgelagert. Der UI-Baustein erhält ausschließlich eine DOM-Elementauflösung und Timer-Funktionen als Abhängigkeiten. Er kennt **weder Leaflet noch IndexedDB**, und übernimmt keine Pin-, Ebenen- oder Geometrieregeln.

- `ui/shell.js`: öffentliche API `showNotice(message)`, `hideNotice()`, `closePanels()`, `togglePanel(id)`, `closePanel(id)`, `updateLabelButton(visible)`, `dispose()`.
- `app.js`: meldet UI-Änderungen über diesen Baustein an; bestehende Schaltflächen, CSS-Klassen, Texte und Zeitsteuerung bleiben in diesem Refactor bewusst erhalten.
- `index.html`: lädt `ui/shell.js` vor dem Startcode; keine andere Web-Version geändert.
- `tests/check-ui-shell.mjs`: UI-Funktionsvertrag mit simulierten DOM-Elementen und Timern. `tests/check-architecture.mjs` kontrolliert die Abhängigkeitsrichtung und die Reihenfolge der geladenen Module. Beide sind in `.github/workflows/leaflet-modular.yml` aufgenommen.
- Quellcode-Syntax wurde isoliert geprüft und der Shell-Controller mit DOM-Mock ausgeführt. Ein vollständiger GitHub-Actions-Lauf sowie ein iPhone-Funktionstest dieser Branch-Version sind **noch nicht bestätigt**.

**Nächste Zerlegung:** Oberflächenzustand und Suchtreffer-Ansicht aus der zentralen Datei herauslösen, dann Pin-Editor und Ebenenpanel durch klar definierte UI-Verträge ersetzen. Anschließend erst die Bedienung der Vorgänger-App schrittweise nachbilden. Niemals zwei neue UI-Module gleichzeitig ohne Regression in das aktive Hauptprogramm integrieren.

## Inkrement 4: Suchergebnisansicht aus der Anwendung gelöst (2026-11-09)

- `ui/search-results.js` ist ein reines Präsentationsmodul mit `SearchResultsView` und den Operationen `show(results)`, `message(text)`, `hide()`, `isVisible()`. Benötigte Abhängigkeiten (`container`, `document`, `onChoose`, `titleOf`, `detailOf`) werden explizit injiziert; keine Kenntnis von Leaflet, IndexedDB, Netzwerk/Nominatim oder Pin-Erstellung.
- `app.js` delegiert jetzt Trefferliste, Schließknopf und Suchstatus-Darstellung an den UI-Baustein. Die bisherige Suchlogik (Throttle, Cache, Nominatim-Freigabe), Trefferformatierung, Auswahl eines einzelnen Resultats sowie das Anlegen eines Pins bleiben **absichtlich noch unverändert**, um zuerst eine minimale Regressionseinheit abzusichern. Die separierte UI kann später ohne Änderung der Nominatim- oder Pinlogik gestaltet werden.
- `tests/check-search-results.mjs` prüft leere/mehrere Treffer, Meldungen, Schließen und Auswahl-Callback anhand eines simulierten DOM. Der Architekturwächter verbietet Karten- und Storagezugriffe in UI-Modulen; der Leaflet-Modularisierungs-Workflow enthält Syntax-, Domänen-, Speicher- und UI-Regressionstests.
- Quellcode-Syntax und Ladenreihenfolge wurden geprüft; GitHub-Actions-Ergebnis sowie ein realer iPhone-Lauf dieses Entwicklungszweigs sind noch nicht bestätigt. `main` und Referenzversionen unverändert.
- **Folgearbeiten:** Suchstatus/Interaktion eindeutig in eigenem UI-State-Controller kapseln, danach Pin-Dialog- und Ebenen-UI aufteilen. Eine weitere Auslagerung von Suchdienst und Suchergebnisformatierung erfolgt separat; keine gleichzeitige Änderung an Kartenlayout oder Fachlogik.

## Inkrement 5: UI-Zustand und Pin-Editor-Ansicht getrennt (2026-11-09)

- Neu: `ui/ui-state.js` hält **ausschließlich temporäre UI-Daten** (`selectedPinId`, `moveMode`). Der Zustand gehört nicht zu den dauerhaft gespeicherten Projektdaten. Ein isolierter Zustandsvertrag mit Auswahl, Rücksetzen und Wechsel des Verschiebemodus ist vorbereitet.
- Neu: `ui/pin-editor.js` stellt die sichtbaren Pin-Eigenschaften in bereits vorhandenen DOM-Feldern dar, ohne Pins selbst zu verändern, Leaflet zu kennen oder Daten zu speichern. Das Modul erhält `getElement`, das Dokument und den Frame-Scheduler ausdrücklich von außen. Insbesondere bleibt die gerade fokussierte Namenseingabe beim Neuzeichnen erhalten.
- `app.js` liest/aktualisiert den UI-Zustand über `uiState` und ruft `pinEditorView.render(...)` auf. Die Pin-Bearbeitung und Geometrieänderung verbleiben vorerst in der Anwendung; nächster Schritt ist die Trennung ihrer fachlichen Anwendungsfälle.
- `tests/check-ui-state.mjs` und `tests/check-pin-editor.mjs` prüfen Auswahl-/Verschiebeübergänge, das Schließen, Feldwerte, Ebenensichtbarkeit und Eingabefokus. Syntax- und isolierte Funktionsprüfungen wurden durchgeführt. Die GitHub-Actions-Workflowdatei und die Architekturregeln sind ergänzt, die Modul-Ladereihenfolge in `index.html` geprüft und korrigiert.
- **Einschränkung:** Die komplette Browser-/iPhone-Regression dieses Branchs ist noch offen. Beim Umziehen von Zuständen verwendet `app.js` vorläufig noch direkte Eigenschaftszuweisungen an `uiState`; in einer späteren, getrennten Änderung können alle Übergänge über öffentliche Methoden geführt werden. Deshalb ist die architektonische Trennung begonnen, **noch nicht vollständig abgeschlossen**.
- Keine Datenbankschemaänderung, keine Änderungen an `main`, Referenzzweigen oder der aktiven Leaflet-PWA.

## Inkrement 6: Fachliche Pin-Operationen und kombinierbares Filtersystem (2026-11-09)

**Neue, in der aktiven Entwicklungs-Anwendung verdrahtete Module:**
- `application/pin-operations.js`: `findPin`, `createPin`, `renamePin`, `assignLayer`, `movePin`, `deletePin`. Der Aufrufer übergibt Projekt und Validierungsfunktionen. Keine Leaflet-, UI- oder Speicherzugriffe. Die Operationen mutieren aus Kompatibilitätsgründen das vorhandene Projekt und überlassen Speichern, Zeichnen und Dialoge explizit der aufrufenden Schicht; die Datenstruktur bleibt unverändert.
- `domain/pin-filter.js`: reine Funktionen `createFilter({matches})`, `isVisible(pin,layers,filter)`, `visiblePins(pins,layers,filter)`, `countByLayer(pins,layers)`. **Vorläufige Kernregel:** Sichtbarkeit der zugeordneten Ebene. Ein späteres, frei definierbares Kriterium kann separat über eine injizierte Prüffunktion wirken; welche Inhalte und Verknüpfungen die UI ermöglichen soll, ist ausdrücklich noch nicht entschieden. Versteckte Ebenen werden auch bei Texttreffer nie eingeblendet. Fehlt eine Ebene, ist ihr Pin nicht sichtbar. Kriterien außerhalb der Ebenen sind noch nicht beschlossen; die alte Textfeld-Annahme wurde zurückgenommen.
- `application/filter-operations.js`: `setLayerVisible(project,layerId,visible)` (keine vorgezogene Textsuchfunktion). Änderungen der Ebenensichtbarkeit erfolgen nicht mehr direkt im entsprechenden UI-Event. Ein Filter darf **niemals Pins löschen oder ihre Zuordnung verändern**.
- `app.js` nutzt Filter bei Pin-Zeichnung und „Alle Pins einpassen“ sowie fachliche Pin-Operationen beim Erstellen, Umbenennen, Umhängen, Verschieben und Löschen. Bisheriges Verhalten: **Textfilter nicht eingeschaltet**; die vorhandenen sichtbaren Pins hängen weiterhin allein von der Ebenensichtbarkeit ab.
- `tests/check-pin-filter.mjs`, `tests/check-filter-operations.mjs`, `tests/check-pin-operations.mjs` decken die Ebenensichtbarkeit, unabhängige künftige Filter-Prüffunktionen, Zählungen, Eingabevalidierung und Pin-Operationen ab. Die CI-Syntax- und Architekturprüfungen wurden entsprechend erweitert.

**Wichtiger Ausblick für eine spätere Filteroberfläche:**
- Der Karten-/Objektfilter ist **keine Ortssuche**. Nominatim-Ortssuche bleibt eigenständiges Modul; Welche Inhalte oder Felder später geprüft werden, ist ausdrücklich offen.
- Die Filterlogik wird auf zusätzliche Geometrietypen erst dann erweitert, wenn Flächen, Linien und Routen eigene Domainmodelle erhalten. Gemeinsamer Filterzustand/Kompositionsregeln werden dann ausdrücklich geprüft.
- Alle Entscheidungen über künftige Filterziele, Felder und Benutzerführung bleiben ausdrücklich offen. Filter bleiben bis zu einer anderslautenden Entscheidung flüchtige Darstellungsbedingungen, keine Veränderung von Projektobjekten.

**Abnahme:** JavaScript-Syntax und einfache isolierte Funktionsausführung wurden geprüft. Vollständiger GitHub-Actions-Lauf, End-to-End-Regression und iPhone-Test sind noch offen; keine Änderung an `main` oder gesicherten Referenzständen.

## Inkrement 7: Filter-Spezifikation geöffnet; Routingmodul vorbereitet (2026-11-09)

**Verbindliche Nutzerentscheidung:** Es wird **noch nicht** entschieden, welche Inhalte oder Objektarten spätere Filter durchsuchen, wie Suchkriterien zusammengesetzt werden oder welche Filterbedienung angeboten wird. Die frühere beispielhafte Festlegung auf `name`, `description`, `notes` war voreilig und ist aus `domain/pin-filter.js` und `application/filter-operations.js` entfernt worden. Derzeit wird ausschließlich die vorhandene Ebenensichtbarkeit tatsächlich angewendet. `createFilter({matches})` bietet lediglich einen optionalen, generischen, injizierten Prüfer ohne vorweggenommene Datenfelder. **Das ist kein Beschluss über künftige Filterlogik.** Keine Filter-UI für Inhalte aktiviert.

**Routing als eigenständiger Fachbereich:** `application/routing-service.js` stellt einen providerunabhängigen Koordinator mit den ausdrücklich genannten Verkehrsarten `car`, `pedestrian`, `transit` bereit. Über `register(mode, provider)` und `calculate({mode,...request})` sind jeweils unterschiedliche Dienste austauschbar. Ohne registrierten Dienst wird eine klare Fehlermeldung erzeugt. Das Modul kennt weder Leaflet noch HTTP, Endpunkte, Datenbank, UI oder Anbieterformate. **Noch keine Routingberechnung, keine Anbieterwahl, keine Strecke in der PWA.** Routen als dauerhaft gespeicherte Domainobjekte, Ergebnisnormalisierung und konkrete Routenalternativen folgen erst mit der Funktionsplanung.

Der Test `tests/check-routing-service.mjs` deckt die drei Verkehrsarten, fehlende Anbieter, unabhängige Anbieterwechsel und Übergabe der unveränderten Anfrage ab. Die bisherigen Filtertests wurden an die Entscheidung angepasst und zusammen mit dem Routingtest in `.github/workflows/leaflet-modular.yml` aufgenommen. Noch kein bestätigter kompletter Browser-/Actions-Lauf. `main` und Referenzzweige unverändert.

## Inkrement 8: Vorgänger-App systematisch untersucht (2026-11-09)

Der verbindliche Funktions- und Modulabgleich ist in **`docs/VORGAENGER_APP_MODUL_AUDIT.md`** hinterlegt. Grundlage ist die echte Vorgängerdatei `pin2map/pin2map:index.html` (ca. 790 kB Quelltext) mit nachgewiesenen Funktionen für Pins, Ebenen, Flächen, Flüsse/Gewässer, Routing inklusive Fahrrad, GPX, Filtern, Datenexport, Notizen/Links, Ortsrecherche und Wetter-/Höhen-/Sonnen-/Zeitzoneninformationen.

Die folgenden **fachlichen Reservierungen** ergänzen die verbindliche Modularchitektur:
- `application/watercourse-service.js` kapselt den künftigen Ablauf „Gewässer finden → Kandidaten entscheiden → OSM-Geometrie auflösen“. Künftig getrennte Domain für Wasserlaufobjekte und Topologie/Segmentzusammenbau; weder Map-Renderer noch Import-/Exportlogik gehören hinein.
- `application/geographic-information-service.js` reserviert getrennte Datenprovider für Wetter, Höhen, Sonnenzeiten/Tageslänge und weitere geografische Kontextdaten, ohne jetzt APIs, Berechnung, Aktualisierungsregeln oder UI festzulegen. **Diese beiden Reservierungen sind nicht in der PWA aktiv.**
- Das bestehende `application/routing-service.js` bleibt providerneutral; die Vorgänger-App weist zusätzlich **Fahrradrouting** nach. Der Modus ist daher als inaktive Option im Koordinator reserviert; keine Anbieteranbindung oder tatsächliche Routenberechnung.
- Referenz-Funktionen werden **nicht** per Copy-and-Paste in NEW übertragen: erst Fachmodell, Provider-/Speicherports, UI und unabhängige Tests, dann Einzelfunktionsabnahme.

Die ermittelten Moduldefizite sind kein Grund, die Oberflächenentwicklung zu blockieren: **Die Ebenenverwaltung ist inzwischen in `application/layer-operations.js` und `ui/layer-view.js` getrennt**; als Nächstes folgt die sichtbare UI-Arbeit mit Vergleich zur Vorgänger-App. Fluss-, Wetter- und Routingfunktionalität folgen erst in der vorgesehenen Funktionsphase; jetzt werden ausschließlich ihre Grenzen gesichert.

`tests/check-future-services.mjs` und die CI-Datei `.github/workflows/leaflet-modular.yml` prüfen die Reservierungsports. Der vollständige Actions- und iPhone-Lauf bleibt gesondert zu bestätigen.

## Inkrement 9: Architekturaufnahme abgeschlossen, UI-Gate vorbereitet (2026-11-09)

Die systematische Vorgänger-Inventur ist in `docs/VORGAENGER_APP_MODUL_AUDIT.md` aktualisiert. **Die ausdrücklich gestrichene Screenshotfunktion wird nicht übernommen; Fotos sind nicht geplant.** Filterziele bleiben unentschieden. Der historische Fahrrad-Routingmodus ist als nicht aktivierter Providerplatz in `application/routing-service.js` erfasst.

Die bereits vorhandene Trennung von Ebenenoperationen (`application/layer-operations.js`) und Ebenenansicht (`ui/layer-view.js`) ist in die Architekturkontrolle aufgenommen. Ihre isolierten Regressionstests sind `tests/check-layer-operations.mjs` und `tests/check-layer-view.mjs`. Der tatsächliche Browser-/iPhone-Test und ein bestätigter GitHub-Actions-Gesamtlauf stehen weiterhin aus.

**Einheitliche Bezeichnungen für spätere Fachbereiche:** `application/geographic-information-service.js` und `application/watercourse-service.js` sind die einzigen kanonischen Providergrenzen. Keine konkurrierenden Parallelmodule für „environment“, „location-context“, „river“ oder „watercourse“ anlegen. Diese Ports sind noch nicht mit der PWA verbunden. Ihre späteren inneren Komponenten (OSM-Suche, Topologie, Cache, Wetterprovider, Höhenprovider, Sonnenberechnung, Zeitzone, Anzeige) bleiben unabhängig.

**Nächster Schritt:** Benutzeroberfläche in kleinen, abnehmbaren Schritten an der Vorgänger-App messen, beginnend mit Shell/Bedienkontrollen und Pin-Dialog. Ein sichtbarer UI-Schritt darf keine ungetesteten Änderungen an Pin-Domain, Filterregeln, Persistenz oder Routing enthalten.


## v149 – austauschbarer Pin-Detailbereich als Vorarbeit für Flächen (2026-11-12)

`ui/pin-details.js` besitzt ausschließlich die Präsentation und den temporären Notizen-/URL-Ansichtsmodus. Änderungen an den Pin-Daten geschehen über `application/pin-operations.js` (`updateDetails`); `app.js` bleibt Kompositionswurzel mit injizierten Speicher- und Navigationscallbacks. `ui/pin-editor.js` stellt vorhandene Datumswerte dar. `ui/pin-layer-picker.js` behält die native Select-Change-Schnittstelle; nur das Trigger-Layout wird als Rundbutton mit Farbpunkt dargestellt. Geänderte CSS-Eigentümer bleiben auf `#pinPanel` eingegrenzt. `ui/pin-details.js` wird in `index.html` und `sw.js`-`CORE` gemeinsam geführt; der Preview-Paketvertrag v148 bleibt unverändert. Für den künftigen Flächendialog wird die fachliche Daten-/Geometrieverantwortung separat geplant, kein Copy-and-Paste eines Pin-Monolithen.


## v151 – Darstellungsebene als Viewport-Portal, ohne Verletzung der Modulgrenzen (2026-11-12)

`ui/pin-layer-picker.js` verschiebt ausschließlich den DOM-Knoten `#pinLayerMenu` in `document.body`; dessen Berechnung verwendet ausschließlich DOM-`getBoundingClientRect`, den sichtbaren Viewport und begrenzte Pixelkoordinaten. Es gibt weiterhin **keine** Abhängigkeit der UI von Leaflet, IndexedDB oder Domain. Der bestehende Native-Select-Change-Port bleibt die einzige Zuordnungsschnittstelle. Das Menü wird bei Außenklick und Escape geschlossen und bei Viewport-Resize neu positioniert. Seine Stile sind auf `#pinLayerMenu` begrenzt; das Popup ist unabhängig von Clipping/Scrollbarkeit des Pin-Dialogs.

Die Vergrößerung/Neupositionierung des Pin-Dialogs selbst bleibt in `ui/pin-panel-positioner.js` unverändert. Die gezielte Korrektur betrifft nur die widersprüchlichen alten CSS-Regeln, den neuen kompakten Designvertrag sowie reale Browser-Visual-Regressionen. Zeile 3 (Navigation/Routing) bleibt im Pin-Dialog **nicht gerendert**, für Flächen überhaupt nicht vorgesehen. Keine Änderung an Pin-Daten, Schichten, Speicherschema, Offline-Tile-Caches, Map-Adapter oder Projekt-Hydration.


## v153 – Pin-Dialog/URL-Overlay und inaktive Navigationsreihe (2026-11-12)

`index.html` enthält jetzt Fieldsets mit den Rahmen-Legenden „Pin Name“, „Navi extern“, „pin2map Routing“ und „Pin Notizen“; die fünf Navigations-/Routing-Buttons sind ausdrücklich `disabled`, ohne Fach-/Event-Handler. Der bestehende `ui/pin-details.js`-Controller zeigt eine an `document.body` angehängte, am `#pinUrlButton` positionierte eigenständige URL-Überlagerung (max. 260px) mit derselben Viewport-Klemmungsidee wie `ui/pin-layer-picker.js`, aber ohne Ersatz des Notizfelds. URL-Eingabe, Save/Cancel/Öffnen und Persistenz erfolgen weiterhin über die injizierten Ports aus `app.js` und `application/pin-operations.js`. Das bestehende Löschbestätigungsmodul bleibt unverändert; sein Trigger ist wieder der rote Button `#deletePin` links oben. `ui/pin-panel-positioner.js` erhöht nur das UI-Breitenmaximum von 310 auf 360px und lässt die Karten- und Ankergeometrie ansonsten unverändert.

Lokale SVGs in `ui/lucide-icons.js` tragen alle Sichtzustände ohne externes Font-/CDN-Runtime; spezielle Apple-Silhouette als SVG und Wikipedia-W als zeichengestaltete Kreisglyphe vermeiden defekte private Unicode-Codepoints. Vom globalen `body.pin-open`-CSS werden nur Kartenbuttons und geöffnete Menüs ausgeblendet; die `.elevation-label-wrap`, Pin-Marker und Leaflet-Namenslabels bleiben sichtbar. Keine Änderungen an Leaflet-Datenlayern, IndexedDB-Schema, Pin-Domain, Offline-Kachelcache oder Providerverträgen.


## v154 – URL-Textarea und unveränderte Zeitstempel-Domain (2026-11-12)

`index.html` enthält keine sichtbare `pin-meta-row` mehr; `ui/pin-editor.js` verarbeitet keine Datums-DOM-Knoten. Domain und Application behalten vorhandene `createdAt`/`updatedAt`-Mutation und Persistenz unverändert. `ui/pin-details.js` hält für den separat an `body` verankerten URL-Popup eine reine DOM-/Viewport-Fokus-Positionsmarke, sodass ein schrumpfender `visualViewport` bei Tastatureingabe nicht erneut die vertikale Popup-Position bestimmt. Die URL ist ein dreizeiliges `textarea` mit zwei rechteckigen Aktionen, aber weiter demselben injizierten Speicher-/Öffnungs-Port. Keine neuen Framework-, Kartenadapter-, Datenbank- oder Navigationsabhängigkeiten.


## v155 – modulare Markeransicht und optionale Pin-Dialogzustände (2026-11-12)

`ui/pin-marker-view.js` leitet rein präsentationsseitig den Status für Note, URL und GPX aus dem aktuellen Pin-Datensatz ab und erzeugt breite, sichere SVG-Markups sowie vertikal bündige Badge-Symbole. Der `map-adapter-leaflet.js` besitzt weiterhin allein `L.divIcon`, den 68×64px Trefferbereich, den stabilen Pin-Anker und den gegenüber der neuen Badge-Spalte versetzten Namenstooltip. Weder `domain/` noch `application/` erhalten Leaflet-/DOM-Verweise. Die DOM-Statussymbole erzeugen keine eigene Datenpersistenz oder Event-Fläche.

`ui/pin-details.js` hat die Ansichtsumschaltung Notizen/Wetter als UI-Zustand sowie ein bedingt sichtbares GPX-Aktionspaar ohne Handler. Eine GPX-Verknüpfung muss bereits am Pin existieren; eine entsprechende Datei-Verarbeitung wird nicht vorgetäuscht. Das URL-Popup bleibt DOM-only und öffnet zulässige externe Protokolle über den bereits injizierten Benutzerinteraktionsweg. `ui/pin-note-editor.js` ist ein neues, vollständig vom Fachmodell getrenntes UI-Modul; es erhält Wert, Pin-Name und Save-/Close-Callbacks, verwaltet Selektion/Datum/Zeit sowie das `visualViewport`-Layout für den mobilen Editor. `app.js` verdrahtet lediglich die schon vorhandenen `pinOps.updateDetails`- und Render-/Speicherports; `ui/map-overlay-layout.js` erfasst zusätzlich Viewport-Änderungen der iPhone-Tastatur.

Neue Module müssen sowohl in `index.html` als auch in der `sw.js`-`CORE`-Reihenfolge stehen; hier betrifft dies `ui/pin-note-editor.js`. Keine Änderung an IndexedDB-Schema, bestehender Pin-Identität, Offline-Tile-Policy, `main` oder `reference/*`.


## v156 – gezielte Kalibrierung innerhalb bestehender UI-Komponenten (2026-11-12)

Die Marker-SVG-Geometrie in `ui/pin-marker-view.js` (36×46) und die Leaflet-Hitbox/Anker-/Tooltip-Geometrie im `map-adapter-leaflet.js` (52×46) wurden gemeinsam verkleinert, ohne die Symbolstatus-Logik zu verändern. `ui/pin-details.js` verwendet für das URL-Portal denselben Trigger-basierten, innerhalb des Viewports geklemmten Überlagerungsgrundsatz wie `ui/pin-layer-picker.js`. Die größere Wetteransicht bleibt ein Anzeigezustand und nutzt den vorhandenen Sichtbarkeits-/Pan-Port.

Das Desktop-Vergrößerungssymbol wird durch die bestehende lokale Lucide-Sammlung bereitgestellt. `ui/pin-note-editor.js` besitzt weiterhin die gesamte Notizeditor-Ansicht und Cursor-Interaktion, zusätzlich die Darstellungsvarianten Desktop-Fenster vs. mobiles Visual-Viewport-Overlay; `app.js` verdrahtet nur den neuen Auslösebutton. Keine Daten-/Schemaänderung, keine neue Datenquelle, kein neues UI-/Build-Framework.
