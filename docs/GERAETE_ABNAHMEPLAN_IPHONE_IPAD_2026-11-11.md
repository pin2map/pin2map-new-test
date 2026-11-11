# Geräte-Abnahmeprotokoll – lokale Basisversion v116 (iPhone / iPad)

**Erstellt:** 2026-11-11 · **Stand:** Geräteabnahme läuft; **A01–A02 laut Nutzerrückmeldung bestanden**, weitere Fälle offen · **Ziel:** Gate 2 / konkrete UX-Parität zur Vorgänger-App, ohne alten Code zu übernehmen.

## 1. Ausgangspunkt und Belegstatus

- **NEW-Preview:** https://pin2map.github.io/pin2map-new-test/preview/
- **Funktionsreferenz:** Vorgänger-App im Repository `pin2map/pin2map`; Vergleich nur bei tatsächlich vorhandener, erreichbarer Referenz auf demselben Gerät.
- **Entwicklungsquelle:** `pin2map/pin2map-new-test`, `feature/leaflet-modular-core`.
- **Quellversion:** v116, SW-Quelle `pin2map-new-v116`, Preview-Variante `pin2map-preview-v116`. Die installierte/aktivierte Version auf einem bestimmten Nutzergerät ist **nicht automatisch nachgewiesen**.
- **Bereits automatisiert geprüft:** Node+Chromium <https://github.com/pin2map/pin2map-new-test/actions/runs/42996283550>, Architektur <https://github.com/pin2map/pin2map-new-test/actions/runs/42996283996>, Pages-/HTTPS-Live-Start <https://github.com/pin2map/pin2map-new-test/actions/runs/42996283529>. Diese Prüfläufe ersetzen **keinen echten Safari-/Touch-/Flugmodus-Test**.
- **Manueller Ergebnisstand:** **A01–A02 laut Nutzerrückmeldung auf iPhone/Safari OK** (11.11.2026); A03–A08, B01–B08 und C01–C05 sowie iPad weiterhin offen. Ein früheres „funktioniert“ für OpenTopoMap v104 ist kein umfassendes v116-Gate.
- **Sicherheit:** Tests nach Möglichkeit mit **einem eigens angelegten Testpin und einer Testebene**. Vorhandene persönliche Pins/Ebenen nicht löschen; auch bei einer Test-Löschung nur den explizit erstellten Testpin verwenden. **Browserdaten, Website-Speicher, Service Worker und PWA nicht löschen oder zurücksetzen.** Bei Fehlern zuerst Screenshot und genaue Schritte erfassen.

## 2. Prüfgeräte und Ergebniserfassung

| Gerät / Umgebung | Prüfstatus | Ergebnis / Browser-/iOS-Version |
| --- | --- | --- |
| iPhone – Safari-Tab, bestehende frühere Preview-Nutzung | A01–A02 OK, übrige offen | Nutzerrückmeldung 11.11.2026; iOS-/Safari-Version nicht mitgeteilt |
| iPhone – installierte PWA (nur falls bereits installiert) | offen | – |
| iPad – Safari-Tab | offen | – |
| iPad – installierte PWA (nur falls bereits installiert) | offen | – |
| iPhone – Brave privat, falls für Fehlervergleich sinnvoll | optional / offen | – |

Ergebnis je Fall: **OK**, **Fehler**, **nicht ausführbar** oder **nicht geprüft**. Bei Abweichungen Datum, Gerät, Browser/PWA, Screenshot, betroffene Funktion, konkrete Bedienreihenfolge und erwartetes/tatsächliches Ergebnis festhalten. Keine stillschweigende Freigabe.

## 3. Priorität A – Kernbedienung (iPhone zuerst, danach iPad)

