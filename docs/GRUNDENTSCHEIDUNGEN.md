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

## Grundentscheidung 26 – Beenden des Pin-hinzufügen-Modus

**Beschlossen (Variante A):** Nach dem **erfolgreichen Anlegen eines Pins** wird der Modus „Pin hinzufügen“ **automatisch beendet**. Die Anwendung kehrt zur normalen Kartenbedienung zurück.

**Konsequenzen:**
- Für jeden weiteren neuen Pin muss der Benutzer den Modus „Pin hinzufügen“ erneut bewusst aktivieren.
- Das Ende des Modus ist in der Oberfläche erkennbar; normales Antippen freier Kartenstellen erzeugt anschließend keine Pins.
- Eine unterbrochene oder abgebrochene Anlage zählt nicht als erfolgreiche Erstellung und darf keinen unvollständigen Pin speichern.
- Die Regeln für aktive bzw. ausgeblendete Ebenen (Grundentscheidungen 7 und 11) gelten weiter.
- Ein späterer optionaler Mehrfacherfassungsmodus ist durch diese Entscheidung nicht Bestandteil der ersten Basisversion.

## Grundentscheidung 27 – Sofortiges Speichern eines neuen Pins

**Beschlossen (Variante A):** Nach dem Antippen einer Kartenposition im aktivierten Modus „Pin hinzufügen“ wird ein neuer Pin **sofort lokal in IndexedDB gespeichert**, mit seinen Koordinaten, einer stabilen internen ID und der Zuordnung zur aktiven Ebene. Eine Bezeichnung ist nicht erforderlich und kann später ergänzt werden.

**Konsequenzen:**
- Nach erfolgreichem Speichern wird der Pin auf der Karte angezeigt und der Modus „Pin hinzufügen“ gemäß Grundentscheidung 26 automatisch beendet.
- Es erscheint kein obligatorischer Namens- oder Bestätigungsdialog.
- Die Regeln zur aktiven Ebene (Grundentscheidung 7) und für ausgeblendete aktive Ebenen (Grundentscheidung 11) gelten weiterhin und müssen vor dem eigentlichen Speichern erfüllt sein.
- Schlägt das Speichern fehl, darf kein vermeintlich dauerhaft angelegter Pin angezeigt werden; der Fehler muss erkennbar sein.
- Die Möglichkeit, den Pin später zu bearbeiten und zu verschieben, bleibt erhalten.

## Grundentscheidung 28 – Automatische Auswahl eines neu angelegten Pins

**Beschlossen (Variante A):** Nach dem erfolgreichen lokalen Speichern wird ein neuer Pin automatisch ausgewählt und seine einfache Bearbeitungsansicht geöffnet. Dort kann insbesondere die optionale Bezeichnung sofort ergänzt werden.

**Konsequenzen:**
- Das Anlegen bleibt gemäß Grundentscheidung 27 unmittelbar und ohne vorausgehenden Eingabedialog möglich.
- Der Modus „Pin hinzufügen“ ist nach erfolgreicher Speicherung beendet (Grundentscheidung 26), auch während die Bearbeitungsansicht geöffnet ist.
- Die Bearbeitungsansicht kann ohne weitere Eingaben geschlossen werden; der bereits gespeicherte Pin bleibt dabei erhalten.
- Ein neu angelegter Pin ist deutlich als ausgewählt erkennbar.
- Der konkrete Speichervorgang für nachträgliche Änderungen in der Bearbeitungsansicht wird mit Grundentscheidung 29 festgelegt.

## Grundentscheidung 29 – Automatisches Speichern nachträglicher Pin-Änderungen

**Beschlossen (Variante B):** Änderungen an Eingabefeldern bestehender Pins werden **automatisch lokal in IndexedDB gespeichert**, beispielsweise nach dem Verlassen des jeweiligen Feldes. Ein gesonderter „Speichern“-Button ist nicht erforderlich.

**Konsequenzen:**
- In der Pin-Bearbeitungsansicht ist keine ausdrückliche Speicherbestätigung für Änderungen an Eingabefeldern notwendig.
- Die Benutzeroberfläche muss einen fehlgeschlagenen Speichervorgang erkennbar melden; Änderungen dürfen nicht fälschlich als dauerhaft gesichert erscheinen.
- Beim Schließen der Bearbeitungsansicht müssen noch ausstehende Eingaben verlässlich übernommen beziehungsweise ein Speicherproblem deutlich gemacht werden.
- Die automatische Speicherung gilt für die nachträgliche Eingabefeld-Bearbeitung; das erstmalige sofortige Anlegen aus Grundentscheidung 27 bleibt unverändert.
- Das Verschieben von Pins auf der Karte wird gesondert festgelegt.
- **Entscheidungsverlauf:** Die zuvor im Chat erklärte Wahl von Variante A wurde ausdrücklich durch die spätere Wahl von Variante B ersetzt; verbindlich ist ausschließlich Variante B.

## Grundentscheidung 30 – Bewusster Verschiebemodus für Pins

**Beschlossen (Variante A):** Das Verschieben eines vorhandenen Pins beginnt ausschließlich durch bewusstes Aktivieren der Funktion **„Pin verschieben“** in seiner Bearbeitungsansicht. Anschließend kann eine neue Position auf der Karte gewählt werden. Das normale Ziehen oder Antippen der Karte darf ohne diesen Modus keine Pin-Koordinaten verändern.

**Konsequenzen:**
- Die Verschiebefunktion ist eindeutig dem ausgewählten Pin zugeordnet.
- Während des Verschiebens ist der Zustand visuell erkennbar; der Vorgang kann abgebrochen werden.
- Die übliche Kartennavigation darf nicht versehentlich einen Pin verschieben.
- Die interne Pin-ID und seine Zuordnung zu genau einer Ebene bleiben beim Verschieben unverändert.
- Wie eine neu gewählte Position verbindlich übernommen wird, ist Gegenstand von Grundentscheidung 31.

## Grundentscheidung 31 – Neue Pin-Position bewusst übernehmen

**Beschlossen (Variante A):** Nach dem Auswählen einer neuen Kartenposition im bewusst aktivierten Verschiebemodus wird die neue Position zunächst **nur als Vorschau** angezeigt. Die neuen Koordinaten werden erst nach ausdrücklichem Antippen von **„Position übernehmen“** dauerhaft in IndexedDB gespeichert. **„Abbrechen“** verwirft die Vorschau und belässt den Pin an seiner ursprünglichen Position.

**Konsequenzen:**
- Eine Positionsvorschau verändert keine dauerhaft gespeicherten Pin-Koordinaten.
- Erst die erfolgreiche Übernahme aktualisiert die Koordinaten in IndexedDB; danach endet der Verschiebevorgang.
- Bei Abbruch oder fehlgeschlagenem Speichern bleibt die bislang gespeicherte Position gültig. Ein Speicherfehler wird sichtbar angezeigt.
- Die stabile Pin-ID und die Ebenenzugehörigkeit bleiben unverändert.
- Die automatische Speicherung von Eingabefeldern gemäß Grundentscheidung 29 gilt weiterhin, führt jedoch nicht zur automatischen Übernahme von Positionsänderungen.
- Die Darstellung der bisherigen und der neuen Position während der Vorschau ist Gegenstand von Grundentscheidung 32.

## Grundentscheidung 32 – Alte und neue Pin-Position gleichzeitig anzeigen

**Beschlossen (Variante A):** Während der Vorschau einer Pin-Verschiebung werden **die bisherige und die neu vorgeschlagene Position gleichzeitig auf der Karte angezeigt**. Beide Markierungen sind visuell eindeutig unterscheidbar.

**Konsequenzen:**
- Die bisherige Position bleibt während des Verschiebevorgangs als eigene Markierung erkennbar.
- Die neue Position wird als Vorschau-Pin gezeigt; vor der ausdrücklichen Übernahme werden keine gespeicherten Koordinaten geändert (Grundentscheidung 31).
- Nach erfolgreicher Übernahme erscheint nur die neue reguläre Pin-Position; nach Abbruch nur die unveränderte bisherige Position.
- Die beiden Markierungen sind lediglich Ansichten desselben Pins; es wird niemals ein zweiter dauerhafter Pin erzeugt.
- Die konkrete visuelle Kennzeichnung der beiden Positionen wird in der UI-Umsetzung gestaltet.

## Grundentscheidung 33 – Verbindungslinie zwischen bisheriger und neuer Pin-Position

**Beschlossen (Variante A):** Während der Vorschau einer Pin-Verschiebung verbindet eine **gut erkennbare Linie** die bisherige mit der vorgeschlagenen neuen Position auf der Karte.

**Konsequenzen:**
- Beide Positionen bleiben gleichzeitig und eindeutig unterscheidbar sichtbar (Grundentscheidung 32).
- Die Verbindungslinie verdeutlicht Richtung und Ausmaß der geplanten Verschiebung und wird beim Ändern der Vorschauposition entsprechend aktualisiert.
- Die Linie ist ausschließlich eine temporäre Darstellung, kein dauerhaft gespeichertes Kartenobjekt.
- Nach erfolgreichem „Position übernehmen“ oder nach „Abbrechen“ verschwindet die Linie zusammen mit der temporären Vorschau.
- Die bisherigen Koordinaten werden erst nach ausdrücklicher Übernahme geändert (Grundentscheidung 31).

## Grundentscheidung 34 – Wiederholtes Korrigieren der Verschiebevorschau

**Beschlossen (Variante A):** Während der Verschiebemodus aktiv ist, kann die vorgeschlagene neue Position durch erneutes Antippen einer Kartenposition **beliebig oft verändert** werden. Die bisherige Position bleibt unverändert, und Vorschau-Pin sowie Verbindungslinie werden bei jeder Änderung aktualisiert.

**Konsequenzen:**
- Jede neue Auswahl einer Kartenposition ersetzt lediglich die vorherige Vorschauposition und speichert keine neuen Pin-Koordinaten.
- Die ursprüngliche Position bleibt bis zur ausdrücklichen Bestätigung sichtbar und erhalten (Grundentscheidungen 31–33).
- „Position übernehmen“ speichert ausschließlich die zuletzt vorgeschlagene Position in IndexedDB.
- „Abbrechen“ verwirft die gesamte Vorschau unabhängig davon, wie oft die Position zuvor geändert wurde.
- Die ID und Ebenenzugehörigkeit des Pins bleiben erhalten.

## Grundentscheidung 35 – Vorschau-Pin direkt verschieben

**Beschlossen (Variante A):** Während des bewusst aktivierten Modus „Pin verschieben“ lässt sich der Vorschau-Pin zusätzlich zum Festlegen einer neuen Position durch Antippen der Karte **direkt per Finger oder Maus ziehen**, um die vorgeschlagene Position präzise zu korrigieren.

**Konsequenzen:**
- Direktes Ziehen eines Pins ist ausschließlich im aktiven Verschiebemodus für den jeweiligen Vorschau-Pin möglich. Außerhalb dieses Modus ist Ziehen keine Pin-Positionsänderung.
- Die ursprüngliche Position bleibt sichtbar und unverändert gespeichert. Die Verbindungslinie zwischen ursprünglicher Position und Vorschauposition wird während des Ziehens aktualisiert (Grundentscheidungen 32 und 33).
- Erneutes Antippen der Karte kann die Position ebenfalls beliebig oft korrigieren (Grundentscheidung 34).
- Erst nach ausdrücklichem „Position übernehmen“ werden die zuletzt gewählten Koordinaten dauerhaft in IndexedDB gespeichert (Grundentscheidung 31). „Abbrechen“ verwirft die Vorschau.
- Die stabile Pin-ID sowie die Zuordnung zu genau einer Ebene bleiben unverändert.

## Grundentscheidung 36 – Einzelne Pins nur nach Bestätigung löschen

**Beschlossen (Variante A):** Nach dem Auslösen von **„Pin löschen“** erscheint eine ausdrückliche **Bestätigungsabfrage**. Erst nach bewusster Bestätigung wird der einzelne Pin aus der lokalen IndexedDB gelöscht.

**Konsequenzen:**
- Der Dialog macht klar, welcher Pin gelöscht wird. Ist keine Bezeichnung vorhanden, wird der Pin anderweitig eindeutig erkennbar gemacht.
- Ein Abbrechen lässt Pin, Koordinaten, Bezeichnung und Ebenenzuordnung unverändert.
- Vor der Bestätigung wird kein Pin gelöscht; die Löschung wird konsistent lokal durchgeführt und ein Fehler sichtbar gemeldet.
- Die Regel gilt auch für Pins der festen privaten Ebene „Privat“; die Ebene selbst bleibt erhalten.
- Die Löschung ganzer regulärer Ebenen samt Pins folgt weiterhin Grundentscheidung 14.
- Eine spätere Papierkorb-, Wiederherstellungs- oder Synchronisationsregel ist hiermit noch nicht beschlossen.

## Grundentscheidung 37 – Kein Papierkorb in der ersten Basisversion

**Beschlossen (Variante B):** Nach der ausdrücklich bestätigten Löschung eines einzelnen Pins wird der Pin lokal aus IndexedDB gelöscht. Die **erste lokale Basisversion enthält weder einen Papierkorb noch eine Rückgängig-Funktion** für solche Löschungen.

**Konsequenzen:**
- Die Sicherheitsabfrage vor dem Löschen aus Grundentscheidung 36 ist verbindlich; erst nach Bestätigung darf der Pin gelöscht werden.
- Die Benutzeroberfläche darf keine Wiederherstellung versprechen, solange diese nicht implementiert ist.
- Ein bestätigtes Löschen eines Pins entfernt ihn aus dem aktiven lokalen Datenbestand; eine eingebaute Wiederherstellung ist in der Basisversion nicht vorgesehen.
- Die besonderen Anforderungen an spätere Server-Synchronisation, Datensicherung und Wiederherstellung bleiben gesondert zu entscheiden, bevor der Zwei-Geräte-Test beginnt.
- Die Löschung einer regulären Ebene einschließlich ihrer Pins folgt weiterhin Grundentscheidung 14.

## Grundentscheidung 38 – Manueller Datenexport in der lokalen Basisversion

**Beschlossen (Variante A):** Bereits die erste stabile lokale Basisversion bietet einen **manuell auslösbaren Export der Pins und Ebenen in eine Datei**. Damit lassen sich die lokalen Daten außerhalb des Browsers sichern, noch bevor die Serveranbindung umgesetzt wird.

**Konsequenzen:**
- Der Export umfasst den aktuellen gespeicherten Bestand der Pins samt Koordinaten, optionalen Bezeichnungen, internen IDs und Ebenenzuordnungen sowie die für die Interpretation nötigen Ebenendaten einschließlich der Systemebene „Privat“.
- Der Export wird ausschließlich nach bewusster Nutzeraktion gestartet; er löscht oder verändert keine lokalen Daten.
- Die Datei muss ein dokumentiertes, versioniertes Datenformat verwenden, damit sie später verlässlich eingelesen werden kann. Das konkrete Exportformat wird gesondert festgelegt.
- Die Exportfunktion benötigt keine Serververbindung.
- Der Benutzer muss die exportierte Datei selbst außerhalb der Browserdaten aufbewahren; ein Export allein ist noch keine automatische Datensicherung.
- Ein Import bzw. eine Wiederherstellung aus der Datei ist durch diesen Beschluss noch **nicht** zugesichert und wird in Grundentscheidung 39 entschieden.
- Löschbestätigungen und der Verzicht auf einen Papierkorb aus Grundentscheidungen 36 und 37 bleiben unverändert.

## Grundentscheidung 39 – Manueller Import bereits in der lokalen Basisversion

**Beschlossen (Variante A):** Die erste stabile lokale Basisversion bietet zusätzlich zum manuellen Export (Grundentscheidung 38) einen **manuell auslösbaren Import gültiger pin2map-Sicherungsdateien**. Vor jeder Übernahme werden Datei und Datenstruktur geprüft.

**Konsequenzen:**
- Export und Import können vollständig lokal und ohne Serveranbindung verwendet werden.
- Die Importfunktion prüft insbesondere Dateiformat und Formatversion, erforderliche Datensätze, gültige Pin-Koordinaten, eindeutige IDs und gültige Zuordnungen der Pins zu genau einer Ebene.
- Die feste private Systemebene „Privat“ muss in ihrem Sonderstatus gewahrt bleiben; Importdaten dürfen keine zweite private Systemebene erzeugen oder deren Nichtlöschbarkeit aushebeln.
- Ungültige beziehungsweise nicht unterstützte Sicherungsdateien werden mit verständlicher Fehlermeldung zurückgewiesen und dürfen den bestehenden Datenbestand nicht verändern.
- Wie gültige Importdaten mit bereits vorhandenen Daten zusammengeführt oder an deren Stelle übernommen werden, wird ausdrücklich in Grundentscheidung 40 festgelegt. Bis dahin ist **kein automatisches Überschreiben oder Zusammenführen** beschlossen.
- Die Datenübernahme muss nach Festlegung der Importstrategie konsistent erfolgen und auch bei Fehlern den vorhandenen Datenbestand schützen.

## Grundentscheidung 40 – Importmodus auswählen; beim Hinzufügen neue Ebene anlegen

**Beschlossen (Variante C mit Ergänzung):** Bei jedem manuellen Import einer gültigen pin2map-Sicherungsdatei wählt der Benutzer ausdrücklich zwischen **„Ersetzen“** und **„Hinzufügen“**.

- **Ersetzen:** Nach Vorschau und ausdrücklicher Bestätigung wird der bestehende lokale Datenbestand durch die gültigen Importdaten ersetzt. Die Übernahme erfolgt konsistent; bei Fehlern darf kein teilweiser Ersatz entstehen.
- **Hinzufügen:** Die bereits vorhandenen Pins und Ebenen bleiben unverändert bestehen. Für die hinzugefügten Daten wird **automatisch eine neue reguläre Ebene** angelegt. Importierte Objekte dürfen keine bestehenden Objekte stillschweigend überschreiben.

**Verbindliche Konsequenzen:**
- Vor dem Import werden Datei, Formatversion und Daten auf Gültigkeit geprüft. Vor der eigentlichen Übernahme wird die gewählte Methode und deren Auswirkung angezeigt und bewusst bestätigt.
- „Hinzufügen“ legt eine **neue Ebene** an, statt importierte Pins ungefragt einer bereits vorhandenen Ebene zuzuordnen. Die Zuordnung jedes Pins zu genau einer Ebene bleibt gewahrt.
- Der Name der neuen Ebene muss die Regel der eindeutigen regulären Ebenennamen erfüllen. Die feste Systemebene „Privat“ darf weder dupliziert noch überschrieben oder in ihrem Systemstatus verändert werden.
- ID-Kollisionen und die Behandlung von gegebenenfalls mehreren Ebenen in der Importdatei müssen ohne Datenverlust und ohne stillschweigende Überschreibung gelöst werden; die genaue Abbildung der importierten Ebenen auf die neue Ebene wird in Grundentscheidung 41 entschieden.
- Das lokale Importieren darf keine Serververbindung voraussetzen und muss nach erfolgreicher Prüfung und Bestätigung konsistent erfolgen.
- Bei „Ersetzen“ muss vorab auf einen möglichen Export des bisherigen Bestands hingewiesen werden.

## Grundentscheidung 41 – Beim Hinzufügen alle importierten Pins einer neuen Ebene zuordnen

**Beschlossen (Variante A):** Wird beim Import die Option **„Hinzufügen“** ausgewählt, legt pin2map automatisch **genau eine neue reguläre Ebene** an und ordnet **alle importierten Pins** dieser neuen Ebene zu – unabhängig davon, zu welchen Ebenen die Pins innerhalb der Sicherungsdatei ursprünglich gehörten.

**Konsequenzen:**
- Alle schon vorhandenen Pins und Ebenen bleiben unverändert; die Systemebene „Privat“ wird weder verändert noch dupliziert.
- Die ursprüngliche Ebenenstruktur der Importdatei wird bei „Hinzufügen“ nicht als neue Ebenenstruktur übernommen. Die ursprünglichen Ebenennamen werden nicht als eigenständige Ebenen angelegt.
- Jeder hinzugefügte Pin gehört genau der einen neu angelegten regulären Ebene an (Grundentscheidung 1).
- IDs importierter Pins werden bei Bedarf kollisionsfrei neu vergeben, ohne bestehende Pins zu überschreiben.
- Vor der Bestätigung weist die Anwendung verständlich darauf hin, dass alle importierten Pins in einer gemeinsamen neuen Ebene landen.
- Die Übernahme der neuen Ebene und aller importierten Pins erfolgt konsistent: Bei einem Fehler bleiben die bisherigen Daten unverändert und es entsteht kein unvollständiger Import.
- Für „Ersetzen“ bleibt die Struktur des gültigen Sicherungsbestands maßgeblich (Grundentscheidungen 39 und 40).

## Grundentscheidung 42 – Dateiname als automatisch vergebener Name der Importebene

**Beschlossen (Variante B, ausdrücklich angepasst):** Beim Importmodus **„Hinzufügen“** wird die genau eine neue reguläre Ebene **ohne vorherige Namenseingabe automatisch nach der zu importierenden Datei benannt**. Maßgeblich ist der Dateiname ohne die Dateiendung (z. B. `Ausflug.json` → „Ausflug“), nicht das zuvor vorgeschlagene Schema „Import 1“.

**Konsequenzen:**
- Der Dateiname wird als lesbarer Ebenenname übernommen; die Dateiendung wird entfernt, um Dateiformat und Ebenenbezeichnung zu trennen.
- Die Regeln für reguläre Ebenennamen gelten weiterhin: kein leerer Name, keine Dopplung nach trim- und groß-/kleinschreibungsunabhängigem Vergleich und kein reserviertes „Privat“ (Grundentscheidungen 12, 13 und 16).
- Um die automatische Anlage ohne zusätzliche Namensabfrage zu gewährleisten, wird bei Konflikten ein **eindeutiger nummerierter Zusatz** angehängt (z. B. „Ausflug (2)“); ist der Dateiname leer oder unbrauchbar, wird ein eindeutiger Ersatzname wie „Import 1“ gewählt.
- Die Ebene kann nach dem Import über die normale Ebenenverwaltung umbenannt werden.
- Alle importierten Pins werden dieser einzigen neuen Ebene zugeordnet, bestehende Pins und Ebenen bleiben unverändert (Grundentscheidung 41).
- Der Import selbst bleibt vor der Datenübernahme bewusst zu bestätigen (Grundentscheidung 40).

## Grundentscheidung 43 – Kartenausschnitt nach dem Hinzufügen automatisch auf importierte Pins einstellen

**Beschlossen (Variante A):** Nach einem erfolgreichen Import im Modus **„Hinzufügen“** stellt pin2map die Karte automatisch so ein, dass **alle gerade hinzugefügten Pins sichtbar** sind.

**Konsequenzen:**
- Die Karte verschiebt und zoomt den Ausschnitt passend zur geografischen Ausdehnung der neu importierten Pins; ein angemessener Kartenrand vermeidet abgeschnittene Markierungen.
- Die automatisch neu angelegte Importebene ist sichtbar (Grundentscheidungen 10 und 41), sodass die importierten Pins unmittelbar geprüft werden können.
- Die automatische Anpassung erfolgt **erst nach erfolgreich abgeschlossener Datenübernahme**. Bei Abbruch, ungültiger Datei oder Importfehler bleibt der bisherige Kartenausschnitt unverändert.
- Enthält die importierte Datei keine Pins, erfolgt keine positionsabhängige Kartenanpassung.
- Nach der erfolgreichen Anpassung gilt die neue Kartenansicht als letzte Ansicht und wird gemäß Grundentscheidung 22 lokal gespeichert.
- Für den Importmodus „Ersetzen“ wird mit dieser Entscheidung keine automatische Kartenausschnitt-Anpassung festgelegt.

## Grundentscheidung 44 – Aktive Ebene nach dem Hinzufügen beibehalten

