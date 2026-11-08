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

## Offen – Grundentscheidung 4: Art der lokalen Datenhaltung

Für die stabile lokale Basisversion ist festzulegen, ob die Daten **strukturiert in IndexedDB** gespeichert werden (Variante A) oder zunächst in einem einfacheren lokalen Speichermodell, etwa localStorage (Variante B). Noch **kein Beschluss**.

**Empfehlung:** Variante A (IndexedDB), weil Pins, Ebenen und spätere Synchronisationsmetadaten strukturiert und transaktionsfähig gespeichert werden können. Die Fachlogik bleibt über eine Repository-/Datenzugriffsschnittstelle unabhängig davon.
