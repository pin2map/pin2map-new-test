# Kartenmigration: Leaflet → MapLibre + Protomaps

Status: **begonnen; Architektur und Referenz eingerichtet; keine Umstellung der produktiven Test-PWA**  
Datum: 2026-11-09

## Verbindliche Wiederherstellungsreferenz

- Repository: `pin2map/pin2map-new-test`
- Referenz-Branch: `reference/leaflet-v18-2026-11-09` (**nicht verändern oder löschen**)
- Exakter Referenz-Commit: `19bb1aafa5f7396c3f023136f68868e4a1a20ec6`
- Stand: Leaflet 1.9.4, PWA-Cache V18, bestehende Pins, Ebenen, Privat-Ebene, Dialoggeometrie, Verschieben, Offline-Cache und Refresh-Mechanismus
- Testseite: https://pin2map.github.io/pin2map-new-test/ – zeigt weiterhin `main`, nicht den Migrationszweig
- Wiederherstellung: Einen neuen Branch exakt vom obigen SHA erstellen, zunächst dort Regressionstests und Benutzeroberfläche prüfen; **niemals** unbesehen lokale IndexedDB-Daten überschreiben oder löschen. Anschließend nur nach expliziter Freigabe auf den Testzweig bzw. `main` übernehmen. Die Git-Referenz sichert den **Code**, nicht die lokal auf Geräten liegenden Pins und Ebenen.

## Ziele / Grenzen

1. **Gleiche Bedienung vor neuem Funktionsumfang:** Pins, eine Ebene je Pin, obligatorische Privat-Ebene, Suche, Kartensteuerung, Zoom per Pin-Langdruck, Pin-Verschieben mit expliziter Bestätigung, Dialog-Spitze und Dialog-Autoausrichtung beim Öffnen müssen erhalten bleiben.
2. **Datenmodell unabhängig von der Kartenbibliothek:** Pins speichern `{id,lat,lng,name,layerId}`, nicht Leaflet- oder MapLibre-Objekte. Routinggeometrien intern in GeoJSON mit `[lng,lat]`.
3. **Kartenschnittstelle zwischen Anwendung und Renderer:** Die Oberfläche darf nicht unmittelbar an Leaflet-/MapLibre-Methoden geknüpft sein. Es gibt zunächst einen Leaflet-Adapter; MapLibre wird erst in einem separaten Prototyp eingebaut und erst nach Vergleich übernommen.
4. **Routing unabhängig vom Renderer:** Valhalla-Polyline6 und Transitous/MOTIS-Geometrien werden separat in GeoJSON konvertiert. Eine Basemap-Quelle bestimmt nicht die Routinggeometrie. Anbieter und Datenstände können abweichen.
5. **Offline zuerst klein:** PMTiles im Prototyp mit **einer kleinen, rechtlich zulässig gewonnenen Testregion** prüfen. Download im iPhone-Browser, lokale Speicherung, Range-Lesen, Speicherlimits und kompletter Flugmodus-Neustart müssen gesondert getestet werden. Keine Behauptung, dass PMTiles-Ranges automatisch voll offline sind.
6. **Keine Fotos** und keine Änderungen am bestehenden IndexedDB-Datenbestand, solange Migration nicht verifiziert ist.
7. **Qualitätsregel:** Syntax, CSS-Kaskade, sichtbare Oberfläche und Regressionen vor Fertigmeldung prüfen. Nicht tatsächlich geprüfte iPhone-Bedienung benennen.

## Vorgesehene Schnittstelle: MapAdapter

Der folgende Vertrag ist rendererunabhängig. Methodenbezeichnungen sind zunächst eine **Spezifikation**, keine bereits integrierte Implementierung.

| Methode | Zweck |
| --- | --- |
| `mount(element, {center,zoom})` / `destroy()` | Karte initialisieren / entfernen |
| `getViewport()` / `setView({center,zoom})` | Kartenausschnitt lesen / setzen |
| `project({lat,lng})` / `unproject({x,y})` | geografische ↔ Bildschirmkoordinaten |
| `panBy({x,y}, options)` | Kartenverschiebung um Pixel |
| `setBasemap(id)` | Basiskarte wechseln |
| `setPins(pins, selectedId)` | Pins + Labels aus neutralen Anwendungsdaten zeichnen |
| `setRoute(geoJsonFeatureCollection)` | Geometrie von Valhalla/Transitous als eigene Overlay-Ebene anzeigen |
| `on('move'|'moveend'|'zoomend'|'pinClick'|'pinLongPress'|'mapLongPress', callback)` | Ereignisse, für Touch und Maus |
| `fitBounds(bounds,padding)` | Kartenausschnitt an Pins/Routen anpassen |
| `showMovePreview({oldPosition,newPosition})` / `hideMovePreview()` | Geometrische Vorschau beim Verschieben, ohne Änderung der Daten |

Koordinatenkonvention: Anwendungs-Pins haben `lat,lng` als Zahlen. Der Adapter behandelt die Bildschirmpixel; GeoJSON benutzt **[longitude, latitude]**, auch wenn Leaflet `[latitude, longitude]` erwartet.

## Arbeitsschritte und Abnahmekriterien

### A. Schnittstelle definieren und Leaflet kapseln
- [x] Referenz-Branch ab tatsächlichem V18-Commit
- [x] Separater Migrationszweig
- [x] Schnittstellenvertrag dokumentiert
- [~] Leaflet-Adapter als `map-adapter-leaflet.js` eingeführt: Ausschnitt, Projektion, Kartenschwenk, Zoom, Bewegungsereignisse, reguläre Pin-Marker, Pin-Klicks, Marker-DOM-Zugriff, Pan-Sperre beim Langdruck, Zoom am gehaltenen Pin, verschiebbare Vorschau-Marker und Verbindungslinie laufen nun über den Adapter. **Noch nicht vollständig rendererunabhängig:** DOM-spezifische Pointer-Gesten, deren Zustandslogik sowie die spätere vollständige MapLibre-Implementierung. Leaflet-CSS-Ausschlussselektoren befinden sich nur noch im Leaflet-Adapter.
- [~] Dialogpositionierung und Kartenbewegung nutzen Adapter-Projektion/Pan und Adapter-Ereignisse; normale Pin-Marker und Verschiebevorschau werden ebenfalls ausschließlich über den Adapter erzeugt und verändert. Die Basiskarten und Controls sowie Map-Klick-/Dragstart-/Zoomstart-Ereignisse werden inzwischen ebenfalls über den Adapter bedient.
- [ ] Reale Browser-Regressionstests mit Desktop + iPhone

### B. Unabhängiger MapLibre-/Protomaps-Prototyp
- [~] MapLibre GL JS 6.16.0 für den isolierten Online-Prototyp fest gepinnt (BSD-3-Clause); PMTiles-Abhängigkeit und Lizenzstände für Offline-Test noch offen
- [ ] Kleine, legale regionale PMTiles-Testdatei und Stil/Fonts/Symbole bereitstellen
- [~] Separater MapLibre-Adapter mit Projektion, Test-Pins und Labels sowie Zoom-Steuerung; Original-Pin-Dialoge, Gesten und Verschiebevorschau noch nicht integriert
- [ ] Leistungs- und Darstellungsvergleich auf iPhone
- [ ] iPhone-Offline-Neustart inklusive PMTiles-Speicherung erfolgreich testen

