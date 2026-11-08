# Verbindliche Grundentscheidungen – pin2map NEW

Stand: 2026-11-08

Dieses Dokument hält die für die neue modulare Basisversion beschlossenen Entscheidungen fest. Neue Grundentscheidungen werden fortlaufend ergänzt; überholte Entscheidungen werden ausdrücklich als ersetzt gekennzeichnet.

## Grundentscheidung 1 – Zuordnung von Pins zu Ebenen

**Beschlossen:** Ein Pin gehört immer **genau einer Ebene** an. Die zuvor erwogene Mehrfachzuordnung wurde ausdrücklich zurückgenommen.

**Konsequenz:** Das Pin-Datenmodell enthält eine einzige Ebenenreferenz pro Pin. Das Verschieben eines Pins in eine andere Ebene verändert diese Zuordnung, statt weitere Ebenenzuordnungen anzulegen.

## Grundentscheidung 2 – Private Ebene in der Basisversion

**Beschlossen (Variante A):** Die private Ebene ist von Anfang an Bestandteil der Basisversion.

**Konsequenz:** Das Ebenenkonzept, die Pin-Zuordnung und die lokale Speicherung berücksichtigen die private Ebene bereits in der ersten funktionsfähigen Version. Das genaue spätere Server-/Sichtbarkeitsverhalten wird gesondert spezifiziert.

## Grundentscheidung 3 – Reihenfolge der lokalen Basisversion und Serveranbindung

**Beschlossen (Variante A):** Zuerst wird eine **stabile lokale Basisversion** entwickelt und getestet. **Danach wird frühzeitig die Serveranbindung integriert und mit zwei Geräten praktisch getestet.**

**Konsequenzen:**
- Die erste Entwicklungsstufe umfasst Karte, Pins, einfache Ebenenverwaltung einschließlich privater Ebene und zuverlässige lokale Persistenz.
- Ein Pin gehört genau einer Ebene an (Grundentscheidung 1).
- Die Anwendungslogik wird über eine Datenzugriffsschnittstelle von der konkreten lokalen Speichertechnik getrennt. Dadurch kann die Serveranbindung folgen, ohne die Fachlogik neu aufzubauen.
- Die lokale Version muss sich über Neustarts und erneutes Öffnen der PWA hinweg bewähren, bevor die Serverintegration beginnt.
- Die zweite Entwicklungsstufe beginnt frühzeitig mit einem realen Zwei-Geräte-Test von Datenübertragung und Synchronisation; die Details des Synchronisationsverhaltens werden gesondert beschlossen.
- Die Serveranbindung wird **nicht** auf einen erst sehr spät erreichten Vollausbau verschoben.
- Der bisherige UI-PoC ist nur eine Design-/Verhaltensreferenz und keine zu übernehmende Codebasis.

## Grundentscheidung 4 – Lokale Datenhaltung

**Beschlossen (Variante A):** Die lokale Basisversion verwendet **IndexedDB** für die dauerhafte Speicherung strukturierter Anwendungsdaten.

**Konsequenzen:**
- Pins, Ebenen und ihre Beziehungen werden lokal in IndexedDB abgelegt.
- Ein Pin verweist auf genau eine Ebene; die private Ebene gehört von Anfang an zum Datenmodell.
- Datenzugriffe erfolgen über eine klar abgegrenzte Schnittstelle, nicht direkt aus UI-Komponenten oder Fachlogik.
- Die Datenstruktur wird auf spätere Synchronisationsinformationen vorbereitet, ohne dass die erste lokale Basisversion bereits einen Server benötigt.
- Schemaänderungen werden über versionierte Datenbankmigrationen gehandhabt.
- Die lokale Persistenz wird praktisch getestet (Änderungen, erneutes Laden, App-Neustart). IndexedDB allein garantiert keinen Schutz vor Löschung der Browserdaten; Backup/Export werden separat entschieden.

## Grundentscheidung 5 – Funktionsumfang der Pins

**Beschlossen (Variante A):** Bereits die erste stabile lokale Basisversion unterstützt den vollständigen grundlegenden Pin-Lebenszyklus: **anlegen, anzeigen, bearbeiten, auf der Karte verschieben und löschen**.

**Konsequenzen:**
- Jede der fünf Aktionen wird über die Fachlogik und den gekapselten Datenzugriff in IndexedDB gespeichert.
- Jeder Pin gehört weiterhin **genau einer Ebene** an; die private Ebene steht von Anfang an zur Verfügung.
- Ein verschobener Pin behält seine Identität; nur seine Koordinaten werden aktualisiert.
- Die Funktionen müssen auch nach Neuladen der PWA und Neustart erhalten bleiben.
- Zusätzliche Pin-Attribute, erweiterte Bearbeitungsfunktionen und Synchronisationsdetails werden gesondert festgelegt.

## Grundentscheidung 6 – Mindestangaben für einen Pin

**Beschlossen (Variante A):** Zum Erstellen eines Pins sind **Standort (Koordinaten)** und die **Zuordnung zu genau einer Ebene** Pflicht. Die **Bezeichnung ist optional**.

**Konsequenzen:**
- Ein Pin darf ohne Namenseingabe erstellt und dauerhaft gespeichert werden.
- Eine Bezeichnung kann nachträglich ergänzt oder geändert werden.
- Jeder Pin erhält unabhängig vom Namen eine stabile eindeutige interne ID.
- Das Datenmodell erlaubt leere/nicht gesetzte Bezeichnungen.
- Die private Ebene steht als mögliche eindeutige Ebenenzuordnung von Anfang an zur Verfügung.
- Wie die Ebene beim Anlegen ausgewählt wird, regelt die nächste Grundentscheidung.

## Offen – Grundentscheidung 7: Ebenenzuordnung beim Anlegen eines Pins

Da jeder Pin genau einer Ebene angehören muss, ist der Bedienablauf beim Erstellen zu entscheiden:

- **Variante A (Empfehlung):** Ein neuer Pin wird automatisch der aktuell ausgewählten/aktiven Ebene zugeordnet. Die aktive Ebene wird beim Setzen des Pins erkennbar angezeigt; die Zuordnung kann später geändert werden. Wenn keine Ebene aktiv ist, muss vor dem Anlegen eine Ebene gewählt werden. Das gilt auch für die private Ebene.
- **Variante B:** Bei jedem neuen Pin wird die zugehörige Ebene ausdrücklich ausgewählt, bevor er gespeichert werden kann, selbst wenn bereits eine Ebene aktiv ist.

**Status:** Grundentscheidung 7 ist offen und noch nicht beschlossen.
