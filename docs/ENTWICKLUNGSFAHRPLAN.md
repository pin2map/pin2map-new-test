# Verbindlicher Entwicklungsfahrplan – pin2map NEW

Beschlossen: 2026-11-09. Status: verbindliche Arbeitsreihenfolge, nicht Behauptung bereits implementierter Funktionen.

## Produkt- und Architekturziele

pin2map verortet Informationen und setzt sie räumlich in Beziehung. Kartenobjekte: Pins, Flächen, Linien, Routen; thematische Ebenen und Metadaten. Leaflet mit der gewohnten informationsreichen OSM-Hintergrundkarte ist die bevorzugte Karten-Engine. Die bisherige Vorgänger-App ist Maßstab für Nutzbarkeit, Informationsdichte und Funktionsumfang.

**Harte Priorität:** Eine Funktion darf unabhängig erweiterbar oder ersetzbar sein, ohne die gesamte App verändern zu müssen. Verbindliche Modulgrenzen und Abhängigkeiten in `docs/MODULARCHITEKTUR.md`.

## Etappe 0 – Bestandsaufnahme und Qualitätsreferenz

- Funktionale und visuelle Referenz der Vorgänger-App erfassen: Hauptkarte, Kopfzeile, untere Steuerung, Label-Modi, Suchdialog, Kartenwahl, Pin-Dialog, Ebenenwahl, Gesten, Statusmeldungen, Flächen-/Linien-/Routenfunktionen.
- Unterschiede zwischen Vorgänger-App und pin2map NEW als **sichtbare Abnahmeliste** führen; jeder Eintrag mit „fehlt“, „implementiert“, „auf iPhone abgenommen“.
- Leaflet-V18-Stand und MapLibre-Referenzen unverändert bewahren; `main` nicht ungeprüft ändern.
- Bereits angelegtes `feature/leaflet-modular-core` enthält die ersten echten Module für Domain, Map-Adapter und IndexedDB-Repository. Deren automatisierte Tests zuerst grün bekommen.

**Gate 0:** Funktions-/UX-Abgleich und aktuelle modulare Testbasis nachvollziehbar, keine unbeabsichtigte Datenmigration.

## Etappe 1 – Modulare Oberflächenbasis

Ziel: UI-Komponenten ohne verdeckte Geschäftslogik und ohne direkte Abhängigkeit von Leaflet/IndexedDB. Vorgesehene Schnittstellen:

- `ui/shell`: Kopfzeile, Statusanzeigen, Kartenfläche, überlagerte Bedienelemente.
- `ui/controls`: Zoom, Basiskartenwahl, Pin-Labels, Ebenensteuerung, Moduswechsel.
- `ui/panels`: Pin-Editor, Ebenenliste, Einstellungen und Bestätigungen.
- `ui/search`: Sucheingabe und Trefferliste; Ortssuche selbst liegt hinter einem Dienst-Port.
- `ui/feedback`: Meldungen, Fehler-/Offline-/Ladezustände.
- `ui/gestures`: auf Nutzeraktionen bezogene Interaktionssteuerung; Leaflet-spezifische Events werden ausschließlich im Kartenadapter normalisiert.
- `app.js` bleibt Kompositionswurzel, verdrahtet die Schnittstellen, übernimmt keine neue Fachlogik.
- Ein zentrales UI-Zustandsmodell für sichtbares Panel, Auswahl und Modi; fachlicher Projektzustand bleibt separat.

**Arbeitsweise:** Nicht erst alle UI-Dateien leeren oder durch Platzhalter ersetzen. Jeder Schnitt wird als funktionsfähige, kleine vertikale Änderung durchgeführt, gegen bestehende Pins/Ebenen getestet und mit dem Vorgänger-UX verglichen.

**Gate 1:** Alle aktuellen UI-Bedienelemente besitzen klar zugeordnete Module/Ports. Keine direkten IndexedDB-Zugriffe in UI; keine Kartendetails außerhalb des Map-Adapters. Weiterhin funktionsfähige lokale Basiskarte und Pins.

## Etappe 2 – Usability auf Niveau der Vorgänger-App

Priorisierte Tests direkt am iPhone:

