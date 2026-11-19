# Vektordaten: Performance-first Integrationskonzept

Stand: 2026-11-19. Arbeitszweig, **keine Änderung an main**.

## Entscheidungen
- Bestehende Leaflet-Rasterkarte bleibt Default und muss beim Start **ohne MapLibre-Download, ohne OpenFreeMap-Kacheln und ohne zweiten WebGL-Kontext** laufen.
- Option `Objekte mit Vektordaten erkennen` bleibt vorläufig **aus** und wird per Benutzeraktion aktiviert; einmaliger Hinweis zu zusätzlichem Traffic.
- Sichtbare Vektorkarte ist eine **separate explizite Auswahl**. Ein einziger MapLibre-Renderer soll, wenn vorhanden, für Objekterkennung und Anzeige wiederverwendet werden; nie zwei parallele MapLibre-Instanzen.
- Die PWA darf ohne Vektordienst weiterhin vollständig mit bisherigen Funktionen arbeiten.
- Nominatim bleibt Geocoder und Lookup-Dienst. Nur bei konkretem Objektabruf; keine Autocomplete-Requests, Cache für wiederholte IDs, Fehlerbehandlung.
- Sprachpräferenz: Deutsch > international > englisch > lokal (bzw. benutzerdefinierte Reihenfolge). Quelle/Style-Layer unterscheiden sich; bei fehlenden Sprachfeldern lokalen Namen anzeigen.
- Kartenwechsel muss den Kamerastand und bestehende Pins, Ebenen, Dialogzustand und Klick-/Move-Modi erhalten. Vor produktiver Aktivierung sind umfassende Regressionstests verpflichtend.
- Alternative Photon derzeit nicht integrieren.

## Technische Abhängigkeit
`main` nutzt `L.map("map")`, `L.tileLayer`, Leaflet Marker und Leaflet Controls unmittelbar in `app.js`. Der historische `map-adapter-maplibre.js` ist noch nicht als Drop-in für alle Funktionen integrierbar. Deshalb zuerst **separate Detektions-Bridge im Feature-Branch**, nicht pauschal bestehende `map`-Referenzen ersetzen.

## Metriken und Messmethode
Je Betriebsart (Raster-only, Vektorerkennung kalt/warm, sichtbare Vektorkarte kalt/warm):
- Zeit bis interaktive Rasterkarte und bis erster renderbarer Kartenklick;
- zusätzlicher Netzwerktraffic der MapLibre-Bibliothek, Style, Glyphs/Sprites und Tiles getrennt;
- Anzahl zusätzlicher Requests;
- Zeit bis ermittelte OSM-ID und bis fertiges Nominatim-GeoJSON;
- GeoJSON-Antwortgröße, Zahl der Koordinatenpunkte, `containsClick`;
- Speicher-/WebGL-Verhalten inklusive iPad-Test, soweit Browser-Messinstrumente es zulassen.

Browser-`PerformanceResourceTiming.transferSize` für Cross-Origin-Requests ohne `Timing-Allow-Origin` ist oft 0: **0 nicht als 0 Byte werten**. Für exakte Messung ggf. DevTools Network mit Cache an/aus verwenden. API-Fetch-`Blob`-`size` misst Nutzlast, nicht wire transfer. Trenne Cachetreffer und echte Netzwerkantworten.

## UI-Entscheidung
Im Einstellungsdialog soll klar erkennbar sein:
- Rasterkarte (wenig zusätzliche Daten, höhere Detaildichte)
- Vektorkarte (zusätzliche Daten, deutsche/internationale Beschriftung, ggf. weniger Details)
- Vektordaten für Objekterkennung bei Rasterkarte optional aktivieren

Bei erster Aktivierung ungefähre, **gemessene** Mehrkosten nennen. Bis Messungen vorliegen KEINE fiktiven MB-/Sekundenwerte anzeigen.

## Akzeptanz-Gates
1. Standardstart lädt keinerlei MapLibre- oder OpenFreeMap-Ressourcen; Test im Network-Panel.
2. Inaktive Option verursacht null zusätzliche Vektor-Requests.
3. Gewählte Option wird transparent gespeichert und darf abschaltbar sein.
4. Kein doppelter MapLibre-Kontext; beim Abschalten korrekte Ressourcenfreigabe.
5. Vektorklick / Nominatim-Lookup funktioniert bei den 7 bestätigten Referenzen; Marradong darf als nicht erkannt ausgewiesen werden.
6. Korrekte Überlagerungsauswahl bei Enoggera, Torres del Paine, Tonlé Sap.
7. Mehrsprachige Beschriftung mit nachvollziehbaren Fallbacks.
8. Kartenwechsel erhält Pin-/Ebenen-/Dialogverhalten auf Desktop und iPad.
9. Vor Merge: Browser-, iPad-, Netzwerk-, Cache-, und Regressionstest inklusive dokumentierter Messwerte.

## Vorläufige Architekturentscheidung
**On-Demand vor Always-On**. Eine permanente unsichtbare Vektorkarte wird erst dann erwogen, wenn reale Messungen einen klaren UX-Gewinn zeigen und Mehrkosten nachweisbar akzeptabel sind.
