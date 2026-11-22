# pin2map NEW – Routing: funktionale Referenz und Anforderungs-/Entscheidungsregister

**Angelegt:** 22.11.2026 · **Status:** gemeinsame Anforderungserhebung eröffnet, **noch keine neuen fachlichen Routing-Entscheidungen freigegeben**.  
**Geltung:** `pin2map/pin2map-new-test`, Branch `feature/leaflet-modular-core`.  
**Vorgänger-Quellreferenz:** `pin2map/pin2map`, `main`, [`index.html`](https://github.com/pin2map/pin2map/blob/main/index.html), direkt am 22.11.2026 geprüft; die unten genannten Zeilen/Funktionen dienen ausschließlich zur Identifikation der Legacy-Funktion.  
**Bereits bestehende Querverträge:** `AGENTS.md`, `docs/GRUNDENTSCHEIDUNGEN.md`, `docs/MODULARCHITEKTUR.md`, `docs/PROJEKTSTATUS.md`, `docs/VORGAENGER_APP_MODUL_AUDIT.md`, `tests/routing-readiness-architecture.test.js`.

## 1. Zweck, Quellenwert und klare Trennung

Dieses Dokument ist **die zentrale fortzuschreibende Arbeitsgrundlage für die Routing-Funktionsdiskussion über mehrere Chats**. Es führt keine konkurrierende Zielarchitektur oder stillschweigende Übernahmepflicht ein. Für jeden Bereich gilt:

- **Vorgänger-Nachweis:** Der Legacy-Quellcode belegt eine vorhandene Bedienmöglichkeit bzw. Implementierung. Das ist noch keine bestätigte Produktanforderung an NEW und kein Nachweis einer fehlerfreien realen Bedienung.
- **Bestehender NEW-Vertrag:** Nur bereits dokumentierte und abgenommene Funktionen/Architekturgrenzen sind verbindlich; Änderungen bedürfen ausdrücklicher Nutzerfreigabe.
- **Neue Nutzeranforderung:** Erst die Beschreibung und anschließende gemeinsame Diskussion mit dem Auftraggeber bestimmen, welche Legacy-Funktionen übernommen, verändert oder gestrichen werden.
- **Technische Lösung:** Erst nach fachlicher Klärung separat bewerten und entwerfen. Provider, Datenmodelle, Algorithmen, UI-/Gesture-Integration und Speicherformat nicht aus der Vorgängerdatei kopieren.

Die Vorgänger-App dient als **funktionale und gegebenenfalls visuelle Referenz, ausdrücklich NICHT als Architektur- oder Quellcodevorlage**. Historische globale Zustände, direkte Leaflet-Kopplungen und Provideraufrufe innerhalb von UI-Handlers sind keine Entwurfsvorgaben.

## 2. Im Vorgänger `pin2map/pin2map:index.html` belegtes Routing-Funktionsinventar

Die Angaben sind Quellcodebefunde, keine für NEW beschlossenen Funktionsanforderungen. Referenzzeilen beziehen sich auf die am 22.11.2026 direkt gelesene Legacy-`main/index.html`.

| ID | Funktionsbereich | Direkt belegtes Verhalten der Vorgänger-App | Beleg im Legacy-Quelltext |
| --- | --- | --- | --- |
| L-R01 | Routenpunkte und Rollen | Ein Pin als **Start**, ein Pin als **Ziel**, beliebige gespeicherte Pins als **Zwischenziele**; Zuordnung über Pin-Aktionen, Entfernen von Zwischenzielen und spätere Neuberechnung | `routeStartItem`, `routeTargetItem`, `routeWaypoints`, `routePosition` um 4195–4198; Click-Handler 4743–4755 |
| L-R02 | Verkehrsarten | Umschaltung **Auto, Fahrrad, Zu Fuß, ÖPNV**; Neuberechnung bei Moduswechsel | `data-route-mode` im `routeInfo` um 2495; Click-Handler 4710–4717 |
| L-R03 | Routendialog | Eigenes Routenbedienfeld mit Zusammenfassung, Verkehrsmodus, Beenden, Ein-/Ausblenden und Teilstreckenansicht | HTML 2495–2504; `setRoutePanelHidden`, `renderRouteEditor`, `routeDetailsToggle` |
| L-R04 | Multi-Pin | Noch nicht verwendete, im aktuellen Kartenausschnitt sichtbare Pins als Zwischenziele aufnehmen bzw. wieder zurücknehmen | `addVisiblePinsToRoute` 4283–4298; `routeVisiblePins` |
| L-R05 | Reihenfolge | `FIX` fest und `OPT` optimiert, manuelles Verschieben von Routenpunkten, Umkehren der gesamten Route; eine Umkehrung stellt feste Reihenfolge her | `routeOrderToggle`, `routeOrderOptimal`, `routeReverse` 2497–2500; `editRouteMove` 4303; `reverseRouteOrder` 4249–4258 |
| L-R06 | Optimierung | Auto mit lokaler Luftlinien-Voroptimierung (Nearest Neighbor/2-opt-artig); Fuß/Fahrrad per Valhalla `optimized_route`; Start/Ziel werden bei der Optimierung beibehalten | `optimizeRouteOrder` 4565–4585 |
| L-R07 | Streckenberechnung | Auto über OSRM; Fuß/Fahrrad über Valhalla, bei mehreren Punkten **abschnittsweise**, mit Darstellung bereits fertiger Etappen; getrennte Providerfehleranzeige | `calculateRoute` 4587–4635, `p2mShowRouteFailure` 4260–4269 |
| L-R08 | Routenergebnis | Gesamtstrecke in km, Dauer, Kartenlinie und Etappen mit Entfernung und Dauer; Teilstreckenansicht aufklappbar | `showCalculatedRoute` 4381–4394 |
| L-R09 | Linienfarben | Unterschiedliche Etappenfarben optional; Fußwege im ÖPNV abweichend dargestellt | `routeLegColors`, `updateRouteLegColorButton` um 4173; `calculateTransitRoute` 4523–4532 |
| L-R10 | Fahrtzeitmarkierungen | Bei Autorouten visuelle Markierungen im 30-Minuten-Raster, volle Stunden zusätzlich hervorgehoben | `p2mDrawDriveTimeMarkers` um 4155–4172 |
| L-R11 | ÖPNV-Anfrage | Nur Start/Ziel, keine Zwischenziele; Fahrplanmodi Abfahrt oder Ankunft mit Datum/Uhrzeit; Fahrzeugpräferenz Alle/Bahn/Bus und zusätzliche Umsteigezeit | HTML 2495; `calculateTransitRoute` 4517–4521; `transitTimeMode`, `transitVehiclePreference`, `transitExtraTransfer` |
| L-R12 | ÖPNV-Ergebnis | Die App verwendet **`d.itineraries[0]`**, also die erste zurückgegebene Verbindung; Anzeige von Linien, Abfahrts-/Ankunftszeiten, Haltestellen, Gleisen, Umstiegen und einzeln fokussierbaren Etappen | `calculateTransitRoute` 4521–4557; `p10730Platform` und `p10732FocusLeg` |
| L-R13 | ÖPNV-Weitergabe | Start/Ziel mit Ortsbezeichnung, Koordinaten sowie lokalem Datum und Abfahrts-/Ankunftsauswahl an DB Navigator übergeben | `p2mDbNavigator` 4719–4742 |
| L-R14 | Apple Karten | Routenstart/Ziel an Apple Karten mit an den Modus angepasstem Navigationsparameter; einzelne Etappen können separat übergeben werden | `openRouteInAppleMaps` um 4324–4328; Etappenaktionen 4388 |
| L-R15 | GPX-Export | Berechnete Route als GPX mit Trackpunkten und Routenpunkt-Waypoints exportieren | `rememberRouteExport`, `exportRouteGpx` 4339–4347 |
| L-R16 | Projektwiederherstellung | Routenmodus, feste/optimierte Reihenfolge, Start/Ziel/Zwischenziele und ÖPNV-Zeitparameter im Projektbezug wiederherstellen, sofern referenzierte Pins noch auflösbar sind | `projectRouteDocument`, `restoreProjectRoute` 4174–4194 |
| L-R17 | Abbruch und Fehler | Route beenden/entfernen, berechnete Geometrie zurücksetzen, Routenpunkte optional beibehalten; überholte Anfragen generationenbasiert ignorieren, Modi bei Fehler zeitweilig markieren | `clearRoute` 4329–4334; `routeRequestGeneration` 4587–4635; `p2mShowRouteFailure` |
| L-R18 | Kartenfokus | Nach Berechnung automatische Anpassung der Kartenansicht; bei ÖPNV kann eine einzelne Etappe in Karte/Liste fokussiert werden | `autoZoomCurrentRoute` 4391–4393; `p10732FocusLeg` 4554 |

### Aussagegrenzen der Referenz

- **Keine bewährte ÖPNV-Alternativenwahl belegt:** Die reguläre Vorgänger-App wählt `itineraries[0]`. Ein in historischen separaten Referenzdateien erwähnter experimenteller Alternativenansatz ist keine abgenommene Hauptfunktion.
- **Anbieter nicht verbindlich:** Die beobachteten OSRM-/Valhalla-/Transitous-/DB-/Apple-Endpunkte sind historische Implementierungsdetails, keine technische Entscheidung für NEW; deren aktuelle Nutzbarkeit, Quoten und Eignung müssen bei einer späteren Providerentscheidung neu geprüft werden.
- **Keine automatische Qualitätsgarantie:** Existenz der Funktionen im Legacy-Quellcode beweist keine korrekte Routenqualität, Reisezeit, stabile Echtzeitverfügbarkeit oder durchgeführte Geräteabnahme.
- **Keine UI-Paritätsautomatik:** Die tatsächliche Bedienoberfläche und der gewünschte Ablauf werden mit dem Auftraggeber eigenständig spezifiziert, insbesondere auf iPhone/iPad.

## 3. Was für pin2map NEW bereits verbindlich ist

1. **Modulgrenzen:** Routing als eigener Fachbereich mit getrennten Domainobjekten, Anwendungsfällen, Routingprovider-Adaptern, Karten-Port/-Renderer und UI-Controllern. Keine Routing- oder Providerfachlogik in `app.js`; kein Leaflet-Objekt als Domain-/Projekt-Routenobjekt. Kartenansicht, Berechnung, Ergebnisnormalisierung, Darstellung, Speicherung und Export sind getrennte Verantwortlichkeiten.
2. **Providerneutraler Platzhalter:** `application/routing-service.js` kennt aktuell `car`, `pedestrian`, `bicycle`, `transit` und `register(mode, provider)`/`calculate(...)`; es ist **kein Provider registriert** und keine Berechnung in der laufenden PWA aktiviert. Dies wird von `tests/routing-readiness-architecture.test.js` geschützt.
3. **Routing-Ready-Baseline:** Nach v329 dokumentiert; Karten-/Tap-/Pin-/Overlay-Eigentümer und Modulschutz bestehen. Routing-Wegpunktauswahl, Eventprioritäten und Speicher-/Fehlerverträge müssen **vor** Aktivierung als neue Anforderungen spezifiziert werden.
4. **Aktueller UI-Vorgriff v330:** Im Pin-Dialog öffnet Start einen **rot gerahmten**, Ziel mit originalem Lucide-`goal` einen **grün gerahmten** Unterdialog im Notizenfeld; die beiden sind exklusive reine UI-Toggles ohne Routenspeicherung/-berechnung. Der gelbe Zwischenzielbutton ist weiter deaktiviert. Diese bereits abgenommene UI wird nicht automatisch durch Legacy-Verhalten ersetzt.
5. **Bestandsschutz und Abschluss:** `AGENTS.md`, `docs/GRUNDENTSCHEIDUNGEN.md`, `docs/ENTWICKLUNGSARBEITSABLAUF_2026-11-15.md`: Keine unbeauftragten Produkt-/Schema-/Layoutänderungen; Umsetzung neuer Features erst nach expliziter fachlicher Freigabe, danach Node-/Architektur-/Chromium-/WebKit-/HTTPS-Service-Worker-Gates für den maßgeblichen Stand und real veröffentlichte Preview. Physische iPhone-/iPad-Abnahme getrennt.

## 4. Offene Funktionsdiskussion – keine impliziten Entscheidungen

Die folgende Struktur ist **nur die Agenda**, keine geforderte oder freigegebene Featureliste. Nutzeranforderungen werden nach Eingang wortgetreu aufgenommen und danach gemeinsam diskutiert.

| ID | Zu klärender Bereich | Status |
| --- | --- | --- |
| O-R01 | Was definiert Start, Zwischenziel und Ziel; nur Projekt-Pins oder auch freie Koordinaten/Suchergebnisse? | **OFFEN** |
| O-R02 | Welche Verkehrsarten und welches Verhalten bei gemischten Wegen, mehreren Zwischenzielen und ÖPNV? | **OFFEN** |
| O-R03 | Was bewirkt Start-/Ziel-Toggle im neuen Pin-Dialog tatsächlich; wie wird der Auswahlmodus verlassen? | **OFFEN** |
| O-R04 | Routenpunktreihenfolge: manuell, umkehren, optimieren; Grenzen und Änderungen | **OFFEN** |
| O-R05 | Gewünschte Routenoberfläche, Kartenlinien, Farben, Legenden, Etappen, Alternativen | **OFFEN** |
| O-R06 | ÖPNV-Zeit, Fahrzeugpräferenz, Anschlüsse, Alternativen und Detailanzeige | **OFFEN** |
| O-R07 | Berechnung, Anbieterwahl, Netzwerk-/Offline-Verhalten, Fehler- und Abbruchstrategie | **OFFEN** |
| O-R08 | Routen speichern, Projektmigration, GPX/andere Exporte und externe Navigation | **OFFEN** |
| O-R09 | Gesten- und Prioritätsregeln gegenüber Pin-Auswahl, Pin-Verschieben, Suche, Flächen, Satellit und Kartenklick | **OFFEN** |
| O-R10 | Abnahmebeispiele auf Desktop, schmalem iPhone, iPad und realen Geräten | **OFFEN** |

## 5. Verbindlicher Workflow für künftige Chats und Freigaben

1. Beim neuen Chat `AGENTS.md` und `docs/PROJEKTSTATUS.md` lesen; danach **dieses Routing-Dokument** und die darin verlinkten Architektur- und Vorgängerverträge.
2. Den **Originalwortlaut jeder neuen Nutzeranforderung** mit eigener Kennung `R-001`, `R-002` … in einer zusätzlichen Rubrik **„Eingereichte Anforderungen“** ergänzen. Datum und Status `EINGEREICHT` kennzeichnen; ohne Interpretation nicht als Beschluss ausgeben.
3. Diskussionen und Alternativen unter derselben Kennung ergänzen, inklusive belegter Vor- und Nachteile und offener Fragen, Status `IN_DISKUSSION`.
4. Erst nach ausdrücklicher Nutzerzustimmung den genehmigten Wortlaut als `BESCHLOSSEN` mit Datum, Geltungsbereich, Akzeptanzkriterien und Links auf eventuell abgelöste Entscheidungen in diesem Dokument sowie gegebenenfalls `GRUNDENTSCHEIDUNGEN.md` erfassen.
5. Technisches Design getrennt und rückverfolgbar zu diesen beschlossenen Anforderungen entwickeln. Keine Architektur-/Provider-/Persistenzannahme allein aus dem Legacy-Verhalten ableiten. Später für die Umsetzung konkrete Modulgates und mobile Interaktionsgates festlegen.
6. Nach jedem freigegebenen Entwicklungsschritt Status, Commit, CI-Run-Links, HTTPS-/SW-Nachweis und offene Punkte in `PROJEKTSTATUS.md` ergänzen. Reine Dokumentationsänderungen benötigen **keine PWA-Versionserhöhung** und keine unangeforderte neue Preview.
7. Beim Chatwechsel ist dieses GitHub-Dokument der kanonische Gesprächsstand; Zusammenfassungen im Chat ersetzen es nicht.

## 6. Eingereichte Nutzeranforderungen

**Noch keine neuen fachlichen Anforderungen eingetragen.** Der Auftraggeber hat angekündigt, sie als Nächstes zu beschreiben und gemeinsam zu diskutieren. Die bereits abgenommene Start-/Ziel-Platzhalteroberfläche aus v330 ist oben ausschließlich als existierender NEW-Vertrag dokumentiert.

## 7. Beschlossene Routing-Fachentscheidungen aus der neuen Anforderungsrunde

**Noch keine.** Die Modularchitektur- und v330-UI-Verträge aus Abschnitt 3 gelten unabhängig davon weiter. Keine technische Routing-Implementierung vor dieser Diskussion.