1. Kartenbedienung: Pan, Pinch, Doppeltippen, Zoom zum gehaltenen Pin, Pan bei randnahen Pins.
2. Pin-Bedienung: Antippen/erneut schließen, Erstellen, Auswählen, Verschieben mit Vorschau und Bestätigung, Löschen.
3. Dialoge und Steuerung: kein Abschneiden am Bildschirmrand, ergonomische Bedienelementpositionen und sichere iPhone-Safe-Areas, keine konkurrierenden Panels.
4. Ebenen und Label-Modi: Auswahl, Sichtbarkeit, konsistente Zustände und Feedback.
5. Suche, Kartenauswahl, Update-/Verbindungsanzeige und Fehlermeldungen.
6. Responsive Layout, Touch-Targets und Bedienbarkeit bei kleinen Viewports.

**Gate 2:** Für jeden relevanten Vorgänger-Workflow gibt es einen iPhone-Abnahmetest; keine als kritisch eingestuften UX-Rückschritte. Neue UI-Module dürfen nicht gegenseitig private DOM- oder Statusobjekte verändern.

## Etappe 3 – Fachliche Funktionsparität und Erweiterung

Modular in nachvollziehbarer Reihenfolge:

1. Pin-Datenmodell, Bearbeitung, Umpositionierung, Beschriftung und Zuordnung zu **genau einer** Ebene.
2. Private Ebene und weitere Ebenen (Anlage, Bearbeitung, Sichtbarkeit, Lösch- und Zuordnungsregeln).
3. Flächen mit eigenständiger GeoJSON-kompatibler Domain-Geometrie, Bearbeitungswerkzeugen und lokalem Speichern.
4. Linien mit eigenen Geometriedaten und Bearbeitung.
5. Routen als eigenständige Fachobjekte; Schnittstelle für externe Berechnung (z. B. Valhalla/Transitous) getrennt von Geometrie und Rendering.
6. Weitere in der Vorgänger-App vorhandene Arbeitsabläufe gemäß konkreter Abnahmeliste; gezielte Verbesserungen nur nach messbarem Nutzen.

Jede Domänenfunktion erhält Unit-Tests ohne Kartenbibliothek; UI- und Kartenintegration werden separat geprüft. Lokale Datenhaltung bleibt Quelle der Wahrheit.

**Gate 3:** Wesentliche Funktionen der Vorgänger-App sind funktional abgenommen oder bewusst als entbehrlich entschieden; vollständige lokale Nutzbarkeit, Import/Export/Wiederherstellung und stabile Datenversionierung sind geprüft.

## Etappe 4 – Synchronisation (erst nach Gate 3)

- Ports und Metadaten für späteren Sync dürfen frühzeitig im Datenmodell berücksichtigt werden (stabile IDs, Änderungsversionen, lokale Änderungsereignisse), **aber keine vorgezogene Server- oder Sync-Implementierung**.
- Dann erst Server, Nutzer- und Projektzuordnung, Authentifizierung, Offline-Änderungsjournal, Synchronisationsprotokoll, Konflikterkennung und -auflösung implementieren.
- Synchronisation darf lokale Objektbearbeitung nicht blockieren. Konflikte betreffen die jeweiligen Datensätze; alte und neue Objektgeometrien bei Positionskonflikten visuell vergleichen.
- Vor Übernahme: Offline-/Online-Wechsel, Datenverlustschutz, Berechtigungen, Reconnect und Migrationen separat abnehmen.

**Gate 4:** Reproduzierbarer Sync über mehrere Geräte ohne unbemerkten Datenverlust, einschließlich Konfliktfällen.

## Fortlaufende Regeln

- Keine ungeprüften Änderungen auf `main`; Entwicklungszweig `feature/leaflet-modular-core` und gesicherte Referenzen getrennt.
- Funktionierende Zwischenstände markieren und Regressionstests ausführen.
- Für jedes Modul: Verantwortung, erlaubte Abhängigkeiten, öffentliche Funktionen/Daten und minimaler Testvertrag.
- Kein neues Monolith-`app.js`, keine zyklischen Abhängigkeiten, keine direkten Leaflet-/DOM-/Datenbankzugriffe in der Domain.
- Neue Features und UI-Änderungen nur in kleinen, abnehmbaren Schritten.
- Die Nutzerabnahme folgt beobachtbarem Verhalten auf dem iPhone; architektonische Prüfungen ergänzen, ersetzen aber keine Bedienungstests.
- Fotos bleiben ausdrücklich außerhalb des Umfangs; 3D/GIS-Analysen nicht vorgesehen; Offline-Hintergrundkarten bleiben optional und gegenüber Informationsfülle nachrangig.

