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

## Offen – Grundentscheidung 57: Genaue Position des Kartenwahl-Buttons

Wo soll der direkt sichtbare Kartenwahl-Button am unteren Kartenrand positioniert werden?

- **Variante A (Empfehlung):** **Horizontal zentriert am unteren Kartenrand**, auf derselben Höhe wie der untere Zoom-Button („−“). Dies entspricht der im PoC erprobten Anordnung und hält den Kartenwechsel gut erreichbar.
- **Variante B:** **In der unteren rechten Kartenecke**, in der Nähe der Zoom-Steuerung. Die Kartenmitte bleibt so frei von Bedienelementen.

**Status:** Grundentscheidung 57 ist offen und noch nicht beschlossen.
