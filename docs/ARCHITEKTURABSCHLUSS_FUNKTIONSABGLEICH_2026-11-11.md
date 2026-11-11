# Architekturabschluss und Funktionsabgleich – pin2map NEW v116

**Stand:** 2026-11-11 · **Branch:** `feature/leaflet-modular-core` · **App-Quellversion:** v116 (diese Prüfung ändert keine App-Dateien)

## 1. Ergebnis der `app.js`-Abschlussinventur

**Die Entflechtungsphase ist für den aktuellen lokalen Basisumfang architektonisch ausreichend abgeschlossen.** Die 14 dokumentierten Schritte v101–v116 haben klar abgrenzbare Aufgaben aus der Kompositionswurzel übernommen. `app.js` umfasst weiterhin etwa **14.726 Zeichen**, aber die Dateigröße ist kein Selbstzweck: Ein Composition Root muss Ports, UI-Controller, Kartenadapter und Startablauf verbinden können.

| Verbleibende Verantwortung in `app.js` | Bewertung / Eigentümer |
| --- | --- |
| Module instanziieren und injizierte Ports verdrahten | **Soll verbleiben.** Zentrale Komposition, kein Fachmonolith |
| `init()`: Storage öffnen, Projekt laden/hydrieren, Leaflet/Views/Controller erzeugen, App starten | **Soll verbleiben.** Datenaufbereitung ist bereits in `application/project-hydration.js` getrennt |
| `bind()`: Controller anbinden, Buttons und PWA-/Sichtbarkeitsereignisse registrieren | **Soll im aktuellen Umfang verbleiben**, da nur kurze Aufrufe/Callbacks; keine künstliche Event-Manager-Abstraktion |
| `renderMarkers()`, `renderLayers()`, `renderPinPanel()` | **Soll verbleiben:** gemeinsame Darstellung nach Änderung von Projekt-/UI-State; konkrete Renderer in `ui/` |
| `updateModeUI()`, `setTileLayer()`, `fitAllPins()` | **Soll vorerst verbleiben:** wenige UI-/Adapter-Ports; Fit-Use-Case bereits in `application/fit-visible-pins.js` |
| Pin-Name ändern, Ebenenzuordnung wechseln, Ebene sichtbar machen | **Restliche kurze Aktions-Callbacks.** Geschäftsregeln in `pin-operations`/`filter-operations`, DOM-Events in `ui/pin-editor-actions.js`. Erst bei einer konkreten Funktion weiter auslagern |
| Ebene/Pins löschen, Löschen bestätigen | **Restliche kurze Use-Case-Verdrahtung.** Validierung und Mutation in `application/layer-operations.js`, Dialogdarstellung in `ui/bulk-delete-dialog.js`. Keine neue Extraktion ohne Bedarf |
| PWA-Refresh, Sichtbarkeits-Speicherflush, Gesten/Move, Overlay-Layout | **Als Schnittstelle verbleiben:** eigenständige `ui/`- und `application/`-Module besitzen das Verhalten; kein direkter IndexedDB-/Leaflet-Fachzugriff nötig |

**Offen, aber kein automatischer Architekturblocker:** Mehrere anonyme Callback-Listen sind lang; weitere Extraktion nur bei Funktionsänderung, neuer Wiederverwendung, tatsächlichem Test-/Fehlerproblem oder verbotener Schichtenabhängigkeit. Keine 15. Extraktion allein zur Zeilenreduktion. Die UI-/CSS-Endabnahme ist **nicht** abgeschlossen.

## 2. Verbindliche Regelhierarchie (Widersprüche aufgelöst)