### C. Routing-Vorbereitung
- [ ] GeoJSON-Overlays als unabhängige Routingdarstellung
- [ ] Valhalla-Polyline6 mit Koordinaten-/Präzisionstests
- [ ] Transitous/MOTIS-Abschnitte, Haltestellen und mögliche fehlende Geometrien
- [ ] Anbieter, Netzverfügbarkeit, Limits und Datenschutzbedingungen klären

### D. Entscheidung und Integration
- [ ] Bestehendes Verhalten und Datenmigration gleichwertig nachweisen
- [ ] Speicher-, Lizenz- und Offline-Risiken bewerten
- [ ] Bewusst entscheiden, ob `main` zu MapLibre wechselt
- [ ] Rollback aus Referenz prüfen, ohne lokale Nutzerdaten zu verlieren

**Stand 2026-11-09:** Drei inkrementelle Umbauten in `feature/maplibre-protomaps` eingecheckt. Die Leaflet-Bibliothek ist weiterhin der einzige Renderer; `main` und die Referenz bleiben unangetastet. Der zusätzliche Adapter ist in der PWA-Shell V19 vorgemerkt. Ein echter Browser-/iPhone-Vergleich steht aus. MapLibre, Protomaps und ihr Offline-Verhalten sind noch nicht implementiert bzw. bestätigt.

## Inkrement 2: Marker und Pin-Bedienereignisse (2026-11-09)

- `createMarker`, `setMarkerPosition`, `getMarkerPosition`, `setMarkerAppearance`, `onMarker`, `removeOverlay`, `hasOverlay` und `getMarkerElement` kapseln die Marker. `onMarker` liefert bei `drag`/`dragend` eine reine `{lat,lng}`-Position.
- `createLine` und `setLinePositions` kapseln die Verschiebevorschau. `zoomAround`, `isPanEnabled`, `setPanEnabled` und `stopMarkerEventPropagation` kapseln Leaflet-Besonderheiten beim Pin-Langdruck.
- Die bewährte Gesten-Zustandsmaschine (550 ms, 11 px, Unterdrückung des folgenden Map-Klicks), Dialogposition und explizite Verschiebebestätigung bleiben erhalten. Die DOM-Pointer-Events selbst liegen noch in der Anwendung; ein zweiter Renderer benötigt vergleichbare Marker-Elemente oder eine einheitliche Gestenschicht.
- Statische UI-Prüfungen wurden auf die Adapter-Aufrufe umgestellt, ergänzende Adapter-Mocks hinzugefügt. Die Tests sowie echte Desktop-/iPhone-Interaktionen müssen nach diesem Commit **noch ausgeführt** werden; es wird kein bestandener Lauf behauptet.
- `main` und die schreibgeschützte Wiederherstellungsreferenz bleiben unverändert. Kein MapLibre-/Protomaps-Code in dieser Phase.

## Inkrement 3: Basiskarte, Map-Events und Controls (2026-11-09)

- Anwendung initialisiert die Karte über `Pin2MapLeafletAdapter.mount` statt `L.map`; Basiskartenwechsel läuft über `setBasemap('street'|'topo')`, inklusive ursprünglicher URLs, Attributionen und Maximalzoomstufen.
- Die bisherigen drei Zoom-Buttons werden unverändert als Leaflet-Control in `addZoomControls` aufgebaut. Die Oberfläche übergibt nur noch die Aktion `onFitAll`; Leaflet-DOM- und Event-APIs verbleiben im Adapter.
- `onMapClick` liefert ausschließlich `{lat,lng}`, statt eines Leaflet-Ereignisobjekts. `on('dragstart zoomstart', ...)` registriert und entfernt beide Kartenereignisse. `fitBounds`, `getContainer` und `unproject` übernehmen weitere direkte Kartenaufrufe.
- In `app.js` gibt es keine direkten `L.`- oder `map.`-Aufrufe mehr. Die bestehenden Pointer-Gesten funktionieren weiterhin über DOM-Elemente. Leaflet-Klassen wie `.leaflet-marker-icon` werden nur noch durch den Renderer-Adapter ausgewertet; die Pointer-Zustandslogik selbst befindet sich noch in `app.js`. Außerdem sind gerenderte Markerhandles bislang noch Leaflet-Objekte, aber für die App nur opake Handles.
- Statische Tests und Adapter-Mocks wurden erweitert. Die aktuellen GitHub-Dateien bestanden 84 statische UI-Checks und 37 Adapter-Assertions in einer isolierten JavaScript-Ausführung, die Node-Dateileseoperationen nachbildet; Syntax von `app.js` und `map-adapter-leaflet.js` geprüft. Der vollständige Node-Testlauf und reale Browser-/iPhone-Interaktionen bleiben offen.
- Kein Deployment nach `main`; V18-Referenz-Branch und lokaler IndexedDB-Datenbestand bleiben unangetastet.

## Inkrement 4: Rendererabhängige Gesten-Hit-Tests isoliert (2026-11-09)

- `app.js` verwendet für Langdruck und Kontextmenü nur noch `mapAdapter.isMapSurface(target)`; die CSS-Klassen von Leaflet zur Abgrenzung von Controls, Markern, Popups und Tooltips stehen ausschließlich im Leaflet-Adapter.
- Bestehende Gestenschwellen und Sicherheitslogik (ein Pointer, Bewegungsschwelle, Langdruck, Kontextmenü-Unterdrückung) bleiben unverändert.
- Isolierte Ausführung der Tests mit den aktuellen GitHub-Dateien: **86 statische UI-Checks und 41 Adapter-Assertions bestanden**, Syntax von `app.js` und `map-adapter-leaflet.js` geprüft. Der vollständige Node-, Desktop-Browser- und iPhone-Test ist noch offen.
- Für den MapLibre-Adapter ist eine eigene `isMapSurface`-Implementierung erforderlich. Eine echte iPhone-Abnahme ist erst sinnvoll, wenn ein unabhängiger Testzweig sichtbar bereitgestellt wird; `main` bleibt unangetastet.

## Inkrement 5: Isolierter MapLibre-Testaufbau (2026-11-09)

