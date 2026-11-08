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

## Offen – Grundentscheidung 6: Mindestangaben für einen Pin

Welche Angaben soll ein Pin in der lokalen Basisversion benötigen?

- **Variante A (empfohlen):** Standort und genau eine Ebene sind Pflicht. Eine Bezeichnung ist optional. Ein Pin kann daher sofort durch Antippen der Karte erstellt und später benannt werden.
- **Variante B:** Standort, genau eine Ebene **und eine Bezeichnung** sind Pflicht. Jeder neue Pin muss vor dem Speichern benannt werden.

Beide Varianten sehen eine stabile interne Pin-ID vor; weitere Felder werden später festgelegt. **Grundentscheidung 6 ist noch nicht beschlossen.**