**Beschlossen (Variante B):** Nach einem erfolgreichen Dateiimport mit **„Hinzufügen“** bleibt die zuvor aktive Ebene unverändert aktiv. Die neu angelegte Importebene wird **nicht automatisch zur aktiven Ebene**.

**Konsequenzen:**
- Die neue Importebene wird angelegt und sichtbar geschaltet, alle importierten Pins werden ihr zugeordnet (Grundentscheidungen 41 und 43).
- Die bisherige aktive Ebene bleibt bestehen. War vor dem Import keine Ebene aktiv, bleibt auch anschließend keine Ebene aktiv.
- Neu erstellte Pins werden weiterhin der aktiven Ebene zugeordnet (Grundentscheidung 7); die Importebene wird erst nach bewusster Auswahl durch den Benutzer zur aktiven Ebene.
- Die gespeicherte aktive Ebene wird durch den Import im Modus „Hinzufügen“ nicht geändert (Grundentscheidung 8).
- Diese Entscheidung betrifft ausschließlich „Hinzufügen“; die Behandlung eines Ersetzen-Imports bleibt davon unberührt.

## Grundentscheidung 45 – Nach Ersetzen zunächst keine Ebene aktiv

**Beschlossen (Variante A):** Nach einem erfolgreichen Import mit dem Modus **„Ersetzen“** ist **zunächst keine Ebene aktiv**. Es wird weder die bisher lokal aktive Ebene beibehalten noch eine aktive Ebene aus der Sicherungsdatei automatisch übernommen.

**Konsequenzen:**
- Der vollständige lokale Bestand an Pins und Ebenen wird nach gültiger Importprüfung und bewusster Bestätigung ersetzt (Grundentscheidungen 39 und 40).
- Die Auswahl der aktiven Ebene wird nach erfolgreicher Übernahme ausdrücklich auf **„keine aktive Ebene“** gesetzt und so lokal gespeichert (Grundentscheidung 8).
- Bevor nach dem Import ein neuer Pin erstellt werden kann, muss eine Ebene bewusst als aktiv ausgewählt werden (Grundentscheidung 7).
- Alle importierten Ebenen und Pins bleiben erhalten; diese Entscheidung ändert allein die Auswahl der aktiven Ebene.
- Bei abgebrochenem oder fehlgeschlagenem Import bleibt die bisherige aktive Ebene unverändert.
- Der Importmodus „Hinzufügen“ ist hiervon nicht betroffen; dort bleibt die zuvor aktive Ebene unverändert (Grundentscheidung 44).

## Grundentscheidung 46 – Alle importierten Pins nach „Ersetzen“ automatisch anzeigen

**Beschlossen (Variante A):** Nach einem **erfolgreichen Import mit „Ersetzen“** stellt pin2map den Kartenausschnitt automatisch so ein, dass **alle importierten Pins sichtbar sind**.

**Konsequenzen:**
- Kartenmittelpunkt und Zoom werden anhand der geografischen Ausdehnung aller importierten Pins angepasst; ein angemessener Rand sorgt für sichtbare Markierungen.
- Enthält die gültige Sicherungsdatei **keine Pins**, bleibt der bisherige Kartenausschnitt erhalten.
- Bei einem fehlgeschlagenen oder abgebrochenen Import erfolgt keine automatische Kartenanpassung.
- Die nach erfolgreichem Import eingestellte Kartenansicht wird gemäß Grundentscheidung 22 als letzte Ansicht lokal gespeichert.
- Nach dem Ersetzen bleibt unabhängig vom Kartenausschnitt zunächst **keine Ebene aktiv** (Grundentscheidung 45).
- Für „Hinzufügen“ gilt weiterhin die automatische Kartenanpassung ausschließlich auf die neu hinzugefügten Pins (Grundentscheidung 43).

## Grundentscheidung 47 – Nach Ersetzen alle importierten Ebenen sichtbar schalten

**Beschlossen (Variante A):** Nach einem erfolgreich abgeschlossenen Import im Modus **„Ersetzen“** werden **sämtliche importierten Ebenen zunächst sichtbar geschaltet**, unabhängig von den in der Sicherungsdatei hinterlegten Sichtbarkeitseinstellungen.

**Konsequenzen:**
- Alle importierten Pins können nach dem Import im automatisch angepassten Kartenausschnitt tatsächlich angezeigt werden (Grundentscheidung 46).
- Die Sichtbarkeitseinstellungen aus der Sicherungsdatei werden für diesen ersten Zustand nach dem Ersetzen bewusst nicht übernommen; anschließend kann der Benutzer einzelne Ebenen wieder ausblenden.
- Die Sichtbarkeit aller Ebenen einschließlich der geschützten Systemebene „Privat“ wird gemäß Grundentscheidungen 10 und 17 lokal gespeichert.
- Unabhängig von der Sichtbarkeit ist unmittelbar nach dem Ersetzen **keine Ebene aktiv** (Grundentscheidung 45). Sichtbar und aktiv sind getrennte Eigenschaften.
- Bei abgebrochenem oder fehlgeschlagenem Import bleiben die bisherige Ebenensichtbarkeit, aktive Ebene und Kartenansicht unverändert.
- Der Importmodus „Hinzufügen“ ist hiervon nicht betroffen; seine neue Ebene ist bereits gemäß Grundentscheidung 43 sichtbar.

## Grundentscheidung 48 – Eigenes versioniertes pin2map-JSON für Sicherungen

**Beschlossen (Variante A):** Die manuelle Export- und Importfunktion der lokalen Basisversion verwendet ein **eigenes, dokumentiertes und versioniertes pin2map-JSON-Format**. Es ist das maßgebliche Sicherungsformat für vollständige Anwendungsdaten; GeoJSON ist nicht das primäre Sicherungsformat.

**Konsequenzen:**
- Die Sicherungsdatei ist eine JSON-Datei und enthält eine eindeutige Kennung des pin2map-Formats sowie eine explizite Formatversionsangabe.
- Das Format bewahrt alle für die Wiederherstellung notwendigen Pin-Daten (stabile interne ID, Koordinaten, optionale Bezeichnung und Zugehörigkeit zu genau einer Ebene) und Ebenendaten (IDs, Namen, Reihenfolge, Systemstatus und Sichtbarkeit) sowie die erforderlichen Anwendungseinstellungen.
- Die geschützte Systemebene „Privat“ ist eindeutig abbildbar; ihre Eigenschaften dürfen durch Import nicht unterlaufen werden.
- Der Import muss das Format und seine Version erkennen und unbekannte bzw. nicht unterstützte Versionen kontrolliert und ohne Datenänderung zurückweisen.
- Die Datei ist ohne Server lesbar und transportierbar. Änderungen des Schemas sollen über dokumentierte Versionierung und gegebenenfalls gezielte Migrationen unterstützt werden; Abwärtskompatibilität wird nicht ungeprüft vorausgesetzt.
- Ein möglicher zusätzlicher GeoJSON-Export für andere Geowerkzeuge bleibt eine separate zukünftige Erweiterung.

## Grundentscheidung 49 – Sichere Migration älterer Sicherungsformate unterstützen

**Beschlossen (Variante A):** pin2map erkennt beim Import die Formatversion einer Sicherungsdatei. **Ältere pin2map-JSON-Formatversionen werden nur dann automatisch in das aktuell verwendete Datenmodell überführt, wenn für diese konkrete Version eine ausdrücklich implementierte und getestete Migration verfügbar ist.** Ist keine sichere Migration vorhanden, wird der Import verständlich begründet abgelehnt.

**Konsequenzen:**
- Die Formatkennung und Versionsnummer aus Grundentscheidung 48 sind für die Auswahl des passenden Import- bzw. Migrationspfads verbindlich.
- Die Anwendung darf unbekannte oder zukünftige Formatversionen nicht auf Verdacht interpretieren.
- Jede Migration muss die strukturellen Invarianten schützen: Jeder Pin gehört genau einer Ebene an, die private Systemebene bleibt geschützt, IDs und Koordinaten sind gültig.
- Die migrierten Daten werden vollständig validiert, bevor eine Übernahme erfolgt. Bei Fehlern bleiben alle vorhandenen lokalen Daten unverändert.
- Die Migration verarbeitet die ausgewählte Importdatei, ohne deren Originaldatei zu verändern.
- Für die erste Formatversion ist keine künstliche Migrationsimplementierung nötig, solange noch keine ältere Version existiert.
- Für das anschließende „Ersetzen“ bzw. „Hinzufügen“ gelten die bereits beschlossenen Regeln (Grundentscheidungen 40–47).

## Grundentscheidung 50 – Offline-Neustart der lokalen PWA

**Beschlossen (Variante A):** Die erste stabile lokale Basisversion von pin2map lässt sich **nach einem erfolgreichen ersten Laden auch ohne Internetverbindung erneut starten**. Die für den Betrieb notwendigen Anwendungsdateien werden dafür lokal über einen Service Worker zwischengespeichert. Pins und Ebenen bleiben offline in IndexedDB nutzbar und bearbeitbar.

**Konsequenzen:**
- Nach dem ersten vollständigen Online-Laden ist die eigentliche PWA bei fehlender Netzverbindung startfähig; ein reiner Online-Start reicht für die Basisversion nicht aus.
- Die für den Programmstart benötigten Ressourcen (z. B. App-Shell, JavaScript, Styles und lokale Assets) müssen durch eine geeignete Cache-Strategie offline verfügbar sein.
- Pins und Ebenen werden weiterhin lokal über IndexedDB gespeichert. Anlegen, Bearbeiten, Verschieben und Löschen der lokalen Datensätze dürfen keine Serververbindung voraussetzen.
- Eine zuverlässige Offline-Verfügbarkeit der **Kartenkacheln bzw. des Kartenhintergrunds** ist hiermit ausdrücklich **noch nicht beschlossen**. Ohne verfügbare Kartendaten kann die Kartenansicht eingeschränkt sein; gespeicherte Pins und Ebenen dürfen dadurch nicht verloren gehen.
- Aktualisierungen des App-Caches müssen so erfolgen, dass die lokale Datenbank nicht unbemerkt gelöscht oder durch eine unvollständige Aktualisierung beschädigt wird.
- Der Offline-Neustart muss vor Freigabe der ersten Basisversion praktisch geprüft werden.

## Grundentscheidung 51 – Kein gezielter Offline-Kartendownload in der Basisversion

**Beschlossen (Variante A):** In der ersten stabilen lokalen Basisversion gibt es **keine gesonderte Funktion zum Herunterladen und Verwalten von Offline-Kartenbereichen**. Die Offline-Startfähigkeit der PWA aus Grundentscheidung 50 bleibt davon unberührt.

**Konsequenzen:**
- Bereits im zulässigen Browser-Cache vorhandene Kartenkacheln dürfen bei fehlender Verbindung weiterhin angezeigt werden, soweit sie tatsächlich verfügbar sind; ihre vollständige Offline-Verfügbarkeit wird nicht garantiert.
- Fehlen Kartenkacheln, zeigt pin2map einen verständlichen Offline-Hinweis beziehungsweise eine geeignete leere Hintergrunddarstellung. Fehlende Kacheln dürfen nicht als Verlust der Pins oder Ebenen interpretiert werden.
- Die lokal gespeicherten Pins und Ebenen bleiben in IndexedDB erhalten und können, soweit die Bedienung ohne Kartenhintergrund möglich ist, weiterhin lokal bearbeitet werden.
- Für die erste Basisversion sind weder eine Downloadbereich-Auswahl noch eine Offline-Kachelverwaltung erforderlich.
- Spätere Offline-Kartenfunktionen müssen Speicherbedarf und die Nutzungsbedingungen des jeweiligen Kartenanbieters berücksichtigen.
- Lokale Anwendungsdateien bleiben gemäß Grundentscheidung 50 für einen Offline-Neustart zwischengespeichert.

## Grundentscheidung 52 – Dauerhafter Verbindungsindikator in der Kopfzeile

**Beschlossen (Variante A):** Schon die erste lokale Basisversion zeigt in der Kopfzeile einen **kleinen, dauerhaft sichtbaren Verbindungsindikator**, der den vom Browser gemeldeten Online-/Offline-Zustand kenntlich macht.

**Konsequenzen:**
- Der Indikator bleibt auch während der Offline-Nutzung der lokal startfähigen PWA sichtbar (Grundentscheidungen 50 und 51).
- Der Status ist als Hinweis auf den browserseitig erkannten Netzwerkzustand zu verstehen, **nicht** als Nachweis der tatsächlichen Erreichbarkeit eines Servers oder der erfolgreichen Synchronisation.
- Der Indikator muss die Zustände online und offline verständlich unterscheiden können und sich bei Zustandsänderungen aktualisieren.
- Fehlende Kartenkacheln werden weiterhin angemessen erklärt; ein vermeintlicher Online-Zustand garantiert keine verfügbare Kartenverbindung.
- Die spätere Serversynchronisation kann eigene zusätzliche Zustände erhalten, ohne die Bedeutung dieses Basisindikators rückwirkend zu verfälschen.

## Grundentscheidung 53 – Antippbarer Verbindungsindikator mit Statushinweis

**Beschlossen (Variante A):** Der dauerhaft sichtbare Verbindungsindikator in der Kopfzeile ist **antippbar**. Ein Antippen öffnet einen kleinen Hinweis mit dem aktuell vom Browser gemeldeten Online-/Offline-Zustand und seiner Bedeutung.

**Konsequenzen:**
- Ein erneutes Antippen desselben Symbols **oder Antippen außerhalb** des Hinweises schließt ihn wieder.
- Der Hinweis erläutert, dass der angezeigte Online-Zustand keine tatsächliche Erreichbarkeit eines Servers und keinen erfolgreichen Synchronisationsvorgang garantiert (Grundentscheidung 52).
- Das Öffnen oder Schließen des Hinweises löst weder einen Verbindungsversuch noch eine Anmeldung, Datenspeicherung oder Synchronisation aus.
- Das Symbol bleibt dauerhaft sichtbar; der aufklappbare Hinweis ist nur bei Bedarf eingeblendet.
- Ändert sich der browserseitig gemeldete Netzwerkzustand, müssen Indikator und ein gegebenenfalls geöffneter Hinweis den aktualisierten Zustand anzeigen.
- Die Bedienung muss mit Maus und Touch funktionieren sowie barrierearm zugänglich sein.

## Grundentscheidung 54 – Mehrere Kartenhintergründe in der ersten Basisversion

**Beschlossen (Variante A):** Die erste stabile lokale Basisversion von pin2map bietet eine **einfache Auswahl zwischen mindestens zwei geeigneten Kartenhintergründen**.

**Konsequenzen:**
- Der Kartenhintergrund lässt sich wechseln, ohne Pins, Ebenen, gespeicherte Koordinaten oder den aktuellen Kartenausschnitt (Mittelpunkt und Zoomstufe) zu verändern.
- Die Kartenansichten sind als austauschbare Darstellungsschicht von der lokalen Pin- und Ebenenverwaltung getrennt.
- Kartenanbieter und Darstellungsarten werden anhand technischer Eignung, Lizenz- und Nutzungsbedingungen gesondert festgelegt.
- Für die Kartenansichten gelten weiterhin die Offline-Grundentscheidungen 50 und 51: Offline-Start der PWA, aber zunächst kein gezielter Download von Offline-Kartenbereichen.
- Die Auswahl erfolgt über eine einfach bedienbare Kartenhintergrund-Steuerung. Eine konkrete Position dieser Steuerung ist mit dieser Grundentscheidung noch nicht festgelegt.

## Grundentscheidung 55 – Letzten Kartenhintergrund beim Neustart wiederherstellen

**Beschlossen (Variante A):** pin2map speichert den **zuletzt ausgewählten Kartenhintergrund lokal** und stellt ihn beim nächsten Start der Anwendung automatisch wieder her, sofern dieser Hintergrund weiterhin verfügbar ist.

**Konsequenzen:**
- Die Kartenhintergrund-Auswahl aus Grundentscheidung 54 wird als lokale Nutzereinstellung gespeichert.
- Beim Neustart wird die zuletzt gewählte Karte verwendet; Kartenmittelpunkt und Zoomstufe werden weiterhin separat gemäß Grundentscheidung 22 wiederhergestellt.
- Ist der zuletzt gewählte Hintergrund nicht mehr verfügbar oder in der aktuellen App-Version nicht mehr konfiguriert, verwendet pin2map einen definierten Standard-Kartenhintergrund. Pins, Ebenen und gespeicherte Koordinaten bleiben davon unbeeinflusst.
- Eine fehlende Internetverbindung kann Kartenkacheln vorübergehend verhindern, ohne dass die gespeicherte Kartenauswahl deshalb automatisch überschrieben werden muss (Grundentscheidungen 50–51).
- Die Auswahl bleibt bei normalem Neustart erhalten, bis der Benutzer bewusst eine andere Karte auswählt oder ein nicht mehr unterstützter Kartentyp ersetzt werden muss.

## Grundentscheidung 56 – Direkter Kartenwahl-Button am unteren Kartenrand

**Beschlossen (Variante A):** Die erste stabile lokale Basisversion von pin2map erhält einen **direkt sichtbaren Kartenwahl-Button am unteren Kartenrand**. Über diesen Button öffnet sich ein kleines Menü zur Auswahl der verfügbaren Kartenhintergründe.

**Konsequenzen:**
- Die Kartenhintergrund-Auswahl ist unmittelbar aus der Kartenansicht erreichbar; ein Umweg über das allgemeine Menü ist nicht erforderlich.
- Nach der Auswahl wechselt lediglich der Kartenhintergrund. Pins, Ebenen sowie Kartenmittelpunkt und Zoomstufe bleiben erhalten (Grundentscheidung 54).
- Die ausgewählte Kartenansicht wird lokal gespeichert und beim Neustart wiederhergestellt (Grundentscheidung 55).
- Die Kartenwahl-Bedienung funktioniert mit Touch und Maus, ohne die normale Kartenbewegung unnötig zu behindern.
- Die genaue Position und Ausrichtung des Buttons innerhalb des unteren Kartenrands werden in einer folgenden Entscheidung präzisiert.

## Grundentscheidung 57 – Kartenwahl-Button unten mittig auf Höhe des Zoom-Minus-Buttons

**Beschlossen (Variante A):** Der direkt sichtbare Kartenwahl-Button wird **horizontal zentriert am unteren Kartenrand** positioniert, und zwar **auf derselben Höhe wie der untere Zoom-Button „−“**. Die Anordnung übernimmt die zuletzt im PoC abgestimmte Position.

**Konsequenzen:**
- Die Kartenwahl bleibt als eigenständige Steuerung direkt in der Kartenansicht erreichbar (Grundentscheidung 56).
- Die vertikale Position orientiert sich am Zoom-Minus-Button und ausdrücklich nicht am Zoom-Plus-Button.
- Die horizontale Platzierung ist mittig; die Umsetzung muss auch bei unterschiedlichen Bildschirmgrößen, Geräte-Aussparungen und Touch-Bedienung ohne Überschneidungen funktionieren.
- Ein Wechsel des Kartenhintergrunds verändert Pins, Ebenen, Kartenmittelpunkt und Zoomstufe nicht (Grundentscheidung 54); die Auswahl bleibt gemäß Grundentscheidung 55 gespeichert.

## Grundentscheidung 58 – Kompaktes Kartenwahl-Menü oberhalb des Buttons

**Beschlossen (Variante A):** Beim Antippen des unten mittig angeordneten Kartenwahl-Buttons öffnet sich ein **kompaktes Auswahlmenü unmittelbar oberhalb des Buttons**. Das Menü zeigt die verfügbaren Kartenhintergründe und kennzeichnet die derzeit ausgewählte Kartenansicht eindeutig.

**Konsequenzen:**
- Die Kartenansicht bleibt beim Öffnen des Menüs sichtbar; ein großer zentraler Dialog wird nicht benötigt.
- Der Benutzer kann die Kartenhintergründe über das Menü direkt erreichen; die zuletzt gewählte Karte wird weiterhin lokal gespeichert (Grundentscheidungen 54–57).
- Nach Auswahl eines Kartenhintergrunds schließt sich das Menü.
- Der Wechsel des Kartenhintergrunds verändert weder Pins und Ebenen noch Kartenmittelpunkt und Zoomstufe.
- Die Positionierung berücksichtigt kleine Displays und sichere Bedienbereiche, damit Menüeinträge nicht außerhalb des sichtbaren Bereichs liegen.

## Grundentscheidung 59 – Kartenhintergrund sofort beim Auswählen wechseln

**Beschlossen (Variante A):** Wird im kompakten Kartenwahl-Menü ein Kartenhintergrund angetippt, wird dieser **unmittelbar aktiviert**, das Menü schließt sich und die Auswahl wird lokal gespeichert. Eine zusätzliche Bestätigung oder Vorschauphase ist nicht erforderlich.

**Konsequenzen:**
- Der Kartenwechsel erfolgt direkt nach der Auswahl; ein „Übernehmen“-Button und ein gesonderter Bestätigungsdialog entfallen.
- Die neue Kartenwahl wird als zuletzt verwendeter Hintergrund lokal gespeichert und gemäß Grundentscheidung 55 beim nächsten Start wiederhergestellt.
- Beim Wechsel bleiben Pins, Ebenen, Kartenmittelpunkt und Zoomstufe unverändert (Grundentscheidungen 54 und 58).
- Ein Wechsel ist jederzeit durch erneute Auswahl eines anderen Kartenhintergrunds korrigierbar.
- Falls die Darstellung des gewählten Kartenhintergrunds fehlschlägt, bleiben lokale Pins und Ebenen sowie ihre Daten erhalten; die Kartenoberfläche zeigt den Fehler nachvollziehbar an.

## Grundentscheidung 60 – Straßenkarte und topografische Karte in der Basisversion

**Beschlossen (Variante A):** Die erste stabile lokale Basisversion bietet **mindestens zwei kartografische Kartenhintergründe**: eine **klassische Straßenkarte** und eine **topografische Karte**. Eine Satelliten- bzw. Luftbildansicht ist für diese Basisversion nicht erforderlich.

**Konsequenzen:**
- Beide Kartentypen sind über die bereits beschlossene Kartenhintergrund-Auswahl unmittelbar zugänglich (Grundentscheidungen 54, 56–59).
- Der Kartenwechsel erfolgt sofort, ohne Bestätigung, und verändert weder Pins, Ebenen noch Kartenmittelpunkt oder Zoomstufe.
- Die zuletzt gewählte Kartenart bleibt beim Neustart erhalten (Grundentscheidung 55).
- Die konkreten Kartenanbieter werden vor der technischen Umsetzung anhand Eignung, Verfügbarkeit, Lizenz, Quellenangaben und Nutzungsbedingungen ausgewählt; aus dieser Entscheidung folgt keine Freigabe eines bestimmten Kacheldienstes.
- Ein gesonderter Offline-Kartendownload ist in der Basisversion nicht vorgesehen (Grundentscheidung 51).
- Satelliten- und Luftbilder bleiben eine mögliche spätere Erweiterung.

## Grundentscheidung 61 – Straßenkarte als Standard beim ersten Start

**Beschlossen (Variante A):** Beim **allerersten Start** von pin2map wird die **klassische Straßenkarte** als Standard-Kartenhintergrund angezeigt, solange noch keine persönliche Auswahl gespeichert ist.

**Konsequenzen:**
- Die Straßenkarte ist die festgelegte Ausgangsansicht für die erste lokale Basisversion.
- Die topografische Karte bleibt unmittelbar über die Kartenwahl zugänglich (Grundentscheidungen 54 und 60).
- Nach einer bewussten Änderung wird die zuletzt ausgewählte Kartenansicht gespeichert und bei folgenden Starts wiederhergestellt (Grundentscheidung 55). Die Straßenkarte wird nicht bei jedem Neustart erzwungen.
- Falls der gespeicherte Kartentyp dauerhaft nicht mehr verfügbar oder konfiguriert ist, gilt die definierte Standardkarte als Rückfalloption (Grundentscheidung 55).
- Die Karte startet beim erstmaligen Öffnen mit dem bereits beschlossenen neutralen Kartenausschnitt ohne automatische Standortabfrage (Grundentscheidung 23).