- Neue Dateien im Branch `feature/maplibre-protomaps`: `maplibre-prototype.html`, `maplibre-prototype.js`, `map-adapter-maplibre.js` und `tests/check-maplibre-prototype.mjs`.
- MapLibre GL JS **6.16.0** fest gepinnt, mit offiziellem `https://demotiles.maplibre.org/style.json`. Lizenz MapLibre GL JS: BSD-3-Clause. Demokacheln sind nur für den technischen Prototyp; ihre Nutzung ist keine Produktions- oder systematische Offline-Downloadfreigabe.
- Karteninitialisierung, `getViewport`, `project`, `unproject`, `setView`, `panBy`, `fitBounds`, Klicks, drei nicht gespeicherte Test-Marker, Labels und Zoom-Buttons im getrennten Prototyp. Es werden **keine bestehenden IndexedDB-Daten** geöffnet, gespeichert oder migriert und **kein Service Worker** registriert.
- JavaScript-Syntax des Adapters und Prototyp-Skripts geprüft; **17 isolierte Vertragsprüfungen bestanden**, insbesondere die korrekte Umrechnung zwischen `{lat,lng}` und MapLibre `[lng,lat]`.
- MapLibre v6 verlangt WebGL2. Echte Geräteprüfung, Rendering, Pin-Gesten, Dialog und Offline-/PMTiles-Test stehen aus. Dies ist bewusst kein funktionsgleicher Ersatz für die bisherige PWA.
- GitHub Pages zeigt weiterhin `main`. Die neue `maplibre-prototype.html` liegt nur im Entwicklungszweig und ist **noch nicht über einen eigenen GitHub-Pages-Testlink veröffentlicht**. Daher noch keine Nutzerprüfung anfordern.
- Nächster Schritt: isolierten Preview-Deploy einrichten, dann gezielte iPhone-Prüfung; anschließend Protomaps/PMTiles und verschiebbare Vorschau integrieren.

## Inkrement 6: Unabhängige Preview-Paketierung (2026-11-09)

- Neuer GitHub-Actions-Workflow `.github/workflows/maplibre-prototype.yml` nur für `feature/maplibre-protomaps`: prüft Syntax und drei bestehende Testskripte; bündelt bei Erfolg `maplibre-prototype.html` als `index.html` sowie `maplibre-prototype.js` und `map-adapter-maplibre.js` zum statischen Artifact `maplibre-isolated-preview` (14 Tage Aufbewahrung).
- Das Workflow-Artifact ist ein **bereitstellbares Dateipaket**, kein öffentlich erreichbarer Web-Link. Ein Hosting-Ziel ist noch nicht konfiguriert und darf keinesfalls die GitHub-Pages-Quelle von `main` ersetzen. Ein separater Preview-Host beziehungsweise ein eigenes Test-Repository ist vor einem iPhone-Test erforderlich.
- Workflow wurde eingecheckt; ein abgeschlossener GitHub-Actions-Lauf konnte im Chat nicht bestätigt werden. Die vorherigen 17 isolierten MapLibre-Vertragsprüfungen bleiben der aktuell dokumentierte letzte Testnachweis.
- Der Prototyp lädt extern MapLibre 6.16.0 und MapLibre-Demokacheln, ist damit nur online testbar und öffnet **keine** bestehenden IndexedDB-Daten.

## iPhone-Abnahme: isolierter MapLibre-Prototyp v4 (2026-11-09)

- Anwenderprüfung auf dem iPhone: Karte sichtbar, alle drei Test-Pins sichtbar und antippbar, Ein-Finger-Verschieben, Zwei-Finger-Zoom und Zoom-Schaltflächen funktionieren.
- Im ersten Test wurde der automatische Fit-Zoom als langsam erlebt; Doppeltipp auf die blaue Kopfzeile vergrößerte die ganze Webseite. Die zwischenzeitlichen Änderungen in den ursprünglichen URLs wurden offenbar nicht geladen (alte Statusmeldung im Screenshot).
- Unter dem neuen, cache-unabhängigen Einstieg `https://pin2map.github.io/pin2map-maplibre-preview/test-v4.html` mit eigenen v4-Dateinamen wurden die Änderungen vom Nutzer mit „funktioniert einwandfrei“ bestätigt. Damit gelten Doppeltipp-Verhalten und Zoomgeschwindigkeit **für den separaten v4-Prototyp auf dem getesteten iPhone** als abgenommen.
- Keine Aussage über allgemeine Gerätekompatibilität, Offline-Fähigkeit, bestehende Pin-Dialoge oder Datenmigration. `main` und die Leaflet-V18-Referenz wurden dafür nicht verändert.
- Nächster Entwicklungsschritt: bestehende Pin-Dialoge, Langdruck-Zoom und explizit bestätigte Verschiebevorschau über den MapLibre-Adapter herstellen; neue Funktionen zunächst nur im separaten Preview erproben.

## Inkrement 7: MapLibre-Testversion 5 – Pin-Interaktion (2026-11-09)

- Separates Preview: `https://pin2map.github.io/pin2map-maplibre-preview/test-v5.html`. Die zuvor abgenommene v4 bleibt unverändert abrufbar.
- `test-v5.html` und `maplibre-prototype-v5.js` im öffentlichen Preview-Repository; Quellkopien `maplibre-prototype-v5.html` / `maplibre-prototype-v5.js` im Entwicklungszweig.
- Test-Pins: Antippen öffnet/schließt den am Pin verankerten Bearbeitungsdialog. Name ist während der Sitzung änderbar. Pin-Langdruck ab 550 ms mit 11-px-Abbruchschwelle schaltet 18/14 am Pin um. Verschieben setzt zunächst nur einen separaten, per Karte oder Drag verschiebbaren Vorschau-Pin mit Verbindungslinie; erst ✓ ändert die Position, × verwirft die Vorschau.
- Diese Version ist **nur ein flüchtiger Interaktionstest**: drei fest programmierte Pins, keine IndexedDB, keine Ebenenverwaltung, keine Synchronisation, keine PMTiles-Karten und kein Offline-Betrieb. V5 ist noch **nicht funktionsgleich** mit der Leaflet-PWA; insbesondere sind die Dialog-Autoausrichtung an Bildschirmrändern und vollständig identische iOS-Pointer-Gesten noch zu prüfen.
- JavaScript-Syntax geprüft; 14 v5-spezifische statische Assertions bestanden. Echter Browser-/iPhone-Test der neuen Pin-Gesten **noch offen**. Keine Freigabe zur Migration auf `main`.

## Inkrement 8: Pin-Langdruck-Zoom am Bildschirmanker korrigiert (2026-11-09)

- Nutzerbefund in v5 auf dem iPhone: Pin liegt zu Beginn unter dem Finger, wandert nach dem Langdruck-Zoom an eine andere Bildschirmstelle. Andere v5-Funktionen wurden als funktionierend gemeldet.
- Ursache: MapLibre `jumpTo({zoom,around})` interpretiert den Anker `around` nicht als Teil seiner JumpToOptions. Stattdessen nutzt der v6-Adapter `zoomTo(zoom,{around:[lng,lat],duration:0,animate:false})`, das den geografischen Punkt am Bildschirmanker hält.
- Isolierte neue Dateien in `pin2map-maplibre-preview`: `test-v6.html`, `maplibre-prototype-v6.js`, `map-adapter-maplibre-v6.js`; entsprechende Kopien im Entwicklungszweig. Die abgenommene v4 und v5 bleiben erhalten. Kein Eingriff in `main` der Leaflet-PWA.
- Syntax von Adapter und Prototype sowie die Ankerargumente (Zoom 18/14; Koordinatenreihenfolge [lng,lat]) in einem JavaScript-Mock geprüft. Die tatsächliche iPhone-Bestätigung des Ankerverhaltens ist noch offen.

## Inkrement 9: iPhone-Diagnose für Pin-Zoomanker (2026-11-09)

