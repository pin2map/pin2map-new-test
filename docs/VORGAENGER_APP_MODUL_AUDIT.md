# Systematische Funktions- und Architekturprüfung der Vorgänger-App

Stand: 2026-11-09. Quelle: **`pin2map/pin2map`, `main`, `index.html`** (circa 790.000 Zeichen, 8.675 Zeilen, 491 `function`-Deklarationen / 448 unterschiedliche Funktionsnamen bei einfacher textueller Erhebung). **Die Vorgänger-App ist funktionale und visuelle Referenz – nicht die Architekturvorlage.** Ihre Funktionen werden neu nach Verantwortlichkeiten gebaut, nicht als alte Closures kopiert.

## Untersuchungsmethode und Aussagegrenzen

Die Referenzdatei wurde direkt über GitHub gelesen. Funktionsdeklarationen, konkrete Benutzerelemente und Implementierungsstellen wurden aufeinander bezogen. Besonders betrachtet: Pin-Popup, Notizen, Kategorien, Filter, Suche, Flächen, Flüsse, Routing, GPX, Wetter/Höhe/Sonnenzeiten/Zeitzonen, Import/Export und externe Integrationen. Die unten angegebenen Legacy-Funktionsnamen dienen als **Belege und Navigationshilfen**, nicht als künftig zu übernehmende API.

Dies ist eine strukturelle Bestandsaufnahme **des Quellcodes**, kein vollständiger manueller Test sämtlicher Arbeitsabläufe oder aller dynamisch angelegten Funktionen. Exakte Bedienparität muss später mit konkreten Vorgänger-App-Szenarien auf dem iPhone abgenommen werden. Es dürfen aus der bloßen Existenz einer Funktion weder Produktionsreife noch korrekte Berechnung abgeleitet werden.

Legende: **V** = im Vorgänger-Code nachgewiesen, **M** = im aktuellen Leaflet-Modularisierungszweig bereits als getrenntes Modul vorhanden, **P** = für neue Architektur erforderlich, aber noch nicht implementiert; **S** = Schnittstelle reserviert, ohne operative Funktion.

## Funktionsinventar → Zielverantwortung

