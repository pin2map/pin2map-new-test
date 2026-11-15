# Kennzeichen-Datenquellen und Qualität – Erweiterung v192 (15.11.2026)

## Ziel und Datenmodell

Die Code-Suche von pin2map ist eine **geografische Einordnung**, keine Bestimmung des Halters oder des aktuellen Fahrzeugstandorts. Die offline mitinstallierten Dateien `domain/license-plate-data-*.js` enthalten nur Text-Fakten: `[code, countryISO, name, geoQuery, adminKind, validityStatus, sourceID]`. Der ursprüngliche, geprüfte v191-Katalog hat bei identischem Land+Code Vorrang. Gleiche Codes **unterschiedlicher Länder** bleiben getrennte Treffer. Landesübergreifende Nicht-Eindeutigkeit ist erwünscht.

`validityStatus` bedeutet **current** (in aktueller offiziellen Liste), **historic** (bewusst nicht mehr regulär neu ausgegeben) oder **unknown** (die heutige Ausgabe ist nicht hinreichend geprüft). Ein Wert `unknown` ist **kein** Hinweis, dass der Code falsch ist. Ein historischer Code kann weiterhin auf dem Fahrzeug vorhanden sein. Kein Status darf aus der bloßen Existenz im Datensatz abgeleitet werden.

## Referenzen und Nutzungsrechte