- Nutzer: v6 scheint den Pin bei Langdruck-Zoom zu halten, ist auf flächig gefärbter Karte aber schwer optisch einzuschätzen. Noch keine eindeutige pixelgenaue Abnahme.
- Separater Diagnose-Prototyp: `https://pin2map.github.io/pin2map-maplibre-preview/test-v7.html` mit eigenen Version-7-Dateinamen. Gelbes, an der Ausgangs-Bildschirmposition feststehendes Fadenkreuz und Anzeige des Abstands zwischen Pin-Projektion vor und nach dem Zoom in Pixeln (Ziel nahe 0 px).
- Verwendet weiterhin `zoomTo(zoom,{around:[lng,lat],duration:0,animate:false})`; keine bestehenden PWA-Pins, Ebenen, IndexedDB oder Service Worker.
- JavaScript-Syntax und statische Verbindungen der Diagnosekomponenten kontrolliert. Noch keine iPhone-Abnahme von v7; Ergebnis muss auf dem Gerät bestätigt werden.

## iPhone-Nachtest MapLibre v7 (2026-11-09)

- Nutzer hat die Version 7 mit Fadenkreuz-/Pixelversatz-Diagnose auf dem iPhone getestet und bestätigt: **„funktioniert“**. Der Langdruck-Zoom wird damit funktional als abgenommen geführt.
- Der genaue numerische Pixelversatz wurde nicht übermittelt; daher keine unbelegte Zusage einer exakt gemessenen Abweichung von 0 px.
- Als nächstes: Pin-Dialoggeometrie an Bildschirmrändern sowie Verbindungslinie, Vorschau und Bestätigung beim Verschieben mit dem Leaflet-Referenzverhalten vergleichen. Dazu erneut eine isolierte Preview-Version verwenden, ohne `main`, Referenz-V18 oder Nutzerdaten zu ändern.

## Inkrement 10: MapLibre v8 – Dialog und Verschiebevorschau (2026-11-09)

- Separate Testseite: `https://pin2map.github.io/pin2map-maplibre-preview/test-v8.html`. Bestehende Version 7 und die Leaflet-PWA bleiben unberührt.
- Dialoggeometrie an Leaflet-Referenz angepasst: Dialog horizontal über dem Pin zentriert, obere Position = Pin-Y minus Dialoghöhe minus **76 px**; Dreiecksspitze bei Pin-Y minus **76 px**. Bei manueller Kartenbewegung bleibt der Dialog fest am Pin; keine Randbegrenzung und kein automatisches Verschwinden.
- Nur beim erstmaligen Öffnen wird anhand der tatsächlichen Dialog- und Dreiecksrechtecke die Karte bei Bedarf um Pixel verschoben, sodass der Dialog sichtbar wird. Die MapLibre-Pan-Richtung berücksichtigt die gegensätzliche Semantik zu Leaflet und darf nicht blind kopiert werden.
- Verschiebe-Bestätigungsleiste wird relativ zur neuen Pinposition, zur sichtbaren VisualViewport-Größe und zu den Bildschirmrändern platziert (unterhalb, wenn Platz ist, sonst oberhalb). Alter und neuer Pin werden über die unveränderte Verbindungslinie verbunden. Die ursprüngliche Position wird erst durch ✓ geändert.
- 13 v8-spezifische statische Prüfungen und JavaScript-Syntax bestanden. Ein echter iPhone-Test, insbesondere nahe allen vier Bildschirmrändern, steht **noch aus**. Weiterhin drei nicht gespeicherte Beispiel-Pins; keine IndexedDB, Ebenen, Synchronisation oder Offline-Funktion.

## Inkrement 11: Korrektur der Kartenverschiebung beim Öffnen von Rand-Pins (2026-11-09)

- iPhone-Befund zu v8: An sämtlichen Rändern verschwindet ein angetippter Pin infolge der automatischen Korrektur **weiter aus dem Bildschirm**, statt den Dialog sichtbar zu machen. Die übrigen Funktionen der v8 wurden als gut bestätigt. V8 ist deshalb **nicht abgenommen**.
- Neue eigenständige Vorschau `https://pin2map.github.io/pin2map-maplibre-preview/test-v9.html`: Beim erstmaligen Öffnen wird weiterhin der benötigte Pixelversatz des Dialogs ermittelt. Der neue Kartenmittelpunkt wird jedoch ausdrücklich mit `unproject(centerPixel.x - dx, centerPixel.y - dy)` bestimmt und durch `setView` ohne Animation gesetzt. Damit wird nicht mehr die möglicherweise falsch verstandene `panBy`-Richtung verwendet; eine reine Kamerabewegung verändert keine Pin-Koordinaten.
- Einfache Projektions-Mocks für links, rechts, oben und unten bestätigen das gewünschte Pixelvorzeichen. JavaScript-Syntax und eigenständige Version-9-Dateireferenzen geprüft. **iPhone-Randtest steht noch aus.**
- Frühere MapLibre-Versionen und Leaflet-PWA `main` sowie Referenz-V18 bleiben unverändert.

## iPhone-Abnahme der Randdialog-Korrektur v9 (2026-11-09)

- Nach anfänglichem HTTP-404 aufgrund noch ausstehender GitHub-Pages-Builds konnte der Nutzer die Version 9 aufrufen und bestätigte anschließend **„Funktioniert“**.
- Die Korrektur des falschen Kartenversatzes beim Öffnen randnaher Pins gilt damit auf dem getesteten iPhone als funktional abgenommen; die übrigen Funktionen von v8 hatte der Nutzer bereits als gut bewertet.
- Die temporäre Veröffentlichungsschwierigkeit war kein fehlender Repository-Inhalt: `test-v9.html` und die zugehörigen JS-Dateien lagen in `main` des Preview-Repositories; der Nutzer zeigte ausstehende Pages-Builds.
- Nächste Etappe: MapLibre-Adapter und eigentliche PWA schrittweise integrieren, ohne den abgenommenen Leaflet-Referenzstand oder die öffentliche Haupt-PWA zu verändern. Offline-/Protomaps-Funktionen bleiben noch gesondert zu implementieren und zu testen.

## Inkrement 12: Vollständige PWA auf MapLibre-Adapter aufgesetzt (2026-11-09)

