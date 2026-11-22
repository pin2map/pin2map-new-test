# Routing – Architekturvorbereitung und Schutzgrenzen (22.11.2026)

**Status:** Technische Bestandsaufnahme und vorgeschlagene Arbeitsabfolge, **keine Freigabe von Routing-Anbietern, neuen Optionen oder einem Persistenzschema**. Maßgeblich bleiben AGENTS.md, GRUNDENTSCHEIDUNGEN.md, MODULARCHITEKTUR.md, ENTWICKLUNGSFAHRPLAN.md und VORGAENGER_APP_MODUL_AUDIT.md. Source: feature/leaflet-modular-core.

## Anlass und Ausgangsbefund
Der Auftraggeber verlangt eine dauerhaft wartbare Anwendung; insbesondere darf die aus der Vorgänger-App bekannte Vermischung von Routingberechnung, Routenplanung, UI-Interaktionen und Karten-/GPX-Speicherung nicht zurückkehren. `app.js` enthält aktuell noch wesentliche Funktionen für Projekttransfer, Objekterstellung/Suche, Zustandskoordination und UI-Komposition. Diese Funktionen müssen fachlich geprüft und soweit erforderlich in eigenständige Module verlagert werden; die bloße Dateigröße begründet keinen Umbau.

Der bestehende `application/routing-service.js` ist nur eine providerneutrale Registrierungs-/Aufrufschnittstelle (`car`, `pedestrian`, `bicycle`, `transit`), ohne aktive Live-Provider und ohne in der PWA eingebundene Routenplanung. Die drei Routingbuttons sind weiterhin deaktiviert. Bestehende GPX-Trackanhänge dürfen nicht mit berechneten Routen oder kartierten Flüssen gleichgesetzt werden.

## Verbindliche Schichten aus den bestehenden Verträgen
- **Domain:** künftige route-/itinerary-spezifische Regeln und WGS84-/GeoJSON-kompatible, rendererfreie Daten; keine DOM-, HTTP-, Leaflet- oder IndexedDB-Zugriffe.
- **Application:** neue Routen planen, validieren, Zwischenstopps/Reihenfolge verarbeiten, Berechnung und Anbieter-Aufruf orchestrieren; Abbruch, Fehlerzustände und Alternativen über Ports. Keine Providerprotokolle oder Kartenobjekte.
- **Routing-Adapter:** Anbieter-spezifische Anfrage-/Antwort-Konversion; keine Domainentscheidungen und keine direkte UI-Logik. Die tatsächlichen Anbieter/Verträge werden vor Implementierung gesondert festgelegt.
- **UI:** eigenständige Routingansichten und Dialogzustände mit injizierten Anwendungsaktionen; keine Speicherung und keine Routenberechnung.
- **Kartenadapter Leaflet:** Darstellung, Hit-Targets und Auswahl von Routen über kleine Karten-Ports; keine Routengeschäftsregeln.
- **Projekt-Repository / GPX:** Persistenz, Schema-/Migrationsschutz und Track-/Routen-Import/Export getrennt von Berechnung und Kartenanzeige. Bestehende `gpxAttachment`- und `rivers`-Bestände bleiben bis zu einer ausdrücklich genehmigten Migration unverändert.
- **app.js:** Composition Root und kurze Callback-Verdrahtung. Keine neue Fachlogik, keine Anbieter-Requests, keine Wegpunktoptimierung, kein GPX-Parsing und keine eigene Routen-State-Machine.

