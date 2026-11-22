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

## 7. Beschlossene Routing-Fachentscheidungen aus der neuen Anforderungsrunde

**Noch keine.** Die Modularchitektur- und v330-UI-Verträge aus Abschnitt 3 gelten unabhängig davon weiter. Keine technische Routing-Implementierung vor dieser Diskussion.