- **Genau eine Ebene pro Pin**, private Ebene von Anfang an.
- **Neuere Präzisierung vom 2026-11-09 hat aktive Ebene ausdrücklich abgeschafft:** Neue Objekte einschließlich manuell gesetzter Pins werden nach **„Privat“** aufgenommen, auch bei ausgeblendeter Ebene mit Hinweis. Die älteren Grundentscheidungen 7–11 gelten insoweit nicht mehr; `activeLayer` ist bewusst kein aktiver Zustand.
- **Neuere Gestenregel hat den alten „Pin hinzufügen“-Modus ersetzt:** Langer Tap auf freie Kartenfläche erstellt einen Pin; die frühere Desktop-/Touch-Präzisierung ist nach Datum/Geltungsbereich zu lesen. Verschieben bestehender Pins erfolgt bewusst über den Pin-Dialog, nicht per Langdruck-Verschieben.
- **Grundentscheidung 21:** Eine separate Pin-Liste ist **nicht Teil der ersten lokalen Basisversion**. Das ist ein bewusst zurückgestelltes Feature, kein Basisdefekt.
- **Fotos nicht geplant; Kartenbild-/PNG-Export ausdrücklich gestrichen.** Nicht als fehlende Funktionen in den nächsten Sprint aufnehmen.
- **Server/Sync erst nach Gate 3** der lokalen Funktionsparität und Datenverlustschutz-Regeln; ältere Aussagen zur frühen Serveranbindung sind ersetzt.
- CSS-B38 mit 298 `!important` bleibt separat pausiert, nicht als saniert/abgenommen deklarieren.

## 3. Funktionsabgleich: NEW v116 versus Vorgänger-App

Statusschlüssel: **I** = implementiert und automatisiert geprüft; **T** = technisch vorhanden, aber reale iPhone-/UX-Abnahme offen; **O** = offen/nicht im aktiven UI; **R** = Schnittstelle reserviert, keine Funktion; **Z** = bewusst zurückgestellt oder ausgeschlossen. Diese Bestandsaufnahme ersetzt keinen durchgeführten Gerätevergleich. Vorlage: `docs/VORGAENGER_APP_MODUL_AUDIT.md`, aktive NEW-Quellen, Tests und Grundentscheidungen.

| Funktionsgruppe | NEW v116 / Status | Nächster Abnahme- oder Entwicklungsbedarf |
| --- | --- | --- |
| Leaflet-Karte, Straßen-/Topokarte, Kartenwahl, Zoom | **I/T** | Automatisiert und Topo v104 vom Nutzer bestätigt; weitere Touch-/Safe-Area-Abnahme separat |
| Pin anlegen, auswählen, umbenennen, verschieben, löschen | **I/T** | Browser-/Offline-Tests grün; echtes iPhone-Gestenverhalten und Randpositionen später gezielt abnehmen |
| Genau eine Ebene, Privat, weitere Ebenen, Sichtbarkeit, Löschen, Pin-Ebenenwechsel | **I/T** | Automatisiert geprüft; Detailvergleich der Ebenen-UX und weiterer Bearbeitung noch offen |
| Kartenausschnitt, Pins/Ebenen lokal speichern, PWA-Offline-Start und OSM-Kachelcache | **I/T** | Chromium-Regressionen grün; Safari/PWA/Flugmodus und Cache-Lebenszyklus auf Geräten nicht pauschal abgenommen |
| Ortsnamensuche, Trefferliste, Übernahme als Pin | **I/T** | Suchcache-/Resultatwege ohne externe Nominatim-Abfrage geprüft; echte Geocoder-Verfügbarkeit/Policy getrennt |
| Pin-Labels/-Nummerierung/-Symbole und Informationsdichte der Vorgänger-App | **O (erweiterter Umfang)** | Bestehender einfacher Label-Schalter ist nicht gleichwertig mit den Vorgänger-Modi; später gezielte UI-Abnahme und separate Pin-Appearance-Module |
| Pinnotizen, Links, Kopieren | **O** | Nach UX-Basis als erster fachlicher Erweiterungskandidat, mit eigenem Metadatenmodell und persistierter Bearbeitung |
| Separate Pin-Liste | **Z (Basis)** | Gemäß Grundentscheidung 21 erst später, nicht als Basisvoraussetzung |
| Erweiterte Ebenenfarben, Umbenennen, Kategorien-/Filtervarianten | **O/teilweise** | Teilweise Grund-/Filtermodule vorhanden; konkrete UI-/Funktionsparität nach Entscheidungen |
| Flächen, Polygone und Linien | **O** | Eigene Geometrie-Domain + Editor + Speicher; nicht als spezielle Pins modellieren |
| Gewässer-/Flusssuche und Topologie | **R** | Gewässer-Service-Grenze reserviert; Segmente/Relationen/Geometrie getrennt entwickeln |
| Routing Auto, Fuß, Rad, ÖPNV; Optionen und Routenreihenfolge | **R/teilweise vorbereitet** | Keine operative Routing-Funktion; Provideradapter und Routen-Datenmodell separat |
| GPX-Import, Track-Verwaltung, GPX-Export | **O** | Eigene Track-/Import-/Exportmodule mit Geometrie- und Verlustschutz-Verträgen |
| Projekt-Import/Export, Backup, Wiederherstellung und Legacy-Übernahme | **O** | Wichtiger Datenverlustschutz vor großem lokalem Funktionsausbau und vor Serverphase; kein stilles Reset/Migration |
| Wetter, Höhe, Tageslänge, Sonnenzeiten, Zeitzonen | **R** | Providerneutraler Geoinfo-Port reserviert, keine aktive UI-/Datenfunktion |
| Externe Karten, Standort, Wikipedia, Verweise | **O** | Später pro Adapter und Sicherheits-/Datenschutzgrenzen |
| Server-/Gerätesynchronisation | **Z (zeitlich)** | Erst nach Gate 3 |
| Fotos, Kartenbild-/PNG-Export | **Z (ausgeschlossen)** | Nicht planen |