| Referenzfunktion im Vorgänger | Belege aus `index.html` | Zielmodule, Trennlinie | Status |
|---|---|---|---|
| Hintergrundkarten, Kartenwahl und Karte/Gesten | `ensureMap`, `openMapInitially`, `syncMapStyleMenu`, `installMapPinGestures` | `adapters/map/leaflet`; `ui/controls`; `ui/gestures`; Karte nicht als Fachzustand | V / M teilweise |
| Pin-Erstellen, Verschieben, Umbenennen, Löschen | `addPinAt`, `p2mEnablePinMove`, `savePinName`, `deletePinById` | `domain/project-model`, `application/pin-operations`, `ui/pin-editor` | V / M teilweise |
| Pinnummern, Labels, Symbole/Badges | `pinNumberForItem`, `p2mSyncPinLabel`, `p2mSyncPinBadges` | `ui/pin-appearance`, `ui/labels`, Kartenadapter; fachliche Meta-Flags separat | V / P |
| Pinnotizen und Links, Zwischenablage | `pinNoteSave`, `pinNoteLink`, `pinNoteCopy`, `p2mCommitVisiblePinNote` | `domain/pin-metadata`, `application/pin-metadata`, `ui/notes`, `adapters/clipboard` | V / P |
| Kategorien/Ebenen, Symbole, Farben, Sichtbarkeit | `categoryDefinitions`, `openCategoryEditor`, `moveSourceLineToCategory`, `projectCategoryVisibility` | `domain/layers`, `application/layer-operations`, `ui/layers-panel` | V / M Sichtbarkeit; Rest P |
| Filter und temporäre Trefferdarstellung | `markFilterMatches`, `markFilterApplyOne`, `p2mRiverFilterMatches`, `p2mExportVisiblePins` | eigenständige **Filter-Domain** und Use Cases, UI-Filter, Export als separater Konsument; **Filterziele und Kriterien vorläufig offen** | V / M Ebenenfilter |
| Orts-/Pin-/Flächen-/Gewässersuche | `geocode`, `quick983Search`, `manualAreaSearch`, `river950Search` | Such-Dispatcher/Recherche-Ports, einzelne Geosuche, Flächensuche, Gewässersuche, Suchergebnis-UI | V / M Suchtreffer-UI; Rest P |
| Flächen suchen, finden, darstellen und bearbeiten | `area960Search`, `findAreasAt`, `polygonContains`, `openAreaNameEditor`, `simplifyAreaGeoJSON` | `domain/geometries`, `application/areas`, `adapters/osm-area-source`, `ui/area-editor`, Kartenadapter | V / P |
| Flüsse und andere Wasserläufe | `river953Find`, `river952WayCoords`, `river952Join`, `river955Choose`, `river959Render`, `p2mRiverFilterRefresh` | **`application/watercourse-service`** (S); getrennt: Name/Treffersuche, Identität/Relation, Segment- und Topologieauflösung, Geometrie, eigene Objekte/Metadaten, Filter und Darstellung | V / S |
| Linienstücke und Geometrien | `geometryCoordinates`, `simplifyAreaWithTolerance`, `river952Join` | `domain/geometry`, `domain/topology` oder klar begrenzte Spezialalgorithmen; keine Leaflet-Geometrie als Daten | V / P |
| Auto-, Fußgänger-, Fahrrad- und ÖPNV-Routing | `calculateRoute`, `calculateTransitRoute`; HTML-Schalter `data-route-mode="driving"`, `"bicycle"`, `"pedestrian"`, `"transit"` | `application/routing-service` (S: Auto/Fuß/ÖPNV); **Fahrrad als zusätzliche Referenzanforderung aufgenommen, Umsetzung nicht entschieden**; separate Provideradapter | V / S |
| Routenreihenfolge, Alternativen/Optionen, Etappen | `optimizeRouteOrder`, `reverseRouteOrder`, `routeOrderOptimal`-Bedienfeld, `updateRouteOrderButtons`, `transitGeometry` | `domain/route-itinerary`, `application/route-planning`, `ui/routing`; keine Provider- oder Kartenlogik | V / P |
| ÖPNV Abfahrt/Ankunft, Fahrzeugwahl, Umstiege | `calculateTransitRoute`, `transitTimeMode`, `transitVehiclePreference`, `transitExtraTransfer` | `domain/route-request`, `adapters/routing/transit`, `ui/routing-options` | V / P |
| GPX-Tracks einlesen, anzeigen, verknüpfen | `parseGpxText`, `p2mGpxKeyForPin`, `updateGpxTrackControls`, `removeImportedGpxTrack` | `adapters/import/gpx`, `domain/tracks`, `application/tracks`, `ui/tracks` | V / P |
| Routen als GPX exportieren | `exportRouteGpx`, `rememberRouteExport` | `adapters/export/gpx`; Route bleibt eigenes Fachobjekt | V / P |
| Projekte speichern/laden, importieren, zusammenführen | `savePin2MapProject`, `openPin2MapProject`, `p101ImportChoice`, `p101MergeTracks` | `application/project-transfer`, `adapters/import-legacy`, `adapters/export-project`, Schema-/Sicherheitsvalidierung und Konfliktbehandlung | V / P |
| Freigabe-URL und Datei-/Text-Export | `p2m106GenerateShareUrl`, `p2mExportPinData`, `p2mExportCopy`, `p2mExportVisiblePins` | `application/share-export`, `adapters/clipboard`, `adapters/files`; Auswahlsatz optional aus Filterport | V / P |
| Kartenbild/PNG-Export | `renderMapPng` | `application/map-export`, separater Rendering-/Canvasadapter; plattformspezifische Grenzen prüfen | V / P |
| Aktueller Standort, externe Karten, Wikipedia | `takeCurrentLocationAsPin`, `openMapy`, `openWikipediaForItem`, `openRouteInAppleMaps` | `adapters/geolocation`, `adapters/external-links`, `application/external-actions` | V / P |
| Wetter aktuell und Tagesmin/-max | `fetchPinTemperatures`, `fetchPinDailyTemperatures` (Open-Meteo) | `application/geographic-information-service` (S); separate Provideradapter, Batch-/Cache-Service, Anzeige unabhängig | V / S |
| Höheninformationen | `fetchMissingElevations` (Open-Meteo Elevation), `renderElevationLabel` | gleicher Geoinfo-Fachbereich, eigener Elevationsadapter; keine Übernahme alter Pin-`_pinLayer`-Abhängigkeit | V / S |
| Sonnenauf-/untergang, Tageslänge | `fetchPinSunTimes`, `p2mLocalDate` | Geoinfo-Fachbereich: Sonnenzeiten-Adapter und später **separate lokale Tageslängenberechnung**, Genauigkeit/Zeitzone erst spezifizieren | V / S; Tageslänge noch offen |
| Zeitzonen | `fetchPinZones` | Geoinfo-Fachbereich, separater Zeitzonenadapter und Cache | V / S |
| UI-Komponenten, Dialoge, mobile Touch-/Keyboard-Fälle | `pinPopupHtml`, `renderRouteEditor`, `renderElevationLabel`, `syncAreaDialogToKeyboard` | `ui/shell`, `ui/pin-editor`, `ui/search-results`, `ui/ui-state`, weitere spezialisierte Views | V / M teilweise |
| Wiederherstellung/Neues Projekt und Zustandsreset | `p2m1211NewMap`, `resetRoutingBeforeImport`, `openPin2MapProject` | `application/project-lifecycle`, getrennte Datenspeicherung, sichere explizite Reset-Abläufe | V / P |

