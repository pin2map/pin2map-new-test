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
- [~] Leaflet-Adapter als `map-adapter-leaflet.js` eingeführt: Ausschnitt, Projektion, Kartenschwenk, Zoom und Bewegungsereignisse laufen bereits über eine eigene Schnittstelle. Die verbleibenden Leaflet-Marker, Kartenlayer, Pin-Gesten und Popup-Interaktionen sind **noch nicht** gekapselt. Dies ist kein abgeschlossener Adapter.
- [~] Dialogpositionierung und Kartenbewegung nutzen bereits Adapter-Projektion/Pan und Adapter-Ereignisse; Kartenmarker/Layer und einzelne Sonderfunktionen benötigen noch direkte Leaflet-Aufrufe.
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

**Stand 2026-11-09:** Erster technischer Umbau in `feature/maplibre-protomaps` eingecheckt. Die Leaflet-Bibliothek ist weiterhin der einzige Renderer; `main` und die Referenz bleiben unangetastet. Der zusätzliche Adapter ist in der PWA-Shell V19 vorgemerkt. Ein echter Browser-/iPhone-Vergleich steht aus. MapLibre, Protomaps und ihr Offline-Verhalten sind noch nicht implementiert bzw. bestätigt.
