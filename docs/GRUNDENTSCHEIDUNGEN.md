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

## Grundentscheidung 7 – Ebenenzuordnung beim Anlegen eines Pins

**Beschlossen (Variante A):** Ein neuer Pin wird **automatisch der aktuell aktiven Ebene** zugeordnet. Die aktive Ebene ist beim Anlegen erkennbar. Die Ebenenzuordnung eines vorhandenen Pins kann später geändert werden.

**Konsequenzen:**
- Beim Erstellen eines Pins ist keine erneute Ebenenauswahl nötig, solange eine Ebene aktiv ist.
- Ist keine Ebene aktiv, muss vor dem Anlegen zuerst eine Ebene ausgewählt werden; eine stillschweigende Zuordnung zu einer zufälligen Ebene ist ausgeschlossen.
- Der Pin erhält eine einzige Ebenen-ID (Grundentscheidung 1), auch wenn seine Zuordnung später geändert wird.
- Die private Ebene kann genauso als aktive Zielebene gewählt werden.
- Die gewählte Ebenenzuordnung wird zusammen mit dem Pin in IndexedDB persistiert.
- Wie die aktive Ebene beim Start der Anwendung festgelegt wird, ist in Grundentscheidung 8 zu entscheiden.

## Grundentscheidung 8 – Aktive Ebene beim Start der Anwendung

**Beschlossen (Variante A):** Die **zuletzt aktive Ebene** wird lokal gespeichert und beim nächsten Öffnen der PWA automatisch wiederhergestellt, **sofern die Ebene noch existiert**.

**Konsequenzen:**
- Die Auswahl der aktiven Ebene wird lokal dauerhaft gespeichert, getrennt von der eigentlichen Ebenenzuordnung der Pins.
- Nach dem Neustart wird die zuletzt aktive Ebene wieder ausgewählt und erkennbar angezeigt.
- Ist noch keine Auswahl gespeichert oder existiert die zuletzt aktive Ebene nicht mehr, gibt es zunächst keine aktive Ebene. Vor dem Anlegen eines Pins muss dann ausdrücklich eine Ebene gewählt werden.
- Es erfolgt kein stillschweigender Wechsel zu einer beliebigen anderen Ebene.
- Die Regel gilt auch für die private Ebene; ihre späteren Zugriffs-/Sichtbarkeitsregeln bleiben gesondert zu klären.
- Die automatische Zuordnung neuer Pins aus Grundentscheidung 7 bleibt unverändert.

## Grundentscheidung 9 – Sichtbarkeit von Ebenen auf der Karte

**Beschlossen (Variante A):** Mehrere Ebenen können gleichzeitig auf der Karte sichtbar sein. **Jede Ebene kann unabhängig ein- oder ausgeblendet werden.** Die aktuell aktive Ebene bestimmt, welcher Ebene neu angelegte Pins zugeordnet werden, nicht welche Pins sichtbar sind.

**Konsequenzen:**
- Sichtbarkeit und Aktivität sind getrennte Zustände mit klar unterscheidbarer Bedienung und Anzeige.
- Pins aller eingeblendeten Ebenen werden gemeinsam auf der Karte gezeigt; ausgeblendete Ebenen und ihre Pins bleiben unverändert gespeichert.
- Ein Pin gehört weiterhin genau einer Ebene (Grundentscheidung 1).
- Die aktive Ebene kann unabhängig von ihrer Sichtbarkeit ausgewählt sein; ein eventuell nötiger zusätzlicher Hinweis beim Setzen eines Pins auf einer ausgeblendeten Ebene wird gesondert entschieden.
- Die private Ebene ist Teil der Ebenenverwaltung; besondere Sichtbarkeits-/Zugriffsregeln bei späterer Serveranbindung bleiben separat zu klären.

## Grundentscheidung 10 – Ebenensichtbarkeit beim Neustart

