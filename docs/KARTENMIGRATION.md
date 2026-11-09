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