## Warum gerade Flüsse ein eigenes Modul brauchen

Der Vorgänger-Code bestätigt mehrere *unabhängige Probleme*, die zuvor im selben globalen Zustand zusammenliefen:

1. **Treffersuche:** Mehrere Namen/Aliasse, OSM-Typ `way` oder `relation`, Nominatim/OSM-API-Kandidaten und geographische Nähe (`river953Find`, `river953Names`, `river953NameScore`).
2. **Auflösen der OSM-Geometrie:** Way-/Relations-Abfragen, Segmentlisten, Verbindung orientierter Teilstücke inklusive Umdrehen der Laufrichtung (`river952WayCoords`, `river952Join`). Das ist fachlich/topologisch und gehört nicht in einen Leaflet-Renderer.
3. **Benutzerentscheidung:** Gleichnamige Flüsse und konkurrierende Treffer müssen sichtbar unterschieden und bestätigt werden (`river955Choose`).
4. **Persistenz/Objektidentität:** Gespeicherte Flussdaten enthalten Name, Farbe, Ketten und Sichtbarkeit (`river959Saved`, `river959Render`, `openPin2MapProject`). Sie dürfen nicht bloß ein temporäres Leaflet-Layer sein.
5. **Filter/Darstellung:** Flüsse hatten eigene Unterebenen und eine Filterkopplung (`p2mRiverFilterMatches`, `p2mRiverFilterRefresh`). Die globale Filterentscheidung darf keine direkte Geometrie- oder UI-Abhängigkeit erzeugen.

**Zielteilung:** `watercourse finder` → `candidate chooser` → `geometry resolver / topology` → `watercourse domain object` → `repository` und `renderer adapter`. Eine eigene Gewässer-Use-Case-Schnittstelle koordiniert den Ablauf. Ob auch Bäche/Kanäle/Seen aufgenommen werden und wie Verläufe gewichtet werden, bleibt späterer Funktionsabnahme vorbehalten.

## Wetter, Höhe, Tageslänge und weitere geographische Informationen

**Eigener fachlicher Bereich** `application/geographic-information-service.js` (S), providerneutral und noch nicht aktiv. Die Vorgänger-App ruft Open-Meteo für Temperaturen, tägliche Min/Max, Sonnenzeiten, Zeitzonen und Höhen ab, mit aufgeschobenen Aktualisierungen und Batch-Verarbeitung. Nicht zu kopieren sind ihre direkten Verknüpfungen mit `it._pinLayer.getLatLng()` und gemeinsamen UI-Zustandsvariablen.

Zielgrenzen: `geographic info request` (Koordinate/Zeit) → **spezialisierter Adapter je Fähigkeit** → normalisiertes Ergebnis + Aktualitätsinformation → Cache/Fehlerbehandlung → Anzeige. Wetterdaten und statische Höhendaten erhalten unterschiedliche Cache-Lebenszyklen. Anzeigen wie Label, Pin-Dialog oder Liste müssen die gleiche fachliche Information wiederverwenden können. Wie die Tageslänge berechnet/angezeigt wird, entscheiden wir erst beim Feature; es gibt derzeit keinen Beleg für eine eigenständige `daylength`-Funktion im Vorgängercode.

## Weitere wichtige Trennungen, um das alte Chaos nicht zu übernehmen