- Der Nutzer hat die isolierte MapLibre-v9-Vorschau auf dem iPhone abgenommen. Für die Zusammenführung existiert nun ein **getrennter, bislang nicht auf dem iPhone getesteter Integrationskandidat** mit originaler Pin-/Ebenenoberfläche unter `https://pin2map.github.io/pin2map-maplibre-preview/full-maplibre.html`.
- Auf `feature/maplibre-protomaps` liegt `map-adapter-maplibre-integration.js` mit `setBasemap` für Straße/Topografie, GeoJSON-`createLine`/`setLinePositions`/`removeOverlay`, Wiederherstellung von Linien nach Stilwechsel und über Projektion normalisiertem `panBy`. Zusätzliche Quellen: `maplibre-full-integration.html`, `maplibre-full-integration-app.js`, `maplibre-full-integration.css`, `maplibre-full-integration-adapter.js`, `maplibre-full-integration-bootstrap.js`. Die veröffentlichte Vorschau verwendet unter `pin2map-maplibre-preview` eigene `full-maplibre.*`-Dateien.
- App-spezifische Änderungen: MapLibre statt Leaflet initialisieren; eigener IndexedDB-Datenbankname `pin2map-maplibre-integration-v1`, damit die bisherigen PWA-Daten nicht geöffnet oder überschrieben werden; **kein Service Worker**; Refresh-Schaltfläche der bisherigen Service-Worker-Logik deaktiviert. Die eigentlichen App-Funktionen einschließlich Pins und Ebenen bleiben als unveränderter Anwendungscode erhalten, soweit nicht ausdrücklich für die separate Vorschau angepasst.
- Basemaps sind weiterhin **online geladene Rasterkacheln** (bestehende OpenStreetMap- und OpenTopoMap-URLs) und ausdrücklich noch **keine Protomaps/PMTiles-Umstellung**. Der v9-Prototyp mit drei temporären Pins bleibt separat bestehen.
- Neuer Node-Vertragstest `tests/check-maplibre-full-integration.mjs` für Dateiverknüpfungen, getrennte Datenbank, Kartenwechsel, Koordinatenreihenfolge, Linienaktualisierung/-entfernung und Bildschirm-Pan; in GitHub Actions eingebunden. Dateiquellcode und Mock-Aufrufe wurden separat geprüft; tatsächliches Ergebnis eines GitHub-Actions-Laufs und echte Browser-Funktionsgleichheit sind **noch nicht bestätigt**.
- Kein Merge nach `main`, keine Änderung der Leaflet-V18-Referenz. Nächste Abnahme: Seite starten, Pin erstellen/auswählen, Dialog am Bildschirmrand, Pin-Verschieben mit ✓/×, Ebene wechseln, Kartenwechsel; danach entscheiden, welche Adapterabweichungen noch behoben werden müssen.

## Integrations-Nachtest 2: gestrichelte Verschiebelinie (2026-11-09)

- Der iPhone-Integrationstest der vollständigen MapLibre-PWA bestand für Start, Pins und Ebenen sowie die Verschiebung, **außer** dass die Verbindungslinie zwischen altem und neuem Pin nicht sichtbar war.
- Ursache im Adapter: `dashArray.split(/\\\\s+/)` wurde als falsch maskierter regulärer Ausdruck interpretiert. Korrigiert zu `dashArray.trim().split(/\\s+/).map(Number)`, sodass aus `"7 5"` das gültige MapLibre-Strichmuster `[7,5]` entsteht.
- Geprüft mittels isoliertem Adapter-Mock: Geokoordinaten `[[9,48],[10,49]]`, Paint-Property `line-dasharray: [7,5]`, JavaScript-Syntax OK.
- Cache-unabhängige neue Vorschau: `https://pin2map.github.io/pin2map-maplibre-preview/full-maplibre-v2.html` mit eigener Bootstrap- und Adapterdatei. Sie verwendet weiterhin die **getrennte** Integrations-IndexedDB; alte Leaflet-PWA und deren gespeicherte Daten bleiben unangetastet.
- Browserabnahme für die Darstellung der Linie ist noch offen.

## iPhone-Abnahme: vollständige MapLibre-Integration, Verschiebelinie (2026-11-09)

- Nutzer hat den Nachtest der separaten Integrationsvorschau `full-maplibre-v2.html` mit **„funktioniert“** bestätigt. Die zuvor fehlende rote gestrichelte Verbindungslinie ist damit im iPhone-Test funktional abgenommen.
- Vorher wurden bereits das Starten der Anwendung, Pin-Erstellung, Pin-Dialoge, Ebenen und die bestätigte Verschiebung als funktionierend gemeldet. Der neue Test bestätigt zusätzlich die Liniendarstellung.
- Die Integration verwendet weiterhin getrennte IndexedDB (`pin2map-maplibre-integration-v1`), Online-Rasterbasiskarten und keinen Service Worker. **Protomaps/PMTiles und Offline-Karten sind noch nicht umgesetzt.** Eine Freigabe der MapLibre-Integration auf `main` ist noch nicht erfolgt.
- Nächste Etappe: MapLibre-Integrationsstand gegen den bestehenden PWA-Funktionsumfang absichern, danach eigenständige Protomaps/PMTiles-Basiskarte im Entwicklungszweig vorbereiten und isoliert testen. Leaflet-V18-Referenz und Haupt-PWA bleiben unverändert.

## Inkrement 13: Abgenommene MapLibre-Integration eingefroren; PMTiles-Technikprobe (2026-11-09)

- Unveränderlicher Entwicklungs-Referenzzweig `reference/maplibre-full-integration-accepted-2026-11-09` aus `feature/maplibre-protomaps` **vor** den neuen PMTiles-Änderungen erstellt.
- Eigenständiger öffentlicher Preview-Referenzzweig `reference/maplibre-integration-v2-accepted-2026-11-09` aus `pin2map-maplibre-preview/main` erstellt. Die bestehende Leaflet-V18-Referenz und `pin2map-new-test/main` bleiben unberührt.
- Die nächste Stufe ist zunächst ein **separater technischer PMTiles-Vektorprototyp**, nicht die fertige Protomaps-Basiskarte: `https://pin2map.github.io/pin2map-maplibre-preview/pmtiles-experiment-1.html`.
- MapLibre GL JS 6.16.0, PMTiles-Browserbibliothek 4.5.0, `maplibregl.addProtocol("pmtiles",protocol.tile)` **vor** der Karteninstanziierung; kleines, von den PMTiles-Projektbeispielen dokumentiertes Florenz-PMTiles-Archiv; vier einfache Vektorlayer (water/buildings/roads/pois). Geodatenzugriffe sind online über das PMTiles-Archiv, nicht über einen lokalen Cache.
- **Kein** globales Protomaps-Kartenwerk, kein Download einer Region, keine vollständige Stylesammlung/Glyphs/Sprites, keine Höhen-Schummerung, keine Satellitenbilder und **noch kein Offline-Betrieb**. Karte ist ausdrücklich auf die Florenz-Testdatei begrenzt; weder Nutzerdaten noch Pin-/Ebenenmodelle noch die abgesicherte MapLibre-Integrationsversion werden dafür geändert.
- Syntax, Importreferenzen und Registrierung des Protokolls mit der Vektor-Style-Erstellung in JavaScript-Mocks kontrolliert. Neuer GitHub-Actions-Test `tests/check-pmtiles-experiment.mjs` ergänzt. Die echte Netzwerkverfügbarkeit der externen PMTiles-Testdatei und die tatsächliche Darstellung auf dem iPhone sind **noch nicht bestätigt**.
- Nach erfolgreichem Test: Protomaps-Stil, Abhängigkeiten von Fonts/Sprites, Hosting- und Range-Request-Fähigkeit sowie eine geeignete **eigens bereitgestellte** PMTiles-Region untersuchen. Erst danach Protomaps als auswählbare Basiskarte in den integrierten MapLibre-Stand aufnehmen, ohne die zwei bestehenden Rasterkarten zu entfernen.