## Grundentscheidung 62 – Kartenanbieter über zentrale Konfiguration austauschbar halten

**Beschlossen (Variante A):** Die Kartenquellen für die Straßenkarte und die topografische Karte werden **über eine zentrale Konfiguration beziehungsweise klar abgegrenzte Kartenquellen-Schnittstelle** eingebunden. Anbieter dürfen bei Bedarf ausgetauscht werden, ohne die Pin- und Ebenenlogik zu verändern.

**Konsequenzen:**
- Anbieterbezogene Angaben wie Kachel-/Kartendienst-Adresse, Kartenart, notwendige Quellenkennzeichnungen und gegebenenfalls Zugriffskonfiguration werden zentral verwaltet und nicht quer über die Kartenansicht verteilt.
- Kartenbedienung, Pin- und Ebenenverwaltung sowie Persistenz bleiben unabhängig vom jeweiligen Anbieter.
- Die technischen und rechtlichen Voraussetzungen eines konkreten Anbieters (insbesondere Nutzungsbedingungen, zulässiger Abruf, Attribution und Offline-/Cache-Regeln) werden vor seiner produktiven Verwendung geprüft.
- Ein Austausch der Kartenquelle darf bestehende Pins, Koordinaten, Ebenen und gespeicherten Kartenausschnitt nicht verändern.
- Die Standard-Straßenkarte, die Topografiekarte und die Speicherung der letzten Kartenwahl bleiben gemäß Grundentscheidungen 54–61 bestehen.

## Grundentscheidung 63 – Rasterkacheln als Kartentechnik der Basisversion

**Beschlossen (Variante A):** Die erste stabile lokale Basisversion von pin2map verwendet **klassische Rasterkacheln** zur Darstellung der Straßenkarte und der topografischen Karte. Die Einführung einer clientseitigen Vektorkarten-Engine ist für diese Basisversion nicht erforderlich.

**Konsequenzen:**
- Straßenkarte und topografische Karte werden als zusammengesetzte Kartenbild-Kacheln dargestellt.
- Die Kartenquellen bleiben über eine zentrale Konfiguration austauschbar (Grundentscheidung 62).
- Der Wechsel des Kartenhintergrunds beeinflusst Pins, Ebenen, Koordinaten, Kartenmittelpunkt und Zoomstufe nicht (Grundentscheidungen 54–59).
- Die Auswahl geeigneter Kacheldienste berücksichtigt Nutzungsbedingungen, Zuschreibung, Verfügbarkeit und Cache-Regeln; ein gezielter Offline-Kartendownload ist nicht Teil der Basisversion (Grundentscheidung 51).
- Vektorkarten bleiben eine mögliche spätere Erweiterung. Die Basisversion muss jedoch keine Vektordaten verarbeiten oder eigene Vektorkartenstile rendern.

## Grundentscheidung 64 – Leaflet als Kartenbibliothek der Basisversion

**Beschlossen (Variante A):** Für die erste stabile lokale Basisversion von pin2map wird **Leaflet** als JavaScript-Kartenbibliothek verwendet. Leaflet übernimmt die Darstellung der Rasterkarten, Kartenbewegung, Zoom und die grundlegende Interaktion mit Pin-Markierungen.

**Konsequenzen:**
- Die Straßenkarte und topografische Karte werden über Leaflet-Rasterkachelebenen eingebunden (Grundentscheidungen 60 und 63).
- Die Pin- und Ebenen-Domänenlogik sowie IndexedDB-Persistenz bleiben unabhängig von Leaflet und verwenden klar definierte Schnittstellen.
- Leaflet wird hinter einer eigenen Kartenkomponente beziehungsweise einem Kartenadapter gekapselt. So sind zukünftige Änderungen an der Kartentechnik möglich, ohne das Datenmodell grundlegend umzubauen.
- Die bereits beschlossenen Modi „Pin hinzufügen“ und „Pin verschieben“, Positionsvorschau, Bestätigung und temporäre Verbindungslinie werden auf der Karte umgesetzt, ohne die entsprechenden Speicherregeln zu verändern (Grundentscheidungen 25–35).
- Die Kartenquellen bleiben zentral konfigurierbar und austauschbar (Grundentscheidung 62).
- Die konkrete Bibliotheksversion wird bei der Implementierung festgelegt und für reproduzierbare Builds fixiert.

## Grundentscheidung 65 – Eigene, zentral gestaltete Pin-Symbole

**Beschlossen (Variante A):** Die erste stabile Basisversion verwendet **eigene, einheitlich gestaltete Pin-Symbole auf HTML-/SVG-Basis** statt der unveränderten Leaflet-Standardmarker. Die Darstellung erfolgt über Leaflet und ist zentral konfigurierbar.

**Konsequenzen:**
- Normale Pins, ausgewählte Pins und die beiden Positionen beim Verschieben können eindeutig unterschieden werden.
- Der ursprüngliche und der vorgeschlagene Pin bleiben während der Verschiebevorschau als verschiedene Zustände desselben Datenobjekts sichtbar; die Verbindungslinie ergänzt die Darstellung (Grundentscheidungen 31–35).
- Form, Größe und Darstellung der Symbole werden zentral in der Kartenkomponente beziehungsweise in gemeinsamen Darstellungsregeln verwaltet.
- Pin-Daten und Ebenenzuordnung bleiben unabhängig von der konkreten Gestaltung und der Kartenbibliothek (Grundentscheidungen 1 und 64).
- Die konkrete Farbgebung und mögliche farbliche Unterscheidung der Ebenen werden gesondert beschlossen.

## Grundentscheidung 66 – Eigene Pin-Farbe je Ebene

**Beschlossen (Variante A):** Jede Ebene erhält eine **eigene Pin-Farbe**. Alle regulär dargestellten Pins einer Ebene verwenden die Farbe ihrer jeweiligen Ebene. Auch die dauerhafte Systemebene „Privat“ erhält eine eindeutig festgelegte Farbe.

**Konsequenzen:**
- Die Farbe ist eine Eigenschaft der Ebene, nicht jedes einzelnen Pins. Die Zugehörigkeit eines Pins zu genau einer Ebene bleibt unverändert (Grundentscheidung 1).
- Beim Erstellen neuer regulärer Ebenen wird eine geeignete Farbe vergeben. Wie Farben vergeben werden und ob sie bearbeitbar sind, wird gesondert entschieden.
- Die Farben der Ebenen werden lokal gespeichert und sind für die vollständige Sicherung und Wiederherstellung im versionierten pin2map-JSON zu berücksichtigen (Grundentscheidungen 38–49).
- Auswahl-, Verschiebe- und Vorschauzustände müssen trotz Ebenenfarben eindeutig erkennbar sein (Grundentscheidungen 31–35 und 65).
- Der Sonderstatus der festen privaten Ebene „Privat“ bleibt unberührt (Grundentscheidungen 15–17).

## Grundentscheidung 67 – Ebenenfarben individuell über Farbpalette auswählen

**Beschlossen (Variante A):** Benutzer können bereits in der ersten stabilen Basisversion **die Pin-Farbe jeder regulären Ebene in der Ebenenverwaltung aus einer vorgegebenen, gut unterscheidbaren Farbpalette auswählen**. Die geschützte Systemebene „Privat“ behält ihre festgelegte, nicht veränderbare Farbe.

**Konsequenzen:**
- Eine Änderung der Ebenenfarbe wird lokal gespeichert und sofort für alle Pins dieser Ebene auf der Karte sichtbar (Grundentscheidung 66).
- Die Farbinformation gehört zur Ebene, nicht zu einem einzelnen Pin, und ist beim versionierten Export und Import zu berücksichtigen (Grundentscheidungen 38–49).
- Auswahl- und Verschiebezustände müssen auch bei wechselnden Ebenenfarben unterscheidbar bleiben (Grundentscheidungen 31–35 und 65).
- Die Farben regulärer Ebenen werden beim Anlegen zunächst automatisch zugewiesen; eine abweichende Farbe kann anschließend bewusst über die Ebenenverwaltung gewählt werden.
- Welche Palette verwendet wird und ob identische Farben für mehrere Ebenen zugelassen werden, wird gesondert festgelegt.

## Grundentscheidung 68 – Gleiche Pin-Farben für mehrere Ebenen zulassen

**Beschlossen (Variante A):** **Mehrere reguläre Ebenen dürfen dieselbe Pin-Farbe verwenden.** Die Farbe ist ein visuelles Organisationsmerkmal und kein eindeutiger Identifikator einer Ebene.

**Konsequenzen:**
- Bereits von anderen Ebenen verwendete Farben bleiben in der Farbpalette auswählbar; keine Farbe wird wegen ihrer Verwendung gesperrt.
- Ebenen werden durch ihre stabilen internen IDs und ihre eindeutigen Namen unterschieden, nicht durch die Farbe (Grundentscheidungen 12 und 13).
- Beim Ändern der Farbe einer Ebene ändert sich die Darstellung ihrer Pins; andere Ebenen mit derselben Farbe bleiben unverändert (Grundentscheidungen 66 und 67).
- Die Systemebene „Privat“ behält ihre festgelegte, nicht veränderbare Farbe. Eine Übereinstimmung der Farbe mit einer regulären Ebene verändert ihren Sonderstatus nicht.
- Die automatische Farbvergabe für neu angelegte reguläre Ebenen wird gesondert bestimmt.

## Grundentscheidung 69 – Automatische Ebenenfarben in fester Reihenfolge vergeben

**Beschlossen (Variante A):** Neu angelegte reguläre Ebenen erhalten ihre anfängliche Pin-Farbe **in einer festen, nachvollziehbaren Reihenfolge aus einer definierten Farbpalette**. Ist das Ende der Palette erreicht, beginnt die Vergabe wieder mit deren erster Farbe.

**Konsequenzen:**
- Nacheinander angelegte reguläre Ebenen erhalten unterschiedliche Startfarben, solange die Palette ausreichend viele Farben enthält.
- Die Farbvergabe erfolgt nicht zufällig; sie ist reproduzierbar und testbar.
- Eine erneute Verwendung von Farben ist ausdrücklich zulässig (Grundentscheidung 68).
- Benutzer können die anfänglich vergebene Farbe regulärer Ebenen anschließend über die Ebenenverwaltung ändern (Grundentscheidung 67).
- Die Farbe wird als Eigenschaft der Ebene lokal gespeichert und in das versionierte Sicherungsformat aufgenommen (Grundentscheidungen 38–49 und 66).
- Die feste Systemebene „Privat“ erhält ihre eigene festgelegte Farbe und wird nicht durch diese automatische Vergabefolge umgefärbt.
- Die genaue Farbpalette sowie ein konsistenter Vergabezähler bzw. eine Ableitung aus der Anlegereihenfolge werden bei der Umsetzung definiert, sodass ein Neustart nicht zu unvorhersehbaren Farben führt.

## Grundentscheidung 70 – Feste Farbpalette für reguläre Ebenen

**Beschlossen (Variante A):** Die erste stabile Basisversion verwendet für die Pin-Farben regulärer Ebenen **eine kleine, fest definierte Palette gut unterscheidbarer Farben** (als Größenordnung acht bis zwölf). Eine freie Eingabe beliebiger Farbwerte über einen Farbwähler ist in dieser Basisversion nicht vorgesehen.

**Konsequenzen:**
- Dieselbe zentral definierte Palette wird sowohl für die automatische Vergabe in fester Reihenfolge (Grundentscheidung 69) als auch für die manuelle Farbauswahl (Grundentscheidung 67) verwendet.
- Farben dürfen mehrfach verwendet werden (Grundentscheidung 68).
- Die konkrete Auswahl und Reihenfolge der Farbwerte wird bei der Umsetzung dokumentiert; das bisherige Beispiel mit zwölf Farben ist noch keine verbindliche Festlegung einzelner Farbwerte.
- Die Farben sollen auch vor unterschiedlichen Kartenhintergründen gut erkennbar sein. Auswahl- und Verschiebezustände müssen zusätzlich deutlich unterscheidbar bleiben.
- Die für Ebenen gespeicherten Farben bleiben Bestandteil des versionierten Sicherungsformats; eine spätere Erweiterung der Palette darf vorhandene Ebenenfarben nicht unbemerkt verändern.
- Die Systemebene „Privat“ behält ihre feste Farbe.

## Grundentscheidung 71 – Exklusive Sonderfarbe für die private Ebene

**Beschlossen (Variante A):** Die feste Systemebene **„Privat“ erhält eine eigene, nicht veränderbare Sonderfarbe, die nicht Teil der regulären Farbpalette ist**.

**Konsequenzen:**
- Pins der privaten Ebene verwenden diese festgelegte Sonderfarbe und sind dadurch im Kartenbild visuell von den regulären Ebenen unterscheidbar (Grundentscheidungen 65 und 66).
- Die Sonderfarbe wird regulären Ebenen weder automatisch zugewiesen noch in deren manueller Farbpalette angeboten (Grundentscheidungen 67–70).
- Die Systemebene „Privat“ bleibt nicht umbenennbar und nicht löschbar; ihre Pins können weiterhin bearbeitet und gelöscht werden (Grundentscheidungen 15 und 16).
- Die konkrete Sonderfarbe wird bei der visuellen Umsetzung festgelegt und dokumentiert. Sie muss auf der Straßenkarte und der topografischen Karte gut erkennbar sein.
- Die Farbgestaltung ändert nichts an IDs, Ebenenzugehörigkeit oder Datenhaltung.

## Grundentscheidung 72 – Pin-Beschriftungen standardmäßig sichtbar und per Button umschaltbar

**Beschlossen (Variante A mit verbindlicher Ergänzung):** Vorhandene optionale **Pin-Bezeichnungen werden standardmäßig direkt neben den Pins auf der Karte angezeigt**. Ein **gut erreichbarer, direkt aus der Kartenansicht bedienbarer Button** schaltet die Beschriftungen jederzeit zwischen **sichtbar** und **ausgeblendet** um.

**Konsequenzen:**
- Nur Pins mit hinterlegter Bezeichnung erhalten eine Kartenbeschriftung; unbenannte Pins bleiben ohne Text.
- Der Umschaltbutton ist in der ersten Basisversion fest vorgesehen, ohne einen Umweg über das allgemeine Einstellungsmenü. Die genaue Position und Gestalt des Buttons werden separat festgelegt.
- Das Umschalten wirkt auf die Kartenbeschriftungen aller sichtbaren Pins, verändert aber keine gespeicherten Pin-Namen, Ebenen, Koordinaten oder anderen Daten.
- Pins bleiben bei ausgeblendeten Beschriftungen weiterhin als Symbole sichtbar und durch Antippen auswählbar.
- Die Darstellung soll überlappende Beschriftungen möglichst reduzieren. Die im PoC vorhandene Bedienung über ein Label-Steuerelement kann als Orientierung dienen.
- Ob der zuletzt gewählte Sichtbarkeitszustand über Neustarts erhalten bleibt, wird in Grundentscheidung 73 entschieden.

## Grundentscheidung 73 – Letzte Sichtbarkeit der Pin-Beschriftungen wiederherstellen

**Beschlossen (Variante A):** pin2map speichert die zuletzt durch den Beschriftungsbutton gewählte Einstellung **„Pin-Beschriftungen anzeigen/ausblenden“ lokal** und stellt sie beim nächsten Start der Anwendung automatisch wieder her. Beim **allerersten Start** sind Beschriftungen standardmäßig sichtbar.

**Konsequenzen:**
- Die Sichtbarkeit der Pin-Beschriftungen ist eine lokale Anzeigeeinstellung und unabhängig von den gespeicherten Pin-Bezeichnungen.
- Ein Umschalten über den direkt erreichbaren Button (Grundentscheidung 72) aktualisiert die Anzeige unmittelbar und speichert die Einstellung lokal.
- Nach einem Neustart bleibt die zuletzt gewählte Sichtbarkeit erhalten; nur wenn noch keine Einstellung existiert, gilt „Beschriftungen anzeigen“ als Ausgangszustand.
- Das Ausblenden verändert weder Pin-Namen noch die Darstellung der Pin-Symbole und ihre Auswahlmöglichkeit.
- Die Einstellung ist unabhängig von der Sichtbarkeit der Ebenen und der Wahl des Kartenhintergrunds.

## Grundentscheidung 74 – Beschriftungsbutton links neben der Kartenwahl

**Beschlossen (Variante A):** Der gut erreichbare Button zum **Ein- und Ausblenden der Pin-Beschriftungen** wird **am unteren Kartenrand links neben dem horizontal zentrierten Kartenwahl-Button** angeordnet. Er liegt mit dem Kartenwahl-Button **auf derselben Höhe wie der Zoom-Minus-Button („−“)**.

**Konsequenzen:**
- Beide direkt erreichbaren Steuerungen für die Kartendarstellung bilden eine gemeinsame untere Bediengruppe.
- Der Beschriftungsbutton schaltet die Kartenbeschriftungen unmittelbar um, ohne die Pins selbst oder deren gespeicherte Namen zu ändern (Grundentscheidung 72).
- Die zuletzt gewählte Beschriftungssichtbarkeit wird lokal gespeichert und bei einem Neustart wiederhergestellt (Grundentscheidung 73).
- Die Anordnung übernimmt das zuletzt im PoC abgestimmte Bedienprinzip und muss auf unterschiedlichen Bildschirmgrößen, mit Touch und Maus, ohne gegenseitige Überdeckung funktionieren.
- Der Kartenwahl-Button bleibt unten horizontal zentriert und auf Höhe des Zoom-Minus-Buttons (Grundentscheidung 57).

## Grundentscheidung 75 – Überlappende Pin-Beschriftungen dynamisch reduzieren

**Beschlossen (Variante A):** Sind Pin-Bezeichnungen eingeblendet, reduziert pin2map **Überlagerungen von Beschriftungen bei dicht beieinanderliegenden Pins automatisch**. Dafür dürfen einzelne Beschriftungen abhängig von Zoomstufe und Kartenausschnitt vorübergehend ausgeblendet werden.

**Konsequenzen:**
- Pin-Symbole bleiben unabhängig von ausgeblendeten Beschriftungen sichtbar und anwählbar, sofern ihre Ebene sichtbar ist.
- Bei größerem Kartenmaßstab bzw. mehr Platz erscheinen zuvor wegen Überlappung unterdrückte Bezeichnungen nach Möglichkeit wieder.
- Die Bezeichnung eines bewusst ausgewählten Pins muss auch in dicht belegten Bereichen zugänglich bleiben; die konkrete Hervorhebungsregel wird gesondert festgelegt.
- Dynamisches Ausblenden verändert weder gespeicherte Pin-Namen noch die globale Einstellung des Beschriftungsbuttons (Grundentscheidungen 72–74).
- Die Berechnung reagiert auf Kartenbewegung, Zoom und geänderte Pin-Bezeichnungen, ohne Pins zu verschieben.
- Die Umsetzung soll auch auf Geräten mit geringerer Rechenleistung eine flüssige Kartenbedienung erlauben.

## Grundentscheidung 76 – Beschriftung des ausgewählten Pins auf der Karte hervorheben

**Beschlossen (Variante B):** Wird ein Pin mit vorhandener Bezeichnung ausgewählt, wird **sein Name zusätzlich direkt an seiner Kartenmarkierung deutlich hervorgehoben**. Dies gilt ausdrücklich auch dann, wenn normale Pin-Beschriftungen über den globalen Button ausgeblendet oder wegen Überlappungen unterdrückt sind. Die zusätzliche Hervorhebung verschwindet beim Abwählen des Pins.

**Konsequenzen:**
- Die Hervorhebung ist eine temporäre Ausnahme für den ausgewählten Pin von den allgemeinen Beschriftungsregeln (Grundentscheidungen 72–75); sie verändert nicht den gespeicherten Ein-/Aus-Zustand des Beschriftungsbuttons.
- Andere Pin-Beschriftungen bleiben entsprechend der gewählten globalen Einstellung sichtbar oder ausgeblendet.
- In der Pin-Detail-/Bearbeitungsansicht bleibt der Name des Pins ebenfalls zugänglich.
- Pins ohne Bezeichnung erhalten keine künstlich erzeugte Beschriftung.
- Die Position und Darstellung der hervorgehobenen Bezeichnung müssen auf kleinen Bildschirmen und bei dicht belegten Kartenflächen lesbar bleiben.

## Grundentscheidung 77 – Ausgewählte Pin-Beschriftung ausschließlich seitlich platzieren

**Beschlossen (Variante A mit verbindlicher Einschränkung):** pin2map positioniert die hervorgehobene Bezeichnung eines ausgewählten Pins **automatisch entweder links oder rechts neben dem Pin**. Eine Platzierung **oberhalb oder unterhalb des Pins ist ausdrücklich ausgeschlossen**.

**Konsequenzen:**
- Die Seite wird abhängig vom verfügbaren horizontalen Platz so gewählt, dass die Beschriftung möglichst vollständig innerhalb des Kartenbereichs sichtbar bleibt.
- Oben oder unten am Pin darf die Beschriftung niemals als Ausweichposition erscheinen; die seitliche Zuordnung bleibt auch an Kartenrändern erhalten.
- Kartenbedienelemente sollen möglichst nicht verdeckt werden. Die Beschriftung wird nicht zum Anlass genommen, die gespeicherten Pin-Koordinaten zu verändern.
- Für sehr lange Pin-Namen bzw. geringe verfügbare Breite wird eine gesonderte Überlaufregel festgelegt.
- Die Hervorhebung gilt weiterhin auch bei ausgeschalteten oder automatisch reduzierten normalen Kartenbeschriftungen (Grundentscheidung 76).

## Grundentscheidung 78 – Lange Pin-Beschriftungen einzeilig kürzen

**Beschlossen (Variante A):** Die hervorgehobene Beschriftung eines ausgewählten Pins bleibt **einzeilig und ausschließlich seitlich** neben dem Pin. Reicht der verfügbare Platz für den vollständigen Namen nicht aus, wird der sichtbare Text **mit Auslassungspunkten („…“) gekürzt**.

**Konsequenzen:**
- Die dynamische Anordnung erfolgt ausschließlich links oder rechts des Pins, niemals oberhalb oder unterhalb (Grundentscheidung 77).
- Die verfügbare Breite wird abhängig von Kartenausschnitt, Bildschirmgröße und seitlicher Position begrenzt; der Text darf den Kartenrand möglichst nicht überschreiten.
- Es wird ausschließlich die **Darstellung** gekürzt, niemals der gespeicherte Pin-Name.
- Der vollständige Name bleibt in der Pin-Detail-/Bearbeitungsansicht zugänglich.
- Die Regel gilt auch, wenn allgemeine Pin-Beschriftungen ausgeblendet sind und die Beschriftung eines ausgewählten Pins dennoch eingeblendet wird (Grundentscheidung 76).

## Grundentscheidung 79 – Alle normalen Pin-Beschriftungen einzeilig darstellen

**Beschlossen (Variante A):** Auch die normalen, nicht hervorgehobenen Pin-Beschriftungen werden **immer einzeilig** und **seitlich neben dem jeweiligen Pin** dargestellt. Reicht der verfügbare Platz nicht aus, wird der angezeigte Name **mit Auslassungspunkten („…“) gekürzt**.

**Konsequenzen:**
- Für normale und hervorgehobene Beschriftungen gilt dieselbe kompakte, einzeilige Grundform (Grundentscheidungen 77 und 78).
- Eine Platzierung oberhalb oder unterhalb des Pins sowie ein mehrzeiliger Umbruch sind nicht vorgesehen.
- Die Kürzung betrifft ausschließlich die Darstellung; der vollständige Name bleibt unverändert gespeichert und über die Pin-Ansicht zugänglich.
- Bei Überlagerungen können normale Beschriftungen gemäß Grundentscheidung 75 dynamisch ausgeblendet werden; die hervorgehobene Beschriftung des ausgewählten Pins bleibt davon ausgenommen (Grundentscheidung 76).
- Die Beschriftungsanzeige kann weiterhin über den gut erreichbaren Button ein- und ausgeblendet werden (Grundentscheidungen 72–74).