**Beschlossen (Variante A):** pin2map speichert lokal für jede Ebene, ob sie sichtbar oder ausgeblendet ist, und stellt diese Auswahl beim erneuten Öffnen der PWA automatisch wieder her. **Neu angelegte Ebenen sind zunächst sichtbar.**

**Konsequenzen:**
- Der Sichtbarkeitszustand jeder Ebene wird lokal dauerhaft gespeichert.
- Das Öffnen oder Neuladen der PWA verändert die zuvor gewählte Ebenensichtbarkeit nicht.
- Neue Ebenen sind standardmäßig eingeblendet.
- Die Sichtbarkeit ist unabhängig von der aktiven Ebene (Grundentscheidungen 7–9).
- Ausgeblendete Pins bleiben unverändert gespeichert; es handelt sich nur um eine Anzeigeeinstellung.
- Ob beziehungsweise wie Anzeigeeinstellungen bei einer späteren Serveranbindung geräteübergreifend synchronisiert werden, bleibt eine gesonderte Entscheidung.

## Grundentscheidung 11 – Neuen Pin auf einer ausgeblendeten aktiven Ebene anlegen

**Beschlossen (Variante A):** Ist die aktuell aktive Ebene ausgeblendet, weist pin2map vor dem Anlegen eines neuen Pins sichtbar darauf hin und bietet an, diese Ebene einzublenden. Eine unsichtbare Pin-Anlage ohne bewusste Nutzerentscheidung ist ausgeschlossen.

**Konsequenzen:**
- Das Antippen der Karte zum Anlegen eines Pins auf einer ausgeblendeten aktiven Ebene löst zuerst einen verständlichen Hinweis mit der Möglichkeit zum Einblenden aus.
- Die Anwendung ändert den gespeicherten Sichtbarkeitszustand einer Ebene nicht ohne ausdrückliche Zustimmung.
- Bis zur bewussten Entscheidung wird kein neuer Pin gespeichert.
- Die Regel wahrt die Trennung von aktiver Ebene und sichtbaren Ebenen (Grundentscheidungen 7–10).
- Der genaue Ablauf weiterer Optionen im Hinweis kann bei der UI-Spezifikation präzisiert werden, ohne die bewusste Entscheidung zu unterlaufen.

## Grundentscheidung 12 – Bezeichnung neuer Ebenen

**Beschlossen (Variante A):** Beim Anlegen einer neuen regulären Ebene muss eine **nichtleere Bezeichnung** eingegeben werden. Die Bezeichnung kann später geändert werden.

**Konsequenzen:**
- Ohne einen Namen kann keine neue reguläre Ebene gespeichert werden; reine Leerzeichen gelten nicht als Name.
- Die Bezeichnung wird gemeinsam mit einer stabilen internen Ebenen-ID in IndexedDB gespeichert.
- Ein späteres Umbenennen verändert weder die Identität der Ebene noch die Zuordnung ihrer Pins.
- Die bereits beschlossene private Ebene wird unabhängig von der Benennung neu angelegter regulärer Ebenen bereitgestellt.
- Ob identische Namen verschiedener Ebenen erlaubt sind, wird in Grundentscheidung 13 geklärt.

## Grundentscheidung 13 – Eindeutigkeit von Ebenennamen

**Beschlossen (Variante A):** Jede reguläre Ebene muss innerhalb derselben Ebenenverwaltung eine **eindeutige Bezeichnung** besitzen.

**Konsequenzen:**
- Beim Anlegen und Umbenennen regulärer Ebenen wird geprüft, ob der Name bereits vergeben ist.
- Bei dieser Prüfung gelten Groß-/Kleinschreibung und führende bzw. nachfolgende Leerzeichen nicht als Unterscheidungsmerkmal (beispielsweise „Restaurants“ und „ restaurants “ sind gleichwertig).
- Ein Namenskonflikt wird verständlich angezeigt; das Anlegen oder Umbenennen wird erst mit einem eindeutigen Namen abgeschlossen.
- Die Identität der Ebene beruht weiterhin auf ihrer stabilen internen ID, nicht auf ihrem Namen. Pin-Zuordnungen bleiben beim Umbenennen unverändert.
- Die bereits vorhandene private Ebene und etwaige reservierte Namen werden im Rahmen ihrer Sonderregeln gesondert behandelt.

