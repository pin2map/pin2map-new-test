# pin2map NEW – zentrale Buttonregeln und verlässliche PWA-Aktualisierung

**Stand:** 2026-11-10 · **Zweig:** `feature/leaflet-modular-core`

## Bestehende Festlegung: runde Bedienelemente

Die gemeinsame Gestaltung wurde bereits am **2026-11-09** mit Commit
`a353114c7e` eingeführt: weiße runde Symbolbuttons mit schmalem
neutralem Rand, gemeinsamen Icon-Maßen und einheitlichem Grundstil.
Folgeänderungen hatten diese Architektur durch lokale Größenwerte
(40, 42, 44, 46 px) für Kartenbuttons unabsichtlich durchbrochen.

**Verbindlicher Gestaltungsvertrag (Neufassung 2026-11-10, v50):**

- Geltungsbereich: **jeder runde Button auf der Kartenfläche**, auch künftig
  neu hinzugefügte. Die Regel gilt automatisch für direkte Overlay-Buttons
  in `#app` sowie Buttons innerhalb der Leaflet-Kartensteuerung `#map`.
- **Ausnahmen vom Geltungsbereich**, keine individuellen Ausnahmen:
  Buttons in sämtlichen Dialogen, Panels und Menüs sowie im Suchblock
  erhalten weiterhin ihre eigenen Designs.
- Einheitliche Größe `42 × 42 px`, Hintergrund **hellgrau
  `#f1f3f6`**, Rand **`#b7c5d4`**, Schatten
  **`0 2px 8px #12253a36`**, Vordergrund **`#253a4b`**.
- Beim Betätigen **kurz blau** (`#c9e1ff` für 220 ms);
  anschließende Rückkehr zu Hellgrau, auch bei geöffnetem Menü/Dialog
  oder aktiver Beschriftungsoption. Ein dauerhaft markierter Button ist
  nicht vorgesehen. Der Menü-/Optionszustand bleibt barrierefrei über
  `aria-expanded` oder `aria-pressed` erkennbar.
- Neue Kartenbuttons müssen **keinen individuellen Designblock**
  erhalten; stattdessen in die gemeinsame Kartenbutton-Struktur
  eingebunden werden. Dialog-/Suchbuttons niemals über diese Regel
  mitgestalten.
- **Jede individuelle Abweichung** bedarf einer expliziten Rückfrage
  und Zustimmung des Auftraggebers. Keine stillschweigenden Sonderfarben,
  Schatten, Abmessungen oder gedrückten Zustände.
- Das ist eine verbindliche Anfangsfassung und kann nach gemeinsamer
  Entscheidung verfeinert werden. Regressionstests prüfen die Regel.

## Was ein Klick auf Refresh gewährleisten soll

1. Ungespeicherte Änderungen an Pins und Ebenen zunächst in IndexedDB sichern.
   Bei Speicherfehlern nicht aktualisieren.
2. Die wirklich veröffentlichte `sw.js` ohne HTTP-Cache anfragen
   und die erwartete Versionskennung daraus bestimmen.
3. Registrierten Service Worker mit `updateViaCache:"none"`
   aktualisieren. Das Offline-Paket mit begrenzter Parallelität
   vorladen; bei Installationsfehler die bisherige funktionierende
   Version behalten.
4. Erst nach **verifizierter Aktivierung und Kontrolle** durch genau
   diese Version die aktuelle Browserseite/PWA mit eindeutiger
   Navigation neu laden.
5. Offline- und Installationsfehler eindeutig melden und den
   Refresh-Button wieder bedienen lassen.

Der Aktivierungszeitraum beträgt 90 Sekunden statt der bisherigen
12 Sekunden. Ein bereits offener Tab aktualisiert sein dargestelltes
HTML/JavaScript nicht allein durch eine Service-Worker-Aktivierung.
Ein Klick aktualisiert **das benutzte Fenster**; ein anderes geöffnetes
Fenster wird nicht ungefragt neu geladen, um dortige Eingaben nicht zu
verlieren.

## Veröffentlichungsprüfung

`preview-pages.yml` muss die **exakte Versionskennung** der
veröffentlichten Service-Worker-Datei mit dem Entwicklungszweig
abgleichen sowie die Live-Auslieferung des Refresh-Moduls prüfen.
Ein grüner Modultest allein gilt nicht als Bestätigung der
Veröffentlichung.

## Keine Datenlöschung

Die Aktualisierung löscht weder Projekt-IndexedDB noch Pins oder Ebenen.
Kartenkachel-Caches bleiben von der Codeversionsbereinigung getrennt.

## Zusatzvertrag v139 – Satelliten-Helligkeit und Kontrast (2026-11-11)

**Nutzerbeschluss:** Im bestehenden Kartenarten-Dialog ist „Satellit“ die letzte Kartenart direkt **oberhalb** der durch die Trennlinie abgesetzten „Schummerung“; „Humanitarian“ steht unmittelbar davor. Unter der Option Satellit und über der Schummerung werden zwei Regler eingeblendet: „Helligkeit“ mit Lucide **`sun-medium`**, „Kontrast“ mit Lucide **`contrast`**. Der lokale `ui/lucide-icons.js`-Symbolbestand enthält beide Geometrien; keine fremde Icon-CDN-Abhängigkeit.

**Werte/Bedienung:** Ausgangspunkt und neutraler Wert jeweils **100 %**. Helligkeit: 70–140 % in 5er-Schritten. Kontrast: 60–140 % in 5er-Schritten. Werte werden während der Eingabe live im Menü als Prozentwert angezeigt und an den Kartenadapter gemeldet; bei abgeschlossener Änderung über den bestehenden `save()`-Port im Projekt gespeichert. Die Regler sind außerhalb der Satellitenkarte deaktiviert, behalten jedoch ihre Werte. Das Menü bleibt beim Verschieben offen und ist bei kleinen Viewports intern scrollbar. Es gibt keine unbeabsichtigte Helligkeits-/Kontraständerung einer anderen Kartenart.

**Strenge Modulgrenze:** `ui/basemap-menu.js` kennt nur die Slider- und Anzeigeereignisse. `app.js` verdrahtet diese mit dem bestehenden Projektzustand und dem Kartenadapter. **Nur** `map-adapter-leaflet.js` verwendet den CSS-Filter `brightness(B/100) contrast(K/100)` am tatsächlichen **Satelliten-Basiskachellayer**. Marker, Pin-Beschriftungen, Kartenbuttons, Attribution, Schummerungs-Overlay und sonstige Basiskarten werden nicht auf diesem Weg gefiltert. Der vorhandene Schummerungs-Filter für Nicht-Satellitenkarten bleibt erhalten.