## Grundentscheidung 80 – Pin-Auswahl ausschließlich über das Pin-Symbol

**Beschlossen (Variante B):** Eine sichtbare Pin-Beschriftung dient **ausschließlich der Anzeige** und ist **keine zusätzliche Antipp- oder Klickfläche** für den Pin. **Nur das Pin-Symbol** löst durch Antippen oder Anklicken die Auswahl des betreffenden Pins und das Öffnen seiner Pin-Ansicht aus.

**Konsequenzen:**
- Antippen/Anklicken einer normalen oder hervorgehobenen Kartenbeschriftung wählt keinen Pin aus und öffnet keine Pin-Ansicht.
- Die Kartenbeschriftungen bleiben reine Anzeigeelemente (Grundentscheidungen 72–79); die Beschriftung eines ausgewählten Pins bleibt weiterhin sichtbar hervorgehoben (Grundentscheidung 76).
- Die Beschriftungsflächen dürfen die Bedienung des darunterliegenden Kartenausschnitts nicht unnötig blockieren; insbesondere darf die normale Kartenverschiebung nicht durch Beschriftungen verhindert werden.
- Die Pin-Symbole müssen auf Touchscreens hinreichend gut bedienbar sein; ihre konkrete Trefferfläche wird gesondert entschieden.

## Grundentscheidung 81 – Unsichtbar vergrößerte Antippfläche für Pin-Symbole

**Beschlossen (Variante A):** Das sichtbare Pin-Symbol behält seine vorgesehene Größe, erhält aber **eine unsichtbar vergrößerte Antipp- bzw. Klickfläche** rund um das Symbol. Damit lassen sich Pins besonders auf Touchscreens leichter auswählen.

**Konsequenzen:**
- Die vergrößerte Trefferfläche gehört nur zum Pin-Symbol; die Pin-Beschriftung bleibt kein Auswahlziel (Grundentscheidung 80).
- Die Trefferfläche darf die optische Darstellung, Position und gespeicherten Koordinaten eines Pins nicht verändern.
- Auswahl durch Antippen oder Klicken der Trefferfläche öffnet dieselbe Pin-Ansicht wie eine Auswahl direkt am sichtbaren Symbol.
- Die konkrete Größe der Trefferfläche wird bei der Umsetzung für Touch- und Mausbedienung getestet; nahe benachbarte Pins und normales Verschieben/Zoomen der Karte müssen bedienbar bleiben.
- Bei überlappenden Trefferflächen mehrerer Pins ist ein eindeutiges, nachvollziehbares Auswahlverhalten erforderlich, das gesondert festgelegt wird.

## Grundentscheidung 82 – Nächstgelegenen Pin bei überlappenden Trefferflächen auswählen

**Beschlossen (Variante A):** Überschneiden sich die unsichtbar vergrößerten Antippflächen mehrerer Pins, wählt pin2map **direkt den Pin aus, dessen sichtbares Symbol dem Berührungs- bzw. Klickpunkt am nächsten liegt**. Ein zusätzliches Auswahlmenü erscheint nicht.

**Konsequenzen:**
- Maßgeblich ist der Abstand in der aktuellen Bildschirmdarstellung; die Berechnung muss bei Kartenzoom und -bewegung entsprechend aktuell sein.
- Für exakt gleiche Abstände gilt eine stabile, nachvollziehbare Gleichstandsregel (z. B. Vergleich der unveränderlichen Pin-IDs), damit dieselbe Berührung nicht zufällig wechselnde Pins auswählt.
- Es werden nur Pins berücksichtigt, deren Ebene sichtbar ist und deren Trefferfläche den Berührungspunkt umfasst.
- Beschriftungen lösen keine Pin-Auswahl aus (Grundentscheidung 80).
- Das Verhalten gilt für Touch- und Mausbedienung; die normale Kartenbewegung darf dadurch nicht unnötig beeinträchtigt werden.
- Der Benutzer kann durch Heranzoomen eine genauere Auswahl ermöglichen.

## Grundentscheidung 83 – Ausgewählten Pin mit Kontur oder Ring hervorheben

**Beschlossen (Variante A):** Der ausgewählte Pin behält **seine reguläre Ebenenfarbe** und erhält zusätzlich **eine deutlich sichtbare Kontur bzw. einen Hervorhebungsring**. Die Auswahl muss auch bei Pins ohne Bezeichnung klar erkennbar sein.

**Konsequenzen:**
- Die Ebenenfarbe des Pins bleibt bei Auswahl unverändert und weiterhin sichtbar (Grundentscheidungen 66–71).
- Die zusätzliche Auswahlmarkierung ist von den Vorschau- und Positionsmarkierungen bei einer Pin-Verschiebung klar unterscheidbar (Grundentscheidungen 31–35 und 65).
- Die Hervorhebung erscheint unmittelbar bei Auswahl und verschwindet bei Abwahl.
- Bei Pins mit Namen bleibt zusätzlich die seitliche hervorgehobene Beschriftung gemäß Grundentscheidungen 76–79 bestehen.
- Die konkrete Form, Stärke und Farbe der Kontur/des Rings werden bei der visuellen Umsetzung mit Blick auf beide Kartenhintergründe und unterschiedliche Ebenenfarben festgelegt.

## Grundentscheidung 84 – Pin-Auswahl durch Antippen einer freien Kartenfläche aufheben

**Beschlossen (Variante A):** Ist ein Pin ausgewählt und kein spezieller Kartenmodus aktiv, **hebt ein Antippen oder Anklicken einer freien Kartenfläche die Auswahl unmittelbar auf**. Die Pin-Detail-/Bearbeitungsansicht wird geschlossen, und Auswahlring bzw. hervorgehobene Pin-Beschriftung verschwinden.

**Konsequenzen:**
- Der Kartenausschnitt und die Zoomstufe bleiben beim Abwählen unverändert.
- Die Aktion ändert keine Pin-Daten; zuvor automatisch gespeicherte Bearbeitungen bleiben erhalten (Grundentscheidung 29).
- „Freie Kartenfläche“ bedeutet, dass weder das Pin-Symbol noch ein anderes bedienbares Steuerelement getroffen wurde; sichtbare Pin-Beschriftungen selbst sind keine Auswahlziele (Grundentscheidung 80).
- In den ausdrücklich aktivierten Modi „Pin hinzufügen“ und „Pin verschieben“ gelten weiterhin deren besonderen Antipp-, Bestätigungs- und Abbruchregeln (Grundentscheidungen 25–27 und 30–35); ein Kartentipp darf dort nicht versehentlich die laufende Aktion durch bloßes Abwählen ersetzen.
- Beim Wechsel zu einem anderen Pin wird stattdessen dieser andere Pin ausgewählt.

## Grundentscheidung 85 – Pin-Auswahl bleibt beim Verschieben der Karte bestehen

**Beschlossen (Variante A):** Wird die Karte mit Finger oder Maus verschoben (Pan), **bleibt die bestehende Pin-Auswahl erhalten**. Die Pin-Detail-/Bearbeitungsansicht bleibt geöffnet und der Pin behält seine Auswahlkontur und – falls vorhanden – seine hervorgehobene Beschriftung.

**Konsequenzen:**
- Die Auswahl bleibt auch dann bestehen, wenn sich der ausgewählte Pin infolge der Kartenverschiebung außerhalb des sichtbaren Kartenausschnitts befindet.
- Die Karte lässt sich weiterhin normal verschieben; die gespeicherten Pin-Koordinaten ändern sich dadurch nicht.
- Ein bewusstes Antippen einer freien Kartenfläche ohne Verschiebegeste hebt die Auswahl weiterhin auf (Grundentscheidung 84). Die Interaktion unterscheidet deshalb Kartentipp und Kartenverschiebung.
- Das Auswählen eines anderen Pins wechselt die Auswahl zu diesem Pin.
- Die gesondert festgelegten Abläufe zum expliziten Verschieben von Pins bleiben unberührt (Grundentscheidungen 30–35).

## Grundentscheidung 86 – Pin-Auswahl bleibt beim Zoomen erhalten

**Beschlossen (Variante A):** Die Auswahl eines Pins **bleibt beim Vergrößern oder Verkleinern der Karte bestehen**, unabhängig davon, ob die Zoomänderung per Zwei-Finger-Geste, Mausrad oder Zoomtasten erfolgt.

**Konsequenzen:**
- Die Pin-Detail-/Bearbeitungsansicht bleibt beim Zoomen geöffnet.
- Der ausgewählte Pin behält seine Auswahlkontur bzw. seinen Hervorhebungsring und – sofern benannt – seine hervorgehobene Beschriftung (Grundentscheidungen 76 und 83).
- Die Auswahl bleibt auch erhalten, wenn der Pin durch das Zoomen außerhalb des sichtbaren Kartenausschnitts liegt.
- Die Zoomaktion verändert weder die gespeicherten Pin-Koordinaten noch die Pin-Zugehörigkeit zu seiner Ebene.
- Ein bewusster Tipp auf eine freie Kartenfläche hebt die Auswahl weiterhin auf (Grundentscheidung 84); normale Kartenverschiebung hebt sie ebenfalls nicht auf (Grundentscheidung 85).
- Die Sonderregeln für explizites Hinzufügen und Verschieben von Pins bleiben unverändert.

## Grundentscheidung 87 – Erneutes Antippen des ausgewählten Pins hebt Auswahl auf

**Beschlossen (Variante A):** Wird das Symbol eines bereits ausgewählten Pins erneut angetippt oder angeklickt, **wird die Auswahl aufgehoben und die Pin-Detail-/Bearbeitungsansicht geschlossen**. Die Auswahlkontur und die hervorgehobene Beschriftung verschwinden.

**Konsequenzen:**
- Erstes Antippen eines nicht ausgewählten Pins wählt ihn aus und öffnet seine Ansicht, erneutes Antippen desselben Pin-Symbols hebt die Auswahl wieder auf.
- Ein Antippen einer freien Kartenfläche hebt die Auswahl ebenso auf (Grundentscheidung 84).
- Kartenschwenken und Zoomen allein lassen die Auswahl unverändert (Grundentscheidungen 85 und 86).
- Der Wechsel auf das Symbol eines anderen Pins wählt diesen anderen Pin aus; es ist kein zusätzliches Schließen erforderlich.
- Bereits automatisch gespeicherte Pin-Änderungen bleiben erhalten (Grundentscheidung 29).
- Die ausdrücklich aktivierten Modi zum Hinzufügen und Verschieben von Pins behalten ihre besonderen Bedien- und Bestätigungsregeln (Grundentscheidungen 25–27 und 30–35).

## Grundentscheidung 88 – Direkter Wechsel zwischen ausgewählten Pins

**Beschlossen (Variante A):** Wird bei bereits geöffneter Pin-Detail-/Bearbeitungsansicht **ein anderes sichtbares Pin-Symbol angetippt oder angeklickt**, wird der bisherige Pin unmittelbar abgewählt und der neue Pin ausgewählt. Die bestehende Pin-Ansicht zeigt **sofort die Daten des neu ausgewählten Pins** an.

**Konsequenzen:**
- Es ist nicht erforderlich, zunächst die bisherige Pin-Ansicht zu schließen oder die Auswahl über eine freie Kartenfläche aufzuheben.
- Auswahlring und gegebenenfalls hervorgehobene Beschriftung wechseln zum neuen Pin (Grundentscheidungen 76 und 83).
- Der aktuelle Kartenausschnitt und die Zoomstufe bleiben unverändert; ein automatisches Zentrieren erfolgt beim Pin-Wechsel nicht.
- Vor dem Wechsel automatisch gespeicherte Änderungen des bisherigen Pins bleiben erhalten (Grundentscheidung 29). Offene asynchrone Speichervorgänge dürfen nicht versehentlich Daten des neu ausgewählten Pins überschreiben.
- Antippen desselben bereits ausgewählten Pins hebt dagegen weiterhin dessen Auswahl auf (Grundentscheidung 87).
- Für explizite Pin-Hinzufüge- und Verschiebemodi gelten deren gesonderte Regeln.

## Grundentscheidung 89 – Pin-Bearbeitungsansicht als unteres Bedienfeld

**Beschlossen (Variante A):** Die Pin-Detail-/Bearbeitungsansicht wird in der ersten Basisversion **als kompaktes Bedienfeld am unteren Bildschirmrand** angezeigt. Der übrige Kartenbereich bleibt sichtbar und bedienbar.

**Konsequenzen:**
- Das untere Bedienfeld stellt die Daten des ausgewählten Pins sowie seine vorgesehenen Bearbeitungsaktionen bereit, insbesondere die optionale Bezeichnung, Ebenenzugehörigkeit, den expliziten Verschiebemodus und das Löschen entsprechend den bestehenden Beschlüssen.
- Die Ansicht passt sich der verfügbaren Bildschirmhöhe an und muss insbesondere auf Smartphones sinnvoll bedienbar bleiben.
- Beim direkten Wechsel zu einem anderen Pin werden die angezeigten Daten unmittelbar aktualisiert (Grundentscheidung 88).
- Das Bedienfeld verschwindet beim Abwählen des Pins (Grundentscheidungen 84 und 87). Beim Verschieben oder Zoomen der Karte bleibt es bestehen (Grundentscheidungen 85 und 86).
- Die Bedienung der Karte und die bereits festgelegten Bedienelemente am unteren Kartenrand, einschließlich Kartenwahl und Beschriftungsbutton, dürfen nicht unbeabsichtigt blockiert werden. Das konkrete Verhalten bei Platzmangel wird gesondert entschieden.

## Grundentscheidung 90 – Unteres Pin-Bedienfeld wächst bei Bedarf nach oben

**Beschlossen (Variante B):** Das am unteren Bildschirmrand angeordnete Pin-Detail-/Bearbeitungsfeld **wächst bei Bedarf nach oben**, damit seine Inhalte **möglichst vollständig ohne eigenen vertikalen Scrollbereich** sichtbar werden. Auf kleinen Displays darf es dabei einen großen Teil der Karte verdecken.

**Konsequenzen:**
- Die Unterkante des Bedienfelds bleibt am unteren Bildschirmrand verankert (Grundentscheidung 89).
- Die Höhe orientiert sich am tatsächlich benötigten Platz für die angezeigten Pin-Daten und Bearbeitungsaktionen; unnötige Leerfläche wird vermieden.
- Anders als die nicht gewählte Variante A wird kein auf eine feste Höhe begrenztes Bedienfeld mit regulär eigenem Scrollbereich als Standard vorgesehen.
- Karte und bestehende Kartensteuerungen sollen soweit möglich bedienbar bleiben. Für Fälle, in denen die Inhalte höher als die tatsächlich verfügbare Bildschirmfläche sind, ist ein sicherer, auf kleinen Geräten nutzbarer Überlauf erforderlich; das ersetzt nicht das beschlossene grundsätzliche Mitwachsen des Feldes.
- Das Bedienfeld aktualisiert seine Höhe passend, wenn Inhalte wechseln, z. B. beim direkten Wechsel zwischen Pins (Grundentscheidung 88).

## Grundentscheidung 91 – Ausgewählten Pin bei geöffnetem Bedienfeld sichtbar halten

**Beschlossen (Variante A):** Wenn das von unten nach oben wachsende Pin-Detail-/Bearbeitungsfeld den ausgewählten Pin verdecken würde, **verschiebt pin2map den sichtbaren Kartenausschnitt bei Bedarf automatisch gerade so weit, dass das Pin-Symbol oberhalb des Bedienfelds sichtbar bleibt**.

**Konsequenzen:**
- Die automatische Verschiebung betrifft nur den sichtbaren Kartenausschnitt, **nicht die gespeicherten Koordinaten** des Pins oder anderer Pins.
- Die Zoomstufe wird dadurch nicht verändert.
- Wenn der Pin ohnehin sichtbar bleibt, wird die Karte nicht unnötig verschoben.
- Die Anpassung berücksichtigt die tatsächliche Höhe des Bedienfelds, auch wenn sich diese beim Wechsel zu einem anderen Pin ändert (Grundentscheidungen 88–90).
- Das Bedienfeld bleibt unten verankert; der ausgewählte Pin muss in der verbleibenden Kartenfläche nach Möglichkeit gut erkennbar bleiben.
- Die automatische Anpassung beim Öffnen oder Wechseln der Pin-Ansicht ist von der bewussten manuellen Kartenbewegung zu unterscheiden: Manuelles Verschieben der Karte darf die Auswahl weiterhin erhalten (Grundentscheidung 85).
- Wie sich die Kartenansicht beim späteren Schließen des Bedienfelds verhält, wird gesondert festgelegt.

## Grundentscheidung 92 – Kartenposition beim Schließen des Pin-Bedienfelds beibehalten

**Beschlossen (Variante A):** Beim Schließen des unteren Pin-Detail-/Bearbeitungsfelds **bleibt die Karte in der zuletzt angezeigten Position**. Es erfolgt **keine automatische Rückbewegung** zum Kartenausschnitt vor dem Öffnen des Bedienfelds, auch wenn die Karte zum Sichtbarhalten eines Pins automatisch verschoben wurde.

**Konsequenzen:**
- Zwischenzeitliche bewusste Kartenverschiebungen des Benutzers bleiben vollständig erhalten.
- Die Zoomstufe wird durch das Schließen des Bedienfelds nicht verändert.
- Bereits gespeicherte Pin-Koordinaten bleiben unverändert.
- Die automatische Kartenverschiebung beim Öffnen/Wechseln einer Pin-Ansicht nach Grundentscheidung 91 bleibt bestehen, löst beim Schließen jedoch keine automatische Rückkehr aus.
- Bei erneutem Öffnen einer Pin-Ansicht darf die Karte wiederum nur dann angepasst werden, wenn das Bedienfeld den ausgewählten Pin sonst verdecken würde.

## Grundentscheidung 93 – Aktion „Pin auf Karte zeigen“

**Beschlossen (Variante A):** Das untere Pin-Detail-/Bearbeitungsfeld bietet für den aktuell ausgewählten Pin die bewusst auslösbare Aktion **„Pin auf Karte zeigen“**. Nach Betätigung wird der Kartenausschnitt bei Bedarf so verschoben, dass das Pin-Symbol wieder **im sichtbaren Kartenbereich oberhalb des geöffneten Bedienfelds** erscheint.

**Konsequenzen:**
- Die Aktion wird nur durch ausdrückliches Antippen/Anklicken ausgelöst; es erfolgt kein automatisches Zurückspringen bei normalem Verschieben oder Zoomen (Grundentscheidungen 85, 86 und 92).
- Die Zoomstufe bleibt unverändert; lediglich die Kartenansicht wird bei Bedarf verschoben.
- Die gespeicherten Koordinaten und die Ebenenzugehörigkeit des Pins bleiben unverändert.
- Ist der ausgewählte Pin bereits ausreichend sichtbar, wird die Karte nicht unnötig verschoben.
- Die Pin-Auswahl und das Bedienfeld bleiben während und nach der Aktion geöffnet.
- Die Positionierung berücksichtigt die tatsächlich sichtbare Kartenfläche oberhalb des mitwachsenden Pin-Bedienfelds (Grundentscheidungen 89–91).

## Grundentscheidung 94 – Button „Pin zeigen“ nur bei nicht sichtbarem Pin

**Beschlossen (Variante A mit verbindlicher Ergänzung):** Das untere Pin-Bedienfeld zeigt einen **direkt erreichbaren Button mit Symbol und Beschriftung „Pin zeigen“ ausschließlich dann**, wenn der aktuell ausgewählte Pin **im tatsächlich sichtbaren Kartenbereich nicht sichtbar** ist. Solange der Pin sichtbar ist, bleibt der Button ausgeblendet.

**Konsequenzen:**
- Der Button ist bei Bedarf mit einem einzigen Antippen ohne weiteres Menü nutzbar.
- Der durch das untere Bedienfeld verdeckte Kartenbereich zählt bei der Sichtbarkeitsprüfung nicht als sichtbar.
- Kartenbewegungen, Zoom, Pin-Wechsel und Änderungen der Bedienfeldhöhe aktualisieren den Button-Zustand.
- Die Aktion verschiebt bei Bedarf den Kartenausschnitt zum ausgewählten Pin, ohne Zoomstufe oder gespeicherte Pin-Koordinaten zu ändern (Grundentscheidung 93).
- Sobald der Pin sichtbar ist, verschwindet der Button wieder. Die Pin-Auswahl bleibt bestehen.
- Das Ein- und Ausblenden darf keine störenden Layoutsprünge oder Rückkopplung mit der automatischen Bedienfeldhöhe auslösen (Grundentscheidung 90).

## Grundentscheidung 95 – Automatische Kartenverschiebungen ohne Animation

**Beschlossen (Variante B):** Automatische Kartenverschiebungen, mit denen pin2map den ausgewählten Pin beim Öffnen bzw. Anpassen des unteren Bedienfelds sichtbar hält oder nach Auslösen von **„Pin zeigen“** wieder in den sichtbaren Kartenbereich bringt, erfolgen **sofort und ohne Übergangsanimation**.

**Konsequenzen:**
- Die Kartenansicht springt unmittelbar in den benötigten Kartenausschnitt; es gibt kein sanftes oder zeitlich verzögertes Verschieben.
- Die Zielposition wird nur soweit angepasst, wie zur Sichtbarkeit des ausgewählten Pins oberhalb des Bedienfelds erforderlich (Grundentscheidungen 91 und 93).
- Die gespeicherten Pin-Koordinaten und die Zoomstufe bleiben dabei unverändert.
- Der Button „Pin zeigen“ erscheint weiterhin nur, wenn der ausgewählte Pin nicht sichtbar ist, und verschwindet nach erfolgreicher Rückführung (Grundentscheidung 94).
- Manuelle Kartenbewegungen sowie die bestehende Pin-Auswahl bleiben von dieser Darstellungsentscheidung unberührt.

## Grundentscheidung 96 – Pin-Koordinaten im unteren Bedienfeld anzeigen

**Beschlossen (Variante A):** In der ersten Basisversion werden **Breiten- und Längengrad des ausgewählten Pins als Zahlenwerte im unteren Pin-Detail-/Bearbeitungsfeld angezeigt**. Die Koordinaten sind dort **nicht direkt editierbar**; zur Änderung des Standorts dient ausschließlich der explizite Pin-Verschiebemodus (Grundentscheidungen 30–35).

**Konsequenzen:**
- Breiten- und Längengrad werden eindeutig beschriftet und aus den aktuell gespeicherten Pin-Koordinaten abgeleitet.
- Eine bestätigte Pin-Verschiebung aktualisiert die angezeigten Werte; eine abgebrochene Verschiebung verändert die gespeicherten Werte nicht.
- Die Anzeige dient der Information und erlaubt keine versehentliche Änderung durch Texteingabe.
- Die zusätzlichen Angaben werden im nach oben mitwachsenden unteren Bedienfeld untergebracht (Grundentscheidungen 89 und 90).
- Das genaue Zahlenformat wird in Grundentscheidung 97 festgelegt.

## Grundentscheidung 97 – Koordinaten als Dezimalgrad anzeigen

**Beschlossen (Variante A):** Die geografischen Koordinaten des ausgewählten Pins werden im unteren Pin-Detail-/Bearbeitungsfeld als **Dezimalgrad im Bezugssystem WGS 84** dargestellt. Breiten- und Längengrad sind eindeutig beschriftet; die Anzeige verwendet **beispielsweise sechs Nachkommastellen**.