## PMTiles-Experiment 1 auf Gerät bestätigt, Protomaps-Kartenstiltest 2 (2026-11-09)

- Nutzer hat Screenshot der Florenz-Testkarte geliefert: PMTiles-Protokoll aktiv, Wasserflächen blau, Gebäude grau und Straßen orange. Damit ist die grundsätzliche Darstellung des isolierten Vektor-PMTiles-Datensatzes bestätigt. Der Nutzer hat kein eigenes Ergebnis zu Verschiebe-/Zoomgesten mitgeteilt.
- Großflächig weiße Regionen sind teilweise der beschränkte räumliche Inhalt des Florenz-Samples; der erste Style verwendet nur vier einfache Vektorlayer. Kein Qualitätsmaßstab für die spätere Basiskarte.
- Eigenständiger zweiter Online-Kartenstiltest: `https://pin2map.github.io/pin2map-maplibre-preview/pmtiles-experiment-2.html`. Nutzt das öffentlich dokumentierte Protomaps-v4-Demo-PMTiles, `@protomaps/basemaps@5.7.2` mit `namedFlavor("light")` und `lang:"de"`; externe Protomaps-v4-Glyphs- und Sprite-Assets. Zeigt Stuttgart als Startpunkt, aber lädt Daten bedarfsgesteuert und ist **keine heruntergeladene/offline gespeicherte Weltkarte**.
- Protokoll, Style-Objekt, Vektorquelle, deutscher Beschriftungsparameter und JavaScript-Syntax mittels Mock kontrolliert. HTTP-Reichweite/Browserdarstellung stehen noch aus. Beide Testversionen sind isoliert und greifen nicht auf vorhandene Pins/Ebenen/IndexedDB der PWA zu.
- Danach: tatsächlichen Kartenstil auf Gerät bewerten; kontrollierte PMTiles-Dateien und offline verfügbare Font-/Sprite-Ressourcen separat planen. Nicht automatisch große Datensätze vom öffentlichen Demo-Server herunterladen.

## PMTiles-Kartenstiltest 2: „Load failed“ und Diagnoseversion 3 (2026-11-09)

- Nutzer-Screenshot: Die isolierte Protomaps-Light-Kartenstiltestseite 2 zeigt statt Stuttgart eine leere graue Karte mit `Kartenfehler: Load failed`. Daher ist **Test 2 fehlgeschlagen**; es darf keine funktionierende Stil-/Schrift-/Spriteintegration behauptet werden.
- Das öffentlich dokumentierte Beispiel nutzt `https://demo-bucket.protomaps.com/v4.pmtiles`, das laut anderen MapLibre/PMTiles-Beispieldokumentationen zeitweise nicht erreichbar ist. Der Screenshot allein identifiziert nicht eindeutig, welche URL fehlgeschlagen ist.
- Diagnoseversion 3 liegt separat unter `https://pin2map.github.io/pin2map-maplibre-preview/pmtiles-experiment-3.html`. Sie prüft die PMTiles-Header-Abfrage des Demo-Archivs, die Existenz der Stilbibliothek sowie die Sprite-JSON-Antwort und meldet Fehlerquellen differenzierter. Bei nicht erreichbarem Demo-Archiv zeigt sie die zuvor bestätigte einfache Florenz-Vektorkarte als Rückfalloption. Auch die Fehler des MapLibre-Renderers werden protokolliert.
- JavaScript-Syntax und Dateiverknüpfungen der Diagnoseversion 3 statisch geprüft; **Live-Abruf und tatsächliche Browserdarstellung sind noch offen**.
- Konsequenz: Für die stabile Protomaps-/Offline-Version sollen wir eigene PMTiles-Archive und die erforderlichen Assets kontrolliert bereitstellen. Keine Verfügbarkeit oder Offlinefähigkeit eines fremden Demo-Servers voraussetzen.

## PMTiles-Diagnose 3 – Browserbefund bestätigt (2026-11-09)

- Nutzer-Screenshot zeigt ausdrücklich: `PMTiles-Protokoll registriert`, `Protomaps-Stilbibliothek: OK`, `Stuttgart-Demo-PMTiles: FEHLER (Load failed)`. Der Florenz-Rückfall hat erfolgreich gerendert.
- Deshalb ist der konkrete Ausfall **beim Abruf des öffentlich verwendeten v4-Demoarchivs** lokalisiert; die Stil- und Sprite-Darstellung auf Stuttgart wurde in diesem Test nicht durchlaufen und ist nicht als fehlerfrei bestätigt. Nicht ohne weitere Daten auf eine allgemeine MapLibre-/PMTiles-Inkompatibilität schließen.
- Architekturentscheidung für die nächste Phase: eine eigene, versionierte, auf eine kleine geografische Testregion begrenzte Protomaps-PMTiles-Datei bereitstellen. Die Protomaps-Dokumentation empfiehlt, Planet-Builds in eigenen Storage zu kopieren statt Build-/Demo-URLs in Anwendungen zu hotlinken. Auszüge können per `pmtiles extract URL region.pmtiles --bbox=west,south,east,north --maxzoom=...` erstellt werden. Dem Browser sind die Datei und alle Glyph-/Sprite-Assets mit korrektem CORS und HTTP-Range-Support bereitzustellen.
- Ein eingebundener Online-PMTiles-URL allein ist noch **keine Offline-Karte**. Offline-Funktionalität wird als gesonderter kontrollierter Download und persistente lokale Aufbewahrung einer ganzen Region (einschließlich Font-/Sprite-Dateien) konzipiert und auf iOS gegen Speicher-/Quota-/Eviction-Verhalten getestet.
- Die bereits abgenommene integrierte MapLibre-PWA, der Florenz-Prototyp und die Leaflet-V18-Hauptreferenz bleiben unberührt. Die Stuttgart-v2-Seite ist wegen der externen, nicht erreichbaren Quelldatei nicht abgenommen.

## Inkrement 14: Kontrollierter Stuttgart-PMTiles-Build (2026-11-09)

- Nach dem nachgewiesenen Ausfall des alten öffentlichen Stuttgart-Demo-Archivs ist im Preview-Repository der Workflow `.github/workflows/build-stuttgart-pmtiles.yml` angelegt. Er soll bei Push der Workflow-Datei oder manueller Auslösung in GitHub Actions ein kleines **selbst extrahiertes Archiv** erzeugen – **kein automatisches Pages-Deployment**.
- Als Archivquelle wird die fest adressierbare Source-Cooperative-Kopie `https://data.source.coop/protomaps/openstreetmap/v4.pmtiles` verwendet (v4, Stand des Mirrors älter als aktuelle Tages-Builds). Der Extraktionsbereich `9.12,48.72,9.25,48.82` umfasst die Stuttgarter Innenstadt, `--maxzoom=12`; die Ausgabe wird auf 80 MiB begrenzt.
- CLI in GitHub Actions `go-pmtiles@v1.31.2`; der Build soll `pmtiles verify`, Header-/Metadatenexport und SHA-256-Prüfsumme ausführen. Ausgabe nur als 14 Tage verfügbares Artifact `stuttgart-pmtiles-z12`.
- Vollständiger, nachvollziehbarer Ablauf und spätere Freigabegates stehen in `docs/PMTILES-STUTTGART.md`. Die erfolgreiche **Durchführung** des ersten CI-Laufs und das Vorhandensein einer tatsächlich erzeugten `.pmtiles`-Datei sind noch **nicht bestätigt**.
- Kein Merge nach `main`, keine Änderung des zuvor auf dem iPhone abgenommenen Kartenadapters und keine Behauptung von Offline-Unterstützung.