| Quelle-ID | Länder | Referenz, Umfang, Qualitätsgrenze |
| --- | --- | --- |
| `cc0-offene-daten` | DE, AT, CH | https://github.com/offene-daten/kennzeichen (Datensatz unter **CC0 1.0**; die Sammlung ist nicht vollständig aktuell). Regionale Codes, **keine** nichtgeografischen Behörden-/Militärkennzeichen. Heutiger Status für neue Einträge vorsichtshalber `unknown`; komplexe historische Gebiete benötigen Einzelprüfung. |
| `fr-geo-api` | FR | Französische amtliche Départements, https://geo.api.gouv.fr/departements und https://www.service-public.gouv.fr/particuliers/vosdroits/F20319 . Gebietskennziffer ist im SIV **frei wählbar**, keine Herkunft des Halters. Offizielle Codes versus ältere Sondernummern getrennt; nicht automatisch alle Sonderformate. |
| `tr-meb-2024` | TR | Türkische Provinznummern 01–81; amtliche Beschreibung auch in https://veriportali.tuik.gov.tr/ und https://meslek.meb.gov.tr/upload/dersmateryali/pdf/BY2024KT0902.pdf (nur **Code-/Ortsfakten**, keine Texte oder Bilder übernommen). |
| `it-cipa-2025` | IT | Provinzkürzel nach ACI https://www.aci.it/i-servizi/normative/codice-della-strada/indice-delle-appendici/appendice-xi-artt-255-e-256-sigle-di-individuazione-degli-uffici-provinciali-della-mctc-e-sigle-di-individuazione-delle-province.html und Fachliste https://www.cipa.it/attivita/sitrad/standard-applicativi-di-base/SITRAD_Standard_applicativi_di_base_rel.1.3.pdf . Provinzkürzel auf modernen Kennzeichen ist optional. |
| `it-sardinia-2026` | IT | Sardinien-Neugliederung: **OT**, **OG**, **VS**, `SU` = Sulcis Iglesiente. Beschluss 19.10.2026: https://www.conferenzastatocitta.gov.it/home/notizie-e-comunicati/2026/sardegna-nuove-sigle-automobilistiche-per-quattro-province/ . Früher verwendetes `SU` als Sud Sardegna erfordert später zusätzliche historische Zuordnung nach Zeitraum. |
| `ie-revenue` | IE | Irisches Revenue Office, https://www.revenue.ie/en/vrt/documents/vrt/registration-number-format.pdf (26 County-/Stadt-Codes). |
| `pl-2024-regulation` | PL | Offizielle polnische Kennzeichenregel 2024 (Anhang mit Wojewodschaft/kreis, https://api.sejm.gov.pl/eli/acts/DU/2024/1709/text/O/D20241709.pdf ). Systematik der Vorzeichen; heutige Verwendung der einzelnen alten Zusatzserien bedarf nochmals Prüfung, deshalb `unknown`. |
| `community-check-2026` | CZ, RO, HR, SI, BG, RS, ME, MK, BY, UA | Nur **Arbeitsreferenzen** aus geografischen Kennzeichenverzeichnissen einschließlich https://github.com/timii/plate-atlas . Die dortige **MIT-Lizenz bezieht sich auf Code, nicht pauschal auf Fremddaten oder Bilder**. Hier werden ausschließlich schlichte Code-/Ortsbeziehungen geführt, keine Abbildungen oder Begleittexte. Diese Codes sind ausdrücklich als **noch unabhängig zu verifizieren** (`unknown`) gekennzeichnet. Vor einer amtlich geprüften Vollständigkeitsbehauptung müssen eigene nationale Quellen konsultiert werden. |

## Datenpflege und Prüfregeln

1. Neue Quellen und Datenlizenzen zuerst dokumentieren. Keine Fremd-Bilder, komplette Fremdtexte oder unberechtigte Massenextraktion unter nicht geklärten Rechten.
2. Code-Schreibweisen wörtlich beibehalten; Unicode-Kennzeichen wie `ČK` und führende Nullen `01` sind wichtig. Für bulgarische, auf Schildern visuell lateinische Cyrillic-Buchstaben ist eine **visuelle Transliteration** in der lokalen Suchkennung erfasst, nicht eine phonetische Transliteration.
3. Tatsächliche Verwaltungseinheit vor einer Flächendarstellung unabhängig mit Nominatim (nur nach Nutzeraktion, keine Massenabrufe) oder einer geeigneten lizenzierten Geo-Quelle prüfen. Ein Code, der mehreren Städten oder einer früheren Zulassungsstelle entspricht, darf **nicht** automatisch auf eine erfundene Stadt-/Kreisfläche projiziert werden. Bei unsicherem Treffer gibt es eine ehrliche Fehlermeldung.
4. Identische Codes innerhalb eines Landes sind nur dann eindeutig, wenn sie denselben geografischen Identifikator bezeichnen. Der aktuelle Offline-Katalog dedupliziert anhand `Land|Code`; mehrere **unterschiedliche** Gebiete unter demselben Land+Code benötigen künftig ein ausdrückliches Variantenmodell, nicht stilles Zusammenführen.
5. Für die Länder DE/AT/CH und die vielen polnischen Regionscodes sind die Gebietsnamen durch die zugrundeliegenden Verwaltungsreformen nicht unbedingt identisch mit heutigen Geometrien. Vor allem historische Codes erfordern eine manuelle zeitbezogene Gebietsprüfung.
6. Die Offline-Code-Liste ist **nicht** gleichbedeutend mit offline verfügbaren Polygonen. Der bestehende Nominatim-Grenzabruf ist netzgebunden und kann je nach Code auch mangels eindeutigem Treffer fehlschlagen. Keine Änderung an Privat-Ebene, Projektdaten oder sonstigen Sucharten.
7. Für eine vollständige Europa-Abdeckung bleiben insbesondere GB, NO, GR und zusätzliche historische Systeme sowie Spezialserien und Regionencodes ohne eindeutige Verwaltungspolygone gesondert offen.

## Veröffentlichung und Checks

Alle vier Datenmodule werden als PWA-App-Shell-Assets **vor** `domain/license-plate-catalog.js` geladen. Der Katalog ist deterministisch, source-tagged und bleibt ohne Internet suchbar. Zusätzlich zu den bestehenden Node-/Chromium-/Architektur- und Live-Pages-Prüfungen gibt es `tests/license-plate-bulk.test.js` für Menge, Ländervielfalt, Schreibweise, Dubletten, Beispiele, Lizenzquellen-Assets und den Offline-Vertrag.

V192 ist ein umfangreicher **Daten-Ausbau**, keine Behauptung, jeder Code liefere bereits zuverlässig ein passendes GeoJSON-Polygon. Die genaue Zahl der aktiven Einträge und die GitHub-Actions-Referenzen werden in `docs/PROJEKTSTATUS.md` nach den erfolgreichen Gates festgehalten.


## v193 – Quellenbelegte geografische Ersatzorte und Länderübergreifende Fallback-Strategie

Die ergänzten **Referenzorte** sind keine geografischen Flächen des Kennzeichenbezirks. Sie werden ausschließlich als gekennzeichnete Punktalternative verwendet, wenn keine eindeutig verifizierbare Verwaltungsfläche ermittelt werden kann.

- **DE NAU / HVL:** Offizielle Landkreis-Havelland-Kennzeichenreservierung mit NAU als Unterscheidungskennzeichen sowie Zulassungsstellen in Nauen und Rathenow: https://www.havelland.de/wirtschaft-verkehr/verkehr/kfz-zulassungsbehoerde/kennzeichenreservierung . Nauen (historisch namensgebend) und der heutige Landkreis Havelland sind **verschiedene geografische Auswahlebenen**.
- **DE LRO:** Landkreis Rostock bestätigt als gültige Kennzeichencodes ausdrücklich LRO/DBR/GÜ/ROS/BÜZ/TET, Hauptsitz **Güstrow**: https://www.landkreis-rostock.de/de/zustaendigkeit-bau-undverkehrsamt/leistung/313/kfz-wunschkennzeichen_erstmalig_reservieren.html .
- **DE BÜS:** Gemeinde Büsingen am Hochrhein bestätigt Sonderkennzeichen BÜS (Verwaltungszugehörigkeit Landkreis Konstanz): https://www.buesingen.de/de/Unser-Buesingen/Deutsche-Insel-in-der-Schweiz/FAQ-Fragen-und-Antworten . Im Kartenmodell ist das **Gemeindegebiet**, nicht die Schweizer Umgebung, die gewünschte Fläche.
- **DE FRI:** Landkreis Friesland (Jever) führt FRI im offiziellen Zulassungsverkehr: https://www.friesland.de/ ; dort veröffentlichter Fachbereich Straßenverkehr mit Dienststelle Jever. Bei unbekannter Verwaltungsgrenze nur **Jever als Referenzort**.
- **AT GU:** Offizielles österreichisches Kennzeichenverzeichnis nennt GU ausdrücklich als Bezirk **Graz-Umgebung**, **nicht Stadt Graz**: https://www.oesterreich.gv.at/.syndication?pageId=fc7d016b-8f01-403f-984d-fc006879bb1e . Die steirische Statistik führt **Gratkorn** als Gemeinde im Bezirk Graz-Umgebung: https://www.landesentwicklung.steiermark.at/cms/dokumente/12256479_141979478/37005d34/60613.pdf . Deshalb wurde Graz als falscher Kreis-Referenzpunkt ausdrücklich ausgeschlossen.

**Geometriequelle:** Existierende OSM-/Nominatim-Objekte werden ausschließlich auf Benutzeraktion abgefragt. Hier wird kein Polygon kopiert. Die Herkunft des Referenzortdatensatzes sowie ggf. OSM-Attribution bleiben getrennt von den allgemeinen Kennzeichencodelizenzen; CC0/ODbL/Rechtepflichten aus v192 gelten unverändert. Die Regel gilt unabhängig von Staat und Kennzeichensprache. Für bislang nicht nachprüfbare Kreis-Referenzorte erfolgt **kein** spekulativer Punkt-Fallback.


## v194 – KN-Zulassungsgebiet und amtlich geprüfte Gebietsreferenzen

**DE|KN: Landkreis Konstanz**. Der Landkreis Konstanz betreibt Kfz-Zulassungsstellen in **Konstanz, Singen und Stockach**; damit ist „Konstanz“ als namensgebende Stadt nicht die alleinige räumliche Kennzeichenregion. Amtliche Landes-/Kreisquelle: https://www.lrakn.de/service-und-verwaltung/aemter/strassenverkehr%20und%20schifffahrt/zulassungsstellen und https://www.lrakn.de/%2CLde_DE/-/allgemeine%2Bdienstleistungen/wunschkennzeichen-beantragen-oder-reservieren/vbid312 (Landratsamt als Zulassungsbehörde für einen Landkreis). Der zusätzliche Referenzort `Konstanz` liegt im Landkreis und ist **nur für den klar gekennzeichneten Punktfallback** bestimmt. Polygon nach Landkreisgrenze; niemals bloße Stadtgrenze. Vgl. Drittabgleich zum KN-Landkreis mit weiteren Ausgabestellen: https://bw.kennzeichen-brd.de/kennzeichen/kn .

Diese konkret geprüfte Zuordnung wird unter `landkreis-konstanz-2026` in `domain/license-plate-jurisdictions.js` gespeichert. Herkunfts-/Lizenzhinweis: Nur Gebiets- und Behördenfakten, keine vollständigen Behördenverzeichnisse, Fotos oder fremde GeoJSON-Daten übernommen. Nominatim/OSM-Grenzgeometrien werden weiterhin nur nach ausdrücklicher Benutzeraktion gemäß bestehenden Nutzungs-/Attributionsbedingungen nachgeladen.

**Weitere Länder:** Die importierten Datensätze enthalten häufig nur namensgebende Städte. `node scripts/audit-plate-jurisdictions.cjs --json` liefert einen reproduzierbaren Qualitätssicherungs-Backlog der besonders prüfbedürftigen Stadtangaben in DE, PL und anderen Ländern. Die Liste beweist keine Kreiszugehörigkeit; sie dient dem gestuften, amtlich quellenbelegten Ausbau der vorrangigen Gebietstabelle. Erst nach dieser Prüfung dürfen `areaName` und `admin` autoritativ überschrieben werden.


## v195 – Prüfinventar mit amtlichen europäischen Gebietstypen

**Österreich – amtliche Liste, Stand 12.03.2026.** Die Kennzeichen sind nach der Zulassungsbehörde organisiert. Die amtlichen tabellarischen Abkürzungen und Bezirksbezeichnungen jeder Region werden als **Text-/Gebietsfakten** übernommen, nicht als kopiertes Register samt Darstellungen:

- Burgenland https://www.oesterreich.gv.at/de/themen/mobilitaet/kfz/5/1/Seite.061402
- Kärnten https://www.oesterreich.gv.at/de/themen/mobilitaet/kfz/5/1/Seite.061403
- Niederösterreich https://www.oesterreich.gv.at/de/themen/mobilitaet/kfz/5/1/Seite.061404
- Oberösterreich https://www.oesterreich.gv.at/de/themen/mobilitaet/kfz/5/1/Seite.061405
- Salzburg https://www.oesterreich.gv.at/de/themen/mobilitaet/kfz/5/1/Seite.061406
- Steiermark https://www.oesterreich.gv.at/de/themen/mobilitaet/kfz/5/1/Seite.061407
- Tirol https://www.oesterreich.gv.at/de/themen/mobilitaet/kfz/5/1/Seite.061408
- Vorarlberg https://www.oesterreich.gv.at/de/themen/mobilitaet/kfz/5/1/Seite.061409
- Wien https://www.oesterreich.gv.at/de/themen/mobilitaet/kfz/5/1/Seite.061410

**Besonders wichtig:** `E` gilt in der Zulassung für **Eisenstadt und Rust**; `SW` für Schwechat **und Teile des Wiener Flughafens**; `BA` ab 2026 für vier Gemeinden im Ausseerland; `GB` für die Expositur Gröbming. Dies sind *keine* exakten Ein-Gemeinde-Polygone. Historische `WU`-Kennzeichen bleiben nach Bezirksauflösung gültig, ohne einen heutigen Bezirk zu bezeichnen. `KG` bezeichnet die Gemeinde Klosterneuburg. In diesen Fällen sind die amtlich benannten Beschränkungen bzw. historischen Zustände zentraler Datenbestand.

**Polen – amtliche Gebietsstruktur und Codearten.** `§ 30, § 31 und Anlage 13` der Verordnung vom 08.11.2024 (Gesetzblatt DU 2024/1709): https://eli.gov.pl/api/acts/DU/2024/1709/text.html . Das System definiert die Kürzel für Wojewodschaften und Powiaten, darunter eigenständige Städte mit Powiat-Rechten; derselbe Ortsname kann Stadt und Landpowiat bezeichnen. Die aus dieser Rechtsnorm abgeleitete *Gebietstypklasse* wird separat von einem **noch nicht quellenbestätigten, grammatikalisch amtlichen Powiat-Namen** geführt. Daher können Nominatim-Polygone bei unbekanntem offiziellen Namen weiterhin fehlen; es wird dann kein falsches Stadtpolygon substituiert. Die aktuellen/stillgelegten Ausgabestände einzelner 2024-Codes müssen gesondert bestätigt werden.

**Deutschland – eine Kennung, mehrere Zuständigkeitsgebiete.** Die allgemeine Rechtsgrundlage ist § 9 FZV https://www.gesetze-im-internet.de/fzv_2023/__9.html ; die zuständigen Bundes-/Landesdaten enthalten Kennzeichen, Kreise und Gemeinden: BKG KFZ250 https://gdz.bkg.bund.de/index.php/default/digitale-geodaten/nicht-administrative-gebietseinheiten/kfz-kennzeichen-1-250-000-kfz250.html (Stand 11.2022; veröffentlichte Datenlizenz Deutschland Namensnennung 2.0 mit vorgeschriebenem Quellenvermerk; **die BKG-Rohdaten sind für v195 noch nicht als Komplettbestand importiert**). Als dokumentierte Einzelbelege der gemeinsamen Kfz-Zulassungskennung:
- `KA`: Landkreis Karlsruhe bestätigt ausdrücklich gemeinsame Kennzeichenverwaltung mit der **Stadt Karlsruhe**: https://www.landkreis-karlsruhe.de/PDF/14112024_TOP_007.PDF
- `HN`: Landkreis Heilbronn differenziert die eigene Kennzeichenreservierung ausdrücklich von der **Stadt Heilbronn**: https://service.landkreis-heilbronn.de/ihr-anliegen/zulassung/wunschkennzeichen-reservieren
- `UL`: Alb-Donau-Kreis bestätigt die gemeinsame Kfz-Zulassungsbehörde für **Stadt Ulm und Alb-Donau-Kreis**: https://www.alb-donau-kreis.de/-/behoerdenwegweiser/gemeinsame-kfz-zulassung-des-alb-donau-kreises-und-der-stadt-ulm-landratsamt-alb-donau-kreis/oe6011593
- `WÜ`: Landkreis Würzburg bestätigt WÜ als Landkreiskennzeichen https://www.landkreis-wuerzburg.de/Wunschkennzeichen ; Stadt Würzburg ist eigenständige Zulassungsbehörde (Stadt und Landkreis getrennte Verwaltungsgebiete).
- `BA`: Landkreis Bamberg bestätigt BA für den Landkreis https://www.landkreis-bamberg.de/Landratsamt/B%C3%BCrgerservice-/Wunschkennzeichen-online/ ; Stadt Bamberg mit eigenständiger Zulassungsstelle.
- `A`: Landkreis Augsburg bestätigt eigenständige Kfz-Zulassungsstelle: https://www.landkreis-augsburg.de/landrat-landratsamt/landratsamt/sicherheit-und-ordnung-kommunales-und-verbraucherschutz/auto-verkehr/fahrzeugzulassung/online-services-kfz-zulassung/ ; Stadt Augsburg ist eigenständige kreisfreie Stadt.

**Lizenzqualität:** Wir übernehmen hier nur behördlich begründete Kennzeichen-/Gebietszuordnungen und Verweise, **keine** fremden PDF-Texte, ZIP-Geodaten oder Bildbestände. BKG stellt seinen umfangreichen KFZ250-Datensatz unter Deutschland Namensnennung 2.0 bereit und fordert den Quellenvermerk `© Bundesamt für Kartographie und Geodäsie (Jahr), Datenquellen: Kraftfahrt-Bundesamt, Flensburg` bei tatsächlicher Datennutzung. Solange dessen Rohdaten nicht übernommen wurden, wird er **nur als recherchierte Prüfquelle** zitiert, nicht als importierte Datei ausgegeben. Für weitere Datenimporte Lizenz- und Quellenangaben vor der Verteilung einplanen.

**Nachprüfung 2024-Anhang, v195:** Die Powiat-Rechtsliste nennt im Woiwodschaftsabschnitt Zachodniopomorskie ausdrücklich **Szczecin** (`ZS`) und **Świnoujście** (`ZSW`) als eigene städtische Einheiten. Ebenso werden die selbstständigen oberschlesischen Stadt-Powiats in der Anlage einzeln aufgeführt. Der aktuelle Klassifikator übernimmt diese Unterschiede, ohne aus der Namensliste ein aktuelles Zulassungsdatum für jeden einzelnen Code zu erfinden. Quelle: https://eli.gov.pl/api/acts/DU/2024/1709/text.html – Anlage 13, Abschnitte Śląskie und Zachodniopomorskie.


## v196 – Neu erschlossene deutsche Sekundärzuordnungen und amtliche Gebietsregeln

**Bodenseekreis / Wiedervergabe:** Verbindliche Gebietsquellen sind der Bodenseekreis und die Landesregierung/Landtag BW: https://www.landtag-bw.de/resource/blob/261158/0922ad35381fc0af7b8e156a7478da4a/17_4183_D.pdf . `TT` ist wieder eingeführter namensgebender Tettnanger Code für den Bodenseekreis; `RV` für den Landkreis Ravensburg; `ÜB` ist ehemals Überlingen und heute in Bodenseekreis, Landkreis Ravensburg und Landkreis Sigmaringen verwendbar. Diese Facts werden mit `source=bw-landtag-2023` bzw. FN mit Bodenseekreis-Jahresbericht https://www.bodenseekreis.de/fileadmin/07_politik_verwaltung/kreisfinanzen/downloads/haushalt/rechenschaftsbericht_2024.pdf geführt.

**Sekundärdatensatz Deutschland (nur Quellenhinweis, keine amtliche Datenbehauptung):** https://github.com/MarkTiedemann/unterscheidungszeichen , `unterscheidungszeichen.json`, 722 Quellenzeilen (716 geografisch). Der Autor bietet die Sammlung unter **CC0-1.0** an; sie ist **aus der deutschsprachigen Wikipedia-Liste der Kfz-Kennzeichen** abgeleitet, deren Wiki-Text unter **CC BY-SA 4.0** steht, siehe https://de.wikipedia.org/wiki/Liste_der_Kfz-Kennzeichen_in_Deutschland und https://creativecommons.org/licenses/by-sa/4.0/deed.de . Aus Vorsicht dokumentieren und nennen wir **beide** Quellen samt Herkunft und behalten die abgeleitete sekundäre Zuordnung im Projekt eigenständig, statt sie als BKG/KBA-original zu bezeichnen. Vor einer separaten Weiterverbreitung des daraus zusammengestellten Datenbankmaterials über die PWA hinaus sind etwaige Attribution/Share-Alike-/Datenbankpflichten nochmals zu prüfen. Die Code- und Amtsgebietsnamen selbst sind einfache Tatsachen; keine fremden Bilder, Texte oder OSM-Polygone übernommen.

**Ausländische amtliche Prüfquellen für Registrierungsscope (nicht ein einzelnes Polygon):**
- Slowenien: Amtliche Zulassungsbereiche, `SI` 11 Codes; https://pisrs.si/pregledPredpisa?id=PRAV7282&tab=analiticni .
- Kroatien: Staatliche/behördliche Vorschrift zur Kennzeichenzuteilung, `HR` 34 regionale Codes, https://cvh.hr/gradani/informacije/propisi-i-upute/pravilnici/zakon-o-sigurnosti-prometa-na-cestama/pravilnik-o-registraciji-i-oznacavanju-vozila/ .
- Serbien: Vorschrift zu Bezirks-Zulassungskennungen, `RS` 74 vorhandene Codes, https://www.paragraf.rs/propisi/pravilnik_o_registraciji_motornih_i_prikljucnih_vozila.html .
- Montenegro: Regierungstext (2019) über 23 vorhandene Kennungen plus `TU` für Tuzi, https://wapi.gov.me/download-preview/e820de62-a4bf-4365-b8c1-d421983c568b?version=1.0 . Alte und neue Gemeindereformen sowie `TZ` und `ZT` werden nicht fälschlich als 2019 amtlich bestätigt.

Diese nationalen Quellen belegen, dass sich ein Kennzeichen oft auf mehrere Gemeinden bezieht, **nicht** dass ein importierter Gemeindenamen die genaue Grenzgeometrie angibt. Die Region erscheint daher bei Unsicherheit nur als markierter Referenzpunkt und ohne automatische Projektpersistenz. Jeder Code führt Land, Quell-ID und Gültigkeit getrennt; die Zweitquelle wird nicht mit amtlicher Einzelfall-Zuordnung verwechselt.

**Weiter offen:** unabhängige amtliche Einzelverifikation hunderter deutscher historischer Zusatzkürzel und aktueller Verwaltungsreformen, komplette internationale Codegültigkeitsprüfungen, genaue zusammengesetzte Geometrien, Nordmazedonien/Ukraine/Belarus-Regionen und das urheber-/datenbankrechtlich geeignete amtliche BKG/KBA-Zulassungsverzeichnis. Das Inventar wird über `node scripts/audit-plate-jurisdictions.cjs --json` weiterhin nach Evidenzstufen unterscheidbar ausgegeben; das Datum einer Rechtsquelle darf nicht auf das tatsächliche Ausgabedatum aller importierten Alt-Kennzeichen übertragen werden.