**Konsequenzen:**
- Die Darstellung ist kompakt und für digitale Karten geeignet. Beispiele: Breitengrad `48,775846°`, Längengrad `9,182932°`.
- Für die deutsche Benutzeroberfläche kann ein Dezimalkomma angezeigt werden; intern gespeicherte numerische Koordinaten dürfen nicht durch eine gerundete Anzeigefassung ersetzt werden.
- Die Koordinaten bleiben im Bedienfeld reine, nicht direkt editierbare Informationen (Grundentscheidung 96).
- Nach bestätigter Pin-Verschiebung werden die dargestellten Werte aktualisiert, ohne zusätzliche Rundung der dauerhaft gespeicherten Koordinaten.
- Das genaue Verhalten beim Kopieren von Koordinaten wird in Grundentscheidung 98 festgelegt.

## Grundentscheidung 98 – Koordinaten mit einem Button kopieren

**Beschlossen (Variante A):** Die erste Basisversion bietet im unteren Pin-Bedienfeld einen **direkt erreichbaren Button „Koordinaten kopieren“**. Er übernimmt den Breiten- und Längengrad des aktuell ausgewählten Pins **gemeinsam als eindeutig getrenntes Dezimalgrad-Paar** in die Zwischenablage.

**Konsequenzen:**
- Die Kopierfunktion ist ohne zusätzliches Menü erreichbar und erfordert kein manuelles Markieren der angezeigten Zahlen.
- Die Reihenfolge ist eindeutig: zuerst Breitengrad, dann Längengrad.
- Die Zwischenablage erhält maschinenlesbare Dezimalzahlen mit Punkt als Dezimaltrennzeichen, unabhängig von der lokalisierten Darstellung mit Komma, beispielsweise `48.775846, 9.182932`.
- Nach erfolgreichem Kopieren erhält der Benutzer eine kurze Bestätigung; ein Fehler beim Zugriff auf die Zwischenablage wird verständlich angezeigt und nicht als Erfolg ausgegeben.
- Die Aktion ändert weder Pin-Koordinaten noch sonstige gespeicherte Daten.
- Die Anzeige der Koordinaten als WGS-84-Dezimalgrad und die Bearbeitung nur durch den expliziten Verschiebemodus bleiben unverändert (Grundentscheidungen 96 und 97).

## Grundentscheidung 99 – Ebenenzugehörigkeit direkt im Pin-Bedienfeld ändern

**Beschlossen (Variante A):** Die aktuelle Ebene eines ausgewählten Pins wird im unteren Pin-Detail-/Bearbeitungsfeld **direkt in einem Auswahlfeld** angezeigt. Darüber kann der Benutzer eine andere bereits vorhandene Ebene auswählen, einschließlich der Systemebene **„Privat“**.

**Konsequenzen:**
- Jeder Pin gehört weiterhin zu jedem Zeitpunkt **genau einer Ebene**. Eine Mehrfachzuordnung ist ausgeschlossen (Grundentscheidung 1).
- Die Änderung der Ebenenzugehörigkeit wird nach bewusster Auswahl **sofort lokal gespeichert**, entsprechend dem Prinzip automatischer Speicherung (Grundentscheidung 29).
- Nach erfolgreicher Änderung erhält der Pin unmittelbar die Farbe seiner neuen Ebene (Grundentscheidungen 66–71).
- Die Änderung betrifft die Ebenenzugehörigkeit des Pins, nicht die aktive Ebene für das Hinzufügen neuer Pins.
- Die aktuelle Ebenenzugehörigkeit ist ohne zusätzlichen Dialog oder Menü sichtbar.
- Das Verhalten beim Wechsel eines Pins zu einer derzeit ausgeblendeten Ebene wird gesondert festgelegt.

## Grundentscheidung 100 – Zuordnung zu ausgeblendeter Ebene ohne automatisches Einblenden

**Beschlossen (Variante A):** Wird einem ausgewählten Pin im unteren Pin-Bedienfeld eine **derzeit ausgeblendete Ebene** zugeordnet, wird die neue Ebenenzugehörigkeit **sofort lokal gespeichert**, die gewählte Ebene **bleibt jedoch ausgeblendet**. Der Pin verschwindet deshalb von der Karte. pin2map zeigt einen kurzen, verständlichen Hinweis auf diesen Zusammenhang.

**Konsequenzen:**
- Die bewusste Einstellung zur Sichtbarkeit einer Ebene wird durch das Umordnen eines Pins nicht geändert.
- Die Ebenenzugehörigkeit bleibt eindeutig: Jeder Pin gehört weiterhin genau einer Ebene an (Grundentscheidung 1).
- Die Änderung wird gemäß Grundentscheidung 99 ohne zusätzliches Bestätigungsfenster gespeichert.
- Der Hinweis informiert, dass der Pin wegen der ausgeblendeten Zielebene nicht mehr auf der Karte zu sehen ist. Andere Ebenen und Pins bleiben unverändert.
- Der Pin bleibt mit seinen Daten lokal erhalten und erscheint wieder, sobald seine Ebene bewusst eingeblendet wird.
- Wie das bereits geöffnete Pin-Bedienfeld unmittelbar nach dem Verschwinden des ausgewählten Pins reagieren soll, wird in Grundentscheidung 101 entschieden.

## Grundentscheidung 101 – Pin-Bedienfeld bleibt nach Zuordnung zu ausgeblendeter Ebene geöffnet

**Beschlossen (Variante A):** Wird ein ausgewählter Pin im unteren Pin-Bedienfeld einer **ausgeblendeten Ebene** zugeordnet, **bleiben das Pin-Bedienfeld geöffnet und der Pin zunächst ausgewählt**, obwohl der Pin selbst wegen der Ebenensichtbarkeit **nicht mehr auf der Karte dargestellt wird**.

**Konsequenzen:**
- Die neue Ebenenzugehörigkeit wird sofort lokal gespeichert; die Sichtbarkeit der Zielebene ändert sich nicht (Grundentscheidungen 99 und 100).
- Das direkte Auswahlfeld zeigt die neue Ebene an und ermöglicht eine unmittelbare Korrektur durch die Wahl einer anderen Ebene.
- Es erfolgt kein erzwungenes Anzeigen des Pins oder der ausgeblendeten Ebene. Eine Auswahl im Bedienfeld bedeutet nicht, dass das Pin-Symbol trotz ausgeblendeter Ebene sichtbar sein muss.
- Der kurze Hinweis auf die Ursache des Verschwindens bleibt Bestandteil der Benutzerführung (Grundentscheidung 100).
- Die vorhandenen Regeln zum bewussten Abwählen und Wechseln von Pins gelten weiter, soweit sie im aktuellen Kartenkontext nutzbar sind (Grundentscheidungen 84 und 87–88).
- Was die Aktion „Pin zeigen“ bei einem ausgewählten Pin in einer ausgeblendeten Ebene leisten soll, wird in Grundentscheidung 102 festgelegt.

## Grundentscheidung 102 – Ebene bewusst einblenden statt über „Pin zeigen“

**Beschlossen (Variante A):** Ist ein Pin ausgewählt, dessen Ebene ausgeblendet ist, wird der Button **„Pin zeigen“ nicht angeboten**. Stattdessen erscheint im geöffneten Pin-Bedienfeld ein verständlicher Hinweis mit der bewusst auslösbaren Aktion **„Ebene einblenden“**. Erst wenn die Ebene sichtbar ist, greifen die normalen Regeln für „Pin zeigen“ (Grundentscheidungen 93 und 94).

**Konsequenzen:**
- Die Aktion „Pin zeigen“ ändert niemals die Sichtbarkeit einer Ebene; Kartenposition und Ebenensichtbarkeit bleiben getrennte Bedienvorgänge.
- Die Aktion „Ebene einblenden“ ändert nach bewusstem Antippen die Sichtbarkeit der betreffenden Ebene; damit werden alle ihre Pins wieder sichtbar, nicht nur der ausgewählte Pin.
- Die Pin-Auswahl und das untere Bedienfeld bleiben währenddessen erhalten (Grundentscheidung 101).
- Nach dem Einblenden wird geprüft, ob der ausgewählte Pin innerhalb des tatsächlich sichtbaren Kartenbereichs liegt. Nur falls er nicht sichtbar ist, erscheint gemäß Grundentscheidung 94 der Button „Pin zeigen“.
- Das Einblenden der Ebene führt nicht automatisch zu einer Kartenverschiebung. Die Zoomstufe und die gespeicherten Pin-Koordinaten bleiben unverändert.
- Die vom Benutzer bewusst festgelegte Sichtbarkeit anderer Ebenen bleibt unberührt.

## Grundentscheidung 103 – Sichtbarkeitssymbol der zugeordneten Ebene im Pin-Bedienfeld

**Beschlossen (Variante A):** Im unteren Pin-Detail-/Bearbeitungsfeld wird **neben oder unter dem Ebenenauswahlfeld ein gut verständliches Sichtbarkeitssymbol** für die aktuell zugeordnete Ebene angezeigt: beispielsweise **Auge** bei sichtbarer Ebene und **durchgestrichenes Auge** bei ausgeblendeter Ebene.

**Konsequenzen:**
- Das Symbol zeigt ausschließlich den **aktuellen Sichtbarkeitszustand der Ebene** an; es ist kein zusätzlicher Schalter.
- Auch nach dem Wechsel der Ebenenzugehörigkeit eines Pins oder nach Änderungen in der Ebenenverwaltung wird der Zustand unmittelbar aktualisiert (Grundentscheidung 99).
- Ist die Ebene ausgeblendet, bleibt die bewusst auszulösende Aktion **„Ebene einblenden“** separat verfügbar (Grundentscheidung 102); der normale Button „Pin zeigen“ wird in diesem Zustand nicht angeboten.
- Die Anzeige soll durch eindeutige Gestaltung bzw. zugängliche Beschriftung auch ohne Interpretation allein der Symbolform verständlich sein.
- Die Sichtbarkeit eines Pins auf der Karte hängt weiterhin von der Sichtbarkeit seiner Ebene ab; das Symbol verändert keine gespeicherten Daten.

## Grundentscheidung 104 – Augensymbol bleibt reine Sichtbarkeitsanzeige

**Beschlossen (Variante A):** Das Augensymbol neben dem Ebenenauswahlfeld im unteren Pin-Detail-/Bearbeitungsfeld dient **ausschließlich als Anzeige** der aktuellen Ebenensichtbarkeit. Es ist **kein antippbarer oder anklickbarer Schalter** zum Ein- oder Ausblenden der Ebene.

**Konsequenzen:**
- Der Benutzer kann die Sichtbarkeit von Ebenen weiterhin in der Ebenenverwaltung ändern.
- Ist die Ebene des ausgewählten Pins ausgeblendet, steht die ausdrücklich beschlossene separate Aktion „Ebene einblenden“ zur Verfügung (Grundentscheidung 102).
- Die Anzeige aktualisiert sich, wenn sich die Sichtbarkeit oder Ebenenzugehörigkeit ändert (Grundentscheidungen 99 und 103).
- Antippen des Symbols darf keine Sichtbarkeitsänderung und keine andere Aktion auslösen.
- Dadurch wird das versehentliche Ausblenden einer gesamten Ebene aus der Pin-Bearbeitung heraus vermieden.

## Grundentscheidung 105 – Pin-Namen direkt im Bedienfeld bearbeiten

**Beschlossen (Variante A):** Der optionale Name des ausgewählten Pins ist im unteren Pin-Detail-/Bearbeitungsfeld **unmittelbar als bearbeitbares Textfeld** vorhanden. Es ist weder ein zusätzlicher Button „Name bearbeiten“ noch ein separater Speichern-Button erforderlich.

**Konsequenzen:**
- Ein vorhandener Name wird direkt im Eingabefeld angezeigt; bei unbenannten Pins kann dort optional ein Name ergänzt werden.
- Änderungen werden entsprechend der automatischen Speicherung aus Grundentscheidung 29 lokal gespeichert.
- Eine leere Eingabe ist erlaubt, weil der Pin-Name optional ist (Grundentscheidung 6).
- Die Kartenbeschriftung eines Pins wird entsprechend der gespeicherten Namensänderung aktualisiert (Grundentscheidungen 72–79).
- Das direkte Wechseln zwischen ausgewählten Pins bleibt möglich; ausstehende Speichervorgänge dürfen keine Namen eines anderen Pins überschreiben (Grundentscheidung 88).
- Der genaue Zeitpunkt, zu dem eingegebene Änderungen übernommen werden, wird in Grundentscheidung 106 konkretisiert.

## Grundentscheidung 106 – Automatische Namensspeicherung nach Eingabepause

**Beschlossen (Variante A):** Änderungen im direkt bearbeitbaren Namensfeld werden **automatisch nach einer kurzen Eingabepause (Debounce)** lokal gespeichert. Zusätzlich wird eine noch ausstehende Eingabe **beim Verlassen des Felds oder beim Wechsel zu einem anderen Pin zuverlässig gespeichert**.

**Konsequenzen:**
- Ein separater Speichern-Button ist nicht vorgesehen (Grundentscheidungen 29 und 105).
- Während fortlaufender Eingabe werden unnötige Datenbankschreibvorgänge für jeden Tastendruck vermieden.
- Beim Abwählen, Schließen des Pin-Bedienfelds oder direkten Wechsel zwischen Pins darf keine noch ausstehende Namensänderung verloren gehen (Grundentscheidungen 84, 87 und 88).
- Asynchrone Speichervorgänge sind eindeutig an die unveränderliche Pin-ID zu binden, damit eine verspätete Speicherung nicht versehentlich einen anderen Pin verändert.
- Nach erfolgreichem Speichern wird die Kartenbeschriftung aktualisiert; Speicherfehler sind verständlich erkennbar zu machen.
- Die konkrete Länge der kurzen Eingabepause wird bei der Umsetzung einheitlich festgelegt und getestet.

## Grundentscheidung 107 – Pin-Namen auf maximal 120 Zeichen begrenzen

**Beschlossen (Variante A):** Optionale Pin-Namen haben in der ersten Basisversion eine **feste maximale Länge von 120 Zeichen**. Das direkt bearbeitbare Namensfeld setzt diese Grenze verständlich durch und weist beim Erreichen darauf hin.

**Konsequenzen:**
- Ein Pin darf weiterhin einen leeren bzw. fehlenden Namen haben (Grundentscheidungen 6 und 105).
- Ein Name mit mehr als 120 Zeichen wird bei manueller Eingabe nicht ungefragt abgeschnitten und gespeichert; das Eingabefeld begrenzt die Eingabe bzw. zeigt eine verständliche Validierung.
- Die Begrenzung ist auch bei Import und Datenvalidierung zu beachten; ungültige Eingaben werden nicht stillschweigend verändert.
- Auch innerhalb des Limits werden längere Kartenbeschriftungen weiterhin einzeilig mit „…“ verkürzt (Grundentscheidungen 78 und 79). Der vollständig gespeicherte Name bleibt im Pin-Bedienfeld zugänglich.
- Die automatische Speicherung nach kurzer Eingabepause bleibt bestehen (Grundentscheidung 106).

## Grundentscheidung 108 – Führende und abschließende Leerzeichen in Pin-Namen entfernen

**Beschlossen (Variante A):** Beim Speichern eines optionalen Pin-Namens werden **führende und abschließende Leerzeichen automatisch entfernt**. Besteht der eingegebene Name nach dieser Bereinigung ausschließlich aus Leerzeichen bzw. ist er leer, bleibt der Pin **unbenannt**.

**Konsequenzen:**
- Leerzeichen zwischen Wörtern bleiben erhalten; nur der Rand des Namens wird bereinigt.
- Das Verhalten gilt auch für automatisch gespeicherte Eingaben nach einer kurzen Eingabepause sowie beim Verlassen des Feldes (Grundentscheidungen 105 und 106).
- Für die maximale Namenslänge von 120 Zeichen ist der bereinigte Name maßgeblich (Grundentscheidung 107).
- Der bereinigte Name wird in der Pin-Ansicht und gegebenenfalls in der Kartenbeschriftung angezeigt (Grundentscheidungen 72–79).
- Validierung und Import müssen dieselbe fachliche Namensregel berücksichtigen; importierte Daten dürfen nicht unbemerkt semantisch verändert werden.

## Grundentscheidung 109 – Pin-Namen sind einzeilig

**Beschlossen (Variante A):** Pin-Namen sind in der ersten Basisversion **stets einzeilige Texte**. **Zeilenumbrüche sind in Pin-Namen nicht zulässig**; das direkt bearbeitbare Namensfeld erlaubt keine Eingabe zusätzlicher Zeilen.

**Konsequenzen:**
- Die Eingabetaste erzeugt im Namensfeld keinen Zeilenumbruch.
- Die Regel gilt für manuelle Eingaben sowie für die Validierung von importierten Daten. Unzulässige Zeilenumbrüche dürfen beim Import nicht stillschweigend verändert werden.
- Der optionale Name darf leer bleiben; die maximale Länge beträgt 120 Zeichen, und Rand-Leerzeichen werden beim Speichern entfernt (Grundentscheidungen 107 und 108).
- Auch die Kartenbeschriftungen bleiben wie beschlossen einzeilig und werden bei Platzmangel mit „…“ gekürzt (Grundentscheidungen 78 und 79).
- Eine spätere ausführliche Beschreibung wäre fachlich von dem kurzen Pin-Namen getrennt.

## Grundentscheidung 110 – Gleiche Pin-Namen innerhalb einer Ebene zulassen

**Beschlossen (Variante A):** Mehrere unterschiedliche Pins dürfen **denselben Namen** tragen, auch wenn sie **derselben Ebene** angehören. Pin-Namen müssen nicht eindeutig sein.

**Konsequenzen:**
- Die eindeutige Identität eines Pins ergibt sich ausschließlich aus seiner stabilen Pin-ID, nicht aus seinem Namen oder seinen Koordinaten (Grundentscheidung 6).
- Das Anlegen, Bearbeiten, Importieren und Verschieben von Pins darf einen bereits verwendeten Pin-Namen nicht als Fehler behandeln.
- Pins mit identischem Namen bleiben eigenständige Objekte; Änderungen oder Löschungen betreffen immer den anhand seiner ID gewählten Pin.
- Die für Ebenennamen beschlossene Eindeutigkeitsregel (Grundentscheidung 13) bleibt davon unberührt.
- Die bestehenden Regeln für optionale, einzeilige und maximal 120 Zeichen lange Pin-Namen gelten weiterhin (Grundentscheidungen 107–109).

## Grundentscheidung 111 – Kein Beschreibungsfeld für Pins in der Basisversion

**Beschlossen (Variante A):** Die erste Basisversion enthält **kein separates Beschreibungs- oder Notizfeld** für Pins. Ein Pin besitzt weiterhin seinen optionalen Namen, geografische Koordinaten, seine stabile ID und genau eine Ebenenzugehörigkeit. Ein ergänzendes Beschreibungsfeld bleibt einem späteren Ausbauschritt vorbehalten.

**Konsequenzen:**
- Das untere Pin-Bedienfeld bleibt auf die beschlossenen Basisfunktionen fokussiert: Namen bearbeiten, Ebenenzugehörigkeit ändern, Koordinaten anzeigen/kopieren sowie explizite Aktionen wie Verschieben und Löschen.
- Datenmodell, Speicherung, Validierung sowie Export/Import der ersten Basisversion benötigen kein fachliches Beschreibungsfeld.
- Die Namenslänge von maximal 120 Zeichen wird nicht zur Behelfslösung für längere Notizen aufgeweicht (Grundentscheidung 107).
- Es wird kein Foto- oder sonstiges Medienfeld aus dieser Entscheidung abgeleitet.

## Grundentscheidung 112 – „Pin löschen“ direkt im Pin-Bedienfeld sichtbar

**Beschlossen (Variante A):** Im unteren Pin-Detail-/Bearbeitungsfeld gibt es einen **direkt sichtbaren, eindeutig als „Pin löschen“ beschrifteten Button**. Er ist optisch von den gewöhnlichen Bearbeitungsfunktionen getrennt. Das Betätigen dieses Buttons löscht **niemals sofort**, sondern öffnet stets die bereits beschlossene ausdrückliche Löschbestätigung (Grundentscheidung 36).

**Konsequenzen:**
- Die Löschaktion ist ohne zusätzliches „Weitere Aktionen“-Menü erreichbar.
- Der Button erhält eine verständliche und ausreichend deutlich erkennbare Warn-/Löschgestaltung, bleibt dabei zugänglich und auf Touch-Geräten gut bedienbar.
- Erst nach bewusster Bestätigung wird ausschließlich der ausgewählte Pin gelöscht, anhand seiner stabilen Pin-ID; ein Abbruch lässt die Daten unverändert.
- Die Löschaktion folgt der bestehenden Festlegung, dass in der Basisversion kein Papierkorb bzw. keine Rückgängig-Funktion vorgesehen ist (Grundentscheidung 37).
- Was nach einer erfolgreich bestätigten Löschung mit Pin-Auswahl und Bedienfeld geschieht, wird gesondert entschieden.

## Grundentscheidung 113 – Pin-Bedienfeld nach erfolgreicher Löschung schließen

**Beschlossen (Variante A):** Sobald der Benutzer das Löschen des ausgewählten Pins ausdrücklich bestätigt hat und die Löschung **erfolgreich lokal gespeichert** ist, wird die **Pin-Auswahl aufgehoben** und das untere **Pin-Bedienfeld automatisch geschlossen**. Der gelöschte Pin verschwindet von der Karte. **Kartenausschnitt und Zoomstufe bleiben unverändert.** Eine kurze Meldung **„Pin gelöscht“** bestätigt den erfolgreichen Vorgang.

**Konsequenzen:**
- Das Pin-Bedienfeld wird erst nach bestätigter, erfolgreicher Datenlöschung geschlossen, nicht bereits beim Öffnen der Sicherheitsabfrage.
- Wird die Löschung abgebrochen oder schlägt sie fehl, bleiben Pin-Auswahl und Bedienfeld bestehen; bei Fehlern erscheint ein verständlicher Hinweis.
- Nach erfolgreichem Löschen darf keine Aktion mehr auf den gelöschten Pin angewendet werden.
- Die Aktion bleibt ohne Papierkorb oder Rückgängig-Funktion (Grundentscheidungen 36 und 37).
- Es erfolgt kein automatisches Verschieben oder Zoomen der Karte.

## Grundentscheidung 114 – Einfache allgemeine Löschbestätigung

**Beschlossen (Variante B):** Die Bestätigungsabfrage vor dem Löschen eines einzelnen Pins bleibt **kurz und allgemein**. Sie zeigt die Frage **„Pin wirklich löschen?“** sowie die beiden eindeutigen Aktionen **„Abbrechen“** und **„Löschen“**. Der Name des ausgewählten Pins wird in der Sicherheitsabfrage **nicht erneut genannt**.

**Konsequenzen:**
- Die bereits beschlossene ausdrückliche Bestätigung vor jeder Pin-Löschung bleibt verpflichtend (Grundentscheidung 36).
- Der Löschdialog bezieht sich auf den beim Öffnen ausgewählten Pin und löscht bei Bestätigung ausschließlich diesen anhand seiner stabilen ID.
- **„Abbrechen“** schließt den Dialog ohne Änderung an den Daten.
- **„Löschen“** führt nach Bestätigung die lokale Löschung aus. Erst nach Erfolg werden Auswahl und Pin-Bedienfeld geschlossen und die Meldung „Pin gelöscht“ angezeigt (Grundentscheidung 113).
- Die Löschaktion ist weiterhin im Pin-Bedienfeld direkt sichtbar (Grundentscheidung 112); in der Basisversion gibt es keinen Papierkorb (Grundentscheidung 37).

## Verbindliche Basisanforderung – Ortsnamensuche und Pin-Erstellung (Ergänzung vor Grundentscheidung 115)

**Verbindlich beschlossen:** Bereits die **erste Basisversion** von pin2map bietet die **Suche nach einem Ortsnamen bzw. geografischen Objekt** (beispielsweise „Oxford“) und ermöglicht, daraus direkt einen Pin zu erstellen. Diese Funktion ist keine spätere Erweiterung.