## 4. Vorschlag zur nächsten Arbeitsreihenfolge (keine neue Grundentscheidung)

1. **Nächstes Inkrement: reproduzierbares UX-/Basis-Abnahmeprotokoll für iPhone und iPad erstellen** – auf konkrete Vorgänger-App-Szenarien fokussiert: Langdruck-Pin, Pin-Öffnen am Rand, Verschieben mit Vorschau, Ebenen-/Such-/Kartenmenü, untere Buttons/OSM-Attribution, Refresh/Offline-Start. Vorhandene Chromium-Gates beibehalten. **Reale Gerätetests ausdrücklich erst mit URL, Schritten und erwarteten Resultaten anfordern**; kein automatischer „iPhone getestet“-Status.
2. **Dann funktionsbezogene Ergänzungen in kleinen Modulen**, zuerst die fachlich noch fehlenden Basisergänzungen gegen die beschlossenen Anforderungen und die Vorgänger-App priorisieren. Kandidaten: verlässlicher Projekt-Export/Backup und Wiederherstellungsweg (Verlustschutz) sowie Pinnotizen/Links. Den konkreten Umfang jeweils vor Code gegen Grundentscheidungen verifizieren, nicht neue Funktionen stillschweigend beschließen.
3. Erweiterte Pin-Darstellung, Ebenenbedienung, Flächen/Linien, Filter, Routing/GPX, Flüsse und Geoinformationen nach Etappe 3 und konkreten Funktionsgates aufbauen. Das bereits vorhandene Vorgänger-Audit als Referenz je Feature verwenden.
4. **Keine frühe Sync-Implementierung**, keine Fotos, kein PNG-Kartenexport und keine pauschale CSS-Sanierung parallel zu jedem Feature.

## 5. Prüf- und Bestandsschutz

Diese Runde ist eine **Quelltext-/Dokumentationsinventur** auf dem aktiven Feature-Branch; **keine App-Datei wurde geändert**, die Quellversion bleibt v116. Der letzte verifizierte funktionale Stand bleibt durch [Node/Chromium](https://github.com/pin2map/pin2map-new-test/actions/runs/42996283550), [Architektur](https://github.com/pin2map/pin2map-new-test/actions/runs/42996283996) und [Pages/HTTPS](https://github.com/pin2map/pin2map-new-test/actions/runs/42996283529) belegt. Diese CI-Ergebnisse gelten für v116, **nicht als neues Testresultat des Dokumentationscommits**.

`main`, `reference/*`, `styles.css`, `sw.js`, Karten-Provider und `adapters/storage/indexeddb-project-store.js` bleiben unangetastet; keine Änderung bestehender Nutzerdaten.
