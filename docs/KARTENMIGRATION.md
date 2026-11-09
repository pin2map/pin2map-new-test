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
- [~] Leaflet-Adapter als `map-adapter-leaflet.js` eingeführt: Ausschnitt, Projektion, Kartenschwenk, Zoom, Bewegungsereignisse, reguläre Pin-Marker, Pin-Klicks, Marker-DOM-Zugriff, Pan-Sperre beim Langdruck, Zoom am gehaltenen Pin, verschiebbare Vorschau-Marker und Verbindungslinie laufen nun über den Adapter. **Noch nicht vollständig rendererunabhängig:** DOM-spezifische Pointer-Gesten und deren Leaflet-CSS-Ausschlussselektoren sowie die spätere vollständige MapLibre-Implementierung.
- [~] Dialogpositionierung und Kartenbewegung nutzen Adapter-Projektion/Pan und Adapter-Ereignisse; normale Pin-Marker und Verschiebevorschau werden ebenfalls ausschließlich über den Adapter erzeugt und verändert. Die Basiskarten und Controls sowie Map-Klick-/Dragstart-/Zoomstart-Ereignisse werden inzwischen ebenfalls über den Adapter bedient.
- [ ] Reale Browser-Regressionstests mit Desktop + iPhone

### B. Unabhängiger MapLibre-/Protomaps-Prototyp
- [ ] MapLibre/PMTiles-Abhängigkeiten und Lizenzstände festhalten
- [ ] Kleine, legale regionale PMTiles-Testdatei und Stil/Fonts/Symbole bereitstellen
- [ ] MapLibre-Adapter mit Pins, Dialogen, Labels und Verschiebevorschau
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
- In `app.js` gibt es keine direkten `L.`- oder `map.`-Aufrufe mehr. Die bestehenden Pointer-Gesten funktionieren jedoch noch über DOM-Elemente und Leaflet-Klassen wie `.leaflet-marker-icon`; das ist eine offene Renderer-Unabhängigkeit. Außerdem sind gerenderte Markerhandles bislang noch Leaflet-Objekte, aber für die App nur opake Handles.
- Statische Tests und Adapter-Mocks wurden erweitert. Die aktuellen GitHub-Dateien bestanden 84 statische UI-Checks und 37 Adapter-Assertions in einer isolierten JavaScript-Ausführung, die Node-Dateileseoperationen nachbildet; Syntax von `app.js` und `map-adapter-leaflet.js` geprüft. Der vollständige Node-Testlauf und reale Browser-/iPhone-Interaktionen bleiben offen.
- Kein Deployment nach `main`; V18-Referenz-Branch und lokaler IndexedDB-Datenbestand bleiben unangetastet.