**Verbindliches Nutzerverhalten:**
- Benutzer können einen Ortsnamen in ein Suchfeld eingeben und eine Ortssuche auslösen.
- Liefert die Suche **mehrere plausible Treffer**, erscheint eine **Auswahlliste** mit genügend Zusatzinformationen zur Unterscheidung (beispielsweise Land/Region).
- Durch bewusste Auswahl eines Listeneintrags wird an den Koordinaten des ausgewählten Orts **ein Pin angelegt**.
- Ist der Ort **eindeutig ermittelt** (genau ein ausreichend verlässlicher Treffer), kann der Pin **direkt ohne Trefferliste** angelegt werden.
- Das Ergebnis ist ein regulärer Pin mit stabiler ID, geografischen Koordinaten und **genau einer Ebene**; die bestehenden Regeln zum Erstellen, Speichern und Bearbeiten von Pins gelten.
- Ortsnamensuche ist **geografische Suche** (Geocoding), nicht lediglich die Suche unter bereits vorhandenen Pins.
- Bei **keinem Treffer**, **unklarer Zuordnung** oder **Verbindungs-/Dienstfehler** darf kein falscher Pin stillschweigend angelegt werden; die Anwendung informiert verständlich.
- Anbieter/Geocoding-Dienst, Offline-Verhalten, Umgang mit der aktiven Ebene und genaue Kriterien für „eindeutig“ sind noch technische bzw. fachliche Umsetzungsdetails; sie dürfen den hier beschlossenen Funktionsumfang nicht einschränken.
- Für eine Suche über einen externen Geocoding-Dienst wird eine Internetverbindung benötigt; die bereits lokale Offline-Pinverwaltung bleibt unabhängig davon funktionsfähig.

**Einordnung:** Diese explizit vom Auftraggeber ergänzte Basisanforderung gilt unabhängig davon, ob für die Umsetzungsstrategie der noch offenen Grundentscheidung 115 Variante A oder B gewählt wird.

## Grundentscheidung 115 – Schrittweise lauffähige Umsetzung einschließlich Ortsnamensuche

**Beschlossen (Variante A):** pin2map wird im bestehenden GitHub-Test-Repository **schrittweise als jederzeit lauffähige und testbare PWA** umgesetzt. Die erste durchgängige Entwicklungsstufe umfasst Kartenansicht, Ebenen, Pins, lokale Speicherung über IndexedDB **und die verbindlich zur Basisversion gehörende geografische Ortsnamensuche mit Pin-Erstellung**. Danach werden weitere bereits beschlossene Basisfunktionen und Bedienungsdetails in überschaubaren, prüfbaren Schritten ergänzt.

**Konsequenzen:**
- Die in der vorangehenden verbindlichen Basisanforderung festgelegte **Ortsnamensuche** ist ausdrücklich Teil der frühen testbaren Anwendung und wird nicht auf eine spätere Ausbaustufe verschoben.
- Ein eingegebener Ortsname kann über Geocoding zu einer Liste mehrerer plausibler Treffer führen; aus dieser Liste kann ein Ort ausgewählt und dort ein Pin erstellt werden. Bei **hinreichend eindeutigem** Ergebnis ist direkte Pin-Erstellung vorgesehen.
- Neue Pins aus Suchergebnissen folgen den bereits beschlossenen Regeln zu stabiler ID, genau einer Ebene, lokaler Speicherung und anschließender Bearbeitung.
- Jede Entwicklungsstufe soll eigenständig start- und testbar bleiben. Die weiteren bereits beschlossenen Basisfunktionen werden iterativ ergänzt, nicht aufgegeben.
- Eine spätere Server-/Synchronisationsintegration folgt erst nach einer stabilen lokalen Basis (Grundentscheidung 3).
- Ungeklärte Einzelheiten des Geocodings werden gesondert entschieden; sie ändern nicht den verpflichtenden Umfang der Ortssuche.

## Grundentscheidung 116 – Direkte Pin-Erstellung nur bei genau einem geeigneten Ortssuchtreffer

**Beschlossen (Variante A):** Die verbindlich zur ersten Basisversion gehörende **Ortsnamensuche** erstellt einen Pin **nur dann ohne Treffer-Auswahlliste**, wenn der Geocoding-Dienst **genau einen geeigneten geografischen Treffer** liefert. Sobald mehrere plausible Orte gefunden werden, zeigt pin2map **immer eine Auswahlliste**, aus der der Benutzer bewusst den gewünschten Ort auswählt. Der vermeintlich relevanteste Treffer darf nicht automatisch vorgezogen werden.

**Konsequenzen:**
- Genau ein geeigneter Treffer: Pin an den zugehörigen Koordinaten direkt erstellen und gemäß den bestehenden Pin-Regeln lokal speichern.
- Mehrere plausible Treffer: geeignete Treffer unterscheidbar mit Zusatzinformationen (insbesondere Ort, Region, Land) anzeigen; erst nach bewusster Auswahl einen Pin erstellen.
- Kein geeigneter Treffer, fehlerhafte oder unklare Ergebnisse: **keinen Pin erstellen** und eine verständliche Meldung anzeigen.
- Eine Rangfolge oder ein Relevanzwert des Geocoding-Anbieters ersetzt niemals die bewusste Auswahl, sobald mehrere plausible Treffer vorhanden sind.
- Diese Regel gilt unabhängig vom später ausgewählten Geocoding-Anbieter und schützt vor versehentlich falsch gesetzten Pins.
- Die bereits beschlossene **Ortsnamensuche bleibt obligatorischer Bestandteil der ersten testbaren Basisversion** (Basisanforderung Ortsnamensuche und Grundentscheidung 115).

## Grundentscheidung 117 – Nach Ortsnamensuche zum neuen Pin springen

**Beschlossen (Variante A):** Wird ein Pin über die verbindlich zur Basisversion gehörende **geografische Ortsnamensuche** erstellt – sowohl nach genau einem geeigneten Suchtreffer als auch nach Auswahl aus mehreren Treffern –, **springt die Kartenansicht unmittelbar zum neu angelegten Pin** und stellt ihn mit **einer geeigneten Zoomstufe gut sichtbar** dar.

**Konsequenzen:**
- Der aus dem Suchergebnis angelegte Pin wird nach erfolgreicher lokaler Speicherung ausgewählt; das untere Pin-Bedienfeld öffnet sich entsprechend dem allgemeinen Erstellungsverhalten (Grundentscheidung 28).
- Die Karte wird zum tatsächlichen Standort des neuen Pins bewegt, damit die Auswahl überprüfbar ist. Die gespeicherten Pin-Koordinaten werden dadurch nicht verändert.
- Der Zielausschnitt berücksichtigt den Platzbedarf des geöffneten unteren Bedienfelds: der ausgewählte Pin soll im unbedeckten Kartenbereich sichtbar sein (Grundentscheidungen 89–94).
- Die zuvor eingestellte Kartenposition und Zoomstufe müssen für diesen Suchvorgang nicht beibehalten werden; die neue Kartenansicht wird gemäß den allgemeinen Regeln lokal gespeichert (Grundentscheidung 22).
- Unklare Suchergebnisse oder Fehler legen weiterhin keinen Pin an (Grundentscheidung 116).
- Die **Ortsnamensuche bleibt verpflichtender Bestandteil der ersten Basisversion** (verbindliche Basisanforderung und Grundentscheidung 115).

## Grundentscheidung 118 – Ortsnamen bei der Pin-Erstellung aus Suchergebnissen übernehmen

**Beschlossen (Variante A):** Wenn ein Pin durch die **verbindlich zur Basisversion gehörende geografische Ortsnamensuche** angelegt wird, wird sein Namensfeld **automatisch mit dem kurzen Ortsnamen des gewählten bzw. eindeutig gefundenen Suchergebnisses vorbelegt** (beispielsweise „Oxford“).

**Konsequenzen:**
- Die automatische Vorbelegung gilt sowohl bei genau einem geeigneten Treffer als auch nach der bewussten Auswahl aus mehreren Treffern (Grundentscheidung 116).
- Der Name ist weiterhin **optional** und kann im nach der Erstellung geöffneten Pin-Bedienfeld direkt geändert oder vollständig gelöscht werden (Grundentscheidungen 6, 28 und 105).
- Für die Übernahme gelten die bestehenden Namensregeln: höchstens 120 Zeichen, keine Zeilenumbrüche sowie Entfernung führender und abschließender Leerzeichen (Grundentscheidungen 107–109).
- Unzulässige, fehlende oder zu lange Anbieterbezeichnungen dürfen nicht unbemerkt abgeschnitten oder ungeprüft als Pin-Name gespeichert werden; eine gültige kurze Bezeichnung kann übernommen werden, sonst bleibt das Namensfeld leer und bearbeitbar.
- Der Pin wird wie beschlossen lokal gespeichert, auf der Karte angezeigt und ausgewählt; die Karte springt zum Standort des gefundenen Orts (Grundentscheidungen 115–117).
- Die Ortsnamensuche mit Pin-Erstellung ist und bleibt **verbindlicher Bestandteil der ersten Basisversion**.

## Grundentscheidung 119 – Ortsnamensuche speichert neue Pins immer in „Privat“

**Beschlossen (Variante C, ausdrücklich vom Auftraggeber eingebracht):** **Jeder über die geografische Ortsnamensuche neu angelegte Pin wird immer der Systemebene „Privat“ zugeordnet**, unabhängig davon, welche andere Ebene gerade aktiv ist oder ob überhaupt eine Ebene aktiv ist. Es erfolgt dafür **keine gesonderte Ebenenauswahl**.

**Konsequenzen:**
- Die verbindlich zur ersten Basisversion gehörende Ortsnamensuche speichert Pins nach eindeutigen Suchtreffern oder bewusster Trefferauswahl grundsätzlich in „Privat“ (Basisanforderung Ortsnamensuche, Grundentscheidungen 115–118).
- Die allgemein beschlossene Regel, manuell erzeugte Pins in der aktiven Ebene anzulegen (Grundentscheidung 7), bleibt **für manuell erstellte Pins** bestehen; die Ortsnamensuche erhält mit diesem Beschluss ausdrücklich eine **abweichende Spezialregel**.
- Die aktive Ebene bleibt unverändert; die Ortssuche aktiviert die private Ebene nicht automatisch.
- Jeder Pin gehört weiterhin genau **einer** Ebene an (Grundentscheidung 1).
- Nach der Erstellung kann der Pin über das direkte Ebenenauswahlfeld im Pin-Bedienfeld wie jeder andere Pin einer anderen Ebene zugeordnet werden (Grundentscheidung 99).
- Die private Systemebene existiert von Beginn an und kann nicht gelöscht werden (Grundentscheidungen 2, 15 und 16).
- Das bisher beschlossene automatische Springen der Karte zum neu angelegten Such-Pin und das geöffnete Pin-Bedienfeld bleiben bestehen (Grundentscheidung 117).
- Ist die Ebene „Privat“ ausgeblendet, muss die Anwendung ihre Sichtbarkeit respektieren. Die genaue Führung bei der Suche und Erstellung in dieser Situation wird in Grundentscheidung 120 geklärt.

## Grundentscheidung 120 – Ortssuch-Pin auch bei ausgeblendeter Ebene „Privat“ speichern

**Beschlossen (Variante A):** Ein über die geografische Ortsnamensuche erzeugter Pin wird **immer sofort in der Ebene „Privat“ gespeichert**, auch wenn diese Ebene gerade **ausgeblendet** ist. Die Sichtbarkeit von „Privat“ wird dabei **nicht automatisch verändert**.

**Konsequenzen:**
- Ein eindeutiger Treffer bzw. eine bewusst getroffene Auswahl aus mehreren Suchtreffern führt wie vorgesehen zur lokalen Erstellung eines Pins in „Privat“ (Grundentscheidungen 116 und 119).
- Ist „Privat“ ausgeblendet, erscheint das Pin-Symbol nicht auf der Karte. Ein verständlicher Hinweis nennt den Grund und bietet die **bewusst auszulösende Aktion „Ebene einblenden“** an (Grundentscheidung 102).
- Der neue Pin bleibt ausgewählt; das untere Pin-Bedienfeld ist geöffnet und erlaubt beispielsweise eine direkte Änderung der Ebenenzugehörigkeit (Grundentscheidungen 99 und 101).
- Die Karte darf wie in Grundentscheidung 117 beschlossen zum gefundenen Ort springen, auch wenn wegen der ausgeblendeten Ebene dort kein Pin-Symbol dargestellt wird.
- Die aktive Ebene bleibt unverändert; andere Ebenensichtbarkeiten werden nicht beeinflusst.
- Die **Ortsnamensuche bleibt ausdrücklich verbindlicher Bestandteil der ersten Basisversion**.

## Grundentscheidung 121 – Ortsnamensuche wird bewusst gestartet

**Beschlossen (Variante A):** Die geografische Ortsnamensuche der ersten Basisversion wird **erst durch eine ausdrückliche Benutzeraktion gestartet**, beispielsweise durch Betätigen eines Suchbuttons oder durch Drücken der Eingabetaste im Suchfeld. **Während des bloßen Tippens werden keine Geocoding-Anfragen verschickt.**

**Konsequenzen:**
- Es gibt eine klar erkennbare Möglichkeit, einen Ortsnamen einzugeben und die Suche bewusst auszulösen.
- Suchbutton und Eingabetaste starten denselben Suchvorgang; die Ergebnisverarbeitung folgt den Grundentscheidungen 116–120.
- Eine laufende Eingabe löst weder Anfragen noch eine automatische Pin-Erstellung aus.
- Bei einem geeigneten eindeutigen Treffer wird gemäß Grundentscheidung 116 ein Pin erstellt; bei mehreren plausiblen Treffern erscheint zunächst eine Auswahlliste.
- Nicht verfügbare Suche bzw. Verbindungsfehler müssen verständlich angezeigt werden, ohne versehentlich einen Pin zu erzeugen.
- Die Ortsnamensuche und die daraus mögliche Pin-Erstellung bleiben **verbindlicher Bestandteil der ersten Basisversion**.

## Grundentscheidung 122 – Suchtext nach erfolgreicher Pin-Erstellung beibehalten

**Beschlossen (Variante A):** Nach erfolgreicher Erstellung eines Pins über die verbindlich zur Basisversion gehörende Ortsnamensuche **bleibt der zuvor eingegebene Suchtext im Suchfeld stehen**. Eine zuvor geöffnete Trefferliste wird nach der Pin-Erstellung geschlossen.

**Konsequenzen:**
- Der zuletzt gesuchte Ortsname ist weiterhin sichtbar und kann bei Bedarf bearbeitet oder erneut gesucht werden.
- Das automatische Beibehalten des Textes löst **keine** zusätzliche Suchanfrage aus; eine neue Ortssuche benötigt weiterhin eine bewusste Aktion (Grundentscheidung 121).
- Die erfolgte Pin-Erstellung folgt weiterhin den beschlossenen Regeln: Speicherung in „Privat“, auch wenn diese Ebene ausgeblendet ist; automatische Übernahme eines gültigen Ortsnamens sowie Kartensprung zum neuen Pin (Grundentscheidungen 117–120).
- Der Suchtext bleibt nach erfolgreichem Vorgang erhalten; ob und wie er über einen Neustart hinweg erhalten bleibt, ist damit nicht festgelegt.
- Die **Ortsnamensuche bleibt verbindlicher Bestandteil der ersten Basisversion**.

## Grundentscheidung 123 – Ortsnamensuchfeld dauerhaft am oberen Kartenrand

**Beschlossen (Variante A):** Die geografische Ortsnamensuche ist in der ersten Basisversion über ein **dauerhaft sichtbares, kompaktes Suchfeld am oberen Rand der Kartenansicht** direkt erreichbar. Die Kartenansicht bleibt die Hauptansicht; für die Eingabe muss kein separates Suchmenü geöffnet werden.

**Konsequenzen:**
- Der Benutzer kann jederzeit einen Ortsnamen eingeben. Eine Anfrage an den Geocoding-Dienst wird weiterhin **erst durch bewusste Betätigung des Suchbuttons oder der Eingabetaste** ausgelöst (Grundentscheidung 121).
- Wenn mehrere plausible Suchergebnisse gefunden werden, erscheint die **Trefferliste unmittelbar am Suchfeld**. Ein Pin wird erst nach bewusster Trefferauswahl erstellt (Grundentscheidung 116).
- Bei genau einem geeigneten Treffer erfolgt die vereinbarte direkte Pin-Erstellung; neue Ortssuch-Pins werden **immer in der Ebene „Privat“** gespeichert (Grundentscheidungen 116 und 119).
- Nach der Pin-Erstellung bleibt der eingegebene Suchtext im Suchfeld stehen, die Trefferliste wird geschlossen und die Karte springt zum neuen Pin (Grundentscheidungen 117 und 122).
- Das Suchfeld muss auf kleinen Touch-Bildschirmen mit weiteren Bedienelementen der Kopfzeile vereinbar und ohne Überdeckung wichtiger Funktionen nutzbar sein.
- Die **Ortsnamensuche bleibt verbindlicher Bestandteil der ersten Basisversion**.

## Grundentscheidung 124 – Kompakte Trefferliste direkt unter dem Ortssuchfeld

**Beschlossen (Variante A):** Wenn die ausdrücklich gestartete geografische Ortsnamensuche mehrere plausible Suchergebnisse liefert, werden diese in einer **kompakten Trefferliste direkt unter dem dauerhaft sichtbaren Suchfeld** angezeigt. Bei vielen Treffern ist die Liste **vertikal scrollbar**; die Karte bleibt als Hauptansicht dahinter sichtbar.

**Konsequenzen:**
- Jeder Listeneintrag enthält eine ausreichend unterscheidbare Ortsangabe, insbesondere **Ortsname sowie Region und Land**, soweit vom Geocoding-Dienst verfügbar.
- Erst die bewusste Auswahl eines konkreten Treffers führt zur Erstellung eines Pins; bei genau einem geeigneten Treffer gilt weiterhin die automatische Erstellung ohne Liste (Grundentscheidung 116).
- Die Trefferliste verschwindet nach Auswahl oder bewusstem Schließen. Der Suchtext bleibt nach erfolgreicher Pin-Erstellung erhalten (Grundentscheidung 122).
- Die Liste wird auf schmalen Touch-Geräten so positioniert und begrenzt, dass sie ohne unbedienbare oder abgeschnittene Einträge nutzbar bleibt.
- Die Trefferliste darf nicht fälschlich die Sichtbarkeit der Karte, die Koordinaten bereits vorhandener Pins oder die aktive Ebene ändern.
- Ein durch die Ortsnamensuche angelegter Pin wird weiterhin **immer in der Ebene „Privat“** gespeichert (Grundentscheidung 119), auch wenn „Privat“ ausgeblendet ist (Grundentscheidung 120).
- **Die Ortsnamensuche ist und bleibt verbindlicher Bestandteil der ersten Basisversion.**

## Grundentscheidung 125 – Ortssuch-Trefferliste auch durch Antippen außerhalb schließen

**Beschlossen (Variante A):** Eine geöffnete Trefferliste der geografischen Ortsnamensuche lässt sich **sowohl durch Antippen bzw. Anklicken außerhalb der Liste als auch über eine eigene, gut erreichbare Schließen-Schaltfläche** schließen. Dabei wird **kein Pin angelegt**.

**Konsequenzen:**
- Das Schließen der Liste verändert weder Kartenausschnitt noch Zoomstufe, vorhandene Pins oder die gerade aktive Ebene.
- Der eingegebene Suchtext bleibt erhalten und kann ohne Neueingabe geändert oder mit einer weiteren bewussten Suche erneut verwendet werden (Grundentscheidungen 121 und 122).
- Die Trefferliste erscheint weiterhin kompakt direkt unter dem dauerhaft sichtbaren Suchfeld (Grundentscheidungen 123 und 124).
- Ein Antippen auf einen Treffer gilt als bewusste Auswahl und erstellt den entsprechenden Pin; es darf nicht zugleich als „außerhalb antippen“ behandelt werden.
- Das Schließen der Liste unterbricht nur die Ergebnisdarstellung, nicht die allgemeine Verfügbarkeit der **verbindlich zur ersten Basisversion gehörenden Ortsnamensuche**.

## Grundentscheidung 126 – Leere Ortssuchanfragen ohne Hinweis ignorieren

**Beschlossen (Variante B):** Wenn das Suchfeld bei Betätigung des Suchbuttons oder der Eingabetaste **leer ist oder ausschließlich Leerzeichen enthält**, wird der Suchversuch **ohne sichtbare Rückmeldung ignoriert**.

**Konsequenzen:**
- Es wird **keine Geocoding-Anfrage** gesendet und **kein Pin erstellt**.
- Es erscheint **keine zusätzliche Hinweismeldung** wie „Bitte einen Ort eingeben“.
- Der vorhandene Kartenausschnitt, die Ebenen und bereits gespeicherte Pins bleiben unverändert.
- Die Regel betrifft ausschließlich leere bzw. nur aus Leerzeichen bestehende Suchtexte; für gültige Suchanfragen und etwaige Geocoding-Fehler gelten die übrigen beschlossenen Regeln.
- Die **Ortsnamensuche bleibt verbindlicher Bestandteil der ersten Basisversion**.

## Grundentscheidung 127 – Ladeanzeige während der laufenden Ortsnamensuche

**Beschlossen (Variante A):** Nach bewusstem Start einer gültigen geografischen Ortsnamensuche zeigt pin2map **im Suchbereich einen kompakten Ladeindikator** an, solange die Anfrage an den Geocoding-Dienst läuft. Der **Suchbutton wird während der laufenden Anfrage vorübergehend deaktiviert**, damit dieselbe Suche nicht versehentlich mehrfach gestartet wird.

**Konsequenzen:**
- Der bereits eingegebene Suchtext bleibt während der Suche sichtbar.
- Die Karte bleibt während der Anfrage grundsätzlich weiter bedienbar.
- Nach Ergebnis, Fehler oder Abbruch endet der Ladezustand und die Suchaktion ist wieder verfügbar.
- Die Ladeanzeige selbst erzeugt weder einen Pin noch zusätzliche Suchanfragen.
- Für die Ergebnisverarbeitung gelten weiterhin die Grundentscheidungen 116–125, einschließlich der Speicherung aller aus der Ortsnamensuche erstellten Pins in **„Privat“**.
- **Die Ortsnamensuche ist und bleibt verbindlicher Bestandteil der ersten Basisversion**.

## Grundentscheidung 128 – Neue Ortssuche ersetzt die bisherige Anfrage

**Beschlossen (Variante A):** Während eine geografische Ortsnamensuche läuft, darf der Benutzer den Suchtext ändern und **eine neue Suche ausdrücklich starten**. Die neue Suche **ersetzt** die alte; die bisherige Anfrage wird soweit technisch möglich abgebrochen. Treffen verspätete Antworten der alten Anfrage dennoch ein, werden diese **vollständig ignoriert**. Nur Ergebnisse der **zuletzt bewusst gestarteten** Suche dürfen angezeigt werden oder zur Pin-Erstellung führen.

**Konsequenzen:**
- Die Suchanfragen erhalten eine eindeutige Zuordnung (z. B. fortlaufende Anfragekennung); veraltete Antworten dürfen weder die Trefferliste noch die Ladeanzeige der aktuellen Anfrage überschreiben.
- Die Ladeanzeige und das Verhindern doppelter identischer Anfragen bleiben erhalten (Grundentscheidung 127). Der Suchbutton ist während einer unveränderten laufenden Anfrage deaktiviert, wird für eine **bewusst geänderte Suchanfrage** jedoch wieder nutzbar; alternativ darf die Eingabetaste die geänderte Anfrage starten.
- Bei einer abgelösten Anfrage darf auch ein verspäteter eindeutiger Treffer **keinen Pin** mehr automatisch erzeugen.
- Die bewusste Suchauslösung bleibt erforderlich; Texteingabe allein startet keine Anfrage (Grundentscheidung 121).
- Die Kartenansicht bleibt bedienbar. Alle Ortssuch-Pins gehören weiterhin zur Ebene **„Privat“**, unabhängig von der aktiven Ebene (Grundentscheidung 119).
- Die **Ortsnamensuche ist verbindlicher Bestandteil der ersten Basisversion**.