| ID | Bedienfolge | Erwartetes Ergebnis | Status |
| --- | --- | --- | --- |
| A01 | Preview direkt in Safari öffnen; Karte ohne Tastatureingabe verschieben; mit zwei Fingern zoomen, dann +/- nutzen | Karte bleibt bedienbar, kein weißes/graues Dauerbild, Zoom/Pan unabhängig von Pins | OK – iPhone Safari (Nutzerrückmeldung 11.11.2026) |
| A02 | Freie Kartenstelle länger berühren, bis ein **Testpin** angelegt ist | Genau ein Pin erscheint am gedrückten Ort und ist in **Privat**; normaler kurzer Tipp erzeugt keinen Pin | OK – iPhone Safari (Nutzerrückmeldung 11.11.2026) |
| A03 | Testpin antippen, Namen bearbeiten, Editor schließen und Pin erneut öffnen | Pin-Auswahl/Editor reagieren; Name bleibt sichtbar und nach Reload gespeichert | offen |
| A04 | Testpin auswählen, Verschieben aktivieren, Vorschau auf andere Stelle bewegen, **Abbrechen** | Ursprüngliche Pin-Position bleibt unverändert; keine versehentliche Pin-Erstellung oder Verschiebung | offen |
| A05 | Verschieben erneut aktivieren, Zielposition wählen, **Bestätigen** | Genau derselbe Pin (ID) hat neue Position; nach Reload bleibt diese gespeichert | offen |
| A06 | Karte so verschieben, dass ein Pin nahe linkem, rechtem, oberem und unterem Bildschirmrand liegt; jeweils Editor öffnen | Einmalige Kartenkorrektur macht **vollständigen Dialog inkl. Spitze** sichtbar; Pin-Koordinaten bleiben gleich | offen |
| A07 | Bei geöffnetem Pin-Editor die Karte frei verschieben und zoomen | Dialog bleibt am Pin verankert und darf später aus dem Viewport wandern; **kein fortlaufendes erzwungenes Zurückschwenken** | offen |
| A08 | Den Testpin erneut antippen oder Dialog-Schließen verwenden, freie Karte berühren | Dialog schließt zuverlässig; Bedienelemente werden wieder sichtbar; keine versteckten blockierenden Overlays | offen |

**Spezifische historische Regression:** A06–A07 schützen den 76px-Pin-Dialogabstand, die Spitze und den einmaligen statt dauerhaften Sichtbarkeits-Pan; dies ist nicht allein durch allgemeine Desktop-Smokes abgenommen.

## 4. Priorität B – Ebenen, Suche, Buttons und Kartenwahl

| ID | Bedienfolge | Erwartetes Ergebnis | Status |
| --- | --- | --- | --- |
| B01 | Ebenen öffnen, zusätzliche **Testebene** anlegen; Privat umschalten, wieder einschalten | Reihenfolge Privat vor weiteren Ebenen, Sichtbarkeit korrekt und nach Reload erhalten; vorhandene Pins unverändert | offen |
| B02 | Testpin im Editor einer Testebene zuordnen; Ebene aus-/einblenden | Pin besitzt genau eine Ebenenzugehörigkeit; bei ausgeblendeter Ebene verschwindet er nur aus der Karte, nicht aus dem Speicher | offen |
| B03 | Ortsnamensuche nur mit bewusst aktivierter Berechtigung nutzen; nach Ort suchen, ggf. Treffer wählen | Trefferliste/Einzeltreffer benutzbar; neuer Ortssuch-Pin in Privat, Karte zentriert; bei Netzproblemen klare Meldung | offen |
| B04 | Kartenwahl öffnen, **Straßenkarte → Topografie → Straßenkarte**; Kartenausschnitt dabei bewegen | Beide Hintergrundkarten sichtbar; Topokacheln laden (in Safari **und** gegebenenfalls Brave); kein dauerhaft grauer Hintergrund | offen |
| B05 | Suchbutton vergrößert ansehen; Suchfeld öffnen/schließen, Tastatur erscheinen lassen | **30px sichtbarer Ring**, **18px Lupe**, **42px Antippfläche**, kein übergroßer grauer Ring, kein Abschneiden/Überdecken der Suche | offen |
| B06 | Unten links/rechts Zoom-/Label-/Kartenbuttons betrachten; Hoch-/Querformat wechseln | Untere Bedienreihe hat ergonomischen Randabstand; **Leaflet-/OSM-Attribution bleibt sichtbar und nicht von Buttons verdeckt**; kein Abrutschen in Safe Area | offen |
| B07 | Label-Optionen und Einstellungen öffnen/schließen, zwischen Panels wechseln | Kein gleichzeitiges blockierendes Panel; Buttons und Schließen funktionieren, keine unerwartete dauerhafte Aktiv-Markierung | offen |
| B08 | Im Vergleich zur vorhandenen Vorgänger-App dieselben Basis-Buttons/Dialoge ansehen | Sichtbare Unterschiede/Abweichungen konkret notieren; Abnahme **nicht** automatisch wegen Designähnlichkeit | offen |

**Schutz:** B05/B06 sind die bereits früher gemeldeten Suchbutton- und Unterkantenprobleme. Keine neue CSS-Abnahme behaupten; B38 mit 298 `!important` bleibt offen. B03 ist bei fehlender expliziter Geocoder-Berechtigung **nicht ausführbar**, kein Fehler.

## 5. Priorität C – Safari-PWA-Aktualisierung und Offline-Daten