## Grundentscheidung 14 – Löschen einer Ebene mit vorhandenen Pins

**Beschlossen (Variante B):** Eine reguläre Ebene kann einschließlich aller ihr zugeordneten Pins gelöscht werden, **aber nur nach ausdrücklicher Bestätigung**. Vor der Bestätigung wird die **Anzahl der betroffenen Pins** verständlich angezeigt.

**Konsequenzen:**
- Beim Löschen einer regulären Ebene werden deren zugeordnete Pins mit erfasst; ein vorheriges Leeren der Ebene ist nicht erforderlich.
- Der Bestätigungsdialog benennt die Ebene, die Anzahl betroffener Pins und die Konsequenz der Löschung deutlich.
- Ein Abbrechen des Dialogs verändert weder Ebene noch Pins.
- Erst nach Bestätigung werden die Ebene und ihre Pins zusammen als eine konsistente lokale Operation in IndexedDB gelöscht; bei einem Fehler darf kein inkonsistenter Teilzustand zurückbleiben.
- Eine unbeabsichtigte Löschung durch bloßes Antippen der Löschfunktion ist ausgeschlossen.
- Löschung, mögliche Wiederherstellung und spätere Synchronisation werden bei der Serverintegration weiter spezifiziert; hier wird noch keine Undo- oder Papierkorb-Funktion beschlossen.
- Die fest vorgesehene private Ebene ist von dieser Entscheidung ausdrücklich ausgenommen; ihre Löschbarkeit wird separat festgelegt.

## Grundentscheidung 15 – Löschbarkeit der privaten Ebene

**Beschlossen (Variante A):** Die private Ebene ist eine **dauerhaft vorhandene, nicht löschbare Systemebene**. Sie gehört von Anfang an zur Basisversion.

**Konsequenzen:**
- Die private Ebene wird beim Initialisieren der lokalen Datenhaltung zuverlässig bereitgestellt; es darf nicht versehentlich eine zweite private Systemebene erzeugt werden.
- Für die private Ebene wird keine Aktion zum Löschen angeboten. Auch die Fachlogik verhindert ihre Löschung.
- Ihre Pins können wie andere Pins angelegt, angezeigt, bearbeitet, verschoben und einzeln gelöscht werden.
- Die Bestätigung zum Löschen einer regulären Ebene einschließlich aller Pins (Grundentscheidung 14) gilt **nicht** für die private Ebene.
- Der Sonderstatus wird über eine stabile interne Identität bzw. einen Systemtyp abgebildet, nicht nur über einen Namen.
- Die Festlegung ihrer Bezeichnung und Umbenennbarkeit ist noch offen.

## Grundentscheidung 16 – Bezeichnung der privaten Ebene

**Beschlossen (Variante A):** Die dauerhaft vorhandene private Systemebene trägt den festen Namen **„Privat“** und kann nicht umbenannt werden.

**Konsequenzen:**
- Die private Ebene wird als feste Systemebene mit dem Anzeigenamen „Privat“ bereitgestellt.
- Das Umbenennen der privaten Ebene ist in der Oberfläche nicht verfügbar und wird auch von der Fachlogik verhindert.
- Ihr Status wird durch ihre stabile interne Kennzeichnung/Identität gesichert, nicht durch einen bloßen Namensvergleich.
- Der Name „Privat“ ist für die Systemebene reserviert und kann nicht für eine reguläre Ebene verwendet werden; die Eindeutigkeitsregel aus Grundentscheidung 13 bleibt gewahrt.
- Die private Ebene bleibt nicht löschbar (Grundentscheidung 15). Ihre Pins können weiterhin bearbeitet und einzeln gelöscht werden.

