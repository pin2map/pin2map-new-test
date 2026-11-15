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
