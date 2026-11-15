# Kennzeichen-Suche – Geografische Verortung (Beschluss 2026-11-15)

## Zweck und Geltung
Eine Kennzeichenkennung stellt eine **geografische Referenz** dar. Sie sagt ausdrücklich nichts über den heutigen Wohnort des Halters oder den Aufenthaltsort des Fahrzeugs aus. Historische Codes dürfen auffindbar sein und sind als historisch gekennzeichnet.

Die Suchoption **Kennzeichen** ergänzt Pin, GPS-Standort, Gebiet, See und Fluss. Shortcut ist **K** bei Fokus auf der Suchauswahl. Die Eingabe erfolgt im normalen Suchfeld und wird erst auf ausdrückliche Auswahl der Suchart ausgewertet.

## Daten und Abdeckung

- `domain/license-plate-catalog.js`: kleiner versionierter, offline mitinstallierter **Startkatalog**. Er enthält Code, Land-ISO, Flagge, lokalisierte Bezeichnung, Nominatim-Suchname, gewünschte Gebietsart und Status `current` bzw. `historic`.
- Die erste Etappe beinhaltet Beispiele aus **DE, AT, CH, FR, IT, PL, CZ, RO, TR, ES, SK**; sie ist **keine flächendeckende vollständige Länder- oder Code-Datenbank**. Neue Einträge dürfen nur mit ausreichend gesicherter geografischer Zuordnung ergänzt werden; ungeklärte Abbildungen werden nicht geraten. Für alle anderen Länder bleibt der Katalog offen erweiterbar.
- Doppelbelegungen sind erwünscht: `B` zeigt u. a. 🇩🇪 Berlin und 🇷🇴 Bukarest, außerdem ggf. weitere Länder/historische Zuordnungen; `67` zeigt 🇫🇷 Bas-Rhin und 🇹🇷 Zonguldak.
- Die Datenpflege benötigt pro Land eine belastbare aktuelle/historische Referenz, Plausibilitätsprüfung der administrativen Einheit, Kennzeichnung von Gültigkeitsperioden und Lizenzkontrolle. Der Startkatalog ist vor einer europaweiten Vollständigkeitsbehauptung weiter zu prüfen und zu erweitern.
- Die geometrische Referenz muss zur tatsächlich kennzeichenführenden Verwaltungsebene passen. Wo nur eine frühere Zulassungsstelle und keine belastbare Fläche bekannt ist, darf keine vermeintlich exakte Fläche gezeigt werden.

## Ablauf und Fehlersicherheit

1. Lokale Suche nach Normalisierung auf exakt den Code (kein öffentlicher API-Aufruf bei Texteingabe).
2. Trefferliste im vorhandenen `searchResults`-Dialog; Land und historische Belegung explizit zeigen.
3. Erst nach Nutzerwahl und aktivierter Nominatim-Einstellung darf `application/license-plate-search.js` die vorhandene `NominatimAreaFinder`-Portfunktion verwenden. Nur Polygon oder MultiPolygon mit **passendem Land** und Verwaltungstyp akzeptieren. Bei keiner oder mehreren ununterscheidbaren Grenzgeometrien Fehlermeldung **ohne** mutmaßliche Fläche. Keine systematischen Massensuchen.
4. Kartendarstellung über **eigenes temporäres Overlay im Leaflet-Kartenadapter**, pink mit Label `🇩🇪 B (Berlin)`; nicht in `state.areas`, IndexedDB oder einer Ebene gespeichert.
5. Klick auf Label zeigt neben dem Label `Bereich speichern? – Ja / Nein`. **Nein** schließt nur die Nachfrage. **Ja** entfernt das Overlay und führt über die bestehende `ProjectFeatures.createArea`-Logik eine dauerhafte Fläche in `private` mit dem Kennzeichenlabel als Namen an. Bestehender Editor öffnet sich.
6. **Jede neue Suchaktion** (Pin, GPS, Gebiet, See, Fluss, Kennzeichen oder Gebietsabfrage auf der Karte) entfernt eine noch temporäre Kennzeichenfläche. Laufende asynchrone Ergebnisse älterer Suchvorgänge werden durch die vorhandene Abbruch-/Seriennummerlogik nicht erneut angezeigt. Das Tippen im Suchfeld allein entfernt sie nicht. Bereits gespeicherte Flächen bleiben erhalten.

## Quellen, Providerregeln und spätere Skalierung

- Nominatim-Suchdokumentation: https://nominatim.org/release-docs/latest/api/Search/
- Nutzungsregel öffentliche OSMF-Instanz: https://operations.osmfoundation.org/policies/nominatim/ . **Höchstens 1 Anfrage/Sekunde insgesamt je Anwendung**, klare Attribution, nur nutzerinitiierte Einzelabfragen, Caching und mögliche Providerumstellung; keine Autovervollständigung, kein Massenimport. Der bestehende clientseitige Intervalltimer ist **keine globale Gesamtlastkontrolle**. Bei stärkerer Nutzung muss eine eigene oder vertraglich geeignete Geometriequelle bereitgestellt werden.
- Frankreich – offizielle Gebietsdaten: https://geo.api.gouv.fr/ ; Italien – ACI Provinzkürzel: https://www.aci.it/ .
- Für die landesweite Vollständigkeit müssen je Land offizielle Zulassungsregister beziehungsweise lizenzierte offene Kennzeichenverzeichnisse als Quellen ergänzt werden; Community-Listen sind ohne Prüfung keine hinreichende alleinige Autorität.
- Attributions-/ODbL-Pflichten bei OSM-Geometrien beachten.

## Architektur und Abnahmekriterien

UI: `ui/license-plate-panel.js`; Domain: `domain/license-plate-catalog.js`; Use-Case: `application/license-plate-search.js`; Kartenrendering ausschließlich `map-adapter-leaflet.js`; `app.js` nur Verdrahtung. Keine neue IndexedDB-Struktur.

Tests müssen Mehrfachtreffer, Historienflag, Länderprüfung, eindeutige Polygonauflösung, temporäre Nichtpersistenz, Nein, Ja/Privat, Suchwechsel-Cleanup sowie vorhandene Pin-/Gebiet-/GPS-Regressionsfälle umfassen. Automatisierte Chromium-Emulation ersetzt keine physische Safari-Nutzerabnahme. **Technischer Abschluss erst bei grünen Node-/Architektur-/Browser- und HTTPS-Preview-Gates.**