## Grundentscheidung 17 – Anfängliche Sichtbarkeit der privaten Ebene

**Beschlossen (Variante A):** Die Systemebene **„Privat“ ist beim ersten Start sichtbar**. Anschließend kann sie wie andere Ebenen ein- und ausgeblendet werden. Die zuletzt eingestellte Sichtbarkeit wird lokal gespeichert und beim nächsten Start wiederhergestellt (Grundentscheidung 10).

**Konsequenzen:**
- Die private Ebene wird beim erstmaligen Initialisieren standardmäßig als sichtbar angelegt.
- Eine spätere bewusste Änderung der Sichtbarkeit bleibt über Neuladen und Neustarts hinweg erhalten.
- Die Sichtbarkeit sagt nichts über die aktive Ebene aus; eine Auswahl als Zielebene zum Pin-Anlegen bleibt erforderlich (Grundentscheidungen 7 und 8).
- Sichtbarkeit auf der Karte bedeutet nicht Freigabe privater Daten für andere Benutzer oder Geräte. Zugriffs- und Synchronisationsregeln werden gesondert festgelegt.
- Ihre Bezeichnung „Privat“ ist fest (Grundentscheidung 16); sie bleibt nicht löschbar (Grundentscheidung 15).

## Grundentscheidung 18 – Ebenen beim ersten Start

**Beschlossen (Variante A, mit ausdrücklich angepasster Bezeichnung):** Beim erstmaligen Initialisieren von pin2map werden zwei Ebenen angelegt:

1. **„Privat“** – feste, nicht löschbare und nicht umbenennbare Systemebene.
2. **„Ebene 1“** – reguläre Ebene, die umbenannt und nach ausdrücklicher Bestätigung auch einschließlich ihrer Pins gelöscht werden kann.

**„Ebene 1“ ersetzt ausdrücklich den ursprünglich vorgeschlagenen Namen „Standard“.**

**Konsequenzen:**
- Beide Ebenen sind beim ersten Start sichtbar; ihre später eingestellte Sichtbarkeit wird lokal wiederhergestellt.
- Keine Ebene wird beim ersten Start automatisch als aktive Zielebene vorausgewählt, solange noch keine frühere Auswahl existiert (Grundentscheidung 8).
- Die initiale Einrichtung erfolgt nur einmal; spätere App-Starts dürfen die reguläre Ebene „Ebene 1“ nicht erneut erzeugen oder vom Benutzer vorgenommene Änderungen rückgängig machen.
- Die reguläre Ebene erhält wie jede andere Ebene eine stabile interne ID und unterliegt den Regeln eindeutiger Ebenennamen.

## Grundentscheidung 19 – Namensvorschlag für weitere reguläre Ebenen

**Beschlossen (Variante A):** Beim Anlegen einer weiteren regulären Ebene wird im Namensfeld ein **freier fortlaufender Name** (z. B. „Ebene 2“, „Ebene 3“ usw.) vorausgefüllt. Der Benutzer darf den Vorschlag vor dem Speichern frei ändern.

**Konsequenzen:**
- Der automatisch vorgeschlagene Name ist nur ein editierbarer Vorschlag und wird nicht ohne bewusste Bestätigung gespeichert.
- Als Vorschlag wird ein noch nicht belegter Name des Musters „Ebene N“ gewählt. Die Regel eindeutig benannter Ebenen aus Grundentscheidung 13 gilt ebenso beim Speichern.
- Bei einer Kollision durch zwischenzeitliche Änderungen muss ein neuer eindeutiger Name gewählt werden.
- Reguläre Ebenen können später umbenannt werden; die stabile interne Ebenen-ID und Pin-Zuordnungen ändern sich dadurch nicht.
- Die feste Systemebene „Privat“ bleibt von diesen Vorschlägen ausgenommen.