## Grundentscheidung 129 – Weltweite Ortsnamensuche unabhängig vom Kartenausschnitt

**Beschlossen (Variante A):** Die geografische Ortsnamensuche in der ersten Basisversion ist **weltweit nutzbar und nicht auf den aktuell sichtbaren Kartenausschnitt beschränkt**. Orte außerhalb des sichtbaren Bereichs dürfen nicht allein aufgrund ihrer Entfernung ausgeschlossen werden.

**Konsequenzen:**
- Beispielsweise kann aus einer aktuell auf Stuttgart zentrierten Kartenansicht nach „Oxford“, „Paris“ oder „Tokio“ gesucht werden.
- Der aktuelle Kartenausschnitt darf, soweit der Geocoding-Anbieter dies unterstützt, allenfalls als **unverbindlicher Sortier- oder Relevanzkontext** verwendet werden, nicht als harter räumlicher Suchfilter.
- Bei mehreren plausiblen Treffern ist weiterhin die bewusste Auswahl aus der Trefferliste erforderlich (Grundentscheidung 116); ein örtlich naher Treffer wird nicht automatisch gewählt.
- Nach erfolgreicher Erstellung des Ortssuch-Pins springt die Karte an dessen Standort (Grundentscheidung 117). Der Pin wird unabhängig von der aktiven Ebene in **„Privat“** gespeichert (Grundentscheidung 119).
- Die **Ortsnamensuche bleibt verbindlicher Bestandteil der ersten Basisversion**.

## Grundentscheidung 130 – Geocoding-Dienst über zentrale Schnittstelle anbinden

**Beschlossen (Variante A):** Die verbindlich zur ersten Basisversion gehörende geografische Ortsnamensuche wird über eine **zentrale Geocoding-Schnittstelle (Adapter)** angebunden. Sie kapselt die Kommunikation mit dem zunächst ausgewählten externen Suchdienst, die Aufbereitung der Suchtreffer und die Fehlerbehandlung; Benutzeroberfläche, Karte und Pin-Verwaltung sind nicht an das proprietäre Antwortformat eines Anbieters gebunden.

**Konsequenzen:**
- Das Suchfeld und die Trefferliste arbeiten mit einem anbieterunabhängigen Ergebnisformat, das insbesondere Ortsname, unterscheidende Ortsangaben und Koordinaten umfasst.
- Der Adapter kapselt Anfrageaufbau, Antwortvalidierung, Abbruch bzw. Verwerfen veralteter Antworten (Grundentscheidung 128) sowie die einheitliche Behandlung von Fehlern und leeren Ergebnissen.
- Ein Wechsel des Geocoding-Anbieters bleibt möglich, ohne die eigentliche Pin-Erstellung, die Trefferliste oder die Kartenbedienung neu zu entwickeln.
- Bei der Auswahl und Einbindung des konkreten Anbieters müssen dessen Nutzungsbedingungen, Nutzungsgrenzen, Datenschutz- und Zuordnungsanforderungen beachtet werden.
- Die beschlossenen fachlichen Regeln bleiben unverändert: weltweite Suche (129), Auswahlliste bei mehreren plausiblen Treffern (116), direkte Pin-Erstellung bei genau einem geeigneten Treffer, und Speicherung aller Such-Pins in **„Privat“** (119).
- **Die Ortsnamensuche bleibt ausdrücklich und verbindlich Bestandteil der ersten Basisversion.**

## Grundentscheidung 131 – Ortsnamensuche in der Basisversion ohne eigenen Server

**Beschlossen (Variante A):** Die **verbindlich zur ersten Basisversion gehörende geografische Ortsnamensuche** nutzt zunächst über den beschlossenen zentralen Geocoding-Adapter (Grundentscheidung 130) einen geeigneten externen Dienst, der **direkte Browser-Anfragen ausdrücklich erlaubt** und dessen Nutzungsbedingungen die vorgesehene Nutzung in der testbaren PWA gestatten. Ein eigener pin2map-Server ist **keine Voraussetzung** für die Ortssuche der ersten Basisversion.

**Konsequenzen:**
- Der Suchdienst muss so ausgewählt und integriert werden, dass Browser-Zugriff, CORS, Nutzungs- und Anfragelimits sowie erforderliche Anbieterkennzeichnungen eingehalten werden.
- Geheim zu haltende API-Schlüssel dürfen nicht im ausgelieferten PWA-Quelltext oder in öffentlich zugänglicher Browserkonfiguration hinterlegt werden. Falls der gewählte Anbieter einen geheimen Schlüssel oder Server-Proxy zwingend voraussetzt, ist er für diese erste direkte Browser-Anbindung ungeeignet.
- Die weltweite Suche, Trefferliste, direkte Pin-Erstellung bei genau einem geeigneten Treffer und Speicherung der neuen Pins in „Privat“ bleiben fachlich unverändert (Grundentscheidungen 116–129).
- Die Suche selbst benötigt eine Internetverbindung; lokale Karten-/Pin-Funktionen und die Speicherung in IndexedDB funktionieren weiterhin unabhängig von der Erreichbarkeit des Geocoding-Dienstes.
- Die Adapterarchitektur erlaubt später einen Anbieterwechsel oder eine serverseitige Weiterleitung ohne Umbau der Pin-Verwaltung.
- Eine spätere eigene Server- und Synchronisationskomponente folgt dem beschlossenen stufenweisen Ausbau (Grundentscheidungen 3 und 115).
- **Die Ortsnamensuche bleibt ausdrücklich verbindlicher Bestandteil der ersten Basisversion.**

## Grundentscheidung 132 – Hinweis bei nicht verfügbarer Ortsnamensuche

**Beschlossen (Variante A):** Wenn eine gültige geografische Ortssuche bewusst gestartet wird, aber aufgrund fehlender Internetverbindung oder Nichterreichbarkeit des Geocoding-Dienstes nicht ausgeführt werden kann, zeigt pin2map **im Suchbereich eine kurze, verständliche Meldung** an, beispielsweise **„Ortssuche derzeit nicht verfügbar“**, gegebenenfalls mit dem Hinweis, die Verbindung zu prüfen und es erneut zu versuchen.

**Konsequenzen:**
- Bei Nichterreichbarkeit des Suchdienstes wird **kein Pin angelegt**. Die bereits gespeicherten Pins und ihre Daten bleiben unverändert.
- Der eingegebene Suchtext bleibt erhalten und kann später für eine neue, ausdrücklich gestartete Suche wiederverwendet werden.
- Die Kartenansicht und alle offline verfügbaren lokalen Pin- und Ebenenfunktionen bleiben weiterhin nutzbar.
- Die Ladeanzeige endet mit dem Fehler, sodass eine erneute Suche möglich ist (Grundentscheidung 127).
- Die Fehlermeldung unterscheidet sich ausdrücklich vom **stillschweigenden Ignorieren einer leeren Suchanfrage** (Grundentscheidung 126).
- **Die Ortsnamensuche bleibt verbindlicher Bestandteil der ersten Basisversion**, auch wenn der externe Dienst vorübergehend nicht verfügbar ist.

## Grundentscheidung 133 – Hinweis bei erfolgreicher Ortssuche ohne Treffer

**Beschlossen (Variante A):** Wird eine gültige geografische Ortsnamensuche erfolgreich durch den Geocoding-Dienst bearbeitet, liefert aber **keinen geeigneten Ort**, zeigt pin2map **direkt beim Suchfeld** die kurze Meldung **„Kein Ort gefunden“** an.

**Konsequenzen:**
- Bei einer ergebnislosen Suche wird **kein Pin erstellt** und der Kartenausschnitt sowie der Zoom bleiben unverändert.
- Der eingegebene Suchtext bleibt im Suchfeld stehen, sodass eine Korrektur und erneute, bewusst ausgelöste Suche möglich ist (Grundentscheidungen 121 und 122).
- Die Ladeanzeige endet, sobald das ergebnislose Suchergebnis vorliegt (Grundentscheidung 127).
- Dieser Hinweis unterscheidet sich von der Fehlermeldung bei technischen bzw. Verbindungsproblemen (Grundentscheidung 132) sowie vom bewusst stillen Ignorieren leerer Suchanfragen (Grundentscheidung 126).
- **Die Ortsnamensuche bleibt verbindlicher Bestandteil der ersten Basisversion.**

## Grundentscheidung 134 – Alle vom Geocoding-Dienst gelieferten Suchtreffer anzeigen

**Beschlossen (Variante B):** Die geografische Ortsnamensuche zeigt **alle vom Geocoding-Dienst gelieferten plausiblen Treffer** in der kompakten, vertikal scrollbaren Trefferliste an. pin2map setzt **keine eigene feste Höchstzahl**, beispielsweise zehn Treffer, für die Anzeige.

**Konsequenzen:**
- Es wird keine zusätzliche clientseitige Begrenzung der angezeigten Trefferzahl eingeführt. **Anbieterseitige Ergebnislimits bleiben bestehen**; „alle“ bedeutet sämtliche tatsächlich vom Dienst gelieferten Ergebnisse, nicht zwingend alle weltweit existierenden passenden Orte.
- Die Trefferliste bleibt direkt unter dem Suchfeld platziert, auf kleinen Bildschirmen in ihrer Höhe begrenzt und innerhalb der Liste scrollbar (Grundentscheidung 124).
- Alle angezeigten Treffer erhalten soweit verfügbar unterscheidbare Ortsangaben (Ort, Region, Land).
- Bei mehreren plausiblen Treffern wird **niemals automatisch ein Pin gesetzt**, sondern erst nach bewusster Auswahl (Grundentscheidung 116).
- Die Sichtbarkeit und Bedienbarkeit der Karte sowie das bewusste Schließen der Liste bleiben gewährleistet (Grundentscheidung 125).
- Aus der Suche erstellte Pins werden weiterhin in **„Privat“** gespeichert, auch bei ausgeblendeter privater Ebene (Grundentscheidungen 119 und 120).
- **Die Ortsnamensuche bleibt verbindlicher Bestandteil der ersten Basisversion.**

## Grundentscheidung 135 – Relevanzreihenfolge des Geocoding-Dienstes beibehalten

**Beschlossen (Variante A):** Die Treffer einer geografischen Ortsnamensuche werden in **der vom Geocoding-Dienst gelieferten Relevanzreihenfolge** angezeigt. pin2map sortiert die Ergebnisse **nicht eigenständig alphabetisch oder nach Entfernung** um.

**Konsequenzen:**
- Die Reihenfolge des gewählten Suchanbieters bleibt beim Aufbereiten und Darstellen der Treffer erhalten.
- Die Trefferliste zeigt weiterhin alle tatsächlich vom Geocoding-Dienst gelieferten plausiblen Ergebnisse ohne zusätzliche feste Beschränkung durch pin2map (Grundentscheidung 134).
- Eine hohe Relevanzwertung führt **nicht** zur automatischen Pin-Erstellung, wenn mehrere plausible Treffer vorliegen: Die bewusste Auswahl bleibt zwingend (Grundentscheidung 116).
- Bei genau einem geeigneten Treffer bleibt die direkte Pin-Erstellung zulässig.
- Der aus der Suche erstellte Pin wird wie beschlossen in der Systemebene **„Privat“** gespeichert (Grundentscheidung 119).
- Die **weltweite Ortsnamensuche bleibt verbindlicher Bestandteil der ersten Basisversion**.

## Grundentscheidung 136 – Keine zusätzliche Geocoding-Anbieterkennzeichnung in der Trefferliste

**Beschlossen (Variante B):** Die Trefferliste der geografischen Ortsnamensuche zeigt **keine zusätzliche Quellen- oder Anbieterangabe unmittelbar in der Liste**, sofern der konkret gewählte Geocoding-Dienst es zulässt, notwendige Quellenkennzeichnungen **an einer anderen zentralen Stelle** der Anwendung zu platzieren.

**Konsequenzen:**
- Die Trefferliste bleibt auf Ortsnamen und unterscheidende Angaben wie Region und Land fokussiert (Grundentscheidungen 124 und 135).
- **Vertraglich oder rechtlich notwendige Attributionen müssen weiterhin vollständig und gut zugänglich angezeigt werden.** Die Platzierung außerhalb der Trefferliste ist nur zulässig, wenn die tatsächlichen Nutzungsbedingungen des gewählten Dienstes dies erlauben.
- Verlangt ein Anbieter die Kennzeichnung direkt an den Ergebnissen, ist diese Vorgabe einzuhalten oder ein anderer geeigneter Anbieter zu wählen; die beschlossene Vereinfachung darf keine Anbieterbedingungen verletzen.
- Der zentrale Geocoding-Adapter (Grundentscheidung 130) und die Anbieterwahl müssen eine konforme Kennzeichnung ermöglichen.
- Die **weltweite Ortsnamensuche bleibt verbindlicher Bestandteil der ersten Basisversion**.

## Grundentscheidung 137 – Geocoding-Anbieter unmittelbar festlegen

**Beschlossen (Variante B):** Für die erste Basisversion soll **jetzt ein konkreter Geocoding-Anbieter verbindlich ausgewählt werden**, statt zunächst eine offene Auswahl anhand eines ausführlichen Kriterienkatalogs durchzuführen. Die namentliche Anbieterwahl folgt unmittelbar als Grundentscheidung 138.

**Konsequenzen:**
- Variante B ist eine Entscheidung für eine **sofortige Anbieterfestlegung**, jedoch **noch keine Benennung eines konkreten Dienstes**. Eine solche Benennung wird nicht erfunden.
- Die später erforderliche technische und rechtliche Prüfung wird nicht übersprungen: Direkte Browser-Anfragen, Nutzungsbedingungen, Ratenlimits, Attribution und etwaige Zugangsschlüssel müssen bei der Umsetzung weiterhin passen (Grundentscheidungen 130, 131 und 136).
- Falls ein festgelegter Anbieter die zwingenden Bedingungen nicht erfüllt, darf er nicht regelwidrig eingebunden werden; die Anbieterwahl ist dann erneut zu entscheiden.
- Die **Ortsnamensuche bleibt verbindlicher Bestandteil der ersten Basisversion**.

## Grundentscheidung 138 – Öffentlichen OpenStreetMap-Nominatim-Dienst auswählen

**Beschlossen (Variante B):** Als **erster Geocoding-Anbieter für die Ortsnamensuche der Basisversion** wird die **öffentliche Nominatim-API der OpenStreetMap Foundation** (`https://nominatim.openstreetmap.org`) festgelegt. Die Anbindung erfolgt über den bereits beschlossenen zentralen Geocoding-Adapter (Grundentscheidung 130).

**Verbindliche Rahmenbedingungen und Umsetzungsvorbehalt:**
- Der öffentliche Dienst wird **nicht** als unbegrenzt verfügbarer Produktionsdienst eingeplant. Seine aktuelle [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) ist vor jeder Inbetriebnahme einzuhalten.
- Der Anbieter nennt ein **absolutes Maximum von einer Anfrage pro Sekunde für die gesamte Website/Anwendung über alle Benutzer zusammen**, nicht pro Browser, sowie **moderate Nutzerzahlen**. Eine clientseitige Drosselung pro Gerät allein kann eine anwendungsweite Grenze nicht gewährleisten.
- Erforderlich sind ein **gültiger, die Anwendung erkennbar kennzeichnender HTTP-Referer oder User-Agent** und eine korrekte OpenStreetMap-Attribution. Eine ausschließlich zentrale Quellenkennzeichnung ist nur möglich, soweit sie die tatsächlichen Pflichten erfüllt (Grundentscheidung 136).
- **Kein Autocomplete und keine Suchanfragen während des Tippens**: Die Suche wird nur bewusst gestartet (Grundentscheidung 121). Kein systematisches bzw. periodisches Abfragen, kein Bulk-Geocoding.
- Die Richtlinie verlangt, dass Apps den Dienst **bei Aufforderung ohne Software-Update wechseln können**; dies ist bei der Adapter-/Konfigurationsarchitektur zu berücksichtigen.
- Die Richtlinie untersagt es, die öffentliche API über No-Code-/Low-Code-/Vibe-Coding-Plattformen als generischen Geocoding-Dienst anzubieten. Hier liegt eine konkrete, bewusst vom Projektverantwortlichen ausgewählte Integration vor; der Projektverantwortliche bleibt für die Einhaltung der Richtlinie verantwortlich.
- Vor tatsächlicher Nutzung im Browser sind CORS, Kennzeichnung und die **anwendungsweiten** Nutzungsgrenzen technisch zu überprüfen. Soweit diese ohne eigenen Server nicht zuverlässig eingehalten werden können, darf die öffentliche API nicht regelwidrig eingesetzt werden; stattdessen ist eine neue Hosting-/Anbieterentscheidung erforderlich.
- **Die weltweite Ortsnamensuche bleibt unabhängig von dieser Anbieterwahl verbindlicher Bestandteil der ersten Basisversion**, ebenso die Erzeugung von Pins in „Privat“ (Grundentscheidung 119).

## Grundentscheidung 139 – Öffentliche Nominatim-API zunächst nur im kontrollierten Testbetrieb

**Beschlossen (Variante A):** Für die erste testbare Basisversion wird die öffentliche **OpenStreetMap-Nominatim-API zunächst ausschließlich in einem begrenzten, kontrollierten Testbetrieb mit wenigen bekannten Testern** verwendet, **sofern vor dem ersten tatsächlichen API-Aufruf die Einhaltung der geltenden Nutzungsrichtlinie nachgewiesen ist**. Die Ortsnamensuche bleibt Bestandteil der ersten lauffähigen PWA und erfordert zunächst keinen eigenen pin2map-Server.

**Verbindliche Konsequenzen:**
- Es erfolgt **keine breite öffentliche Freigabe** der auf der öffentlichen Nominatim-API beruhenden Ortsnamensuche ohne zuvor nachgewiesene, für die tatsächliche Nutzerzahl tragfähige Einhaltung der geltenden Anbieterbedingungen.
- Insbesondere muss die **anwendungsweite** Grenze der öffentlichen Nominatim-API eingehalten werden (derzeit maximal eine Anfrage pro Sekunde für die gesamte Anwendung, nicht pro Nutzer). Bei mehreren parallel aktiven Browsern reicht ein bloßes clientseitiges Limit nicht als verlässliche Durchsetzung aus.
- Vor API-Einsatz sind Kennzeichnung/Attribution, Identifizierbarkeit der Anwendung, Browser-Kompatibilität, Anfragefrequenz und zulässige Nutzungsart zu prüfen.
- Falls diese Voraussetzungen selbst im vorgesehenen Testbetrieb nicht verlässlich erfüllt werden können, wird der öffentliche Dienst **nicht regelwidrig eingesetzt**; die Testanbindung braucht dann einen anderen konformen Geocoding-Endpunkt bzw. eine erneute Hosting-/Anbieterentscheidung.
- Vor einer späteren allgemeinen Freigabe wird ein für die tatsächliche Nutzung geeigneter Geocoding-Dienst oder eine belastbare Infrastruktur mit anwendungsweiter Durchsetzung der Bedingungen bereitgestellt.
- Der zentrale Geocoding-Adapter ermöglicht den späteren Wechsel des Dienstes (Grundentscheidung 130).
- Die **weltweite Ortsnamensuche mit Pin-Erstellung in „Privat“ bleibt verbindlicher Bestandteil der ersten Basisversion** (Grundentscheidungen 115–120).

## Grundentscheidung 140 – Erfolgreiche Ortsnamensuchen kurzzeitig lokal zwischenspeichern

**Beschlossen (Variante A):** pin2map speichert **erfolgreiche Suchergebnisse der geografischen Ortsnamensuche für eine begrenzte Zeit lokal im Suchergebnis-Cache**. Wird **dieselbe Suchanfrage** anschließend erneut bewusst ausgelöst, können die bereits vorliegenden gültigen Treffer wiederverwendet werden, **ohne eine neue Anfrage** an den Geocoding-Dienst zu senden.

**Konsequenzen:**
- Die grundsätzliche **bewusste Suchauslösung** durch Suchbutton oder Eingabetaste bleibt bestehen (Grundentscheidung 121). Eine Cache-Antwort darf nicht ungefragt während der Texteingabe ausgelöst werden.
- Die normalen Suchregeln gelten auch für zwischengespeicherte Ergebnisse: genau ein geeigneter Treffer kann unmittelbar einen Pin erstellen, mehrere plausible Treffer erfordern eine bewusste Auswahl (Grundentscheidung 116).
- Der Cache ist **zeitlich begrenzt**. Veraltete oder ungültige Einträge dürfen nicht dauerhaft verwendet werden; Ablaufdauer und Speichergrenze müssen im Zuge der Umsetzung festgelegt und getestet werden.
- Die Speicherung ist lokal und erhöht nicht die Zahl der Anfragen an die öffentliche Nominatim-API. Die aktuellen Nutzungs- und Lizenzbedingungen des konkreten Dienstes sind weiterhin einzuhalten.
- Der Cache ersetzt keine anwendungsweit verlässliche Begrenzung der API-Anfragerate. Der öffentliche Nominatim-Dienst bleibt ausschließlich für den bereits beschlossenen richtlinienkonformen kontrollierten Testbetrieb vorgesehen (Grundentscheidungen 138 und 139).
- Die **weltweite Ortsnamensuche mit Speicherung neu angelegter Pins in „Privat“ bleibt verbindlicher Bestandteil der ersten Basisversion**.

## Grundentscheidung 141 – Ortsnamensuchergebnisse 24 Stunden zwischenspeichern

**Beschlossen (Variante A):** Erfolgreiche Ergebnisse einer bewusst ausgelösten geografischen Ortsnamensuche werden im lokalen Cache **24 Stunden ab dem erfolgreichen Abruf** als gültig behandelt. Eine identische erneut bewusst ausgelöste Suche kann innerhalb dieses Zeitraums die gespeicherten Ergebnisse verwenden, ohne Nominatim nochmals anzufragen. **Nach Ablauf der 24 Stunden** erfolgt bei einer erneuten Suche eine neue Anfrage an den Geocoding-Dienst.

**Konsequenzen:**
- Der Cache bleibt **über einen Neustart der PWA hinweg** erhalten, soweit lokale Daten verfügbar sind. Die technische Speicherung kann in die lokale Datenhaltung integriert werden.
- Die Ablaufzeit wird für jeden Cacheeintrag anhand seines Abrufzeitpunkts bestimmt; nach Ablauf werden die betreffenden Ergebnisse nicht mehr als aktuell benutzt.
- Fehlgeschlagene Antworten oder technische Fehler werden nicht als erfolgreiche Treffer zwischengespeichert.
- Die fachlichen Regeln für einzelne und mehrere plausible Ortsnamensuchergebnisse, bewusste Auswahl und Pin-Erstellung gelten auch für Cachetreffer.
- Der Cache darf die geltenden Nutzungsbedingungen des gewählten Dienstes nicht verletzen. Er ersetzt **keine anwendungsweite Durchsetzung des Nominatim-Anfragelimits** (Grundentscheidungen 138 und 139).
- **Die weltweite Ortsnamensuche bleibt verbindlicher Bestandteil der ersten Basisversion.**

## Grundentscheidung 142 – Implementierung der ersten lauffähigen Basisversion jetzt beginnen

**Beschlossen (Variante A):** Die Planungsphase der Grundentscheidungen wird zugunsten der **unmittelbaren Implementierung einer tatsächlich lauffähigen und testbaren PWA** im bestehenden GitHub-Repository `pin2map/pin2map-new-test` beendet. Weitere technische Einzelheiten werden während der Umsetzung pragmatisch entschieden, getestet und bei Bedarf dokumentiert, ohne die bereits verbindlichen Grundentscheidungen aufzuweichen.