**Optionale kompatible Projektfelder:** `satelliteBrightness` (Default 100), `satelliteContrast` (Default 100). Ein altes Projekt ohne diese Schlüssel erhält beim Laden automatisch neutrale Standardwerte durch die vorhandene `{...defaults(),...saved}`-Hydration. IndexedDB-Datenbank `pin2map-new-v1`, Version `1`, Store `kv`, Schlüssel `appState` bleiben unverändert; **keine Migration und keine Löschung** bestehender Pins oder Kacheln. Neue Werte werden nur im bestehenden Projektobjekt mitgespeichert.

**Technische Abnahme:** v139 [Node/Chromium/HTTPS Live 43084901562](https://github.com/pin2map/pin2map-new-test/actions/runs/43084901562) bestanden, [regulärer Feature-Pages-Deploy 43085021050](https://github.com/pin2map/pin2map-new-test/actions/runs/43085021050) bestanden. Die reale Preview meldet `pin2map-preview-v139`; Live-Browser prüft Slider, lokale Lucide-Symbole, Filter-Isolation und ursprüngliche Basiskarten auf Phone, Tablet und Desktop. Persönliche iPhone-Abnahme wird separat dokumentiert.

## Historischer Zusatzvertrag v140 – durch Nutzerbeschluss v141 vollständig ersetzt (2026-11-11)

**Nutzerfreigabe v139:** Nutzer bestätigt „alle Tests bestanden“ für die beiden Satelliten-Slider, die Isolation des Bildfilters und deren Speicherung; v139 ist damit auf dem getesteten Gerät angenommen.

**Neue Bedienung:** Rechts neben dem Eintrag **Satellit** steht ein kompaktes, eigenständiges, barrierefrei beschriftetes Zurücksetzen-Symbol (vorhandenes lokales Lucide `refresh-cw`). Der Button ist nur bei aktiver Satellitenkarte und mindestens einem abweichenden Reglerwert aktiv. Beim Anklicken werden **beide** Regler gleichzeitig auf den dokumentierten Standard `100 %` gestellt, die Bilddarstellung sofort geändert und die Werte **einmal** über den vorhandenen Projekt-Save-Port gespeichert. Das Kartenarten-Menü bleibt geöffnet; es wird kein Kartenwechsel ausgelöst und keine Pin- oder Kartendatenmigration durchgeführt. Bei beiden Werten 100 % wird Zurücksetzen deaktiviert.

**Inactive-Anzeige:** Sind andere Kartenarten gewählt, bleiben beide Regler deaktiviert und ihre aktuellen gespeicherten Werte erhalten; die Texte „Helligkeit“ und „Kontrast“, deren Prozentanzeigen und Lucide-Symbole erhalten eine ausgegraute Darstellung. Ausschließlich die Komponente `ui/basemap-menu.js` verwaltet diese Darstellung per `.is-inactive`-Klasse. `styles.css` trägt die lokal begrenzten Farb- und Buttonregeln ohne neue `!important`-Altlasten. `app.js` verbindet den einzigen Reset-Callback mit `mapAdapter.setSatelliteAppearance` und `save()`; der Kartenadapter, Projekt-Schema, Datenbank und PWA-Kacheln bleiben unverändert.

**Gates:** Fokussierte Node-/Chromium- und HTTPS-Live-Vertragsprüfungen sind ergänzt; erfolgreiche CI, Pages-Veröffentlichung und persönliche Geräteabnahme werden erst nach tatsächlichem Nachweis im zentralen Projektstatus vermerkt.

## Zusatzvertrag v141 – nur Satelliten-Helligkeit, Standard 140 % und sichtbarer Reset (2026-11-11)

**Ersetzt v139/v140 in Bezug auf Regleranzahl, Filter und Standard.** Der Nutzer meldete per Screenshot: Reset fehlt in der auf dem Gerät sichtbaren alten v139-Veröffentlichung, Kontrastregler ohne Nutzen. Die noch nicht live abgenommene v140-Zwischenversion wurde nicht übernommen. Der verbindliche aktuelle Dialog enthält **nur Helligkeit** mit Lucide `sun-medium`; `Kontrast` und der dazugehörige Eingaberegler wurden entfernt. Der Satelliten-Slider reicht von **70 bis 180 %** in 5er-Schritten und beginnt bei neuen beziehungsweise bisherigen Projekten ohne gespeicherten Wert mit **140 %**. Bereits bewusst gespeicherte Helligkeitswerte behalten Vorrang; keine stille Datenbereinigung. Ein historisch gespeicherter `satelliteContrast`-Wert wird weder im UI verwendet noch auf die Kacheln angewendet, aber zur Verlustvermeidung nicht aus vorhandenen Projektdaten gelöscht.

**Reset rechts neben Satellit:** Ein ausdrücklich sichtbarer Button mit dem Text **„Standard“** und lokalem Lucide-Symbol `refresh-cw` steht rechts neben `Satellit`. Das Icon gehört einem Kind-`span[data-pin-icon]` und kann deshalb durch die lokale Icon-Dekoration ersetzt werden, ohne den sichtbaren Buttontext zu löschen. Der Reset setzt ausschließlich die Helligkeit auf **140 %**, aktualisiert das Esri-World-Imagery-Basiskachelbild unmittelbar und speichert über den vorhandenen `save()`-Port **einmal**. Der Dialog bleibt geöffnet. Auch wenn der Button am Standardwert deaktiviert ist, bleibt die Aufschrift „Standard“ gut sichtbar; der Button ist korrekt beschriftet und fokussierbar, solange aktiv.

**Inaktive Anzeige:** Bei allen anderen Kartenarten ist nur der Helligkeitsregler deaktiviert; die Schrift, Prozentzahl und das Sonnensymbol werden grau dargestellt. Der Reset ist außerhalb von `Satellit` ebenfalls deaktiviert. Gespeicherte Helligkeit bleibt bei Kartenwechsel erhalten.

**Modulverantwortungen:** `index.html` enthält den einen Regler und die sichtbare Reset-Aktion; `ui/basemap-menu.js` besitzt die DOM-Events und UI-Zustandsklassen; `app.js` ist ausschließlich der Composition Root für `onSatelliteAdjust`, `onSatelliteReset`, Karten-Port und Save-Port; `domain/project-model.js` kennt den optionalen neutralen Vorgabewert 140; `map-adapter-leaflet.js` filtert **nur die Esri-Satellitenkacheln** mit `brightness(value/100)`, ohne einen separaten Kontrastfilter und ohne Auswirkungen auf Pins, Beschriftungen, andere Basiskarten oder Schummerung. Keine IndexedDB-Schemaänderung und keine Kachellöschung. Bestehende CSS-Eigentümer und das `!important`-Budget bleiben unverändert.

**Abnahme:** [CI/Node/Chromium/HTTPS-Live 43114800674](https://github.com/pin2map/pin2map-new-test/actions/runs/43114800674) erfolgreich (268/268 Node-Tests, vollständige Chromium-Regression, unabhängige HTTPS-Datei- und Browserprüfung). [Offizieller Feature-Pages-Deploy 43114888203](https://github.com/pin2map/pin2map-new-test/actions/runs/43114888203) erfolgreich; HTTPS-Assets ausdrücklich `pin2map-preview-v141`, Live-Tests auf Phone, Phone-Tracking-URL, Tablet, Desktop bestanden. Persönliche Geräteabnahme noch offen.

## Zusatzvertrag v142 – Satelliten-Standard 120 % und vollständige Pin-Editor-Control-Isolation (2026-11-11)

**Nutzer-Geräteabnahme v141:** Nutzer meldet „alle Tests bestanden“ für die Helligkeits-Ein-Regler-Darstellung und sichtbaren Standard-Reset. Persönlicher Test damit bestanden.

**Neuer Helligkeitsstandard:** Die einzige Satelliten-Helligkeit hat für neue und bisher nicht individuell gespeicherte Projekte den Vorgabewert **120 %** statt 140 %. Der rechts neben Satellit sichtbare `Standard`-Button setzt ausschließlich die Helligkeit auf **120 %** und speichert sie über den bestehenden Port. Das Einstellintervall bleibt 70–180 % in 5er-Schritten. Bereits in einem bestehenden Projekt gespeicherte manuelle Helligkeiten bleiben unverändert; dadurch kann der beim ersten Start angezeigte Wert von 120 % abweichen, bis der Nutzer den Reset betätigt. Keine IndexedDB-Migration, keine Stilleingriffe in die Projektpins, Offline-Kacheln oder bestehende individuelle Reglerwerte.

**Pin-Editor blendet andere Controls aus:** Für `body.pin-open` gilt neben den bisherigen allgemeinen Bedienelementen und Kartencontrols auch die Ausblendung des Karten-Pin-Info-Buttons `#pinInfoButton`, seines Menüs `#pinInfoMenu` sowie der gesonderten, interaktiven **`#map .elevation-label-wrap`-Marker** mit Informationen oberhalb der Pins. Letztere sind echte Leaflet-Marker im `marker-pane`, nicht gewöhnliche Map-Controls. Der bereits vorhandene verantwortliche CSS-Owner des `pin-open`-Zustands wurde gezielt ergänzt; der frühere, durch stärkere generelle Button-Styles übersteuerte `#pinInfoButton`-Sonderselektor wurde entfernt. Nach dem Schließen werden die Labels ohne Neuanfrage wieder angezeigt. Der Leaflet-Kartenadapter, der PinEditor und die Pin-/Wetterdaten wurden nicht geändert. Keine neuen CSS-`!important`-Override-Schichten; bestehender Owner wurde erweitert.

**Optionale Satelliten-Straßen-/Namensreferenz (Machbarkeit, KEINE Implementierung):** Esri dokumentiert passende World-Imagery-Referenzlayer wie **World Boundaries and Places**, **World Transportation** und den **Hybrid Reference Layer (Local Language)**. Ein optionales Overlay könnte im `map-adapter-leaflet.js` als eigener, transparenter Kachel- oder Vektorlayer zwischen Esri-Hintergrundbild und Pins liegen. Vor einer Implementierung sind konkrete Service-Endpunkte, Autorisierung/API-Key-Anforderungen, Anbieterbedingungen, Quelle/Attribution, Offline-Cache-Regeln und mobile Performance zu prüfen. Der Nutzer fragte zunächst nach der Möglichkeit; ohne gesonderten Integrationsbeschluss keine neue Netzwerkanfrage, Menüoption oder zusätzliche Kartenquelle. Beispiele: https://www.arcgis.com/home/item.html?id=f5705ef5eb8b4f5a322 und https://www.arcgis.com/home/item.html?id=ff52218580f94d89851563f50cd1a2b2 .

**Gates:** [Node/Chromium/independenter HTTPS-Live-Lauf 43117189596](https://github.com/pin2map/pin2map-new-test/actions/runs/43117189596) **alle grün**: 268 Node-Tests, Chromium-Regression mit realen zwei Informationslabels und einem geöffneten Pin-Dialog, sowie Live-Tests auf Phone, Phone-Tracking-URL, Tablet und Desktop; [regulärer Feature-Pages-Deploy 43117287077](https://github.com/pin2map/pin2map-new-test/actions/runs/43117287077) erfolgreich; HTTPS-Quellversion `pin2map-preview-v142`. Persönliche Geräteabnahme der beiden neuen Korrekturen noch offen.

## Zusatzvertrag v143 – reduzierte Kartenwahl, blaue Menütrigger und sichtbarer mobiler Suchfeld-Löschen-Button (2026-11-12)

**Persönliche Abnahme v142:** Nutzer bestätigt „alle Tests bestanden“ für Pin-Dialog-Overlay-Isolation und 120-%-Satelliten-Helligkeitsstandard. Damit v142 persönlich angenommen; bisherige Tests nicht unnötig wiederholen.

**Kartenmenü (ersetzt alte Sortier- und Titelregel):** Die eigenständige Überschrift `Darstellung` **innerhalb** des Kartenwahlmenüs entfällt. Exakte neue Reihenfolge: **Standard** (`data-basemap="street"`, bisher „OSM Original“), **International**, **Humanitarian**, **Topografisch**, **Trennstrich**, **Satellit**, darunter **Helligkeit**, danach **Schummerung**. Die bisherige Satelliten-Standard-Schaltfläche rechts von „Satellit“ bleibt ausdrücklich erhalten. Der Trennstrich gehört jetzt zur visuellen Abgrenzung vor Satellit (`hr.basemap-satellite-divider`), nicht mehr zur Schummerung. Die fachlichen Kartenquellen und IDs `street/international/humanitarian/topo/satellite` sowie Esri-Relief-Verhalten bleiben unverändert.

**Gemeinsame aktive Menübutton-Farbe:** Während des jeweils **geöffneten** Menüs ist dessen auslösender runder Kartenbutton **kräftig blau** (`#1764bf`), das Lucide-Icon **weiß**. Dies betrifft den Kartenartenbutton, den Pin-Info-Button, **Ebenen** und **Einstellungen**. Nach Schließen, Esc, Auswahl oder Wechsel zum anderen Menü kehren alle in ihre normale Darstellung zurück. Der UI-Zustand `aria-expanded` ist die einzige Quelle; `ui/basemap-menu.js` und `ui/pin-info-menu.js` pflegen ihn bereits, `ui/shell.js` setzt ihn nun auch beim Einstellungen-Panel und für beide Panels beim Schließen korrekt. Der CSS-Owner der gemeinsamen Map-Controls schaltet lediglich die vorhandenen `--p2m-map-control-bg`- und `--p2m-map-control-ink`-Variablen; sein bestehender vorübergehender Klick-Effekt gilt nicht mehr für geöffnete Menütrigger. **Keine neuen `!important`-Regeln**, keine zusätzlichen zustandsführenden UI-Module.

**Mobilgerätesicheres Löschen der Suche:** Die Browser-native `input[type=search]`-X-Darstellung ist nicht plattformübergreifend verlässlich. Innerhalb von `#searchForm` wurde deshalb ein expliziter, barrierefrei beschrifteter, grau hinterlegter Rundbutton `#searchClear` mit weißem X ergänzt. Der native WebKit-X-Indikator ist verborgen, damit keine doppelten Schaltflächen entstehen. Der Button erscheint auf Desktop **und** Smartphone, sobald Text enthalten ist; im leeren Zustand verschwindet er. `ui/search-form.js` verwaltet die Sichtbarkeit und ruft beim Klick die **bereits bestehende** `inputChanged()`-Logik auf: Anfrage abbrechen, Trefferliste schließen, spätes Ergebnis unterdrücken, Suchfeld leeren und Fokus zurückgeben. Der Klick löst **keine Suche** aus. Kein direkter Geocoder-/Persistenzzugriff im UI, kein neues Cache-/Datenformat.

**Nachweise:** [Node-/Chromium-/unabhängiger HTTPS-Live-Lauf 43180933258](https://github.com/pin2map/pin2map-new-test/actions/runs/43180933258) mit **270/270 Node-Tests** und erfolgreicher Browserregression, [regulärer Feature-Pages-Deploy 43181009780](https://github.com/pin2map/pin2map-new-test/actions/runs/43181009780) erfolgreich. Tatsächliche HTTPS-Assets: `PASS published HTTPS assets: pin2map-preview-v143`, Live-Browser auf Phone, Phone-Tracking-URL, Tablet und Desktop erfolgreich. Temporärer QA-PR #27 wurde **ohne Merge geschlossen** und temporäre `qa-v143-*`-Jobs mit Actions-Write-Berechtigungen anschließend entfernt. Persönliche v143-Geräteabnahme bleibt offen.


## v144 – Satellitenbild-Beschriftung und punktuelle Bildinformationen (2026-11-12)

**Beschluss:** Nur eine Schaltfläche `switch-camera` für sämtliche zum angeklickten Bildpunkt verfügbaren Daten. Betätigen schließt das Kartenmenü und aktiviert bewusste Punktwahl; keine Hintergrundabfragen. Die nächste freie Kartenberührung zeigt temporär eine gelbe halbtransparente Kreismarkierung mit grauem gestricheltem Rand und `satellite`-Icon sowie ein schließbares Metadaten-Overlay. Weitere Kartenberührungen ersetzen die Markierung und stellen eine neue, auf den sichtbaren Maßstab bezogene Abfrage; laufende ältere Abfragen werden abgebrochen und ihre Antworten ignoriert. Fehlende Daten bleiben als nicht verfügbar erkennbar; Datum aus der Quelle ist Aufnahmedatum, **kein automatisch abgeleitetes Veröffentlichungsdatum**.

Die optionale Checkbox „Straßen und Ortsnamen“ steuert separate Esri-World-Transportation- und World-Boundaries-and-Places-Layer. Straßenlayer werden nur für Satellit erzeugt, unter Pins; der Zustand wird mit bestehenden Projekteinstellungen gespeichert. `esriRelief` bleibt persistiert, aber der Kartenadapter rendert **keinen** Schummerungslayer für Satellit und der Schalter ist ausgegraut. Rückkehr zu anderen Basiskarten stellt den gespeicherten Relief-Zustand wieder her; Satellitenbild-Controls werden deaktiviert und das Bildinfo-Overlay geleert. Bestehende Slider-/Reset-Regeln mit 120 % gelten unverändert.

**Keine Änderung:** aktuelle Pin-/Ebenenobjekte, Datenbankversion, Referenzbranches oder stabile `main`-PWA. Implementierung auf `feature/leaflet-modular-core` mit Release `v144`. Technische Prüfnachweise im zentralen `PROJEKTSTATUS.md` ergänzen, keine Geräteabnahme vorwegnehmen. Offen bleibt die praktische Eignung von Esri-Identify-/Referenzdiensten und Anbieterbedingungen für eine spätere öffentliche Produktionsfreigabe.


## v145 – Metadaten-Reihenfolge, ISO-Datum, Wayback und Fadenkreuz (2026-11-12)

Der neue Bildinfo-Dialog erhält **ausschließlich** sechs Zeilen: **Aufnahmedatum**, **Resolution**, **Accuracy**, **Source_info**, **Datenquelle**, **Link zu Wayback**. Esri-Daten werden nur in der Reihenfolge dieser freigegebenen Felder angezeigt; keine Zusatzangaben. Fehlende/ungültige Werte: „Nicht verfügbar“. Aufnahmedatum: `YYYY-MM-DD`; Veröffentlichungsdaten werden nicht aus Aufnahmedaten abgeleitet. Wayback öffnet via `target="_blank"` und `rel="noopener noreferrer"` mit `#mapCenter=lng,lat,zoom` an der angeklickten Position.

Die bewusst durch `switch-camera` aktivierte Kartenauswahl erhält einen **Fadenkreuz-Zeiger** über die Kartenoberfläche; die bisherige Auswahlmarkierung (gelber transparenter Kreis mit grauem gestricheltem Rand und `satellite`-Symbol), Folge-Taps und Abbruch bleiben exakt wie in v144. Beim Deaktivieren wird die Cursor-Klasse entfernt. CSS benutzt bestehende Zuständigkeit ohne `!important`-Budget zu erhöhen.

Die als fehlend gemeldeten Straßen-/Ortsnamen-Referenzen werden über die fachlich korrekten `Reference/`-Dienste von Esri geladen; weiterhin optional, nur bei Satellit, zwischen Basiskarte und Pin-Markern. Alle bereits bestandenen persönlichen v144-Testfälle gelten als angenommen. Technische Test-/Preview-Nachweise im Projektstatus gesondert vermerken.

## v146 – Bildmetadaten: originale Esri-Werte bei unveränderter Filterung (2026-11-12)

**Nutzerabnahme v145:** Laut Rückmeldung sind alle zuletzt getesteten Funktionen bestanden **außer** der Darstellung der Esri-Aufnahme-, Auflösungs- und Genauigkeitswerte; Screenshot zeigt für diese drei Felder „Nicht verfügbar“, für `Source_info` „Vivid Advanced“ und Datenquelle „Vantor“. Die vorangegangenen bestandenen Funktionen nicht erneut umfassend abfragen.

**Fehlerursache:** Esri gibt in `identify`-Antworten häufig **Alias-Feldnamen** wie `DATE (YYYYMMDD)`, `RESOLUTION (M)`, `ACCURACY (M)` zurück, nicht nur die technischen Feldnamen `SRC_DATE`, `SRC_RES`, `SRC_ACC`. Die v145-Allowlist deckte die Aliasnamen nicht ab. Zusätzlich setzte die v145-ISO-Datumsformatierung selbst von Esri vorhandene originale Datumstexte auf „Nicht verfügbar“, wenn sie nicht in die wenigen unterstützten Formate passten.

**Verbindliche Korrektur:** `adapters/esri-imagery-metadata.js` erkennt sowohl die technischen Namen als auch die Esri-Aliasbezeichnungen, unabhängig von Groß-/Kleinschreibung und Trennzeichen. Die Anzeige bleibt auf **Aufnahmedatum, Resolution, Accuracy, Source_info, Datenquelle und Link zu Wayback** beschränkt, in dieser festen Reihenfolge. **Alle verfügbaren Rohwerte einschließlich Aufnahmedatum werden unverändert durch `String(raw)` angezeigt.** Keine ISO-Umformatierung, Rundung oder Datumsvalidierung. Fehlende, leere und bekannte Esri-Fehlwert-Sentinels (z. B. 99999) zeigen weiterhin „Nicht verfügbar“. Wayback, gelbe Markierung, Kreuzcursor, Referenzlayer, Schummerung, Datenbank und Offline-Kartenregel bleiben unverändert.

**Tests:** neue Unit-Regressionen mit echten Esri-Feldaliasformen und unveränderten numerischen Werten; Chromium-Browsertest stellt `DATE (YYYYMMDD)`, `RESOLUTION (M)`, `ACCURACY (M)` mit einer simulierten Esri-Antwort bereit und prüft die angezeigten Originalwerte. Die öffentlichen Esri-Dienste können in einzelnen Regionen weiterhin wirklich fehlende Bildmetadaten zurückgeben – kein Auffüllen durch Vermutungen. Verifizierung und Deployment als separates Gate nach Codeänderungen.


## v147 – unveränderter Vorgänger-Maßstab im neuen Leaflet-Kartenlayout (2026-11-12)

Übernommen wird **genau der native Leaflet-Maßstab aus der Vorgänger-App**: metrisch, nicht imperial, `maxWidth:160`, automatisches Update bei Zoom/Verschieben, nur ein Maßstabsbalken. Position gemäß jüngster Vorgänger-Referenz: **oben horizontal mittig unterhalb der Kopfleiste** (desktop/iPad 76px, mobil 72px ab Safe-Area), kein eigener Toggle, keine zusätzliche Menüzeile. Gestaltung: hellweiß `rgba(255,255,255,.92)`, Schwarz für Beschriftung und Rahmen, oben offener Maßstabsbalken, `font-weight:600`. Die Karte und alle bestehenden Bedienelemente bleiben erhalten. Bei geöffnetem Pin-Editor wird der Maßstab wie andere Leaflet-Bedienelemente ausgeblendet, Attribution bleibt sichtbar. **Kein Übernehmen historischer pauschaler CSS-Overrides.** Zuständigkeit allein im Leaflet-Adapter sowie einem eng begrenzten CSS-Block; v146 ist vom Auftraggeber persönlich vollständig abgenommen.


## Verbindlicher Listendialog-Designvertrag (16.11.2026, v224)

Nur rein symbolische Schaltflächen sind kreisrund. Sichtbar textbeschriftete Buttons (auch `Abbrechen`, `Zusammenführen`, `+ Ebene hinzufügen`, Favoriten- und künftige Filteraktionen) sind rechteckig mit kleinen gerundeten Ecken; Listensuchfelder ebenso. Symbol-Launcher haben im Ruhezustand die jeweilige Dialogfarbe, im aufgeklappten Zustand einheitliches Blau `#1764bf` mit weißem Symbol und korrekt synchronisierte `aria-expanded`/`aria-pressed`-Werte. Keine anderen Karten-Controls allein wegen des Öffnens eines Filterdialogs ausblenden.

Listenverschiebung zentral über `ui/list-dialog-core.js`: 480-ms-Longpress auf Textbezeichnung aktiviert den gemeinsamen Drag-Zustand; Einträge werden bei unveränderter Dialogfläche kompakter und weiter auseinander gerückt, eine schmale Einfügelinie begleitet die Finger-/Zeigerbewegung. Der jeweilige Fachport schreibt die neue Reihenfolge (Ebenen: Privat bleibt Erster; Favoriten: beliebige Positionen); dieselbe Mechanik kann von einem zukünftigen Filterlisten-Dialog verwendet werden. Die eigene Sichtbarkeits-Hilfsleiste im Ebenendialog ist von Textbutton- und Drag-Konventionen ausgenommen: Sie verwendet einen runden hellblauen Icon-Button.


## Vorrangige allgemeine Bedienregel: runde Kartenbuttons (16.11.2026)

Die neueste ausdrückliche Entscheidung des Auftraggebers lautet: **Alle runden Buttons auf der Karte bleiben bei Aktivierung jedes beliebigen runden Kartenbuttons sichtbar und anklickbar.** Der aktivierte Button darf keine der anderen Schaltflächen oder Karten-Controls per `display:none`, `visibility:hidden`, `opacity:0` oder vergleichbarer Overlay-/Zustandsklasse unterdrücken. Im Gegenzug **schließt die Aktivierung alle anderen offenen Menüs**, bevor das neue Menü geöffnet wird. Das gilt unabhängig davon, ob es sich um den bisher gelben Favoriten-Button, Ebenen, Filter, Kartenstil, Optionen oder einen anderen runden Icon-Launcher handelt. Bestehende entgegenstehende Selektoren wie `body.favorites-open #app > button:not(#favoritesButton)` und die alte Ausblendlogik für `#basemapButton`, `#labelsToggle`, `#layersButton`, `#pinInfoButton`, `#refreshButton` usw. sind **technische Altlasten** und müssen bei Implementierung entfernt bzw. gezielt entkoppelt werden. Nur Menüoberflächen, nicht die anderen Kartenbuttons, schließen/verschwinden. Diese universelle Regel hat Vorrang vor sämtlichen früheren dialogspezifischen Sonderregeln.


### v229 – Ebenendialog: kompakte Hilfe, Farbring, Drag statt Sichtbarkeit (16.11.2026)

Im Merge-Modus wird die globale Sichtbarkeits-Hilfsleiste komplett versteckt, und die exakte Zielwahl-Anweisung steht unter dem oberen rechteckigen Abbrechen-Button. Im Standardmodus steht rechts vom hellblauen Auge der exakte Nutzer-Hinweis „Zum verschieben einer Ebene die Ebene lange festhalten und dann an die gewünschte Position verschieben.“; die Zeile ist kompakt. Checkboxen sind mittig in einer runden Fläche mit der echten Ebenenfarbe platziert. Ebenen-Zeilentext und leere Zeilenfläche schalten nie die Sichtbarkeit um; nur der eigene Augen-Button darf das. Zeilenziehen beginnt unmittelbar ab einer echten Bewegungsdistanz; die gemeinsame Architektur `ui/list-dialog-core.js` behält für Favoriten den bisherigen Longpress bei. Rechteckige Textbuttons bleiben verbindlicher globaler Stil.


## Verbindlicher Ebenen-/Favoritendialog-Vertrag – 16.11.2026 (v232)

**Diese neue, ausdrücklich bestätigte Regel hat Vorrang vor den bisherigen Launcher-Z-Index-Absprachen v227–v231:**

1. **Dialoge liegen IMMER über allen Kartenbuttons.** Sichtbare runde Kartenlauncher dürfen geöffneten Ebenen-, Favoriten-, Einstellungs- und weiteren Dialogen niemals Teile des Inhalts oder Schließen-Schaltflächen überlagern bzw. Klicks abfangen. Andere Kartencontrols dürfen sichtbar bleiben, besitzen aber geringere Stapelpriorität als geöffnete Dialoge. Das muss als tatsächliches Pointer-Ziel im Browser geprüft werden.
2. **Jeder lesbar beschriftete Button in Dialogen ist eckig** (höchstens 7–8 px Eckenradius); ausdrücklich auch „+ Ebene hinzufügen“, „Abbrechen“, „Erstellen“, „Übernehmen“ und die roten Löschaktionen. **Nur reine Icon-Buttons** dürfen rund sein. Die konkrete berechnete CSS-Eckenform ist ein Pflichtregressionstest, nicht allein eine Quelltextsuche.
3. Die Hilfszeile lautet genau zweizeilig: „Ebene verschieben: kurz festhalten, dann verschieben.“ und „Ebenen zusammenführen: in das Farbfeld klicken.“ Der Farbring um die Ebenen-Checkbox besitzt **keinen sichtbaren Rahmen**.
4. Ebenen verschieben durch **450 ms Longpress** auf einer verschiebbaren Ebene, dann mit weiterhin gedrücktem Finger/Pointer ziehen. Erst beim Halten werden die Listeneinträge kleiner; ohne Bewegung keine Umordnung. Die Querlinie zeigt die Einfügeposition und liegt **zentriert zwischen den unmittelbar benachbarten Zeilen**. Die Systemebene „Privat“ bleibt unverrückbar an erster Stelle. Der gemeinsame Sortiercontroller bleibt Eigentümer der Pointerlogik; Favoriten behalten ebenfalls Longpress.
5. Im roten „Was soll gelöscht werden?“-Bestätigungsfeld hat **Abbrechen hellroten Hintergrund**. Destruktive Bestätigungen bleiben kräftig rot.
6. Erstellen und Umbenennen nutzen **dieselbe Vier-Zeilen-Struktur**: (1) fette Überschrift „Neue Ebene erstellen:“ bzw. „Ebene umbenennen?“; (2) normalgewichtige Beschriftung „Farbe und Name der Ebene:“; (3) Farbquadrat und Namenseingabe nebeneinander; (4) eckige Schaltflächen bzw. die zwölf Farbpunkte. Erstellen: „Abbrechen“ hellblau und „Erstellen“ blau. **Das Umschalten zu den Farbpunkten und zurück darf weder die Gesamthöhe des Innenfelds noch die Höhe der vierten Zeile verändern**, und zwar sowohl bei neuen als auch vorhandenen Ebenen.
7. Diese Verträge gelten als Abnahmebedingungen in **realen Chromium-Viewports 390×844 und 1280×800** sowie in noch separat erforderlichen Safari-Gerätetests. Tests müssen berechnetes CSS, DOM-Reihenfolge, Bounding-Rects, Pointer-Ziel und Drag-Einfügelinie prüfen. Nicht nur Existenz von CSS-Deklarationen oder statische HTML-Strings akzeptieren.

Die langwierige Wiederholung derselben UI-Fehler (zuvor runder Add-Button, überlagernde Launcher) zeigt, dass die früheren selektor-/sichtbarkeitsorientierten Checks unzureichend waren. Diese Regeln dürfen durch spätere generische Style- oder Z-Index-Regeln nicht erneut ausgehebelt werden. Bei Widersprüchen gilt der obige Vertrag.


## Ebenen-Zusammenführen und Neuanlage – verbindliche Präzisierung vom 17.11.2026 (v233)

**Der Button für das Zusammenführen darf den Filter-zurücksetzen-Button nicht ersetzen oder dessen Position benutzen.** Er liegt ausschließlich in `#layersHelpers`, rechts neben dem blauen Sichtbarkeits-/Auge-Button und oberhalb der farbigen Ebenenfelder. Er erscheint bei mindestens zwei markierten Quell-Ebenen (darunter mindestens einer regulären Zielebene), verschwindet im Zusammenführungsmodus. Die Filter-Zurücksetzen-Funktion bleibt an ihrem ursprünglichen Platz in der Kopfzeile und behält ihre Aufgabe. Die Hilfszeile lautet genau:

„Halten und verschieben für neue Position“
„Markieren zum Zusammenführen“

**Zusammenführungsmodus – nur die zwei unteren Footer-Buttons steuern den Vorgang:**
- Die bisherige obere `Abbrechen`-Schaltfläche im Hinweis und die bisherige obere `Zusammenführen`-Schaltfläche werden ersatzlos gestrichen.
- Die erste untere Schaltfläche wechselt von „+ Ebene hinzufügen“ zu „Zusammenführen“. Sie ist bis zur expliziten Wahl einer regulären markierten Zielebene deaktiviert und führt danach die bereits beschlossene Zusammenführung aus.
- Die zweite untere Schaltfläche „Abbrechen“ beendet **nur** den Zusammenführungsmodus, ohne den Ebenendialog zu schließen und ohne Projektobjekte zu ändern. Außerhalb des Zusammenführungsmodus schließt sie weiterhin den Ebenendialog.
- Die erklärende Zeile „Alle Objekte aus den gewählten Ebenen ...“ erscheint im Zusammenführungsmodus mit kleinerer Schrift, weiterhin vor der Liste der möglichen Ziele. Nach der Zielwahl steht dort auch die Ziel-/Quelleninformation; **niemals** zusätzliche obere Aktionsbuttons.
- Das obere X bleibt der Weg zum Schließen des gesamten Ebenendialogs. Bestehende Regeln: Privat darf Quelle sein, nie Zielebene, wird nicht gelöscht; Bestätigung erfolgt erst nach ausdrücklichem Klick auf den unteren „Zusammenführen“-Button.

**Neu angelegte Ebenen** werden im gespeicherten Ebenenarray **sofort hinter der unverrückbaren Systemebene „Privat“** eingefügt, nicht am Ende. Frühere reguläre Ebenen behalten untereinander ihre Reihenfolge. Das gilt für alle Wege über die gemeinsame `application/layer-operations.js`-`create`-Operation einschließlich `LayerCreation.createConfigured` und `create`. Nach dem Speichern wird der neue Eintrag im Listendialog sichtbar gehalten; bestehende Daten werden nicht rückwirkend sortiert.

**Pflichtregressionen:** Standort und Sichtbarkeit des Merge-Buttons, unveränderte Filter-Schaltfläche, exakt zwei Hilfszeilen, verkleinerte Hinweisschrift, keine Aktionsbuttons im Hinweis, Beschriftung/Deaktivierung/Funktion beider Footer-Buttons, wirklicher Abbruch ohne Datenänderung, echte Fusion samt IndexedDB-Nachweis und sichtbare und persistente Neuanlage direkt unter „Privat“. Weiterhin kleine eckige Radien sämtlicher lesbar beschrifteter Footer-Buttons. 


## UI-Vertrag v234 (17.11.2026) – neun ursprüngliche Ebenenfarben und präzise Interaktionen

Neu angelegte Ebenen haben **ein fokussiertes leeres Namensfeld ohne Vorschlag**. Im Ebenen-Listenmodus ist `#layersUnite` **immer sichtbar** rechts neben dem Auge und **bis mindestens zwei markierte Ebenen vorhanden sind deaktiviert**; die Suche-/Filter-zurücksetzen-Funktion bleibt unverändert. Bei Unsichtbarkeit werden **Name UND SVG-Augensymbol rot** dargestellt. Die zwei Hilfszeilen lauten exakt „1 Sek. halten und an neue Pos. verschieben.“ / „Markieren zum Zusammenführen.“. Nur das Verschieben von Ebenen erfordert nun 1000 ms Halten (nicht mehr 450 ms). Die Farbpunkte in Erstellen/Bearbeiten sowie Standardfarben-Einstellungen enthalten **neun** statt zwölf Werte.

Die Vorgängerpalette wurde **direkt aus `pin2map/pin2map:index.html` (Variable `defaults`)** übernommen: `#FF0000`, `#1E90FF`, `#32CD32`, `#FFD700`, `#FF8C00`, `#8A2BE2`, `#FF1493`, `#008B8B`, `#8B4513`. Privates Grau `#808080` und die eigenständigen drei Signalfarben bleiben davon unabhängig. Frühere bereits gespeicherte Ebenen behalten ihre individuellen Farbwerte; beim Lesen gespeicherter unmodifizierter v232-Standardpaletten werden nur Default-Slots auf die entsprechende neue Palette abgebildet, Benutzeranpassungen bleiben bestehen.

Zur Abnahme müssen berechnete DOM-/CSS-Werte, echte Fokuszustände, disabled-Status des Merge-Buttons, exakt neun Farbwähler, die originale Reihenfolge und Bestandsdatenschutz im Chromium- und Domain-Test geprüft werden.


## Farbwechsel und sanftes Blinken ungespeicherter Pins (17.11.2026 – v237)

Der siebte Eintrag der neunteiligen Ebenen-Standardpalette lautet künftig **`#8A7431`** statt `#FF1493` – exakt vom bereitgestellten einfarbigen Screenshot abgelesen. Das betrifft die zentrale Farbverwaltung, die Auswahl beim Anlegen und Bearbeiten sowie die neun Standardfarben im Einstellungsregister; der vorhandene Benutzerfarbwert einer bereits gespeicherten Ebene wird nicht automatisch geändert. „Privat“ und Signalfarben sind nicht betroffen.

Temporäre **Pin**-Vorschauen behalten Pink und erhalten eine sanfte 1,3-s-Blinkanimation über die innere SVG-Pinform (minimal 24 % Sichtbarkeit). Diese Wirkung verändert **nicht** die Leaflet-Markerbox, Klick- oder Touchflächen, Label-/Popup-Anker, Kartenausschnitt und gespeicherte Marker; `prefers-reduced-motion:reduce` deaktiviert sie. Sie wird beim Entfernen der temporären Vorschau mit deren DOM automatisch entfernt.


## v238 – Animationsvertrag auf Flächen, Seen und Flüsse ausgedehnt (17.11.2026)

**Korrektur des Geltungsbereichs:** Die zuvor nur für temporäre Pins definierte Blinkanimation gilt jetzt auch für alle temporären Flächen/Seen und Linien/Flüsse. Pink bleibt bestehen, das sichtbare SVG-Objekt pulsiert sanft (1,3 s / bis 24 % Opazität). Ein animierter Fluss erhält die CSS-Klasse ausschließlich auf der sichtbaren Mittellinie; seine separate 24px Berührungsfläche blinkt nicht. Polygon-Geometrien werden beim Erstellen im Leaflet-Adapter mit der Klasse markiert. Die Labels, Klickflächen, dauerhaften Karteneinträge, Lage und die Bedienbarkeit bleiben stabil. `prefers-reduced-motion:reduce` deaktiviert das Blinken für **alle** Objekttypen. Browser-Abnahme umfasst temporäre Pins, Gebiete, Seen, Flüsse sowie reduzierte Animation und nicht animierte Touchkorridore.


## Kartentip – Steuerung der Kartenklick-Vorschau (17.11.2026, v239)

Als „Kartentip“ gilt die kleine zweiknöpfige Auswahl nach einem Hintergrund-Tipp auf die Karte. **Links Flächensuche**, **rechts Pin setzen**. Beim Erstellen einer temporären Vorschau aus diesem Kartentip bleiben **Zoom und Kartenzentrum unverändert**, einschließlich der Gebietshierarchie-Auswahl für Flächen; automatische Ausschnittanpassung bleibt ausschließlich bei der üblichen Suche bestehen. Ist ein oberer Pin-Informationsmodus (z. B. Höhe oder Temperatur) aktiv, wird die Information bereits für den **temporären Kartentip-Pin** geladen und über dessen SVG-Pin angezeigt; Aufhebung der Vorschau entfernt das Label und den Datenabruf aus der aktiven Menge. Keine Änderung an gespeicherten Objekten oder deren Datenmodell.


## Neue Ebenen – einheitlicher Datums-/Stundenvorschlag (17.11.2026, v243)

**Neuere ausdrückliche Regel ersetzt den leeren Namensvorschlag aus v234/v236:** Bei **jeder** Neuanlage einer Ebene wird das Namensfeld vorbefüllt, unabhängig vom Einstieg: Ebenendialog (Inline-Editor) und temporäre Objekt-Zielebenenauswahl (nativer Namensdialog). Das Format ist exakt **`dd.mm.yyyy-hh`**, mit zweistelligem lokalem Kalendertag, Monat und Stunde (24-Stunden-Uhr, 00–23) und vierstelligem Jahr. Die Uhrzeit wird beim Öffnen der jeweiligen Neuanlage frisch ermittelt; Minuten und Zeitzonenkennung werden nicht angehängt. Die gemeinsame Formatierung gehört zu `application/layer-creation.js`, ohne zusätzliche persistierte Daten. Vorschlag editierbar, bestehende Ebenen unverändert; bestehende Eindeutigkeits-/Validierungsregeln gelten weiterhin (bei gleicher Stunde muss der Nutzer einen abweichenden Namen wählen). Fokus im Inline-Editor bleibt auf der Namenseingabe. Regressionen: alle Einstiegspfade, Uhrzeitformatierung und Browser-Namensvorgabe.


## Kartentip-Flächensuche – räumliche Gebietstypen und Geometriedaten (17.11.2026, v244)

Der Kartentip ist **keine reine administrative Gebietsabfrage**. Die Auswahlliste zeigt zunächst die reverse-geokodierte Länder-/Verwaltungshierarchie und ergänzt tatsächlich den Tipp-Punkt umfassende **benannte OSM-Flächen**: Inseln, Schutzgebiete/Nationalparks, militärische Sperr- und Schießgebiete sowie weitere kartierte Natur-/Regionsflächen. Die zusätzliche räumliche Kandidatenliste wird über die öffentlich angebotene Overpass-`is_in`-Abfrage ermittelt, die Auflösung der ausgewählten exakten OSM-Way-/Relation erfolgt über Nominatim-Lookup mit Polygon-GeoJSON; für bereits bestehende administrative Treffer bleibt die geprüfte Nominatim-Freitext-Geometriesuche erhalten. Suchergebnisse sind echte Flächenobjekte, keine automatisch um eine Ortskoordinate erfundenen Kreise. Eine Geometrie, die beim Anbieter nicht als Polygon hinterlegt ist, darf ausdrücklich nicht als erfolgreich gefunden bezeichnet werden. Eindeutige Länder-/Ortshinweise rechtfertigen einen engen Toleranzfall für vereinfachte Orts-/Küstenpolygone; mehrdeutige gleichnamige Objekte werden nicht blind akzeptiert. Overpass-Ausfall darf die bisherige administrative Gebietsauswahl nicht unbenutzbar machen; ein Abbruch muss auch die weitere Abfrage beenden. **Bei Auswahl verändert der Kartentip weiterhin nie Zoom oder Kartenzentrum.** Globale Gebietstypen sind erwünscht, ihre Erkennbarkeit hängt von Kartierung, Anbieterabdeckung und Verfügbarkeit ab.


### Nichtblockierende Kartentip-Gebietsliste (v245)

Die administrative Gebietshierarchie muss **sofort** nach dem Nominatim-Rückwärtsgeocoder sichtbar und auswählbar sein. Eine zusätzliche Overpass-Abfrage zur räumlichen Ergänzung darf die ursprünglichen Auswahlmöglichkeiten nicht verzögern. Die Liste aktualisiert sich, falls die zusätzliche Abfrage tatsächlich benannte Gebiete findet. Wird vorher ein Eintrag gewählt, muss die spätere Antwort verworfen bzw. die noch laufende Abfrage abgebrochen werden. Bei Ausfall des zusätzlichen Dienstes bleiben die Verwaltungseinheiten verfügbar und eine verständliche Kurzmeldung weist auf die fehlenden Sondergebiete hin. Dieser v245-Vertrag ist eine Korrektur einer durch echte v244-HTTPS-Chromium-Tests gefundenen Wartezeitregression.


### Kartentip-Gebietsanbieter und Echtdaten-Freigabe (v246)

Öffentliche Overpass-Instanzen können Browseranfragen ablehnen (HTTP 429/406, Timeout, CORS). Sie dürfen daher nicht allein mit gemockten Antworten als funktionsfähig gelten. Wo regional verfügbar, verwendet die Kartentip-Flächenfindung zuerst geprüfte regionale Provider (Europa, Nordamerika), danach globale Fallbacks. Die zusätzliche Übertragung von Kartenpunktkoordinaten an diese Dienste gehört zur angezeigten Nutzer-Einwilligung. Administrative Ergebnisse bleiben unverzüglich bedienbar und sind von allen optionalen Quellen unabhängig. Für die Kartentip-Funktion ist ein **echter Chromium-Echtdaten-Gate** auf der veröffentlichten HTTPS-Preview erforderlich: Für einen festen Rügen-Punkt muss der Anbieter tatsächlich die Insel und Nationalpark Jasmund liefern und die Parkrelation als Polygon aus Nominatim aufgelöst werden. Exakte räumliche Suche auf allen Kontinenten ist weiterhin vom jeweiligen live erreichbaren Polygonanbieter abhängig und darf nicht als ausnahmslos garantiert bezeichnet werden.