## Grundentscheidung 20 – Reihenfolge der Ebenen in der Ebenenverwaltung

**Beschlossen (Variante A):** Die Systemebene **„Privat“ steht immer ganz oben**. Darunter erscheinen die regulären Ebenen **in ihrer Anlegereihenfolge**.

**Konsequenzen:**
- Die Systemebene „Privat“ wird stets an erster Stelle dargestellt, unabhängig von ihrem Anlagezeitpunkt.
- Reguläre Ebenen werden anhand einer stabilen Anlegereihenfolge angezeigt; eine spätere Umbenennung verändert ihre Position nicht.
- Die Anlegereihenfolge bleibt über Neuladen und Neustarts der PWA erhalten.
- Neue reguläre Ebenen werden am Ende der Liste ergänzt.
- Eine manuelle Umsortierung gehört zunächst nicht zum beschlossenen Funktionsumfang und kann später gesondert entschieden werden.
- Das Löschen einer Ebene verändert nicht die relative Reihenfolge der verbleibenden regulären Ebenen.

## Grundentscheidung 21 – Pin-Liste in der Basisversion

**Beschlossen (Variante A):** Die erste stabile lokale Basisversion zeigt Pins **auf der Karte** an; Pins werden durch Antippen auf der Karte ausgewählt und bearbeitet. **Eine zusätzliche Pin-Liste ist nicht Bestandteil der Basisversion** und kann später ergänzt werden.

**Konsequenzen:**
- Die Kartenansicht ist der zentrale Zugang zu Pins.
- Die bereits beschlossenen Grundfunktionen (Anlegen, Anzeigen, Bearbeiten, Verschieben und Löschen) bleiben vollständig erhalten.
- Für die erste Basisversion ist keine separate Auflistung aller Pins und keine Navigation über eine Pin-Liste erforderlich.
- Die Architektur darf die spätere Ergänzung einer Pin-Liste nicht unnötig erschweren.
- Die Entscheidung betrifft nur den Umfang der Basisversion und verbietet eine spätere Pin-Liste nicht.

## Grundentscheidung 22 – Kartenausschnitt beim erneuten Öffnen

**Beschlossen (Variante A):** pin2map speichert den zuletzt verwendeten **Kartenausschnitt einschließlich Zoomstufe** lokal und stellt ihn beim erneuten Öffnen der PWA wieder her.

**Konsequenzen:**
- Kartenzentrum und Zoomstufe werden lokal als Anzeigeeinstellungen gespeichert.
- Neuladen und erneutes Öffnen der Anwendung stellen die letzte gültige Kartenposition und Vergrößerung wieder her.
- Die Speicherung der Kartenansicht ist von der Speicherung der Pins und Ebenen getrennt; eine Änderung der Ansicht verändert keine Pin-Koordinaten.
- Beim erstmaligen Start ohne gespeicherte Kartenansicht wird ein festzulegender initialer Kartenausschnitt verwendet.
- Sollte ein gespeicherter Kartenausschnitt ungültig sein, wird ein gültiger Startausschnitt verwendet; bestehende Pins bleiben unberührt.
- Ob Kartenansichtseinstellungen zwischen Geräten synchronisiert werden, wird später getrennt entschieden.

## Grundentscheidung 23 – Kartenausschnitt beim allerersten Start

**Beschlossen (Variante A):** Wenn noch keine Kartenansicht gespeichert ist, startet pin2map mit einem **festen, neutralen Kartenausschnitt und einer voreingestellten Zoomstufe**. Es wird beim ersten Start **keine Standortberechtigung angefragt**.