**Verbindlicher Mindestumfang der ersten Basisversion:**
1. Interaktive Karte und die beschlossenen grundlegenden Kartenbedienelemente.
2. Einfache Ebenenverwaltung einschließlich der Systemebene **„Privat“**.
3. Pins mit stabiler Kennung und WGS84-Koordinaten, wobei **jeder Pin genau einer Ebene** angehört; Anlegen, Auswählen, Bearbeiten, Verschieben und Löschen gemäß den bereits getroffenen Entscheidungen.
4. Offline-orientierte **lokale Speicherung in IndexedDB** einschließlich der relevanten Karten-/Ebenen-/Pin-Zustände.
5. **Weltweite geografische Ortsnamensuche als Pflichtbestandteil der ersten Basisversion**, mit stets sichtbarem Suchfeld, bewusst ausgelösten Suchen, Trefferliste bei Mehrdeutigkeit, direkter Pin-Erstellung bei genau einem geeigneten Treffer, Speicherung jedes Such-Pins in „Privat“, Fehler- und Leertreffermeldungen sowie lokalem 24-Stunden-Suchergebnis-Cache.
6. Geocoding über den zentralen Adapter; zunächst ausgewählt ist die öffentliche OpenStreetMap-Nominatim-API. **Real zugeschaltete API-Anfragen setzen den nachgewiesenen richtlinienkonformen kontrollierten Testbetrieb voraus** (Grundentscheidungen 138–141). Bei fehlender Zulässigkeit wird die externe Anfrage nicht regelwidrig ausgeführt; die Ortsnamensuche als Funktion der Basisversion darf deshalb nicht dauerhaft entfallen.
7. Bereitstellung eines direkt im Browser testbaren Entwicklungsstands über das bestehende GitHub-basierte Testverfahren; Tests der Kernabläufe.

**Ab jetzt geplanter konkreter Umsetzungsablauf:**
- **Schritt 1 – Projektbestand prüfen:** vorhandene Dateien, Build-/Test-/Deployment-Prozess, Dokumentation und bereits implementierte Funktionen des aktuellen Repositorys feststellen; nichts funktionierendes ungeprüft ersetzen.
- **Schritt 2 – Ausführbares PWA-Grundgerüst:** App-Start, Karte, Basiskarten-Auswahl und eine einfache lauffähige Testbereitstellung herstellen oder ergänzen.
- **Schritt 3 – Datenmodell und lokale Persistenz:** Ebenen („Privat“ und „Ebene 1“), ein Pin pro Ebene, IndexedDB und Wiederherstellung nach Neuladen.
- **Schritt 4 – Pin-Kernfunktionen:** Anlegen, Auswählen, Bearbeiten, Bewegen, Ebene wechseln und Löschen einschließlich der bereits beschlossenen Dialoge und Zustandsregeln.
- **Schritt 5 – Ortsnamensuche:** Von Beginn an als Muss-Funktion des ersten zusammenhängenden testbaren Basisstands umsetzen; über Geocoding-Adapter inklusive Suchfeld, Trefferbehandlung, Pin-Erstellung in „Privat“, 24-Stunden-Cache, Fehlermeldungen und richtlinienkonformer Dienstanbindung.
- **Schritt 6 – Integrationstest und Bereitstellung:** end-to-end prüfen, dass Karte, Ebenen, Pins, Speicherung und weltweite Suche zusammen funktionieren; Entwicklungsstand dokumentieren und über Test-URL zugänglich machen. Eine nicht funktionierende Ortssuche ist **kein abgeschlossener Basisstand**.
- **Schritt 7 – Iteration:** erst anhand des lauffähigen Teststands fehlende Details und spätere Server-/Synchronisationsausbaustufen festlegen.

**Status:** Grundentscheidung 142 ist beschlossen. Die nächste Phase ist **Implementierung und Testen**, nicht eine weitere Folge abstrakter Grundentscheidungen. Einzelne unvermeidbare Implementierungsfragen werden zielgerichtet während der Arbeit behandelt.

## Umsetzungspräzisierung nach Grundentscheidung 142 – Mobile Kartenbedienung und Pin-Anlage

**Verbindliche Aktualisierung auf ausdrücklichen Wunsch des Auftraggebers (2026-11-08):**

1. **Eine einzige kompakte Kopfzeile auf dem iPhone.** Das Logo entfällt; die Ortssuche mit Suchschaltfläche sowie die Ebenen- und Einstellungen-Schaltflächen passen auf eine Zeile. Die frühere zweizeilige Gestaltung ist verworfen. Die weltweite Ortsnamensuche bleibt dauerhaft erreichbar und gehört weiter zur Basisversion.
2. **Antippen einer freien Kartenfläche schließt alle offenen nichtmodalen Bedienfelder**, insbesondere Pin-Bearbeitung, Ebenenverwaltung, Einstellungen und die Trefferliste der Ortssuche; eine aktive Pin-Auswahl wird aufgehoben. Eine ausdrücklich laufende Pin-Verschiebung bleibt als Sonderhandlung auf einen Kartentipp ausführbar. Der Löschbestätigungsdialog wird nicht versehentlich durch die Karte bestätigt.
3. **Drei runde Zoom-Schaltflächen** bilden eine zusammenhängende Gruppe: Vergrößern (+), Verkleinern (−) und automatische Ansicht aller **sichtbaren** Pins (◎). Die bisher separat angeordnete „Alle Pins“-Schaltfläche entfällt; ausgeblendete Ebenen werden nicht automatisch eingeblendet.
4. **Neuer Pin durch langes Drücken auf eine freie Kartenposition** (derzeit ca. 650 ms). Der Pin wird exakt aus der gedrückten Kartenposition ermittelt und der aktiven Ebene zugeordnet. Ein kurzer Kartentipp erzeugt **keinen Pin**; Kartenverschiebung und Mehrfingergesten dürfen keine Pins erzeugen. Die „+ Pin“-Schaltfläche und der separate Pin-hinzufügen-Modus entfallen. Dies **ersetzt ausdrücklich die Bedienregel aus Grundentscheidungen 25 und 26** sowie den Aktivierungsschritt aus Grundentscheidung 27; sofortige lokale Speicherung, eindeutige Ebenenzuordnung, automatische Auswahl und Bearbeitung gemäß Grundentscheidungen 1, 7 und 27–29 bleiben erhalten.
5. Die bereits ergänzte automatische Kartenanpassung auf alle sichtbaren Pins nach manueller Pin-Erstellung bleibt vorerst aktiv. Der Rundbutton (◎) ermöglicht dieselbe Funktion jederzeit bewusst.
6. Die unmittelbar vorher getroffenen Grundentscheidungen bleiben ansonsten bestehen. **Die weltweite Ortsnamensuche einschließlich der Speicherung von Such-Pins in „Privat“ bleibt Bestandteil der Basisversion.**

## Umsetzungspräzisierung – Kartenbedienung nach Nutzertest (2026-11-08)

**Diese aktuellen Nutzerentscheidungen ersetzen bei Widersprüchen ältere UI-Festlegungen, insbesondere Grundentscheidungen 25–26, 89–95 und die vorangegangene Präzisierung zum Desktop-Langdruck.**

1. **Kompakter Suchblock anstelle einer flächigen Kopfzeile:** Der dauerhaft sichtbare Eingabeblock zur weltweiten Ortssuche mit Such-, Ebenen- und Einstellungensteuerung erhält eine feste Maximalbreite von etwa 410 px (ungefähr iPhone-Breite), auch auf Desktopbildschirmen. Die Karte nutzt die Fläche darunter und daneben; das Logo bleibt entfernt. Auf dem iPhone bleibt der Block einzeilig und schmal.
2. **Pin-Editor am Ort des Pins:** Beim Auswählen wird der Bearbeitungsdialog **als schwebende kompakte Karte oberhalb der betreffenden Pin-Position** platziert statt dauerhaft am unteren Bildschirmrand. Die Position folgt dem ausgewählten Pin bei Kartenbewegungen; die Höhe wird auf dem iPhone begrenzt, mit einem bedienbaren Überlauf bei Platzmangel. Wo oberhalb eines randnahen Pins zu wenig Platz ist, wird die Position an den noch sichtbaren Bereich angepasst. Die gespeicherten Koordinaten ändern sich niemals durch die Dialogplatzierung. Diese neue explizite Nutzerentscheidung ersetzt die unteren Bedienfeldregeln aus Grundentscheidungen 89–95.
3. **Pin-Namen seitlich und standardmäßig sichtbar:** Benannte Pins erhalten schon ohne Auswahl einzeilige, neben dem Pin platzierte Labels, automatisch **links oder rechts** (nicht darüber). Die Labels werden bei Platzmangel gekürzt; gewöhnliche sich überschneidende Labels können zurückgestellt werden, das ausgewählte bleibt hervorgehoben. Ein sichtbarer Button schaltet Labels ein und aus; der Zustand bleibt lokal gespeichert. Die Beschriftung ist keine eigene Pin-Auswahlfläche. Dies verwirklicht Grundentscheidungen 72–80.
4. **Neue Pins auf dem Desktop per Rechtsklick; auf Touchscreens durch langen Tap:** Der Langdruck mit der Maus entfällt. Rechtsklick auf freie Kartenfläche legt direkt einen Pin in der aktiven Ebene an; auf iPhone/Touch-Geräten bleibt ein langer Tap (ca. 650 ms). Bewegen des Fingers bzw. mehrere Touchpunkte brechen die Geste ab. Die Kartenansicht darf **bei der Pin-Anlage nicht automatisch zur Seite springen**; insbesondere entfällt die zuvor auf Pin-Erstellung ausgeführte automatische Gesamtzoom-Aktion. Die separate runde Taste „Alle sichtbaren Pins“ bleibt zur **bewussten** Gesamtansicht erhalten.
5. Ein kurzer Tipp auf freie Kartenfläche schließt offene nichtmodale Dialoge und wählt Pins ab. Treffer aus der Ortsnamensuche werden weiterhin wie beschlossen in „Privat“ gespeichert; die Ortssuche einschließlich Suchtrefferliste, Nominatim-Adapter und 24-Stunden-Cache bleibt **verbindlicher Bestandteil der ersten Basisversion**.

**Umsetzungsstand:** Quellcodeänderungen im Test-Repository eingecheckt; tatsächliche Bedienung auf iPhone und Desktop ist weiterhin anhand des veröffentlichten Tests zu überprüfen.

## Umsetzungspräzisierung – Ebenenlöschung, langes Drücken und Pin-Verschiebung (2026-11-08)

**Auf ausdrücklichen Wunsch nach praktischem Test verbindlich aktualisiert:**

1. **Langes Drücken auf freie Karte erzeugt Pins sowohl auf Touchscreens als auch am Desktop** (ca. 650 ms), sofern keine Verschiebegeste erkannt wird. Der Rechtsklick auf eine freie Kartenposition bleibt als zusätzliche Desktop-Bedienung bestehen. Die Karte wird durch diese Aktion nicht automatisch gezoomt oder verschoben.
2. **Reguläre Ebenen besitzen eine direkt erreichbare Löschschaltfläche.** Vor dem Löschen werden Ebenenname, Zahl der zugeordneten Pins und die gemeinsame Löschfolge angezeigt. Die Löschung erfordert eine ausdrückliche Bestätigung und betrifft die Ebene samt Pins (Grundentscheidung 14).
3. **Die Systemebene „Privat“ bleibt unantastbar, ihre Pins können jedoch gesammelt gelöscht werden** – über „Alle Pins in Privat löschen“ mit Bestätigungsdialog und Anzahl betroffener Pins. Die Systemebene selbst und andere Ebenen bleiben bestehen (Grundentscheidungen 15–16).
4. **Langes Drücken direkt auf ein Pin-Symbol für ca. eine Sekunde öffnet die Namensbearbeitung und fokussiert das Eingabefeld**, also einen unmittelbar nutzbaren Umbenennungsmodus. Kurzes Antippen wählt den Pin wie bisher aus.
5. **Pin-Verschiebung ohne überlagernden Editor:** Die weiterhin ausdrücklich ausgelöste Aktion „Pin verschieben“ blendet den schwebenden Bearbeitungsdialog aus. Eine neue Kartenposition erzeugt eine verschiebbare Vorschau mit sichtbarer bisheriger Position und Verbindungslinie. „Position übernehmen“ speichert erst die Vorschau; „Abbrechen“ verwirft sie (Grundentscheidungen 30–35). Das verhindert, dass der Editor kurze Verschiebungen blockiert.
6. **Die weltweite Ortsnamensuche bleibt verbindlicher Bestandteil der ersten Basisversion.** Sie erzeugt Pins wie beschlossen in „Privat“ und ist von diesen Karteninteraktionen getrennt.

**Status:** Codeänderungen in GitHub eingecheckt; die tatsächliche Bedienung auf iPhone und Desktop bleibt im veröffentlichten Teststand zu überprüfen.


## Umsetzungspräzisierung – Korrekturen für Ebenennamen, Privat-Löschung und Pin-Langdruck (2026-11-08)

**Auf ausdrückliche Nutzerkorrektur nach Test verbindlich festgelegt:**

1. Beim Anlegen einer regulären Ebene ist das Eingabefeld **mit dem ersten noch freien Namen „Ebene N“ vorbelegt**. Der Vorschlag kann geändert werden. Doppelte Ebenennamen (ohne Unterscheidung von Groß-/Kleinschreibung oder umgebenden Leerzeichen) und der reservierte Name „Privat“ werden nicht akzeptiert (Grundentscheidungen 12, 13 und 19).
2. Das Sammellöschen der Pins aus der Systemebene **„Privat“ wird ausschließlich über eine Löschschaltfläche rechts innerhalb der Zeile „Privat“** ausgelöst, nicht über einen breiten Button unterhalb der Liste. Vor der Löschung werden Anzahl und Folgen bestätigt. **Die Ebene „Privat“ selbst wird nie gelöscht** (Grundentscheidungen 14–16).
3. **Langes Drücken auf einen bestehenden Pin für etwa eine Sekunde aktiviert den Pin-Verschiebemodus** und ermöglicht direkt im selben Finger-/Mauszug das Positionieren der Vorschau. Das Öffnen bzw. Fokussieren der Namensbearbeitung durch diesen Langdruck war eine Fehlinterpretation und wird ausdrücklich verworfen.
4. Nach dem Langdruck wird der überlagernde Pin-Editor ausgeblendet. Die ursprüngliche Position bleibt bestehen, und der Vorschau-Pin lässt sich bewegen. Die Änderungen werden erst nach bewusster Aktion **„Position übernehmen“** gespeichert, **„Abbrechen“** verwirft sie. Dies erhält die Sicherheitsregeln der Grundentscheidungen 30–35. Ein normaler kurzer Klick auf einen Pin öffnet weiterhin die Bearbeitung.
5. Langes Drücken auf eine **freie Kartenstelle** erzeugt dagegen wie zuvor einen **neuen Pin**; dies ist ausdrücklich vom Verschieben eines vorhandenen Pins zu unterscheiden. Es funktioniert auf Desktop und iPhone.
6. **Die weltweite Ortsnamensuche bleibt verbindlicher Bestandteil der ersten Basisversion.**

**Stand:** Die Änderungen wurden in den Quellcode im GitHub-Repository übernommen. Ihre Bedienung im tatsächlichen Browser/iPhone bleibt zu prüfen.

## Fehlerkorrektur – Pin-Auswahl und Pin-Verschiebung nach Regression (2026-11-08)

**Verbindliches Verhalten, ausdrücklich nach Nutzerbefund erneut bestätigt:**

- **Kurzes Antippen/Anklicken eines vorhandenen Pins** öffnet zuverlässig dessen Bearbeitungsdialog; erneutes kurzes Antippen desselben Pins schließt ihn. Die Kartenfläche erhält bei einer Geste auf dem Pin kein konkurrierendes Ziehereignis.
- **Etwa eine Sekunde langes Drücken auf einen vorhandenen Pin** aktiviert den Verschiebemodus; der Finger bzw. die Maus kann anschließend in derselben durchgehenden Geste den Vorschau-Pin zur gewünschten Stelle ziehen. Die Karte selbst darf sich dabei **nicht verschieben**.
- Die Ereignissteuerung verhindert Karten-Dragging bereits beim Beginn der Pin-Berührung und stellt die normale Kartenbedienung nach Loslassen oder Abbruch wieder her. Der Pin muss sein Eingabeelement während der aktiven Geste behalten, damit die Bewegung nicht durch einen DOM-Austausch unterbrochen wird.
- Beim Loslassen wird die angezeigte neue Position **nicht automatisch gespeichert**; die vorhandenen Aktionen **„Position übernehmen“** bzw. **„Abbrechen“** bleiben verbindlich (Grundentscheidungen 30–35).
- Dies ist die Korrektur einer Regression und **keine neue Funktion**. Die weltweite Ortsnamensuche bleibt Teil der Basisversion.

**Prüfstatus:** JavaScript-Syntax und die relevanten Codepfade wurden geprüft; das Verhalten auf echtem iPhone und Desktop muss weiterhin praktisch verifiziert werden.


## Umsetzungspräzisierung – Pin-Langdruck-Zoom und Ebenenauswahl unten (2026-11-09)

**Nach Prüfung des Originals in `pin2map/pin2map` und auf ausdrücklichen Nutzerwunsch verbindlich festgelegt:**

1. **Ein langer Druck auf ein bestehendes Pin-Symbol dient zum Zoomen, nicht zum Verschieben.** Die Vorgänger-App verwendet den Wechsel zwischen Zoomstufe **18 und 14** mit einem Halteintervall von ca. **550 ms**. Der Pin behält seine **bisherige Bildschirmposition** statt automatisch in die Kartenmitte zu springen; der Übergang erfolgt ohne Animation. Die maximale Zoomstufe des gewählten Kartenanbieters wird respektiert.
2. **Ein kurzer Pin-Tipp öffnet weiterhin den Pin-Bearbeitungsdialog**, erneutes Tippen schließt ihn. Pin-Gesten dürfen keine Kartenverschiebung auslösen.
3. **Pin-Verschieben ist nur über die bewusst gewählte Schaltfläche „Pin verschieben“ im Pin-Bearbeitungsdialog möglich.** Die vorherige Langdruck-Verschiebegeste wird aufgehoben. Die separate Vorschau mit alter Position, neuer Position, Verbindungslinie sowie „Position übernehmen“/„Abbrechen“ bleibt bestehen.
4. **Die Ebenensteuerung wandert aus dem oberen Suchblock heraus.** Ein eigener **runder Button unten horizontal zentriert** öffnet die Ebenenverwaltung **direkt darüber**, sowohl auf iPhone als auch Desktop. Die obere Suchsteuerung bleibt kompakt und enthält die Ortssuche und Einstellungen.
5. Das lange Drücken auf eine **freie Kartenfläche** erzeugt weiterhin einen neuen Pin, auch am Desktop. Diese Geste ist unabhängig vom Langdruck auf einen bestehenden Pin.
6. Die **weltweite geografische Ortssuche bleibt verbindlicher Bestandteil der Basisversion**; alle darüber erzeugten Pins gehören in „Privat“.

**Prüfstatus:** Gegen das Original-Verhalten geprüft, Code eingecheckt und JavaScript-Syntax kontrolliert. Ein realer Browser-/iPhone-Interaktionstest ist weiterhin erforderlich.


## Verbindliche Änderung – Neue Objekte immer in „Privat“, keine aktive Ebene (2026-11-09)

**Neue Grundentscheidung 1 (überschreibt ältere Festlegungen):** **Jedes neu erzeugte Objekt, insbesondere jeder Pin, wird zunächst ausschließlich in der Systemebene „Privat“ angelegt.** Das gilt unabhängig vom Erstellungsweg, einschließlich langem Drücken bzw. Rechtsklick auf die Karte und geografischer Ortsnamensuche. Der Benutzer kann ein vorhandenes Objekt anschließend ausdrücklich einer anderen regulären Ebene zuordnen. Die Regel „ein Pin gehört genau einer Ebene“ bleibt bestehen.

**Neue Grundentscheidung 2 (Konsequenz aus 1):** Die Kennzeichnung beziehungsweise Auswahl einer **aktiven Ebene entfällt vollständig**. In der Ebenenverwaltung gibt es keine Aktionen „Aktiv“ oder „Aktivieren“ mehr. Beim Anlegen einer Ebene wird diese weder aktiv noch als bevorzugtes Ziel für neue Objekte markiert. Die bisher lokal gespeicherte `activeLayer`-Eigenschaft wird bei der Übernahme vorhandener Browserdaten verworfen. Die Sichtbarkeit von Ebenen bleibt eine unabhängige Einstellung.

**Weitere Konsequenzen:**
- Die Beschlüsse zur automatischen Zuordnung neuer Pins zur aktiven Ebene (insbesondere Grundentscheidungen 7–9), zum Erstellen in ausgeblendeten *aktiven* Ebenen (Grundentscheidung 11) sowie entsprechende Passagen der bisherigen Umsetzungspräzisierungen sind **in diesem Punkt ausdrücklich aufgehoben**.
- Die bereits beschlossene Regel der Ortssuche, neue Pins in „Privat“ zu speichern (Grundentscheidung 119), wird auf **alle** Erstellungsarten erweitert.
- Die Ebene „Privat“ bleibt nicht löschbar; ihre Pins können wie beschlossen gesammelt gelöscht werden.
- Wird ein Pin neu angelegt, während „Privat“ ausgeblendet ist, bleibt die Ebene ausgeblendet. Der Pin wird dennoch in „Privat“ angelegt; ein Hinweis mit bewusster Möglichkeit zum Einblenden ist bereitzustellen. Diese Regel ersetzt die frühere Pflicht, vor dem Anlegen eine aktive Ebene auszuwählen.
- Bestehende Pins werden **nicht** verschoben oder umsortiert. Ihre bisherigen Ebenenzuordnungen bleiben unverändert. Die explizite Änderung einer Pin-Ebene über dessen Bearbeitungsdialog bleibt möglich.
- **Die weltweite geografische Ortsnamensuche bleibt verbindlicher Bestandteil der Basisversion.**

**Status:** In der testbaren Anwendung umgesetzt. Browser- und iPhone-Interaktionen müssen nach der Veröffentlichung weiterhin praktisch überprüft werden.


## UI-Präzisierung – Kompakte Positionsbestätigung am Vorschau-Pin (2026-11-09)

**Verbindlich aus dem Nutzertest:**
- Die Bestätigung des bewussten Pin-Verschiebens ist **kein breiter Dialog am unteren Bildschirmrand** mehr. Stattdessen erscheint eine **äußerst kompakte Bestätigungsleiste mit geringem Abstand unterhalb der neu gewählten Pin-Position**.
- Die Beschriftung lautet ausschließlich **„Neue Position“**.
- „Position übernehmen“ erscheint als **runder grüner Button mit weißem Haken (✓)**, „Abbrechen“ als **runder roter Button mit weißem X (×)**. Die Buttons erhalten eindeutige barrierefreie Beschriftungen.
- Die Leiste folgt dem Vorschau-Pin bei dessen Verschiebung und bei Kartennavigation; falls unterhalb des Pins kein ausreichender Platz besteht, wird sie am sichtbaren Bildschirmrand sinnvoll oberhalb der Position platziert.
- Die Leiste wird erst angezeigt, nachdem eine neue Position als Vorschau vorliegt. Die ursprüngliche Position, Vorschau und Verbindungslinie bleiben erhalten. Die Speicherung erfolgt weiterhin **erst nach Bestätigung**, Abbrechen verwirft die Vorschau (Grundentscheidungen 30–35).
- Die weltweite Ortssuche und die Regel, alle neuen Pins zunächst in „Privat“ anzulegen, bleiben unberührt.
