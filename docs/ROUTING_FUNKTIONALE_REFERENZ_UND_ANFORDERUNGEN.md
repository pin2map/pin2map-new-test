# pin2map NEW – Routing: funktionale Referenz und Anforderungs-/Entscheidungsregister

**Angelegt:** 22.11.2026 · **Status:** gemeinsame Anforderungserhebung eröffnet, **noch keine neuen fachlichen Routing-Entscheidungen freigegeben**.  
**Geltung:** `pin2map/pin2map-new-test`, Branch `feature/leaflet-modular-core`.  
**Maßgebliche Vorgänger-Funktionsreferenz (nach ausdrücklicher Nutzerklarstellung vom 22.11.2026):** [`pin2map/pin2map-2`, `main/reference/legacy/pin2map_v10.12.71_Verbindungsauswahl_TEST.html`](https://github.com/pin2map/pin2map-2/blob/main/reference/legacy/pin2map_v10.12.71_Verbindungsauswahl_TEST.html), archivierter Original-Blob `e3906d8d17bdebdf55a09a3f731d18b96fe3e04a`. **Ältere stabile Vergleichsbasis:** [`pin2map/pin2map-2`, `main/reference/legacy/pin2map_v10.12.71_auto_zeitmarkierungen.html`](https://github.com/pin2map/pin2map-2/blob/main/reference/legacy/pin2map_v10.12.71_auto_zeitmarkierungen.html), Blob `818d613eef1e721b412be9245e83cb10af600429`, bytegleich zur bisherigen `pin2map/pin2map:main/index.html`. Beide Originale und ihre Einordnung sind in `pin2map-2/reference/legacy/README.md` dokumentiert.  
**Bereits bestehende Querverträge:** `AGENTS.md`, `docs/GRUNDENTSCHEIDUNGEN.md`, `docs/MODULARCHITEKTUR.md`, `docs/PROJEKTSTATUS.md`, `docs/VORGAENGER_APP_MODUL_AUDIT.md`, `tests/routing-readiness-architecture.test.js`.

## 1. Zweck, Quellenwert und klare Trennung

Dieses Dokument ist **die zentrale fortzuschreibende Arbeitsgrundlage für die Routing-Funktionsdiskussion über mehrere Chats**. Es führt keine konkurrierende Zielarchitektur oder stillschweigende Übernahmepflicht ein. Für jeden Bereich gilt:

- **Vorgänger-Nachweis:** Der Legacy-Quellcode belegt eine vorhandene Bedienmöglichkeit bzw. Implementierung. Das ist noch keine bestätigte Produktanforderung an NEW und kein Nachweis einer fehlerfreien realen Bedienung.
- **Bestehender NEW-Vertrag:** Nur bereits dokumentierte und abgenommene Funktionen/Architekturgrenzen sind verbindlich; Änderungen bedürfen ausdrücklicher Nutzerfreigabe.
- **Neue Nutzeranforderung:** Erst die Beschreibung und anschließende gemeinsame Diskussion mit dem Auftraggeber bestimmen, welche Legacy-Funktionen übernommen, verändert oder gestrichen werden.
- **Technische Lösung:** Erst nach fachlicher Klärung separat bewerten und entwerfen. Provider, Datenmodelle, Algorithmen, UI-/Gesture-Integration und Speicherformat nicht aus der Vorgängerdatei kopieren.

Die Vorgänger-App dient als **funktionale und gegebenenfalls visuelle Referenz, ausdrücklich NICHT als Architektur- oder Quellcodevorlage**. Historische globale Zustände, direkte Leaflet-Kopplungen und Provideraufrufe innerhalb von UI-Handlers sind keine Entwurfsvorgaben.

## 2. Im Vorgänger `pin2map/pin2map:index.html` belegtes Routing-Funktionsinventar

Die Angaben sind Quellcodebefunde, keine für NEW beschlossenen Funktionsanforderungen. **Die folgende zunächst erstellte Tabelle L-R01–L-R18 referenziert die ältere stabile Datei** (`pin2map/pin2map:main/index.html`), deren Zeilennummern nicht mit der maßgeblichen ÖPNV-Testversion übereinstimmen. **Abschnitt 2a dokumentiert verbindlich die zusätzliche/abweichende Funktionalität der neueren Testversion; bei fachlichen Widersprüchen hat sie als Funktionsreferenz Vorrang.**

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
| L-R12 | ÖPNV-Ergebnis (**ältere stabile Version**) | Die ältere App verwendet **`d.itineraries[0]`**; die **maßgebliche neuere Testversion** bietet dagegen eine echte Auswahl mehrerer zurückgelieferter Verbindungen und aktualisiert bei Auswahl Karte und Etappen (siehe Abschnitt 2a). | Ältere `calculateTransitRoute` 4521–4557; neuere `p2mStoreTransitAlternatives`/`p2mShowTransitAlternatives`/`p2mRenderTransitItinerary` 4534–4631 |
| L-R13 | ÖPNV-Weitergabe | Start/Ziel mit Ortsbezeichnung, Koordinaten sowie lokalem Datum und Abfahrts-/Ankunftsauswahl an DB Navigator übergeben | `p2mDbNavigator` 4719–4742 |
| L-R14 | Apple Karten | Routenstart/Ziel an Apple Karten mit an den Modus angepasstem Navigationsparameter; einzelne Etappen können separat übergeben werden | `openRouteInAppleMaps` um 4324–4328; Etappenaktionen 4388 |
| L-R15 | GPX-Export | Berechnete Route als GPX mit Trackpunkten und Routenpunkt-Waypoints exportieren | `rememberRouteExport`, `exportRouteGpx` 4339–4347 |
| L-R16 | Projektwiederherstellung | Routenmodus, feste/optimierte Reihenfolge, Start/Ziel/Zwischenziele und ÖPNV-Zeitparameter im Projektbezug wiederherstellen, sofern referenzierte Pins noch auflösbar sind | `projectRouteDocument`, `restoreProjectRoute` 4174–4194 |
| L-R17 | Abbruch und Fehler | Route beenden/entfernen, berechnete Geometrie zurücksetzen, Routenpunkte optional beibehalten; überholte Anfragen generationenbasiert ignorieren, Modi bei Fehler zeitweilig markieren | `clearRoute` 4329–4334; `routeRequestGeneration` 4587–4635; `p2mShowRouteFailure` |
| L-R18 | Kartenfokus | Nach Berechnung automatische Anpassung der Kartenansicht; bei ÖPNV kann eine einzelne Etappe in Karte/Liste fokussiert werden | `autoZoomCurrentRoute` 4391–4393; `p10732FocusLeg` 4554 |

### Aussagegrenzen der Referenz

- **ÖPNV-Alternativenwahl ist in der gesuchten Testversion ausdrücklich vorhanden:** Anders als die ältere stabile Datei verarbeitet die neuere Testversion mehrere von Transitous gelieferte Itineraries und stellt eine echte auswählbare Liste dar. Die Archivdokumentation kennzeichnet diese Version als nach umfangreichen Tests optimiert, zugleich aber mit nicht mehr beherrschbarer Darstellung. Eine fehlerfreie/abgenommene mobile UI ist damit nicht belegt. Keine automatische Funktionsübernahme ohne neue Anforderungsfreigabe.
- **Anbieter nicht verbindlich:** Die beobachteten OSRM-/Valhalla-/Transitous-/DB-/Apple-Endpunkte sind historische Implementierungsdetails, keine technische Entscheidung für NEW; deren aktuelle Nutzbarkeit, Quoten und Eignung müssen bei einer späteren Providerentscheidung neu geprüft werden.
- **Keine automatische Qualitätsgarantie:** Existenz der Funktionen im Legacy-Quellcode beweist keine korrekte Routenqualität, Reisezeit, stabile Echtzeitverfügbarkeit oder durchgeführte Geräteabnahme.
- **Keine UI-Paritätsautomatik:** Die tatsächliche Bedienoberfläche und der gewünschte Ablauf werden mit dem Auftraggeber eigenständig spezifiziert, insbesondere auf iPhone/iPad.

## 2a. Maßgebliche erweiterte ÖPNV-Testversion – direkt nachgewiesene Unterschiede

**Unbedingt für alle künftigen Routing-Diskussionen beachten:** Der Auftraggeber meint die **zweite, erweiterte Datei** `pin2map_v10.12.71_Verbindungsauswahl_TEST.html` aus `pin2map/pin2map-2:reference/legacy/`, **nicht** die zuvor primär untersuchte stabile `pin2map/pin2map:index.html`. Beide tragen denselben Versionspräfix `v10.12.71`; erst der Zusatz `Verbindungsauswahl_TEST` unterscheidet sie eindeutig.

Nach direktem Vergleich des wirklichen Quelltexts am 22.11.2026:

1. **Mehrere Verbindungen statt bloß `itineraries[0]`:** `calculateTransitRoute` (Zeilen 4622–4631) speichert mit `p2mStoreTransitAlternatives(d.itineraries,routeItems)` zunächst die Liste der zurückgegebenen Möglichkeiten; zuerst wird standardmäßig der erste darstellbare Eintrag angezeigt, die weiteren sind aber wählbar.
2. **Explizite Alternativenliste:** `p2mTransitAlternatives`, `p2mTransitSelected`, `p2mShowTransitAlternatives` (Zeilen 4534–4583) zeigen **tatsächlich gelieferte** Verbindungen mit Abfahrts-/Ankunftszeit, Dauer und Umstiegen an. Auswahl eines anderen Eintrags aktualisiert Karte, Etappen und Hinweise, ohne den externen Provider erneut nach genau dieser Alternative fragen zu müssen. Eine ausgedachte oder vom Provider nicht gelieferte Alternative wird nicht erzeugt.
3. **Separate Etappen-/Kartendarstellung:** `p2mRenderTransitItinerary` (Zeilen 4584–4620) rendert die jeweils ausgewählte Verbindung samt Geometrie, Farben, Routenübersicht, Haltestellen und Etappen. Etappen lassen sich auswählen und in der Karte fokussieren (`p10732FocusLeg` um Zeilen 4498–4512); die Liste bietet auch Tastaturbedienung per Pfeiltasten (4515–4529).
4. **Ungültige oder veraltete Antworten:** `p2mTransitRequestSeq` verhindert die Übernahme später eintreffender veralteter Berechnungsergebnisse. Als Möglichkeiten werden nur Einträge mit einer nichtleeren `legs`-Liste angenommen; Fehler verwerfen die Alternativen (4534–4559, 4622–4631).
5. **Geprüfte Grenzen:** Die archivierte `reference/legacy/README.md` nennt die ÖPNV-Verbindungsauswahl „nach umfangreichen Tests optimiert“, sagt aber ausdrücklich, dass die **Darstellung nicht mehr beherrschbar** war. Das beschreibt den historischen Entwicklungsstand; für NEW übernehmen wir daher **nur die gewünschten Fähigkeiten**, nicht die alte Layout-, Zustands- oder Handlerarchitektur.

**Fachlich für spätere Abstimmung relevant, aber noch OFFEN:** Welche Alternativen angezeigt/gefiltert/sortiert werden, wie man zwischen ihnen wechselt, welche Etappeninformationen und Fokuseffekte tatsächlich gewünscht sind sowie iPhone-/iPad-Navigation und Scrollverhalten. Der Legacy-Mehrfachverbindungscode ist ein konkreter Funktionsnachweis, **noch keine neue verbindliche Umsetzungsentscheidung**. Die umfassendere detaillierte Analyse des weiteren historischen Etappen- und Layout-Codes kann bei der entsprechenden Anforderungsrunde fortgesetzt werden.

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

### R-001 – Vier Routing-Typen und schrittweise Beschreibung (22.11.2026)

**Status: EINGEREICHT – fachliche Grundvorgabe vom Auftraggeber, Einzelheiten noch in Diskussion; keine Freigabe zur Implementierung.**

**Originalwortlaut des Auftraggebers (unverändert):**

> Gut. Es wird zukünftig wieder vier Routing-Typen geben: Auto, Fahrrad, Fußgänger, ÖPNV. Beim ÖPNV werden wir uns auf die aufwändigen Vorarbeiten im Routen und Etappen Optimieren der Vorgänger-Version orientieren. Bei den anderen Routing-Arten wird es gegenüber der Vorgänger-Version erhebliche Abweichungen geben. Was wir übernehmen ist die Darstellung der Autoroute, die für halbe und ganze Stunden kleine marker auf die Route setze und bei den vollen Stunden die Stunden als Zahl eintrug. Ich werde kleinschrittig vorgehen, weshalb ich zunächst nur das Auto-Routing beschreibe, bevor wir zu den anderen Routing-Arten kommen.

**Für die spätere Diskussion getrennt vorgemerkte Aussagen (keine ergänzten Funktionen):**

- **R-001a:** Für NEW sind vier Routing-Typen vorgesehen: **Auto, Fahrrad, Fußgänger und ÖPNV**. Das entspricht den bereits providerneutral reservierten Modi `car`, `bicycle`, `pedestrian`, `transit`; es legt noch keinen Anbieter und keine Aktivierungsreihenfolge fest.
- **R-001b:** Bei **ÖPNV** sollen insbesondere die aufwändigen Vorarbeiten zur **Routen- und Etappenoptimierung** der maßgeblichen erweiterten Vorgängerversion `pin2map_v10.12.71_Verbindungsauswahl_TEST.html` als funktionale Orientierung dienen. Das ist **keine** Entscheidung, Quellcode, Layout oder technische Algorithmen ungeprüft zu übernehmen.
- **R-001c:** Bei den **anderen Routing-Arten** sind gegenüber der Vorgänger-App **erhebliche Abweichungen** angekündigt. Diese dürfen nicht durch vermeintliche Legacy-Parität vorab festgelegt werden.
- **R-001d:** Beim **Autorouting** soll die aus der Vorgänger-App bekannte Anzeige von **kleinen Markern bei halben und ganzen Fahrtstunden entlang der Route** übernommen werden. **Volle Stunden** erhalten **die Stundenzahl** am Marker. Exakte Visualisierung, Berechnungs-/Rundungsdetails, Zeitskalierung und Fehlerfälle bleiben bis zur folgenden Auto-Routing-Beschreibung offen.
- **R-001e:** Der Auftraggeber beschreibt **zuerst ausschließlich Autorouting**, Schritt für Schritt. Danach folgen die anderen Modi. **Keine voreilige fachliche Detailentscheidung** oder Routingimplementierung vor Abschluss der gemeinsamen Besprechung.

**Nächster Input:** Detaillierte Anforderungen zum Autorouting. Bis dahin keine Fragen zu technischen Providern oder zur vollständigen ÖPNV-Gestaltung vorziehen.



### R-002 – Autorouting: zwei Eingabevarianten, Profile, Richtung, Fähren und externe Übergabe (23.11.2026)

**Status: EINGEREICHT / IN DISKUSSION. Keine Implementierungsfreigabe, keine Entscheidung über Provider, Algorithmus, UI-Detailgestaltung oder Datenmigration.**

**Quellkontext:** Neue ausführliche Nutzerbeschreibung im Folgechat mit Screenshot des *historischen* Routendialogs zur Illustration; der Screenshot ist ausdrücklich kein Auftrag, das alte Layout zu übernehmen. Der vollständige Wortlaut ist im zugehörigen Chatbeitrag enthalten. Für eine robuste Chatwechsel-Fortsetzung sind die einzelnen Aussagen hier getrennt und möglichst nah am Wortlaut dokumentiert:

- **R-002a – Variante 1 (über Pins):** Bestehenden Pin öffnen, roten Routing-Startbutton im Pin-Dialog betätigen: Pin wird Routingstart und optisch hervorgehoben. Zweiten Pin öffnen, grünes Zielsymbol betätigen: Pin wird als Ziel hervorgehoben; A→B-Route wird automatisch gezeichnet und separater Routing-Detaildialog erscheint. Durch Öffnen weiterer Pins und Betätigen des gelben Routing-Plusbuttons werden beliebig wiederholbar echte Zwischenziele hinzugefügt. Ihre anfängliche Reihenfolge folgt der chronologischen Hinzufügung. Optimierung kann die Reihenfolge der Zwischenziele ändern; Umschaltung zwischen Originalreihenfolge und optimierter Reihenfolge wie beim historischen „Multi Pin Routing“.
- **R-002b – Variante 2 (Start-Dialog und freie Adresse):** Startpin öffnen, roten Startbutton drücken; im bestehenden Start-Unterdialog über Texteingabe Zieladresse bestimmen. Ein Ziel muss zuvor kein Pin sein: wenn kein entsprechender Pin existiert, soll an aufgelöster Adresse automatisch ein neuer Zielpin angelegt und markiert werden. Falls ein entsprechender Pin existiert, soll er im Start-Dialog auswählbar sein. Live-Teilstringsuche nach vorhandenen Pins über **alle** Ebenen einschließlich ausgeblendeter Ebenen, potenziell mehrere Tausend Pins: „ham“ findet alle Einträge mit dieser Zeichenfolge; Ergebnismenge verengt sich mit weiterer Eingabe.
- **R-002c – Zwei zusätzliche untereinander angeordnete Texteingabefelder:** Angaben wie „Frankfurt“ sollen die gewünschte Richtung/den Routenverlauf vorgeben, ohne echte Adressen/Pins und ohne tatsächlichen Zwischenstopp: Route soll *an Frankfurt vorbei* statt etwa über Würzburg verlaufen, **ohne unnötigen Umweg in den Ort**. Echte Pin-Zwischenstopps bleiben unabhängig hiervon jederzeit ergänzbar. Technisches Konzept zur weichen Korridorführung ausdrücklich noch offen.
- **R-002d – Autoroutenprofile:** Nicht länger ausschließlich die schnellste Route. Gewünscht sind (a) schnellste Route und (b) Route für langsamere Fahrzeuge mit vergleichbarem großräumigem Verlauf, möglichst ohne Autobahnen, mit attraktivem Verlauf. **Nicht** gleichzusetzen mit kürzester Strecke oder speziellem Motorradrouting. Einfach zu bedienen. Optional zusätzlich Routen ohne Autobahnen und ohne Mautstraßen (auch grenzüberschreitend). Profilbezeichnungen und Grad der Präferenz/strikter Ausschlüsse noch offen.
- **R-002e – Einstellungen „Routing“:** Eigenes neues Einstellungsraster für Grundparameter mehrerer Routingarten. Festlegbare Höchstgeschwindigkeiten pro Straßenart, ausdrücklich Autobahn, Landstraße, Schotterstraße und innerorts. Beide Autoroutenprofile und ihre Fahrzeitprognosen sollen sich daran orientieren. Technische Straßenklassifikation, rechtliche Limits, Missing Data und Trennung von Routenauswahl/Zeitschätzung offen.
- **R-002f – Apple Karten:** Button mit Apple-Logo soll die gewählte Route einschließlich tatsächlicher Zwischenziele an Apple Karten übergeben. Offene Einschränkung: Kann exakte berechnete Linienführung/Korridor überhaupt beibehalten werden oder nur Stopps?
- **R-002g – Fähren:** Wasser-/Fährpassagen gestrichelt darstellen; deren Fahrtdauer **nicht** schätzen, da keine Fährpläne ausgewertet werden. Ausschließlich Straßenfahrzeiten ausweisen und auf Zeitmarkern darstellen; Zeitmarker bei jeder Straßenetappe zwischen Fährpassagen neu ab 0 zählen (Beispiel Köln–Oostende // Fähre Oostende–Dover // Dover–London). Straßenetappen einzeln und Summe der Straßenfahrzeiten anzeigen. Unterscheidung tatsächlicher Fähre vs. sonstiger Wasserquerung, Anschluss-/Terminalfahrten und Abgrenzung Gesamtreisezeit noch offen.

**Architektur- und Funktionsfragen, derzeit ausdrücklich NICHT beschlossen:** Gibt es parallele Auswahl zwischen zwei Profilen und optionalen Ausschlüssen? Wie weich/hart soll ein Richtungsort gelten und wie werden ungültige/mehrdeutige Adressen aufgelöst? Woher kommen Straße-/Geschwindigkeitsdaten, wie werden Fahrzeuglimits legal begrenzt? Was tun bei fehlender Route unter „keine Autobahnen/Maut“? Dürfen Zielpins in ausgeblendeten Ebenen visuell vorübergehend erscheinen, ohne gespeicherte Sichtbarkeit zu verändern? Wie werden Apple-Karten-Limits und Fähren ohne verlässliche Zeiten kenntlich gemacht? Keine vorschnelle Implementierung.

**Wiedereinstieg:** Zuerst im Chat fachlich bewerten und mit Auftraggeber präzisieren. Erst nach ausdrücklicher Zustimmung einzelne Punkte auf BESCHLOSSEN setzen. v330 bleibt unverändert.

### R-003 – Dialogsymmetrie, Provider-Zugang, entspannte Route und sinnvolle Alternativen (23.11.2026)

**Status: EINGEREICHT / IN DISKUSSION. Keine Implementierungsfreigabe.**

**Neue Aussagen des Auftraggebers im Folgechat:**

1. Die unter R-002b/c für den Start-Dialog genannten Funktionen gelten **analog für den Ziel-Dialog**: dort Ausgangspunkt suchen/auswählen bzw. bei Bedarf an Adresse anlegen und Richtungs-/Korridorwünsche eingeben. Keine nur einseitige Funktionalität. Ob die beiden Oberflächen technisch denselben Controller nutzen, ist eine Architekturfrage; bestehendes v330-Layout bleibt bis zur Freigabe geschützt.
2. Eine **Anmeldung/ID** für GraphHopper oder andere Routingnutzung ist **ausgeschlossen**. Daher Zweifel an GraphHopper und Konzentration auf OSRM/Valhalla; ausdrücklich Frage nach weiteren Optionen. Sachlich verifiziert: Der **gehostete kommerzielle GraphHopper-Directions-Dienst** verlangt Registrierung/API-Key; die freie Open-Source-Engine kann dagegen ohne GraphHopper-Konto selbst betrieben werden. Ebenso selbst betreibbar sind Valhalla, OSRM und openrouteservice; Selbsthosting ist jedoch kein automatisch verfügbarer öffentlicher Dienst und benötigt Infrastruktur. Noch offen, ob das Verbot nur Nutzerregistrierung, jegliche Entwickler-API-Schlüssel oder jede Infrastrukturregistrierung umfasst; keine gewählte Providerlösung.
3. „Entspannte Route“ bedeutet **überwiegend Variante B**: vergleichbarer **großräumiger Verlauf** wie schnellste Route, geeignete Landstraßen/Autobahnmeidung, keine extremen Umwege. Frühere Versuche mit Valhalla-„autobahnfrei“ in der Vorgänger-App ergaben häufig sehr lange Strecken/krasse Umwege. Nicht lediglich eine starre harte Autobahnsperre wiederholen. Alle quantitativen Limits bislang offen.
4. Überlegung, mehrere Routenalternativen auszuwerten. **Keine starre Anzahl von drei** und keine kaum unterscheidbaren oder absurden Umweg-Kandidaten anzeigen. Falls Alternativen, nur eine sinnvolle variable Anzahl mit **wesentlich unterschiedlichen** Verläufen. OSRM und Valhalla unterstützen technisch Alternativenanfragen; das ersetzt keine Qualitätsbewertung, keine Pflicht, mehrere anzuzeigen, und ist noch keine beschlossene UX.
5. **Zentrales ungelöstes Problem:** „über Frankfurt“ bei Stuttgart–Hamburg ist gedanklich eher ein **Autobahnkorridor**. Die entspannte Route kann einen davon abweichenden, viel attraktiveren/kürzeren/direkteren Verlauf besitzen. Eine geometrisch erzwungene Passage durch Frankfurt kann dem Ziel widersprechen. Auftraggeber wünscht **ausdrücklich vorab gründliche fachliche Lösung**, hat selbst noch keine festgelegt.

**Diskutierte, nicht beschlossene Lösungsansätze:** (A) Korridorwünsche identisch für beide Profile; (B) nur für schnellstes Profil; (C) weiche, für jedes Profil auf Qualität und Abweichung geprüfte Verlaufspräferenz; (D) zunächst substantielle großräumige Routenalternativen/Korridorfamilien ermitteln und Richtungsort als Präferenz für eine Familie statt als erzwungenen Ortsdurchgangspunkt interpretieren. Fachlicher Vorrang: Nutzerwünsche niemals stillschweigend ignorieren; echte Zwischenstopps bleiben zwingend. Eine Richtungsvorgabe muss möglicherweise zwischen zwingend/bevorzugt unterscheiden, dies ist **nicht** beschlossen. Kandidaten nach tatsächlicher Straßensegmentüberschneidung, Umweg, Dauer, Straßentypen und Eignung vergleichen; Schwellen noch offen. Valhalla-/OSRM-Alternative-API sind lediglich technische Kandidaten, kein Qualitätsversprechen.

**Recherchierte Dokumentationsquellen:** https://www.graphhopper.com/terms/ ; https://github.com/graphhopper/graphhopper ; https://project-osrm.org/docs/v26.6.1/http ; https://valhalla.github.io/valhalla/api/route/api-reference/ ; https://giscience.github.io/openrouteservice/run-instance/index . Datenstände/Providerbedingungen vor Implementierung neu verifizieren.

**Nächster Diskussionsschritt:** Gemeinsames fachliches Modell für Richtungswünsche in Kombination mit beiden Profilen und sinnvolle Alternativen, erst danach getrennte technische Evaluierung/Proof-of-Concept unter unveränderten v330-Schutzverträgen. Keine Routingprovider, neue Appversion oder Cache-/Datenänderung.

### R-004 – Richtungsorte gelten für alle Routen; keine starre Zahl von Routenvorschlägen (23.11.2026)

**Status: EINGEREICHT / IN DISKUSSION; keine Implementierungsfreigabe.**

**Wortnahe neue Anforderung des Auftraggebers:** „Wenn ich einen oder zwei Ort angebe, an denen ich vorbeikommen will, gilt das für alle Routentypen. Wenn ich keinen Ort angebe, dann darf pin2map die aus seiner Sicht beste Route angeben.“ Weiterhin ausdrücklich offen ist die Anzahl der sichtbaren Vorschläge: „Zwei schnelle und zwei entspannte? Oder eine schnelle, eine entspannte und eine Kombination?“

**Fachliche Eingrenzung:** Eine eingegebene Richtungsort-Vorgabe darf **nicht nur für die schnellste Route** gelten, während die entspannte Route sie stillschweigend ignoriert. Die Vorgabe gilt für alle zur Auswahl gestellten Routen/Profile; genaue Geltung bei den weiteren Verkehrsmitteln und die geografische Toleranz beim Vorbeifahren sind später modespezifisch zu klären. Richtungsorte bleiben von zwingend anzufahrenden Pin-Zwischenstopps unterschieden. Ohne Richtungsort gibt es keine erzwungene Verlaufsbindung; die beste Route hängt von der noch festzulegenden Qualitätsbewertung/Profildefinition ab.

**Diskutierte Empfehlung – ausdrücklich noch NICHT beschlossen:** Intern bei Bedarf mehrere Kandidaten für schnell und entspannt berechnen, nach gemeinsamem Korridorvertrag, Fahrtzeit, Umweg, Straßenklassen, Straßenabschnittsüberdeckung und erkennbarem Zusatznutzen filtern. Sichtbar nur qualitativ unterscheidbare Vorschläge; **keine starre Anzahl** (ggf. nur eine, häufig zwei, weitere nur bei substantiellem Mehrwert). Als Ausgangsfall die beste schnelle und, falls relevant anders, die beste entspannte Route. Keine künstliche dritte Kategorie „Kombination“, weil ein sinnvolles entspanntes Profil selbst Autobahnabschnitte zulassen kann; zusätzliche Verlaufsvarianten bei echter Relevanz. Ungeeignete Kandidaten nicht als Alternativen auffüllen. Eine manuell gewünschte Richtung darf nicht ohne sichtbare Erklärung fallen gelassen werden. Geografische Toleranz, Qualitätsmetriken/Schwellenwerte, UI und Berechnungsstrategie noch offen; Anbieterunterstützung allein garantiert nicht die geforderte Auswahlqualität.

**Technikstatus:** rein fachliche Diskussion; v330, Service Worker, Routenberechnung und alle persistenten Projektdaten unverändert.

### R-005 – Eine sichtbare Autoroute; sämtliche Vorgaben direkt im Start-/Ziel-Dialog und über Routenlinie änderbar (23.11.2026)

**Status: EINGEREICHT / IN DISKUSSION. Klare neue Präferenz des Auftraggebers zur radikalen UI-Vereinfachung; noch keine ausdrückliche Implementierungsfreigabe.** Diese neuere Präferenz ist bei der Diskussion der sichtbaren Routenanzahl vorrangig vor R-003/R-004 zu prüfen, ohne ältere Aussagen stillschweigend zu löschen.

**Neue Nutzeräußerung, wortnah und ohne zusätzliche Produktfestlegung:**
- „eine identische Route ist keine eigene Route, da das Geschwindigkeitsprofil ja für beide Routenarten gilt“: gleiche Geometrie darf nicht als zweite schnell/entspannt-Alternative erscheinen; dieselben Fahrzeug-Geschwindigkeitseinstellungen gelten für beide.
- Autobahn- und Mautvermeidung sollen **als Optionen direkt im Start- oder Ziel-Dialog** festgelegt werden.
- Der Start- bzw. Ziel-Dialog soll **auch nach einer ersten Routenberechnung erneut geöffnet** werden können, um beispielsweise andere Korridororte festzulegen.
- „Es gibt immer nur eine angezeigte Route“: pin2map ist kein Navigationsgerät, sondern soll **möglichst realistisch** die Straßenfahrdauer A→B abschätzen. Unterschiedliche Fragestellungen gibt der Nutzer als **vier Gruppen von Vorgaben** ein: (a) Start/Ziel, (b) maximal zwei Korridor-/Richtungsorte, (c) Routingart schnell/entspannt, (d) Einschränkungen keine Autobahn/keine Maut. Daraus wird **genau eine Linie** mit Fahrdauer in der Karte angezeigt.
- Die sichtbare Routenlinie soll **anklickbar** sein, ähnlich der bestehenden Flussauswahl, und eine **reduzierte Start-/Ziel-Bearbeitungsansicht** öffnen, in der sich diese Vorgaben schnell ändern lassen, wenn die Route nicht überzeugt.
- **Intern** darf das System weiterhin mehrere Kandidaten berechnen, qualitativ vergleichen und **die beste zur gewählten Vorgabenkombination** wählen. Keine Mehrfachpräsentation nur um ihrer selbst willen.

**Fachlicher Zweck:** Berechnete Fahrdauer und nachvollziehbare Streckenwahl haben Vorrang vor Navi-artiger Alternativenauswahl. Eine schnelle und eine entspannte Einstellung sind unterschiedliche *Anfrageprofile*, nicht gleichzeitig auszugebende Ergebnislisten. Die im allgemeinen Routing-Einstellungsbereich vorgesehenen Straßentyp-Geschwindigkeiten gelten für beide; individuelle Vorgaben gelten für die betreffende Planung. R-004 (Richtungsorte gelten für alle jeweils gewählten Routingprofile) bleibt kompatibel; Richtungsvorgaben dürfen nicht stillschweigend ignoriert werden.

**Diskutierte technische/UX-Empfehlungen, ausdrücklich NICHT beschlossen:** gemeinsamer Routenplanungszustand für Start-, Ziel- und Linien-Bearbeitung; neue Berechnung bei Parameteränderungen, veraltete Antworten ignorieren, bisherige Route bis zu erfolgreichem Austausch erhalten; exakte Geometrie der selektierbaren Linie und Pointerprioritäten gegenüber Pins/Flüssen testen. Nach Streckenauswahl getrennte Bewertung der zulässigen Fahrzeit nach hinterlegten Straßen-Geschwindigkeiten, Streckenlimits und unbekannten Verzögerungen. Nutzerziel „so realistisch wie möglich“ kann ohne Echtzeitverkehr keine garantierte Ankunftszeit bedeuten. Harte vs. weiche Vermeidung, fehlerhafte/unmögliche Korridore, die Auswahl-/Bestätigungsmechanik nach Änderung, Fahrzeitmodell, mehrere Zwischenziele und tatsächliches Layout weiter zu spezifizieren. Bestehende R-002-Pin-Zwischenstopps, Reihenfolge/Optimierung und Fähren bleiben offen erhalten, nicht durch UI-Vereinfachung gestrichen.

**Stand:** Nur Dokumentation; v330, Service Worker, IndexedDB, Caches, aktive Routingprovider und Preview unverändert.

### R-006 – Innerstädtische Pflicht-Teststrecke für Routing-Anbietervergleich (23.11.2026)

**Status: EINGEREICHT; ausdrücklich gewünschte Ergänzung des technischen Machbarkeitsprüfplans. Keine Freigabe zur Änderung der PWA.**

**Originalwortlaut des Auftraggebers:** „Beim anbieter-Vergleich dürfen wir nicht nur Fernstrecken testen, sondern müssen unbedingt auch innerstädtische Strecken testen. Mein Vorschlag: Von Stuttgart, Bodelschwingshtr. 64 nach Stuttgart chamissostr. 21.“

**Konkreter Pflicht-Testfall, Adressschreibweise überprüft (keine stillschweigende Änderung des Nutzerwortlauts):**
- Start: **Bodelschwinghstraße 64, 70597 Stuttgart, Deutschland**. Diese Schreibweise und Hausnummer sind aus dem Stuttgarter Straßenverzeichnis bzw. Hausnummernverzeichnissen belegt; Nutzerwortlaut enthält „Bodelschwingshtr.“.
- Ziel: **Chamissostraße 21, 70193 Stuttgart, Deutschland**; Straßenname/Hausnummer über Straßen- und Hausnummernverzeichnis plausibilisiert.
- Vor einem Routingvergleich müssen beide Adressen **geokodiert und die konkreten Zielkoordinaten / Straßennetz-Snaps geprüft werden**; reine Namensgleichheit oder automatisch eingesetzte Zentren genügen nicht.

**Vorgeschlagene gezielte Vergleichskriterien:** Identische geokodierte Start-/Zielkoordinaten für OSRM und Valhalla; Distanz, Fahrzeit, tatsächlich gefahrene Straßenfolge, Einbahnstraßen, Abbiegebeschränkungen, Tempo-30-/Wohnstraßen, Höhenlage/Steigungen und ortstypische Signal-/Kreuzungsverzögerungen soweit datenmäßig vorhanden; Sensitivität auf eingestellte Fahrzeugspeed-Grenzen, entspannte/schnelle Route und zulässige Vermeidungen, Fehler und nicht geroutete Verbindungen. Dieselbe Route ohne Verkehrs-/Echtzeitdaten nicht als reale Ankunftszeit versprechen. Prüfung zusätzlicher städtischer Fälle (sehr kurze Strecke und verkehrsreicher Innenstadtabschnitt) gesondert zu bestimmen; keine erfundenen Ergebnisse.

**Nachweise für Schreibweise:** Städtisches Straßenverzeichnis https://www.domino1.stuttgart.de/web/komunis/komunissde.nsf/49ec24bbdf344054c1257ca900367f10/c258a21879700ad4c125896b00284d93/%24FILE/c8w01_.PDF ; https://cleanwhale.de/gebaeude/stuttgart/bodelschwinghstrasse (Hausnummer 64); https://cleanwhale.de/gebaeude/stuttgart/chamissostrasse (Hausnummer 21). Vor praktischer Routentest-Ausführung Eingabekoordinaten kontrollieren.

**Dokumentationsstatus:** Diese Ergänzung konkretisiert den geplanten Anbietervergleich, ändert nicht die noch offene OSRM-/Valhalla-Auswahl und aktiviert kein Routing. v330, bestehende Preview und Nutzerdaten unverändert.


### R-007 – Erweiterung des isolierten Live-Anbietervergleichs (23.11.2026)

**Status: EINGEREICHT; konkrete Testausführung vom Auftraggeber beauftragt, keine Freigabe zur Routingintegration in die PWA.**

**Originalwunsch:** „ja, nimm die Berliner Beispielpunkte mit in den Test auf. Und ich finde, wir sollten auch einen Test Stadt-Land hinzufügen. Ich schlage dafür vor: Stuttgart Bodelschwinghstr. 64 nach Groß Lafferde Hölderlinstr. 12.“

**Prüfumfang:** Der bestehende separate Testworkflow `.github/workflows/routing-provider-probe.yml` wird um zwei Berliner OSRM-Dokumentations-Beispielstrecken erweitert: Koordinaten (Breite/Länge) 52.517037/13.388860 → 52.529407/13.397634 und 52.529407/13.397634 → 52.523219/13.428555. Die Punkte sind dokumentierte API-Beispiele, keine Benchmarks für Fahrzeitqualität.

**Stadt–Land-Test:** Bodelschwinghstraße 64, Stuttgart (identischer exakt geokodierter Start wie R-006) → Hölderlinstraße 12, Groß Lafferde. Die Zieladresse wird via Nominatim mit Straßenname + Hausnummer validiert; ohne exakten Treffer darf keine Ersatzkoordinate als erfolgreiche Prüfung ausgegeben werden. Beide Provider erhalten identische Koordinaten. Ergebnisvergleich mit Distanz, berechneter Fahrzeit und angebotenen Alternativen, keine Behauptung realer Straßenfahrzeiten.


**Live-Testnachweis für R-007 (23.11.2026):** GitHub Actions [Routing provider feasibility probe, Run 45089332357](https://github.com/pin2map/pin2map-new-test/actions/runs/45089332357), Commit `3a78e3649320b91d5bcc899b1d873b763a4f8f06`, Job `compare` **completed/success**. Exakte Nominatim-Adressauflösung für Stuttgart 48.7452823/9.1604151 und Groß Lafferde 52.2308763/10.2462993 bestätigt. Beide Provider wurden mit exakt gleichen Koordinaten abgefragt.

| Test, jeweils erste zurückgelieferte Route | OSRM | Valhalla |
| --- | --- | --- |
| Stuttgart Bodelschwinghstr. 64 → Groß Lafferde Hölderlinstr. 12 | 514,5 km · 309,2 min | 518,3 km · 321,9 min |
| Berlin 52.517037/13.388860 → 52.529407/13.397634 | 1,9 km · 4,3 min | 1,9 km · 4,4 min |
| Berlin 52.529407/13.397634 → 52.523219/13.428555 | 2,8 km · 6,2 min | 2,9 km · 7,1 min |

**Lieferung zusätzlicher Alternativen (keine Qualitätsfreigabe):** Stuttgart–Groß Lafferde OSRM 516,9 km/311,2 min, Valhalla 516,2 km/319,9 min und 548,8 km/340,4 min. Berlin 1→2 OSRM nur eine Route, Valhalla zusätzlich 2,7 km/6,6 min und 3,6 km/8,5 min. Berlin 2→3 OSRM zusätzlich 3,3 km/6,8 min; Valhalla zusätzlich 3,7 km/8,9 min und 4,3 km/10,6 min. **Wichtig:** Valhallas erste Route ist nicht immer die kürzeste oder schnellste von Valhalla selbst gelieferte; Ranking darf nicht ungeprüft übernommen werden.

**Grenzen:** bislang nur Geokodierung sowie Distanz-/Zeitkennwerte; weder reale Straßensegmente und Geschwindigkeitsklassen noch Ampeln, Abbiegebeschränkungen, Verkehrs-/Staudaten oder reale Vergleichsfahrten verifiziert. Es gibt **noch keinen Beleg**, welcher Anbieter die realistischste Straßenfahrzeit liefert. Ein Testaufruf über freie Demo-Endpunkte ist kein nachgewiesenes produktives Nutzungskontingent. Keine Entscheidung für einen Provider.

**Schutzgrenze:** Nur isolierter GitHub-Actions-Test und Fach-/Statusdokumentation; PWA-Routing nicht aktiviert, keine Daten- oder Cacheänderungen. Provider-/Produktentscheidung weiterhin offen.



### R-008 – Live-Untersuchung der Straßenfolgen und Modellgeschwindigkeiten (23.11.2026)

**Status: TECHNISCH UNTERSUCHT; Providerentscheidung und produktives Fahrzeitmodell OFFEN.** Der Auftraggeber hat nach R-007 ausdrücklich die Analyse tatsächlicher Straßenabschnitte und modellierter Geschwindigkeiten beauftragt.

**Ausführung:** Isolierter Testworkflow `.github/workflows/routing-provider-probe.yml` um getrennte Prüfungen von `steps` und `annotations=distance,duration,speed,datasources` bei OSRM sowie Valhalla-`maneuvers` und optional `trace_attributes` (edge speed, speed_limit, road_class) ergänzt. [Provider-Workflow 45126917402](https://github.com/pin2map/pin2map-new-test/actions/runs/45126917402) **success** für den Testcommit `c91fdd7516f48ac121e78334790315d2fdf73c84`. Dieselben bereits in R-007 validierten Koordinaten.

**Stuttgart Bodelschwinghstr. 64 → Chamissostr. 21:** OSRM 6,87 km / 13,54 min, Valhalla 6,86 km / 16,20 min. OSRM `steps` zeigen Bodelschwinghstr., Heinestr., Karl-Kloß-Str., Schreiberstr., Schickhardtstr., Schwabstr., Reinsburgstr., Rotenwaldstr., Herderstr., Botnanger Str., Stirnbrandstr., Chamissostr. OSRM-Annotation: 443 feinere Abschnitte, rund 6,87 km, modellierter Durchschnitt über die Abschnittszeiten 32,8 km/h (Gesamtroutendauer kann zusätzliche Manöver-/Abbiegemehraufwände enthalten). Valhalla-Manöver beschreiben einen kürzeren Straßen-Narrativ; Manöverlängen können angrenzende Straßen umfassen und dürfen NICHT eins zu eins als Straßenkantenlängen interpretiert werden. Separater Valhalla-`trace_attributes`-Aufruf **erfolgreich**: 140 tatsächliche Straßenkanten, alle 140 mit Modelltempo, 135 mit positivem hinterlegtem Tempolimit. Beispiel Bodelschwinghstraße `speed=17`, `speed_limit=30`, residential; Heinestraße `speed=27`, `speed_limit=50`, tertiary. Ein Tempolimit ist nicht dasselbe wie Modellfahrtempo.

**Stuttgart → Groß Lafferde:** OSRM 514,52 km / 309,19 min; Valhalla 518,31 km / 321,92 min. OSRM-Annotation: 7.634 Abschnitte, Modellgeschwindigkeitsquotient 100,1 km/h; ~444,06 km liegen im 90–119-km/h-Quotientenbereich. OSRM-Manövernamen erscheinen auf ~507 km als `(unnamed)`; daher daraus NICHT schließen, die gesamte Autobahnroute sei straßenlos oder identisch zu Valhalla. Valhalla-Manöver nennen unter anderem A 8, A 81, A 3, A 7, B 444; A-81- und A-7-Manöver ergeben rechnerische mittlere Geschwindigkeiten ungefähr 99–108 km/h. Individuelle Höchstgeschwindigkeiten (zum Beispiel 90 km/h Autobahn) wurden noch nicht getestet.

**Berlin-Beispiel 1→2:** OSRM 1,89 km / 4,34 min und Valhalla 1,89 km / 4,45 min; beide benennen Friedrichstraße → Torstraße. OSRM-Abschnittsmodell ~30,1 km/h; Valhalla `trace_attributes`: 85 Kanten, für alle 85 Modelltempo und positives Tempolimit verfügbar. **Berlin 2→3:** OSRM 2,85 km / 6,18 min; Valhalla 2,95 km / 7,10 min; OSRM-Manöver nennen u.a. Torstr., Prenzlauer Allee, Prenzlauer Berg, Friedenstr.; Valhalla dagegen Otto-Braun-Str./B 2 und Am Friedrichshain neben Torstr. und Friedenstr. 113 Valhalla-Kanten, davon 110 mit positivem Tempolimit. Unterschiedliche Straßennamen sind ein Indiz für Streckenunterschiede; exakte Geometrieüberschneidung noch nicht quantitativ geprüft.

**Interpretationsgrenzen und nächste Aufgabe:** OSRM-`annotation.speed` ist `distance/duration` des Routingmodells, **nicht** das gesetzliche Tempolimit; aus Valhalla-Maneuver-`length/time` abgeleitete Werte ebenfalls keine Tempolimits. Valhalla-`edge.speed` und `edge.speed_limit` sind getrennte Felder. Valhallas Geschwindigkeitsmodell beruht auf OSM-Tempolimits, Straßentyp-Defaults und weiteren Dichte-/Verkehrs-/Profilfaktoren (Quelle: https://valhalla.github.io/valhalla/concepts/speeds/). Ohne reale Referenzfahrten, aktuell verifizierte Limits und eigene Fahrzeugprofile keine Aussage, welcher Anbieter tatsächliche Fahrzeiten besser vorhersagt. Die Testprobe beweist keine freie produktive API-Nutzung, Korridorqualität, Mautregeln oder Fähren.

**Bestandsschutz:** Nur unabhängiger GitHub-Actions-Test; kein aktiver Routingprovider in pin2map, kein PWA-Code-/Cache-/Persistenzschema geändert. v330 unverändert.

### R-009 – Freie Ortsnamen für Start/Ziel, Test langsamer Fahrzeugprofile (23.11.2026)

**Status: EINGEREICHT.** Der Auftraggeber ergänzt ausdrücklich: Der Start-Dialog darf im Zielfeld nicht nur eine vollständige Adresse wie „Hamburg bilser str. 49“, sondern auch nur einen Ortsnamen wie **„Leipzig“** akzeptieren. Im Ziel-Dialog gilt **genau das Entsprechende für den Start**. Bestehende Pin-Treffer aus allen Ebenen und freie Adresssuche nach R-002/R-003 bleiben bestehen. Ortsangaben dürfen nicht künstlich auf Straße/Hausnummer eingeschränkt werden.

**Offene Ausgestaltung, noch keine beschlossene Automatik:** Ein Ort ist geografisch ein Gebiet und muss für Routing auf einen konkret geeigneten Straßenanschlusspunkt projiziert werden. Bei mehrdeutigen Ortsnamen darf kein unbemerkter falscher Ort gewählt werden; Auswahl, angezeigte Ortslage, Existenzprüfung und automatische Pin-Erzeugung bei frei geokodierten Orten benötigen eine eigene fachliche Freigabe. Keine stillschweigende Gleichsetzung von Ortsmittelpunkt, Rathaus und Fahrtziel.

**Live-Ergebnis zum Testauftrag, 23.11.2026:** [Isolierter Routing-Workflow 45128100318](https://github.com/pin2map/pin2map-new-test/actions/runs/45128100318), Code/Testcommit `30e5b8b37644d4f36785a536e3adbe188d2f94c7`, **completed/success**. Valhalla `costing_options.auto.top_speed` 140 → 90 km/h mit unveränderten Start-/Zielkoordinaten: Stuttgart innerstädtisch **6,86 km/16,20 min bei beiden Geschwindigkeiten**; Berliner Beispiel 1→2 **1,89 km/4,45 min bei beiden**; Stuttgart–Groß Lafferde **518,31 km/321,92 min** bei 140, dagegen **510,35 km/430,11 min** bei 90. Beleg: Workflow-Joblog `SPEED_CAP_VALHALLA`. Die signifikante Fernstreckenänderung belegt wirksame profilbezogene Routingkosten und eine veränderte Straßenwahl. Die 90 km/h sind kein geprüftes Nutzerprofil; Straßenklassen-spezifische Limits, reales Verkehrsaufkommen, Verzögerungen, gesetzliche Limits und realistische Ankunftsdauer wurden dadurch **nicht** validiert. OSRM wurde in diesem Schritt nur als unveränderter Standard-Benchmark geprüft, nicht mit eigener Profilvariante. Kein neuer PWA-Routingprovider registriert.\n\n**Technischer Testauftrag vom Auftraggeber bestätigt:** Die bestehende isolierte Anbieter-Machbarkeitsprüfung wird um einen Vergleich des Valhalla-`auto.top_speed` (vorläufig 140 gegenüber 90 km/h, nur Testparameter) für Stadt und Fernstrecke erweitert. Die übrigen vier Straßenklassen-Höchstgeschwindigkeiten sind noch kein freigegebenes konkretes Profil. Ein `top_speed`-Grenzwert allein erfüllt ausdrücklich **nicht** die Anforderung nach getrennten Maximalgeschwindigkeiten für Autobahn/Landstraße/Schotterstraße/innerorts. OSRM-Standarddemo bietet keine frei pro Anfrage veränderbaren Straßenklassenprofile; Anpassung erfordert eigene Profil-/Datenverarbeitung oder zusätzliche Fahrzeitberechnung. Quellen: https://valhalla.github.io/valhalla/api/route/api-reference/ und https://project-osrm.org/docs/v26.4.0/profiles. Kein produktiver Anbieter ausgewählt, keine PWA-Implementierung, v330 bleibt unverändert.


### R-010 – Antwortzeit als wichtiges Kriterium der Routinganbieterwahl (23.11.2026)

**Status: EINGEREICHT, technische vergleichende Messung beauftragt; keine Änderung der PWA-Produktentscheidung.**

**Nutzeranforderung:** OSRM antwortete bei früheren Versuchen sehr schnell. Valhalla soll auf denselben Strecken gegen OSRM auf **Antwortlatenz** geprüft werden. Eine kurze Wartezeit ist für den Anwender möglicherweise **wichtiger als eine geringfügig genauere Fahrtzeitschätzung**. Geschwindigkeit und Genauigkeit müssen anhand von Messungen gegeneinander abgewogen werden. Nicht ohne Messung voraussetzen, dass beide gleich schnell sind.

**Testentwurf:** Im isolierten Workflow dieselben vier Stadtrouten/Fernstrecken mit je vier Wiederholungen und abwechselnder Anbieter-Reihenfolge anfragen, Antwortzeit für HTTP plus JSON-Transfer, Übertragungsgröße, Median/Minimum/Maximum/Mittelwert und Fehler aufzeichnen. Weitere kleine Abfragen mit Abbiege-/Segmentdetails separat messen, damit Basisrouting nicht mit aufwändigen Folgeabfragen verwechselt wird. Die öffentlichen Demo-Hosts sind keine verbindliche Produktionsinfrastruktur, und die GitHub-Runner-Netzwerkstrecke ist nicht dieselbe wie ein Nutzergerät in Deutschland. Entscheidung noch offen; keine erfundenen SLA- oder Nutzungszusagen.



**Messnachtrag R-010 (Live 23.11.2026):** [Erster Latenztest 45128692822](https://github.com/pin2map/pin2map-new-test/actions/runs/45128692822), Commit `23632a7fdce9d21869c3c66185a223d471f277be`, erfolgreich. Vier Wiederholungen je Anbieter/Strecke, alternierte Reihenfolge, Messpunkt: vollständiger HTTP-Body. **Median OSRM / Valhalla in Millisekunden:** Stuttgart Stadt 111,9/882,2; Berlin Stadt 110,2/938,6; Stuttgart–Groß Lafferde 115,2/997,4; Stuttgart–Hamburg 115,1/868,3. Acht zusätzliche Detailabfragen ebenfalls erfolgreich. Die OSRM-Basisabfrage hatte bei Fernstrecken nur etwa 600 B ohne Routengeometrie; Valhalla lieferte etwa 37–44 KB. Deshalb für eine fairere Aussage ein zweiter Test mit **vollständig übertragener zeichnbarer Polyline bei beiden Providern**.

**Geometrie-Nachtest:** [Workflow 45128854004](https://github.com/pin2map/pin2map-new-test/actions/runs/45128854004), Commit `2535a7d4d537f198b94f12d5978d795fb5147d6c`, Providerjob **completed/success**. Je drei Anfragen pro Strecke und Anbieter, 24/24 erfolgreich, abwechselnde Reihenfolge. Beide Antworttypen enthalten vollständig zeichnbare Routengeometrie (nicht unbedingt gleiches JSON-/Polylineformat).

| Strecke | OSRM Median ms / B | Valhalla Median ms / B |
| --- | --- | --- |
| Stuttgart innerstädtisch | 100,8 / 1.679 | 891,1 / 2.462 |
| Berlin innerstädtisch | 99,2 / 938 | 885,1 / 1.196 |
| Stuttgart–Groß Lafferde | 201,6 / 27.064 | 975,8 / 37.223 |
| Stuttgart–Hamburg | 200,2 / 33.592 | 965,6 / 44.478 |

**Befund und Grenzen:** Auf den konkret getesteten öffentlichen Demo-Hosts war OSRM unter diesen Zugriffsbedingungen rund fünf- bis neunmal schneller. Die Ursachen (Serverkapazität, Hosting, Netzweg, Cache, Profilaufwand, Antwortstruktur) sind nicht isoliert, die Messung läuft auf einem GitHub-Runner und nicht auf einem Endnutzergerät in Deutschland. Die Stichprobe ist klein, keine verlässliche p95/p99-Latenz oder Produktions-SLA. Valhalla-`trace_attributes` zum Gewinn von Kantenlimits ist eine **zusätzliche** Anfrage und in diesen Basis-/Geometriezeiten **nicht enthalten**. Weiterer Vergleich soll daher die Gesamtdauer der realen pin2map-Pipeline inklusive Zwischenstopps, Kandidatenwahl, Geschwindigkeits-/Abschnittsdaten und Browser-Rendering prüfen. Nutzerpriorität kurze Wartezeit, ggf. höher als geringfügige Zeitprognoseverbesserung, ist als Auswahlkriterium festgehalten; Anbieterentscheidung bleibt **OFFEN**. Die zuvor beobachtete größere Profilflexibilität von Valhalla vs. statisches OSRM-Demoprofil bleibt ebenfalls relevanter Trade-off.



### R-011 – End-to-End-Versuch langsames Fahrzeug inkl. Zusatzabfragen (23.11.2026)

**Status: Technischer Test beauftragt und ausgeführt, keine Produktionsimplementierung oder Providerentscheidung.**

**Auftraggeber:** „Ja, ausprobieren!“ zur zuletzt vorgeschlagenen vollständigen Routenberechnung mit eigenem Langsamfahrzeugprofil, getrennten Straßenart-Geschwindigkeiten, nötigen Straßendaten und Messung bis zum fertigen Berechnungsergebnis.

**Probe:** Erweiterung ausschließlich des isolierten `.github/workflows/routing-provider-probe.yml`, beispielhaftes Testprofil **90 km/h Autobahn / 70 km/h Landstraße / 35 km/h innerorts / 25 km/h unbefestigt**. Nicht als kundenseitig freigegebene Werte oder Straßenklassen-Erkennung auffassen. Vergleich von (A) OSRM Standardroute mit vollständiger Polyline6, anschließend `Valhalla trace_attributes` mittels `map_snap`, (B) Valhalla `costing_options.auto.top_speed=90` und anschließend eigener `edge_walk`-Trace. Jeder getracete Abschnitt liefert Kantenlänge, `edge.speed`, `edge.speed_limit`, `edge.road_class` und soweit vorhanden Oberflächeninformation. Nur eine **naive, experimentelle** Summierung `length / min(model_speed, geschätzte Straßenklasse-Profilgrenze, vorhandenes speed_limit)`; keine wirkliche Zeitprognose, keine Durchfahrt-/Ampel-/Stau-/Abbiegezuschläge, keine lückenlos korrekten Innerorts- und Belagklassen.

**Nachgewiesener Fehler und Ursachenklärung:** Beim ersten Probe-Commit `f16c858dafc8cdcdf1fd35a2167c1a2202a2a68b` scheiterte der OSRM→Valhalla-`map_snap`-Trace auf Stuttgart–Groß Lafferde mit HTTP 400 `error_code=154: Path distance exceeds the max distance limit: 200000 meters`; andere fünf Varianten hatten Daten geliefert. Vorgeschriebene Stop-Regel angewendet: kein willkürliches Patchen, sondern Ursache und Servergrenze nachgewiesen. Gezielter Neuansatz teilt **nur die Analyse der fremden OSRM-Polyline**, nicht die OSRM-Route, in rund 100-km-Stücke und dokumentiert die Zahl zusätzlicher Abfragen. Limitbedingt vereinfachte Stützpunkte können den Abgleich verändern. Testcommit `e34bc07afbd91cb690332a73b342ab89f4c98ec5`, [grüner Provider-Test 45131107401](https://github.com/pin2map/pin2map-new-test/actions/runs/45131107401), sechs erfolgreiche Datenketten.

| Strecke | OSRM Route + Valhalla-Trace (Gesamt) | Valhalla Top-Speed-90 Route + eigener Trace (Gesamt) |
| --- | --- | --- |
| Stuttgart Stadt | 0,766 s (1 Trace, 6,9 km) | 1,712 s (1 Trace, 6,9 km) |
| Berlin Stadt | 0,907 s (1 Trace, 1,9 km) | 1,995 s (1 Trace, 1,9 km) |
| Stuttgart–Groß Lafferde | **6,099 s** (6 sequenzielle Traces, 514,5 km) | **2,428 s** (1 Trace, 510,4 km) |

**Einzelheiten:** OSRM Stuttgart Stadtroute 13,5 min vom Provider, naive Kantensumme auf Valhalla-Snap 15,8 min; Valhalla Stadtroute 16,2 min, naive Kantensumme 15,8 min. OSRM Groß-Lafferde-Standardroute 309,2 min, naive Kanten-Summe 363,0 min. Valhalla Groß-Lafferde-Route mit Top-Speed 90 430,1 min, naive Kanten-Summe 431,2 min. **Die unterschiedlichen Routen und nicht vergleichbaren Klassenmodelle machen diese Zeitwerte NICHT zur Aussage, dass OSRM oder Valhalla die realistische Fahrdauer besser trifft.** Beim externen OSRM-Tracing ist die geringe Gesamt-Längenabweichung (0–0,6 %) kein Beweis, dass identische Straßenkanten gefunden wurden; `map_snap` kann bei parallelen Straßen, Auf- und Abfahrten und Stützpunktverdünnung andere Segmente wählen.

**Zentraler methodischer Mangel offen:** Im Test wurden `primary/secondary/tertiary`-Straßen pauschal der Kategorie „Landstraße“ zugeordnet. Damit landen z. B. **6,1 km einer innerstädtischen Stuttgarter Route** fälschlich in der Landstraßen-Kategorie. Ohne zusätzliche geografische oder OSM-basierte Information lässt sich „innerorts“ nicht aus `road_class` ableiten. Auch `surface` und das Tempolimit fehlen auf Teilen der Strecke. Daher **keine Abnahme des selbst errechneten Fahrtzeitmodells** und keine Übernahme der Testklassifizierung in die PWA. Lange OSRM→Valhalla-Datenketten verbrauchen mit sechs Demo-Anfragen mehr Zeit und könnten Anbieter-Regeln verletzen; keine produktive Nutzung zugesagt.

**Interpretation und nächster Schritt:** Die OSRM-Berechnung allein bleibt schnell, doch eine nachgeschaltete, für die eigene Zeitberechnung nötige Klassifikations-/Tempolimitbeschaffung kann den Vorteil bei längeren Strecken ganz aufzehren. Die getesteten öffentlichen Valhalla-Provider unterstützen eigener Route `edge_walk` mit einem statt mehreren Zusatzaufrufen. Weitere technische Prüfung soll klären, ob eine echte Straßenabschnitt-/Innerorts-/Schotterklassifikation und ein Zeitmodell **ohne zusätzliche teure Vollrouten-Trace-API** möglich sind, und ob progressive Anzeige (sofort Linie, später nachgerechnete Daten) fachlich erwünscht ist. Messungen sind einzelne GitHub-Runner-Durchläufe auf frei zugänglichen Demo-Endpunkten, keine stabile p95/p99-Zusage oder Browsertest für die neue Routingfunktion. **v330-Anwendungsarchitektur bleibt unangetastet.**


### R-012 – Single-Request-Recosting und verfügbare OSRM-Metadaten (23.11.2026)

**Status: Technischer Test erfolgreich; Entscheidung über Anbieter und eigene Fahrzeitberechnung OFFEN.** Nutzer hat isolierte Erprobung beauftragt, wie sich Straßeninformationen, individuelle Geschwindigkeitsannahmen und schnelle Ergebnisse ohne teure Zusatzaufrufe verbinden lassen. Keine Freigabe für PWA-Routingintegration.

**Quellen und Test:** Valhalla dokumentiert `recostings` zum Neubewerten **derselben Route** für alternative Costing-Parameter in **derselben Route-HTTP-Anfrage** (https://valhalla.github.io/valhalla/api/route/api-reference/). OSRM-Standard-Route-Annotations enthalten Abschnittsentfernung, -dauer, modellierte Geschwindigkeit, Datasource und optional OSM-Knoten-IDs, jedoch nicht als allgemeine öffentliche Responsefelder die rechtlichen Straßenlimits, Straßenbelag oder verlässliche Innerorts-Zuordnung (https://project-osrm.org/docs/v26.6.1/http). Direkte Live-API-Prüfung auf [isoliertem Provider-Workflow 45132617828](https://github.com/pin2map/pin2map-new-test/actions/runs/45132617828), Testcommit `e6e9a60f8d1e44b7a268364b6f202691b6a1db3f`: drei Strecken, Standard-Valhalla, Recostings für `auto.top_speed=90` und `auto.top_speed=60`, OSRM-Route mit `steps` und vollständigen Annotations. Alle neun fachlichen API-Abfragen erfolgreich.

**Stuttgart Bodelschwinghstr. 64 → Chamissostr. 21:** Valhalla Standard 6,86 km / 16,20 min; Recosting derselben Geometrie auf 90 bzw. 60 km/h jeweils 972,023 s = 16,20 min; keine Fahrtzeitänderung, weil das urbane Ausgangsmodell langsamer ist. **Berlin erste Beispieldistanz:** Valhalla Standard 1,89 km / 4,45 min; Recostings 90/60 jeweils 266,955 s = 4,45 min. **Stuttgart → Groß Lafferde:** Standard 518,31 km / 321,92 min; Recosting **auf derselben ursprünglichen Geometrie** 90 km/h → 21931,388 s = 365,52 min; 60 km/h → 31640,396 s = 527,34 min. Das ist **nicht** identisch mit neuer Valhalla-Routensuche mit Top-Speed 90, die R-009 bei 510,35 km und 430,11 min fand. Gründe und Profilkonsistenz vor produktiver Verwendung ausdrücklich nachweisen; eine recostete Originalroute muss nicht die beste Route für das neue Profil sein.

**Protokollierte Antwortzeiten, jeweils Einzelproben ohne statistische Belastbarkeit:** Stuttgart Valhalla Standard 874,2 ms, mit Recostings 710,2 ms; Groß Lafferde Standard 448,0 ms, mit Recostings 1006,0 ms; Berlin Standard 173,0 ms, mit Recostings 985,3 ms. Diese unstabilen Beispiele erlauben **keine** Aussage, Recosting sei schneller als Standardroute; entscheidend ist, dass die zusätzliche HTTP-Runde entfällt. Die Antworten wurden mit nur ca. 90–100 zusätzlichen JSON-Bytes größer.

**OSRM-Direktantwort:** Stuttgart 14 `steps`, 443 fein granulierte Speed-Annotationen; Berlin 4 `steps`, 132 Annotationen; Groß Lafferde 45 `steps`, 7634 Annotationen. Auf keinem der drei getesteten Fälle hat die `step`-Response einen `is_urban`-Wert geliefert; im Test wurden als relevante Straßenattribute auf Step-Ebene nur `name` gefunden. Intersection-Keys `bearings, entry, location, out`; keine Straßenklassifikations-/Tempolimitfelder. Somit **keine Grundlage für vier verlässlich getrennte Geschwindigkeitsklassen** aus der OSRM-Standard-Demo-Response allein. Keine Schlussfolgerung über selbstgehostete OSRM-Datenmodelle oder externen Kartendatenzugang.

**Grenzen:** Valhalla-`recostings` erlaubt Costing-Varianten nur innerhalb des vom Server unterstützten Costing-Modells; nicht nachgewiesen ist damit eine beliebige nach Straßenklassen getrennte Nutzer-Geschwindigkeit. Ohne belastbare Ermittlung von Innerorts-Arealen, Fahrbahnbelag, Verkehrslicht- und Staukomponenten nicht von einem produktionsreifen Fahrtzeitmodell sprechen. Die bisherigen Langstrecken-`trace_attributes`-Messungen und deren 200-km-`map_snap`-Grenze aus R-011 bleiben relevant. Kein API-Anbieter für den Produktivbetrieb freigegeben. Keine Änderungen an PWA `v330`, SW oder Nutzerdaten.


### R-013 – Neuer Vorschlag: schnelle OSRM-Autoroute mit relativen Fahrzeitfaktoren statt individueller Höchstgeschwindigkeiten (23.11.2026)

**Status: EINGEREICHT / IN DISKUSSION. Ausdrücklicher neuer Vereinfachungsvorschlag des Auftraggebers, noch keine Implementierungs- oder Änderungsfreigabe der bisherigen R-002–R-012-Verträge.**

**Nutzerziel:** Für Auto steht *Anzeigegeschwindigkeit* im Vordergrund, im Unterschied zu den künftig noch zu behandelnden Fuß-, Fahrrad- und ÖPNV-Routings mit höherem Anspruch an Präzision. Leitfrage: „Wie schnell komme ich unter idealen Bedingungen mit meinem Fahrstil von A nach B?“ Auto benötigt keine dynamische Verkehrs-/Stauprognose und keine Navigationsfunktion; bewusst plausible Näherungen können wichtiger als teure Straßenkanten-/Tempolimitabfragen sein.

**Vorschlag des Auftraggebers:** Die sehr schnelle OSRM-Standardroute samt Abschnitten als Ausgangspunkt verwenden. In den Routingeigenschaften statt absoluter Fahrzeughöchstgeschwindigkeiten **relative Fahrzeit-Korrekturfaktoren** pro Straßenart anbieten: (1) Autobahn/Schnellstraße, (2) Landstraße, (3) Stadt, (4) unbefestigte Straße. Unterschiede zwischen Fahrzeugen/Fahrstil, besonders Schnellstraße/Autobahn für Pkw vs. Kastenwagen (kein Lkw-Routing), als frei einstellbare Faktoren erfassen. Drei individuelle, bearbeitbare Presets anbieten; im Start-/Ziel-Routingdialog das angewendete Preset auswählen. Auch regional unterschiedliche Erwartungen – etwa Rennes/Peking/Marrakesch – können manuell durch Faktoren repräsentiert werden. Eine sichtbare Route bleibt Ziel, nicht mehrere gleichzeitig dargestellte Alternativen.

**Mathematische Präzisierung des diskutierten Vorschlags:** Faktoren sollten auf die **OSRM-Fahrzeitanteile** der erkannten Straßenkategorien wirken, nicht direkt auf ihre Streckenlängenanteile. `T_personal = Σ T_OSRM(category) * factor(category) + T_unknown` (unbekannte Anteile zunächst unverändert, falls eine solche Fallback-Regel beschlossen wird). Zum Beispiel bedeutet Faktor 1,30 30 % längere Zeit in dieser Kategorie, 0,95 etwa 5 % kürzere Zeit. Das sind **Modellannahmen**, keine amtlichen Verkehrsvorhersagen oder garantierte reale Fahrtzeiten. Korrektur nur durch Anwendung desselben Faktors auf konsistent zugeordnete Zeitsegmente; Manöver-/Abbiegezuschläge und Modellbasis müssen überprüft werden. Ebenso muss klar sein, ob „ideale Bedingungen“ die OSRM-Modellzeiten inklusive pauschaler Verzögerungen meint.

**Kritische überprüfte Tatsachengrenze:** Aus R-012 folgt, dass die öffentlich getestete OSRM-Standard-`route`-Antwort detaillierte `annotations` für Streckenlänge/-dauer/-Modelltempo und `steps` mit Straßennamen liefert, aber **keine verlässliche 4-Klassen-Zuordnung, Innerorts-Kennung, vollständige OSM-Highway-/Surface-Attribute oder Tempolimits**. Daher ist die Annahme, OSRM liefere schon in der Standardantwort belastbar den Autobahn-/Stadt-/Land-/Unbefestigt-Anteil, **nicht nachgewiesen**. Reines Filtern nach Namen `A 7` oder Geschwindigkeit ist höchstens heuristisch, kann Autobahnzubringer, innerstädtische Kraftfahrstraßen, umbenannte Abschnitte und niedrigere Limits verwechseln. Die auf Stadtstraßen bereits fehlerhaft angewendete `road_class→Landstraße`-Heuristik aus R-011 ausdrücklich **nicht** übernehmen.

**Diskutierte Empfehlung, noch NICHT beschlossen:** Prüfen, ob sich wenigstens die **autobahnbezogenen Fahrzeitanteile** der Standardroute ohne zusätzliche Serveranfragen belastbar schätzen lassen, unklare Kategorien ausdrücklich markieren und vorerst nicht korrigieren. Komplette Routen-Neuberechnung bei Änderung der Faktoren sollte unterbleiben, *wenn die gewählte Route unverändert bleiben darf*: Dann nur persönliche Fahrzeit lokal sofort aktualisieren. Das beantwortet nicht die Fachfrage, ob „schnell/entspannt“ jeweils eine andere Wegwahl erfordern; R-005-Einzelroutenanzeige und R-002-Richtungsorte/Autobahn-/Mautvermeidung bleiben unberührt. Die **schnelle** Basisroute kann für stark verlangsamte Fahrzeuge eine suboptimale Strecke sein. Die spätere fachliche Entscheidung muss diesen Kompromiss ausdrücklich behandeln.

**Nächster isolierter Machbarkeitstest zur Entscheidung:** Auf den bereits festgelegten Stuttgart-/Berlin- und Stuttgart–Groß-Lafferde-Strecken OSRM-`steps`/Intersection-`classes` und `annotations` auf Identifizierbarkeit und zeitliche Zuordnung von Autobahn-/Schnellstraßenabschnitten prüfen; im Vergleich zu tatsächlichen OSRM-/Valhalla-Geometrie-/Straßennamen und verfügbaren Referenzdaten Unsicherheiten messen. Anschließend drei frei gewählte Beispielpresets **ohne zusätzliche produktive Netzwerkanfragen** numerisch durchspielen, Ergebnisse und Laufzeit gegenüber den bisherigen getrennten Profiltests vergleichen. Keine erfundene Präzisionsbehauptung. Keine automatische Zuordnung nach Stadt-/Landesnamen, keine aktuelle Verkehrsvorhersage ohne neue Entscheidung.

**Technischer Stand:** ausschließlich Anforderungs-/Diskussionsdokumentation, keine neue Routing-API, kein Produktivcode, PWA v330 unverändert.

## 7. Beschlossene Routing-Fachentscheidungen aus der neuen Anforderungsrunde

**Noch keine.** Die Modularchitektur- und v330-UI-Verträge aus Abschnitt 3 gelten unabhängig davon weiter. Keine technische Routing-Implementierung vor dieser Diskussion.