- **Objekt ↔ Kartenlayer:** In der Vorgänger-App wird Fachinformation an Feldern wie `_pinLayer`, `_areaLayer`, `_elevationLayer` gehalten; die neue Fachdomain speichert ausschließlich normale Daten. Jeder Renderer rekonstruiert seine eigenen Layer.
- **Eigene Ortssuche ↔ Projektfilter ↔ Objektrecherche:** Nominatim-Adresssuche, Projektfilter, Flächen-/Fluss-/POI-Suche sind getrennte Use Cases mit möglicherweise gemeinsamem Suchfeld als reinem UI-Dispatcher.
- **Routing-Plan ↔ Berechnung ↔ Anzeige ↔ GPX:** Die Vorgänger-App mischt Order-Optimierung, URL-Aufbau, Kartenlinien und Export. Neues System verwendet unabhängige Ports und ein eigenes Routen-Datenmodell.
- **Geometrie ↔ Objektart:** Polygone, Flusslinien, GPX-Tracks und Routen verwenden grundsätzlich GeoJSON-kompatible Geometrien, aber behalten eigene fachliche Identität/Metadaten. Keine Sonderbehandlung als „Pin mit Spezialtyp“.
- **Import/Export ↔ Projektspeicher:** Import verarbeitet Legacy-Formate in einer Test-/Validierungsschicht, nicht direkt im laufenden globalen App-Zustand. Export hängt an einem expliziten Datensnapshot.
- **Feature-Caches ↔ Projektdaten:** Wetter/Geoinfo-Caches, OSM-Geometrie-Caches, Rasterkacheln und gespeicherte Projektobjekte haben getrennte Lebenszyklen und Speicherregeln.
- **Gesten ↔ Fachaktionen:** Longpress, Touch, Tastatur und Dialogpositionierung lösen nur definierte Aktionen aus. Die Pin-/Fluss-/Routenoperation selbst arbeitet ohne DOM/Touch-Ereignisse.
- **Alle Erweiterungen dürfen erst nach eigener fachlicher Abnahme verbindlich detailliert werden.** Die Inventarliste sichert Existenz und Wiederherstellungsziel, nicht das historische UI oder seine Fehler.

## Abgleich mit unserer aktuellen pin2map-NEW-Struktur

**Bereits als Modul im Entwicklungszweig:** `domain/project-model.js`, `domain/pin-filter.js` (gegenwärtig Ebenen), `application/pin-operations.js`, `application/filter-operations.js`, `adapters/storage/indexeddb-project-store.js`, `map-adapter-leaflet.js`, `ui/shell.js`, `ui/search-results.js`, `ui/ui-state.js`, `ui/pin-editor.js`. **Bereits als Test-/Fachports reserviert:** `application/routing-service.js`, `application/geographic-information-service.js`, `application/watercourse-service.js` – letztere werden noch **nicht** vom aktiven UI aufgerufen.

**Fehlende Module nach Priorität:** `application/layer-operations` und `ui/layers` als nächster kleiner Oberflächenschnitt; danach Pin-Labels/Popups/Notes, Suche, Geometrie und ihre Editoren, Flussrecherche, Tracks, Routenplan/Provider, Geoinformationen, Import/Export/Legacy, externe Integrationen. Synchronisation wird weiterhin **erst nach funktionaler Gleichwertigkeit** integriert.

**Referenzbesonderheit:** Der Vorgänger besitzt **Fahrradrouting**; bisher waren für NEW ausdrücklich Auto, Fuß und ÖPNV genannt. Fahrradrouting wird als Funktion in die Paritätsliste aufgenommen, aber nicht ohne gesonderte Entscheidung umgesetzt oder automatisch in den Routing-Koordinator eingefügt.

## Nächste abnehmbare Schritte

1. Diese Inventarliste als Funktionsreferenz stabil halten; bei späteren UI-Entscheidungen jeweils den passenden Vorgänger-Workflow konkret benennen.
2. Domain-, UI-, Provider- und Speichergrenzen per CI weiter erzwingen.
3. Wieder in der vereinbarten Reihenfolge die Oberfläche modularisieren; **zuerst Ebenenpanel und Ebenenaktionen**, ohne Verhaltensänderung.
4. Danach Bedienungsparität schrittweise am iPhone herstellen.
5. Fachliche Funktionsparität anhand dieser Liste; dann Synchronisation.

Keine Änderung an `main`, an stabilen Referenzzweigen oder am Projektformat während der Bestandsaufnahme.