## Inkrement 15: PMTiles-Build stabilisiert und Dateivorschau vorbereitet (2026-11-09)

- Vorheriges GitHub-Actions-Skript um explizite Kontrolle des CLI-Namens nach `go install` ergänzt (`go-pmtiles` → `pmtiles`) und einen `pmtiles version`-Aufruf eingebaut. Der korrigierte Workflow liegt ausschließlich im Preview-Repository; keine Auswirkungen auf die bestehende MapLibre-PWA.
- Der v4-Quellpfad auf Source Cooperative und die offiziellen PMTiles-CLI-Befehle sind dokumentiert bestätigt. **Erfolgreicher Workflow-Lauf, Artifact und Ausgabegröße konnten noch nicht unabhängig bestätigt werden.**
- Eine zusätzliche, vom bestehenden Prototyp getrennte Testseite `pmtiles-local-file-check.html` nutzt die Browser-`File`-API und `pmtiles.FileSource`. Die PMTiles-Datei bleibt dabei lokal auf dem Gerät; sie wird nicht hochgeladen, nicht in IndexedDB kopiert und nicht automatisch synchronisiert. Die Testseite lädt weiterhin Stilbibliothek, Fonts und Sprites online.
- Die geprüfte MapLibre-Integration, das normale `main` sowie die Referenz Leaflet-V18 bleiben unverändert.

## Inkrement 16: Automatische Qualitätsprüfung für eigene Stuttgart-PMTiles (2026-11-09)

- Der Workflow `pin2map-maplibre-preview/.github/workflows/build-stuttgart-pmtiles.yml` validiert jetzt zusätzlich das Ausgabeformat (`mvt`), konsistente Zoomgrenzen bis maximal 12, die räumliche Überlappung mit Stuttgart, JSON-Metadaten und die Größenbegrenzung bis 80 MiB. Zusätzlich zu `pmtiles verify` gibt es eine SHA-256-Prüfsumme.
- Der GitHub-Actions-Lauf erhält eine lesbare Schrittzusammenfassung mit Archivname, Größe, Zoomstufen, geografischen Grenzen und Hash. Nur nach bestandenem Validierungsschritt soll das `stuttgart-pmtiles-z12`-Artifact entstehen.
- Die verfügbaren GitHub-App-Aktionen können den Push-getriggerten Actions-Lauf nicht direkt auflisten. Öffentliches Actions-Webinterface ließ sich ebenfalls nicht abrufen. **Build-Erfolg, Archiv und echte iPhone-Karte weiterhin nicht bestätigt.**
- Technische Details unter `docs/PMTILES-STUTTGART.md`. Keine Änderung an Haupt-PWA, MapLibre-Referenz oder Offline-Speicherung.

## Inkrement 17: Stuttgart-PMTiles tatsächlich erzeugt und verifiziert (2026-11-09)

- Nutzer-Screenshot von GitHub Actions **Build #3**, grün, zeigt eine vollständige `Stuttgart PMTiles extraction`-Zusammenfassung samt `stuttgart-pmtiles-z12`-Artifact.
- Archiv `stuttgart-z12.pmtiles` existiert als Build-Artefakt (2.866.574 Bytes, 2,73 MiB), Format `mvt`, Zoom 0–12, Bounds `9.12000,48.72000,9.25000,48.82000`, `pmtiles verify: Passed`.
- SHA-256 des Archivs: `d3eec669bd7556d96d939933c3e5253e9d174857fd67c137888607d00366a80d`. Das angezeigte GitHub-Artefakt hat eine **eigene** ZIP-/Artifact-Prüfsumme und ist von der PMTiles-Datei-Prüfsumme zu unterscheiden.
- Das Build-Ergebnis ist **nicht** auf GitHub Pages veröffentlicht und **noch nicht** als lokale Datei im iPhone-Browser getestet. Nächster Test mit der isolierten Browser-`FileSource`-Vorschau `pmtiles-local-file-check.html`. Keine Auswirkungen auf die gespeicherte Leaflet-/MapLibre-Anwendung oder Offline-Behauptung.

## Inkrement 18: Eigene lokale Stuttgart-PMTiles-Datei auf Karte dargestellt (2026-11-09)

- Nutzer-Screenshot des lokalen Dateitests zeigt **„stuttgart-z12.pmtiles geöffnet · Protomaps Light · Zoom 0–12“** und eine gerenderte Karte von Stuttgart mit Stadtteilen, Straßennetz, Grünflächen und deutschsprachigen Labels.
- Damit sind Erzeugung/Archivvalidierung, lokale Dateiauswahl und renderingtechnische Anbindung an MapLibre/Protomaps-Light nachgewiesen. Dies bestätigt nur den isolierten Test, noch nicht den Start der eigentlichen PWA mit lokalem PMTiles-Archiv.
- Noch über das Internet: JavaScript-Bibliotheken, Glyphs und Sprites. Die Testseite speichert die gewählte Datei nicht persistent. **Kein vollständiger Offline-Betrieb**.
- Nächste Stufe: reproduzierbare Ressourcenliste, eigene Styles/Fonts/Sprites und später kontrollierter Download/Import in dauerhaftes lokales Kartenarchiv. Frühere Leaflet-/MapLibre-Referenzen und `main` nicht verändert.

## Inkrement 19: Dauerhafter lokaler PMTiles-Speicher und Asset-Paket vorbereitet (2026-11-09)

- Erfolgreicher Test der **lokal ausgewählten** eigenen Stuttgart-PMTiles-Datei wurde zuvor abgenommen; neu ist eine **separate, noch nicht im iPhone getestete** Speicherprobe `pmtiles-persistent-lab-v1.html` im Preview-Repository.
- Die Speicherprobe prüft `.pmtiles`-Dateiname, Größe bis 40 MiB, MVT-Header und Metadaten, speichert die komplette Browser-`File` in separater IndexedDB `pin2map-pmtiles-persistent-lab-v1` und erlaubt bewusstes Wiederöffnen bzw. Löschen. Nach Import ist ein Lese-/Größencheck eingebaut; `navigator.storage.persist()` fragt nach besserem Speicherschutz und meldet den Entscheid. Kein Upload, keine bestehende Pin-/Ebenendatenbank.
- Zweiter neuer Workflow `pin2map-maplibre-preview/.github/workflows/package-offline-map-assets.yml` soll die momentan extern geladenen JavaScript-/CSS-Bibliotheken, Schrift-PBFs und Protomaps-Light-Sprites einschließlich Lizenzdateien in ein überprüfbares GitHub-Actions-Artifact bündeln. Der Upstream-Asset-Commit wird protokolliert, die Größe begrenzt und pro Datei SHA-256 ins Manifest geschrieben. **Build-Erfolg und Asset-Paket sind bislang nicht bestätigt.**
- Ausführliche Freigabegates und verbleibende Aufgaben in `docs/PMTILES-OFFLINE-ARCHITEKTUR.md`. Weder Service Worker für den Offline-Start noch Offline-Ready-Status oder Integration in die gesicherte Haupt-PWA behaupten.
- Bereits abgenommene Leaflet-/MapLibre-Stände bleiben unverändert.