| ID | Bedienfolge | Erwartetes Ergebnis | Status |
| --- | --- | --- | --- |
| C01 | In bereits benutztem Safari-Tab Preview öffnen, vorhandenen **Testpin** bearbeiten, anschließend oben **Refresh** verwenden | Änderungen vor Reload gespeichert; richtige neu verfügbare App-Version wird aktiviert oder verständlicher Fehler angezeigt; keine alte/leere App | offen |
| C02 | Dieselbe Vorschau in Safari normal und alternativ in Brave privat aufrufen | Ein Browser darf nicht dauerhaft alte/falsche HTML-/SW-Routen liefern; bei 404 genaue URL + Browser dokumentieren, **keinen Cache/Daten löschen** | offen |
| C03 | Online Straßenkarte in einem kleinen Bereich und einer Zoomstufe betrachten; PWA/Tab schließen, Flugmodus einschalten, erneut starten | Bereits installierte App-Shell startet offline; lokale Testpins/Ebenen erhalten; **nur zuvor betrachtete OSM-Kacheln derselben Zoomstufe** müssen ggf. vorhanden sein | offen |
| C04 | Im Flugmodus Karte in neuen Bereich oder andere Zoomstufe bewegen; anschließend wieder online | Fehlende Kacheln dürfen offline leer bleiben; Pins/Kartenzentrum nicht verlieren; online wird Anzeige wiederhergestellt | offen |
| C05 | Nach Offline-Bearbeitung Testpin erneut online laden und prüfen | Kein stiller Datenverlust oder doppelter Pin; vorherige Änderung dauerhaft gespeichert | offen |

**Hinweise:** Die Topokarten-Kacheln gehören derzeit nicht zum eigenen Offline-Tile-Cache. C03 ist nur möglich, wenn die PWA zuvor online vollständig installiert/initialisiert wurde. Safari-Tab und Home-Screen-PWA sind getrennt zu protokollieren. Nicht auf **„Website-Daten löschen“**, PWA deinstallieren oder SW abmelden ausweichen, weil das gespeicherte Pins vernichten kann.

## 6. Reihenfolge und Abnahmeregel

1. Vorab **A01–A08** auf einem iPhone in Safari prüfen; nur Testpin verwenden. Bei kritischem Fehler dort stoppen, bevor weitere Änderungen das Problem verdecken.
2. Danach **B04–B06** (bekannte regressionsanfällige Punkte), anschließend B01–B03/B07 und ein kurzer Vergleich mit Vorgänger-App B08.
3. **C01–C05** nur bewusst als separaten Speicher-/Offline-Block, ohne vorhandene Benutzerdaten zu gefährden.
4. Auf dem iPad A06–A07, B05–B07 und C01 gezielt nachholen; Querformat einschließen.
5. **Gate 2 erst schließen**, wenn erforderliche reale Gerätefälle OK sind oder Abweichungen ausdrücklich behoben/akzeptiert wurden. Status „nicht geprüft“ bleibt offen. Ein „ok“ zur Projektfortsetzung ist **keine** Geräteabnahme.

## 7. Reproduzierbarer Fehlerbericht (für spätere Rückmeldung)

```text
Fall-ID:
Gerät / iOS-Version:
Safari-Tab, installierte PWA oder Brave:
Preview-URL:
Schritte:
Erwartet:
Tatsächlich:
Screenshot (falls vorhanden):
Wiederholbar: ja / nein
```

## 8. Bereits beschlossene und bewusst offene Funktionen

- **Nicht Basis-Blocker:** separate Pin-Liste (Grundentscheidung 21), aktives Ebenenkonzept und früherer Pin-hinzufügen-Modus (beides später ausdrücklich aufgehoben).
- **Nicht geplant:** Fotos, Kartenbild-/PNG-Export.
- **Nach dem UX-Gate zu priorisieren:** lokaler Projekt-Export/Backup und sicherer Import/Wiederherstellung (Verlustschutz), anschließend Pinnotizen/Links und weitere Vorgänger-Funktionen. Keine vorgezogene Server-/Synchronisationsintegration.
- **Technische Baseline:** v116 unverändert, keine neue Live-Abnahme aus der Erstellung dieses Dokuments ableiten. `main`, Referenzen, IndexedDB-Daten, CSS/Tile-Server bleiben geschützt.

## Laufende Geräte-Ergebnisse

- **2026-11-11 – iPhone/Safari, Test A01–A02: OK.** Nutzer meldet wörtlich „Test A01–A02: Alles funktioniert wie beschrieben.“ Damit sind Pan/Zoom und die Pin-Anlage per Langdruck nach dem bereitgestellten Ablauf bestätigt; kurz tippen erzeugt keinen Pin. Testpin für A03–A05 weiterverwenden. Kein Screenshot oder Geräte-/iOS-Versionsdetail übermittelt. **Alle anderen A-, B- und C-Fälle bleiben offen.**