## Stabilisierungsfolge vor aktivem Routing
1. Vorhandene unabhängige Freigabegates klären, insbesondere den zeitweise fehlgeschlagenen externen Overpass-Echtdaten-Gate. Keine künstliche Abschwächung des Gebietspolygon-Vertrages.
2. GPX-Anhangs-/Kartenanzeige und Export aus der Composition Root lösen. Erstes Inkrement v309: `ui/pin-gpx-actions.js` und `application/gpx-attachment-export.js`; fachlich bestehendes Verhalten und Datenformate unverändert. Node/Architektur/Chromium sind auf Commit `61336d5` erfolgreich; vollständiger Preview-Gate **nicht** grün wegen externem Overpass.
3. Projekttransfer-UI und Transfer-/Commit-Ablauf nach vorheriger Risikoinventur trennen. Single-commit-/Rollback-/Nutzerdatenschutz-Regeln als Regression erhalten; keine unmittelbare Schemaänderung.
4. Objektvorschau/Suche und übergreifende Schließ-/Overlay-Zustände auf Port- und Eigentümergrenzen prüfen, dann gezielt entflechten. Keine pauschale Zerlegung kurzer Composition-Callbacks.
5. Routing-Domain- und Application-Schnittstellen **zuerst ohne Live-Anbieter und ohne neue Persistenzfelder** spezifizieren und isoliert testen. Erforderliche Produktentscheidungen vor deren Implementierung einholen.
6. Routing-UI und Karten-Ports in getrennten, real getesteten Inkrementen anbinden; Provideradapter danach einzeln integrieren. Ein bestandener Node-Test allein genügt nie zur Veröffentlichung.

## Unabdingbare neue Routing-Regressionen (bei Implementierung)
- Dieselbe Routenanfrage ist ohne Browser/Leaflet serialisierbar und testbar; Punktnotationen werden nicht verwechselt.
- Anbieterwechsel, Timeouts, Abbruch und veraltete Antworten verändern niemals die falsche Route oder einen anderen Pin.
- Zwischenstopp-/Reihenfolgeregeln werden nur einmal definiert, nicht in UI, Adapter und Service dupliziert.
- Providerresultate und berechnete/gezeichnete Routen werden getrennt; keine implizite Persistenz beim Anzeigen einer Alternative.
- Beim Projektimport, GPX-Export und späterer Migration bleiben alte Projekte ohne Datenverlust nutzbar.
- Desktop/iPhone/iPad teilen denselben Zustands- und Style-Eigentümer; echte Browsergeometrie und mobile WebKit-Abnahmen.
- Vollständige Node-, Architektur-, Chromium-, WebKit-, Deployment-, HTTPS-Live- und Service-Worker-Gates vor jeder Fertigmeldung.

**Nicht beschlossen:** konkrete Routinganbieter, Verkehrsmitteloptionen, Alternativen-/Optimierungsalgorithmen, gespeicherte Route-Schemata, neue externe Dienste oder vorgezogene Serversynchronisation. Diese Entscheidungen sind separat zu vereinbaren.

## Beschlossener nächster Architekturabschnitt – v310 (22.11.2026)

Der Auftraggeber hat ausdrücklich freigegeben, vor Routing zuerst den externen Overpass-Echtdaten-Gate vom allgemeinen Preview-Workflow zu entkoppeln und anschließend den bestehenden Projekttransfer in getrennte UI- und Application-Module zu überführen. Der unveränderte reale Rügen/Jasmund/Borgwallsee-Test bleibt separat per manueller GitHub-Workflow-Auslösung verfügbar; automatische Node-, Architektur-, Chromium-, WebKit-, HTTPS-, Service-Worker- und Offline-Gates bleiben obligatorisch. Die externe Dienstverfügbarkeit steht auf der offenen Punkte-Liste und wird bis zu neuer Beauftragung nicht weiter aktiv untersucht.

Geplante Eigentümer: `application/project-transfer-session.js` hält Validierung, Projektnormalisierung, einen vollständigen Speicher-Commit und Rollback; `ui/project-transfer-controller.js` hält Dateiauswahl, Dialogzustände, Fehlertexte und browserseitigen Download. `app.js` injiziert Daten- und Kartenports und aktualisiert nach erfolgreichem Commit die Ansicht. Die ursprüngliche Import-/Export-Funktionalität, GPX-Modi, Ein-Ebene-Import, Ersetzen, Zustimmung, Warntexte, Datenschema und Persistenz bleiben unverändert. Neue Routingfunktionen oder Provider werden dadurch nicht aktiviert.