## Inkrement 20: Vollständig lokale Ressourcenpaketierung vorbereitet (2026-11-09)

- Aus der bereits getrennten PMTiles-IndexedDB-Testseite und den Protomaps-/MapLibre-Abhängigkeiten erzeugt `scripts/assemble-offline-lab.py` künftig eine eigenständige `index.html` mit **relativen, eigenen** JS-/CSS-, Glyph- und Sprite-URLs.
- Der Browser-Service-Worker `offline-stuttgart-sw.js` darf ausschließlich den vorgesehenen Test-Unterordner der eigenen Origin bearbeiten. Er versucht dort die App-Shell und die übrigen lokalen Ressourcen bei der Installation komplett zwischenzuspeichern; die PMTiles-Datei bleibt als Browser-`File` in IndexedDB und wird nicht dupliziert.
- Die Ausgabe ist ein auf maximal 100 MiB begrenztes, prüfbares Paket mit Dateihashes; der Workflow `package-offline-map-assets.yml` lädt das Paket weiterhin nur als **Artefakt**, ohne eine bestehende PWA umzuschalten. `tests/check-pmtiles-offline-package.mjs` ist in der Entwicklungs-CI ergänzt.
- **Keine Offline-Freigabe:** Tatsächlicher Build-Erfolg, vollständige Asset-Abdeckung, Hosting unter eigenem Unterpfad und Flugmodus-Test fehlen noch. Die bereits abgenommenen MapLibre- und Leaflet-Referenzen sind unverändert.

## Inkrement 21: Offline-Ressourcenpaket mit Vollständigkeits- und Hash-Prüfung (2026-11-09)

- `scripts/check-offline-package.mjs` validiert nach der Paketmontage alle erwarteten lokalen Dateien gegen den Service-Worker-Cache und `manifest.json` einschließlich SHA-256. Das Preview-Actions-Workflow-Skript startet diesen Test vor dem Artifact-Upload.
- Die vorhandene Protomaps-Glyph-Lizenz `fonts/OFL.txt` und die Upstream-Herkunftshinweise der Sprites werden mitgeführt; es wird keine nicht existente Datei `sprites/LICENSE.txt` mehr erwartet.
- Script-Syntax und Workflow-Einbindung geprüft. Tatsächlicher GitHub-Actions-Status und vollständige Geräte-Offlinefähigkeit **noch unbestätigt**. Separate PMTiles-Speicherprobe und gesicherte PWA bleiben unverändert.

## Inkrement 22: Eigenständiges Offline-Labor in Preview-Repository veröffentlicht (2026-11-09)

- GitHub Actions kann nach bestandener Paketprüfung ausschließlich die Unterstruktur `pin2map-maplibre-preview/main:offline-stuttgart-lab/` aktualisieren, ohne andere Vorschauseiten oder gesicherte Referenzen zu verändern.
- GitHub-Dateiprüfung bestätigt die **tatsächliche Existenz** der isolierten Offline-Site-Dateien einschließlich Service Worker und Manifest; 1040 Dateien, 18,19 MiB, davon 1024 Schriftkachel-Dateien. Service-Worker-Precache: 1039 Dateien; Version `pin2map-stuttgart-lab-67a476a99139ee27`.
- Neue sichtbare Bereitschaftsanzeige trennt lokal gecachte Programm-/Stilressourcen von der separat gespeicherten PMTiles-Datei.
- **Noch keine Geräte-Offline-Abnahme:** Öffentliche Pages-Erreichbarkeit und erfolgreicher iOS-/Brave-Cache-Install sowie Flugmodus-Start sind noch separat zu testen. PMTiles-Datei bleibt nur in der isolierten IndexedDB-Testdatenbank, niemals in bestehenden Pin-Datenbanken.

## Inkrement 23: Fehler im Offline-MapLibre-Worker lokalisiert und Build korrigiert (2026-11-09)

- Nutzer-Screenshot: Graue Karte und Meldung `Worker failed to load. Check that the worker URL is correct.` in der neuen separaten Offline-Labor-Seite.
- Ursache: Die MapLibre-6-ESM-Bibliothek wurde zunächst **ohne** die zwingend erforderliche separate `maplibre-gl-worker.mjs` ausgeliefert. Das ergänzende `maplibre-gl-shared.mjs` wird ebenfalls in das Paket aufgenommen. Die bereits erfolgreich getestete lokale Stuttgart-PMTiles-Datei selbst ist dadurch nicht widerlegt.
- Build und Paketvalidierung im Preview-Repository ergänzt: Worker-/Shared-Bundles lokal abrufen, Vollständigkeit verlangen, eigene Worker-URL über `setWorkerUrl` setzen und im SW-Precache verifizieren.
- Bei letzter Prüfung waren die Worker-Dateien in der veröffentlichten GitHub-Pages-Struktur **noch nicht vorhanden**. Neuer Build/Deployment und anschließender Browser-Test stehen aus. Gesicherte Haupt-PWA/Referenzen unverändert.

## Inkrement 24: Fehlenden MapLibre-Worker ergänzt und erneutes Deployment bestätigt (2026-11-09)

- GitHub-Dateiprüfung bestätigt `offline-stuttgart-lab/vendor/maplibre-gl-worker.mjs` (519.372 Bytes), explizite `setWorkerUrl`-Anweisung in veröffentlichter `pmtiles-persistent-lab-v1.js` und 1.041 Manifest-Dateien mit Worker. Der ursprüngliche Offline-Renderingfehler durch fehlenden Worker ist im Deployment behoben.
- **Versionsspezifischer Befund:** MapLibre 6.16.0 benötigt keine separate `maplibre-gl-shared.mjs`. Diese Datei ist bewusst weder im Manifest noch als zwingende Build-Abhängigkeit enthalten.
- Reale Kartendarstellung und Flugmodus-Start mit aktualisiertem Cache müssen weiterhin auf dem iPhone überprüft werden; bestehende Haupt-PWA und Referenzen unangetastet.

## Inkrement 25: Offline-Labor zeigt eigene Stuttgart-Karte und Ressourcen-Cache (2026-11-09)

- Nutzer-Screenshot bestätigt Rendering der Datei `stuttgart-z12.pmtiles` mit lokal bereitgestelltem Protomaps-Stil, MapLibre-Worker-Korrektur und erfolgreicher Meldung `Programm und Kartenstil lokal verfügbar` des isolierten Service Workers.
- Noch offen und vor Offline-Abnahme zwingend: iPhone-Flugmodus-Test nach vollständigem Neustart bzw. Neuaufruf, Kontrolle der in IndexedDB gespeicherten Region, Symbol-/Beschriftungsprüfung. Bestehende PWA und Referenzen unverändert.