## Sofort nächster Arbeitsschritt

1. Bestehende `app.js`-Zuständigkeiten inventarisieren und dem Zielmodul zuordnen.
2. Zunächst **Oberflächen-Shell und UI-Zustand** aus `app.js` lösen; keine Designänderungen im ersten Schnitt.
3. Nach erfolgreichem Regressionstest erste sichtbare Verbesserung mit der Vorgänger-App vergleichen (Kopfzeile, Steuerung und Pin-Dialog).
4. Danach Komponenten einzeln bearbeiten und auf dem iPhone abnehmen.

## Querschnittsmodul Filter – verbindliche Ergänzung vom 2026-11-09

Die Ebenensichtbarkeit wird ab sofort als **erste Filterbedingung** behandelt, nicht als Spezialfall des Karten-Renderers. Die Module `domain/pin-filter.js` und `application/filter-operations.js` sind angelegt und in den Entwicklungszweig integriert.

Sobald die Oberfläche modular ist, kommt eine eigenständige **Filter-UI** hinzu: zunächst Ebenen ein-/ausblenden, danach nach einer späteren eigenständigen Anforderungsentscheidung weitere Filtermöglichkeiten; welche Inhalte und Felder betroffen sind, ist derzeit ausdrücklich offen. Eine mögliche Kombination mit Ebenen wird erst bei der detaillierten Filterentscheidung verbindlich definiert; Filter dürfen keine Projektdaten verändern. Aktuell werden Pins aus unsichtbaren Ebenen nicht angezeigt.

Vor einem sichtbaren neuen Textfilter müssen wir dessen Benutzerführung an der Vorgänger-App und auf iPhone testen. Die bestehende Nominatim-Ortssuche bleibt technisch unabhängig von künftig möglichen Projektfiltern.

## Vorbereitendes Routingmodul – 2026-11-09

Auto-, Fußgänger- und ÖPNV-Routing werden als **eigenständiger, austauschbarer Routingbereich** geplant. Ein providerneutraler Koordinator (`application/routing-service.js`) existiert mit Tests, ist aber noch nicht in die aktive PWA eingebunden. Verkehrsmittel sind lediglich Kategorien zur späteren getrennten Anbieteranbindung. Weder konkrete Anbieter, Optionen, Routenvarianten und Datenschemata noch der genaue Funktionsumfang sind entschieden. Es wird weiterhin keine Synchronisation vorgezogen.

## Referenzprüfung abgeschlossen – Übergang zurück zur Oberfläche (2026-11-09)

Die Vorgänger-App wurde anhand ihres echten Quellcodes systematisch auf **künftige Modulgrenzen** geprüft. Siehe `docs/VORGAENGER_APP_MODUL_AUDIT.md` mit Funktionsbelegen, aktuellem Abdeckungsstatus und fehlenden Modulen. Die inventarisierten Funktionen bilden den Zielumfang für spätere Parität; ihre alte Codeorganisation und globale Zustände sind ausdrücklich **kein** Implementierungsmuster.

Als zusätzliche Fachbereiche wurden eine **geografische Informationsschnittstelle** (Wetter/Höhe/Sonnenzeiten/Tageslänge etc.) und eine **eigene Wasserlauf-/Flussschnittstelle** eingerichtet, noch ohne echte Berechnung/Anbindung. Fahrradroute ist als zusätzlich nachgewiesene Referenzfunktion vermerkt.

**Jetzt weiter in Etappe 1:** Ebenenpanel und Ebenen-Use-Cases einzeln aus `app.js` auslagern; für den ersten Schritt keine optischen Neuerungen. Regression/Architekturschnittstellen testen, dann anschließende UX-Abnahme an der Vorgänger-App.
