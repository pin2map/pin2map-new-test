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