**Konsequenzen:**
- Die Anwendung ist beim ersten Start ohne Standortfreigabe nutzbar.
- Die konkreten Startkoordinaten und die Zoomstufe werden bei der Umsetzung festgelegt; sie sind mit dieser Entscheidung noch nicht beschlossen.
- Sobald der Benutzer die Kartenansicht verändert, wird der zuletzt verwendete Ausschnitt gemäß Grundentscheidung 22 lokal gespeichert und beim Neustart wiederhergestellt.
- Ein späteres optionales Zentrieren auf den Gerätestandort bleibt möglich, bedarf aber einer gesonderten Entscheidung.
- Ist eine gespeicherte Kartenansicht unbrauchbar, kann der feste Startausschnitt als sicherer Rückfall dienen.

## Grundentscheidung 24 – Grundbedienung der Karte in der Basisversion

**Beschlossen (Variante A):** Die erste stabile Basisversion unterstützt das **Verschieben der Karte per Finger oder Maus**, das **Zoomen über Touch-Gesten beziehungsweise Mausrad** sowie **sichtbare Plus- und Minus-Zoomtasten**.

**Konsequenzen:**
- Kartennavigation funktioniert auf mobilen Touch-Geräten und am Desktop.
- Sichtbare Schaltflächen „+“ und „−“ ermöglichen eine Bedienung ohne Pinch-Geste oder Mausrad.
- Zoomen und Verschieben ändern den Kartenausschnitt, ohne Pin-Koordinaten oder die Zuordnung zu Ebenen zu verändern.
- Der zuletzt eingestellte Kartenausschnitt einschließlich Zoomstufe wird gemäß Grundentscheidung 22 lokal gespeichert.
- Die genaue Positionierung und Darstellung der Zoomtasten ist Sache der späteren UI-Umsetzung; der bestehende PoC kann als Gestaltungsreferenz dienen, ohne dessen Programmcode zu übernehmen.

## Grundentscheidung 25 – Bewusstes Anlegen von Pins auf der Karte

**Beschlossen (Variante A):** Ein neuer Pin wird ausschließlich nach bewusster Aktivierung des Modus **„Pin hinzufügen“** durch anschließendes Antippen einer Kartenposition angelegt. Ein normales Antippen einer freien Kartenstelle außerhalb dieses Modus legt keinen Pin an.

**Konsequenzen:**
- Die Benutzeroberfläche bietet eine erkennbare Funktion zum Aktivieren des Modus „Pin hinzufügen“.
- Der aktive Modus ist visuell erkennbar, und es gibt eine Möglichkeit, das Anlegen abzubrechen.
- Erst nach bewusster Aktivierung kann das Antippen einer Kartenposition den Anlagevorgang auslösen.
- Kartennavigation (Verschieben, Zoomen) bleibt von der Anlage eines Pins unterscheidbar; das Ziehen der Karte löst keine Pin-Erstellung aus.
- Die Zuordnung erfolgt zur aktiven Ebene gemäß Grundentscheidung 7. Ist keine Ebene ausgewählt oder die aktive Ebene ausgeblendet, gelten die zuvor festgelegten Schutzregeln aus Grundentscheidungen 7 und 11.
- Wann der Modus nach einer Pin-Erstellung endet oder fortgesetzt wird, wird in Grundentscheidung 26 festgelegt.

## Offen – Grundentscheidung 26: Verhalten des Modus „Pin hinzufügen“ nach einer Erstellung

- **Variante A (Empfehlung):** Nach erfolgreichem Anlegen eines Pins wird der Modus automatisch beendet. Für den nächsten Pin muss „Pin hinzufügen“ erneut aktiviert werden. Dies verringert die Gefahr unbeabsichtigter weiterer Pins.
- **Variante B:** Der Modus bleibt nach dem Anlegen eines Pins aktiv. Es können mehrere Pins hintereinander gesetzt werden, bis der Benutzer den Modus ausdrücklich beendet. Dies erleichtert das Erfassen vieler Pins.

**Status:** Grundentscheidung 26 ist offen und noch nicht beschlossen.
