import { globalConfig } from '@airtable/blocks';
import {
         initializeBlock,
         useBase,
         useSession,
         useSettingsButton,
         expandRecordList,
         expandRecordPickerAsync,
         Box,
         Button,
         Dialog,
         FormField,
         Heading,
         Input,
         Loader,
         RecordCard,
         Switch,
         Text,
         Tooltip
} from '@airtable/blocks/ui';
import React, { useState } from 'react';

const version = "1.0.6";

class LerneinheitenAuswahl extends React.Component {
        shouldComponentUpdate(nextProps) {
                return (nextProps.Counter !== this.props.Counter);
        }
        render() {
                const me = this;
                const klassenbuch = me.props.Base.getTableByName("Klassenbuch");
                const inhalt = me.props.Base.getTableByName("Inhalt");
                // TODO Klassenbuch loswerden? Klassenbuchrecords sind in Inhaltsrecords verlinkt ...
                const klassenbuchJg = me.props.Klassenbuch.filter(k => k.Jahrgang?.some(x => x.id === me.props.Jahrgang.id));
                const filterFachThema = function (rec) {
                        let treffer = rec["Inhaltliche Einordnung"]?.some(x => x.id === me.props.Fach.id);
                        treffer = treffer && (me.props.Thema.id === "" || rec["Inhaltliche Einordnung"]?.some(x => x.id === me.props.Thema.id));
                        if (me.props.HideFinishedLEs === true)
                                treffer = treffer && (rec["Jahrgang abgeschlossen"]?.every(x => x.value.id !== me.props.Jahrgang.id) ?? true);
                        return treffer || rec.selected;
                };
                const getStyle = function (rec) {
                        let style = {}
                        if (rec["Jahrgang abgeschlossen"]?.some(x => x.value.id === me.props.Jahrgang.id)) {
                                style["backgroundColor"] = "#d4efdf";
                        }
                        else if (rec["Jahrgang allgemein"]?.some(x => x.value.id === me.props.Jahrgang.id)) {
                                style["backgroundColor"] = "#fcf3cf";
                        }
                        else {
                                style["backgroundColor"] = "#fadbd8";
                        }

                        return style;
                }
                const getHeight = function (rec) {
                        if (rec["Jahrgang allgemein"]?.some(x => x.value.id === me.props.Jahrgang.id)) {
                                return undefined;
                        }
                        return 40;
                }
                const getFrequency = function (rec) {
                        return rec["Jahrgang allgemein"]?.filter(x => x.value.id === me.props.Jahrgang.id)?.length ?? 0;
                        //return `Diese Lerneinheit wurde im gewählten Jahrgang bisher ${rec["Jahrgang allgemein"]?.filter(x => x.value.id === me.props.Jahrgang.id).length ?? 0} Mal unterrichtet`;
                }
                const getFields = function (rec) {
                        let fields;
                        if (rec["Jahrgang allgemein"]?.some(x => x.value.id === me.props.Jahrgang.id)) {
                                fields=[inhalt.getFieldByName("Name")
                                        ,klassenbuch.getFieldByName("Dozent:in")
                                        ,klassenbuch.getFieldByName("Datum")
                                        ,klassenbuch.getFieldByName("Stunden")
                                        ,klassenbuch.getFieldByName("Bemerkungen")];
                        } else {
                                fields=[inhalt.getFieldByName("Name")];

                        }
                        return fields;
                }
                const enrichRecord = rec => {
                        const treffer = klassenbuchJg.filter(k => k.Inhalt?.some(x => x.id === rec.id));
                        if (treffer.length > 0) {
                                treffer.sort((t1, t2) => {
                                        let date1 = new Date(t1.Datum); date1.setHours(0,0,0,0);
                                        let date2 = new Date(t2.Datum); date2.setHours(0,0,0,0);
                                        let byDate = date2 - date1;
                                        return byDate == 0 ? t2.ID - t1.ID : byDate;
                                });
                                let kbinfo = treffer[0];
                                rec[klassenbuch.getFieldByName("Dozent:in").id]   = kbinfo["Dozent:in"];
                                rec[klassenbuch.getFieldByName("Datum").id]       = kbinfo.Datum;
                                rec[klassenbuch.getFieldByName("Stunden").id]     = 
                                        treffer.reduce((acc, v) => acc+((isNaN(v.Stunden) ? 0 : v.Stunden)/v.Inhalt.length), 0);
                                rec[klassenbuch.getFieldByName("Bemerkungen").id] = kbinfo.Bemerkungen;
                        } else {
                                rec[klassenbuch.getFieldByName("Dozent:in").id]   = [];
                                rec[klassenbuch.getFieldByName("Datum").id]       = "";
                                rec[klassenbuch.getFieldByName("Stunden").id]     = null;
                                rec[klassenbuch.getFieldByName("Bemerkungen").id] = "";
                        }
                        return rec;
                }
                const expandRecordIfPossible = function (rec) {
                        const treffer = klassenbuchJg.filter(k => k.Inhalt?.some(x => x.id === rec.id));
                        if (treffer.length > 0) {
                                return function (_) {
                                        expandRecordList(treffer.sort(
                                                (t1, t2) => {
                                                        let date1 = new Date(t1.Datum); date1.setHours(0,0,0,0);
                                                        let date2 = new Date(t2.Datum); date2.setHours(0,0,0,0);
                                                        let byDate = date2 - date1;
                                                        return byDate == 0 ? t2.ID - t1.ID : byDate;
                                                }), {fields: [klassenbuch.getFieldByName("Dozent:in")
                                                             ,klassenbuch.getFieldByName("Datum")
                                                             ,klassenbuch.getFieldByName("Stunden")
                                                             ,klassenbuch.getFieldByName("Bemerkungen")]});
                                }
                        }
                        return undefined;
                }
                return  <Box display="flex" flexDirection="column">
                                {me.props.Lerneinheiten
                                        .filter(filterFachThema)
                                        .map(r => <Box key={r.id} display="flex" alignItems="stretch" padding="1" marginBottom="2">
                                                        <Switch value={r.selected} onChange={_ => me.props.toggleSelected(r)} width="40px" backgroundColor="transparent"/>
                                                        <Tooltip content={`Diese Lerneinheit wurde im gewählten Jahrgang bisher ${getFrequency(r)} Mal unterrichtet`}
                                                                 placementX={Tooltip.placements.CENTER}
                                                                 placementY={Tooltip.placements.BOTTOM}
                                                                 shouldHideTooltipOnClick={true}
                                                                 disabled={getFrequency(r) === 0 ? true : false}>
                                                                <RecordCard key={r.id} flex="1 1 auto" 
                                                                        height={getHeight(r)}
                                                                        style={getStyle(r)}
                                                                        record={enrichRecord(r)} 
                                                                        fields={getFields(r)}
                                                                        onClick={expandRecordIfPossible(r)}
                                                                />
                                                        </Tooltip>
                                                </Box>)
                                }
                        </Box>;
        }
}

function EintragInsKlassenbuchApp() {
        const base = useBase();
        const session = useSession();
        const Airtable = require("airtable");
        const inhalt = base.getTableByName("Inhalt");
        const orte = base.getTableByName("Ort");
        const jahrgaenge = base.getTableByName("Jahrgang");
        const faecher = inhalt.getViewByName("Unterrichtsfach");
        const themen = inhalt.getViewByName("Thema");
        const lerneinheiten = inhalt.getViewByName("Lerneinheit");
        const klassenbuch = base.getTableByName("Klassenbuch");

        const personal = base.getTableByName("Personal");
        const doz = personal.getViewByName("Dozent:in");
        const assist = personal.getViewByName("Assistent:in");

        const nil = {id: "", name: ""};
        const [getOrt, setOrt] = useState(nil);
        const [getJahrgang, setJahrgang] = useState(nil);
        const [getFach, setFach] = useState(nil);
        const [getThema, setThema] = useState(nil);
        const [getHideFinishedLEs, setHideFinishedLEs] = useState(false);
        const [getLerneinheiten, setLerneinheiten] = useState([]);
        const [getKlassenbuch, setKlassenbuch] = useState([]);
        const [getDoz, setDoz] = useState([]);
        const [getAssist, setAssist] = useState([]);
        const [getDatum, setDatum] = useState("");
        const [getStunden, setStunden] = useState("");
        const [getStatusAbgeschlossen, setStatusAbgeschlossen] = useState(false);
        const [getBemerkungen, setBemerkungen] = useState("");
        const [isWarningOpen, setIsWarningOpen] = useState(false);
        const [isStundenWarningOpen, setIsStundenWarningOpen] = useState(false);
        const [isPermissionWarningOpen, setIsPermissionWarningOpen] = useState(false);
        const [isConfirmOpen, setIsConfirmOpen] = useState(false);
        const [isInhaltLoading, setIsInhaltLoading] = useState(false);

        // TODO Nur ein Hilfsmittel, um feiner zu steuern, wann die Lerneinheitenauswahl aktualisiert wird
        const [getCounter, setCounter] = useState(0);
        const incCounter = function () {
                setCounter(getCounter+1);
        }

        const [getApiKey, setApiKey] = useState(globalConfig.get("apiKey"));

        const [isShowingSettings, setIsShowingSettings] = useState(false);
        useSettingsButton(function () {
                setIsShowingSettings(!isShowingSettings);
        });
        const [hasDozPermission, setHasDozPermission] = useState(false);

        const reset = function () {
                setOrt(nil);
                setJahrgang(nil);
                setFach(nil);
                setThema(nil);
                setDoz([]);
                setAssist([]);
                setDatum("");
                setStunden("");
                setStatusAbgeschlossen(false);
                setBemerkungen("");
                setLerneinheiten(getLerneinheiten.map(function(r) {r.selected = false; return r;}));
                setHideFinishedLEs(false);
                incCounter();
        }
        const validate = async function () {
                const _hasDozPermission = await checkDozPermission();
                if (!_hasDozPermission) {
                        setIsPermissionWarningOpen(true);
                        return;
                }
                const stundenTest = (getStunden === "" ? "0.01" : getStunden);

                if (getJahrgang.id === "" ||
                    getLerneinheiten.filter(r => r.selected).length === 0 ||
                    getDoz.length === 0 ||
                    getDatum === "" ||
                    getStunden === "")
                        setIsWarningOpen(true);
                else if (isNaN(parseFloat(stundenTest)) || parseFloat(stundenTest).toString() !== stundenTest || parseFloat(stundenTest) < 0) 
                        setIsStundenWarningOpen(true);
                else
                        setIsConfirmOpen(true);
        }
        const save = async function () {
                if (!hasDozPermission)
                        return;
                if (klassenbuch.checkPermissionsForCreateRecord().hasPermission) {
                        await klassenbuch.createRecordAsync({
                                "Dozent:in": getDoz.map(d => ({id: d.id})),
                                "Assistent:in": getAssist.map(a => ({id: a.id})),
                                "Jahrgang": getJahrgang.id !== "" ? [{id: getJahrgang.id}] : [],
                                "Inhalt": getLerneinheiten.filter(r => r.selected).map(r => ({id: r.id})),
                                "Datum": getDatum,
                                "Stunden": getStunden === "" ? null : parseFloat(getStunden),
                                "Abgeschlossen": getStatusAbgeschlossen,
                                "Bemerkungen": getBemerkungen
                        });
                        setLerneinheiten(getLerneinheiten.map(function(r) {r.selected = false; return r;}));
                        setIsInhaltLoading(true);
                        // TODO Klassenbuch loswerden? Klassenbuchrecords sind in Inhaltsrecords verlinkt ...
                        await loadKlassenbuch();
                        await loadLerneinheiten();
                        setIsInhaltLoading(false);
                        incCounter();
                } else {
                        try {
                                const apiBase = new Airtable({apiKey: globalConfig.get("apiKey")}).base(base.id);
                                apiBase("Klassenbuch").create([
                                        {
                                                "fields": {
                                                        "Dozent:in": getDoz.map(d => d.id),
                                                        "Assistent:in": getAssist.map(a => a.id),
                                                        "Jahrgang": getJahrgang.id !== "" ? [getJahrgang.id] : [],
                                                        "Inhalt": getLerneinheiten.filter(r => r.selected).map(r => r.id),
                                                        "Datum": getDatum,
                                                        "Stunden": parseFloat(getStunden),
                                                        "Abgeschlossen": getStatusAbgeschlossen,
                                                        "Bemerkungen": getBemerkungen
                                                }
                                        }
                                ], async function (err, records) {
                                        if (err) {
                                                alert(err);
                                                return;
                                        }
                                        setLerneinheiten(getLerneinheiten.map(function(r) {r.selected = false; return r;}));
                                        setIsInhaltLoading(true);
                                        // TODO Klassenbuch loswerden? Klassenbuchrecords sind in Inhaltsrecords verlinkt ...
                                        await loadKlassenbuch();
                                        await loadLerneinheiten();
                                        setIsInhaltLoading(false);
                                        incCounter();
                                });
                        } catch (e) {
                                alert(e);
                                return;
                        }
                }
        }

        // TODO Klassenbuch loswerden? Klassenbuchrecords sind in Inhaltsrecords verlinkt ...
        const loadKlassenbuch = async function () {
                const queryResult = klassenbuch.selectRecords({
                        fields:["ID", "Inhalt", "Jahrgang", "Abgeschlossen", "Dozent:in", "Datum", "Stunden", "Bemerkungen"]
                });
                await queryResult.loadDataAsync();
                const records = queryResult.records;
                setKlassenbuch(records.map(function (r) {
                        let rec = {
                                "parentTable": klassenbuch,
                                "id": r.id, // interne ID
                                "ID": r.getCellValue("ID"), // Primärfeld, von uns erfundene ID
                                "Inhalt": r.getCellValue("Inhalt"),
                                "Jahrgang": r.getCellValue("Jahrgang"),
                                "Abgeschlossen": r.getCellValue("Abgeschlossen"),
                                "Dozent:in": r.getCellValue("Dozent:in"),
                                "Datum": r.getCellValue("Datum"),
                                "Stunden": r.getCellValue("Stunden"),
                                "Bemerkungen": r.getCellValue("Bemerkungen"),
                        };
                        return rec;
                }));
                queryResult.unloadData();
        }
        const selectOrt = async function() {
                const queryResult = orte.selectRecords();
                await queryResult.loadDataAsync();
                const records = queryResult.records;
                const rec = await expandRecordPickerAsync(records);
                if (rec !== null) {
                        let newOrt = {id: rec.id, name: rec.name};
                        setOrt(newOrt);
                } else {
                        setOrt(nil);
                }
                queryResult.unloadData();
        }
        const selectJahrgang = async function () {
                if (getLerneinheiten.length > 0)
                        setIsInhaltLoading(true);

                const queryResult = jahrgaenge.selectRecords({
                        sorts:[{field: jahrgaenge.getFieldByName("Name"), direction: "desc"}],
                        fields:["Name", "Ort"]
                });
                await queryResult.loadDataAsync();
                const records = queryResult.records.filter(r => r.getCellValue("Ort")?.some(o => o.id === getOrt?.id));
                const rec = await expandRecordPickerAsync(records);
                if (rec !== null) {
                        let newJahrgang = {id: rec.id, name: rec.name};
                        setJahrgang(newJahrgang);
                } else {
                        setJahrgang(nil);
                }
                queryResult.unloadData();

                if (getKlassenbuch.length === 0)
                        await loadKlassenbuch();
                setIsInhaltLoading(false);
                incCounter();
        }
        const loadLerneinheiten = async function () {
                const queryResult = lerneinheiten.selectRecords({
                        sorts:[{field: inhalt.getFieldByName("Sortierung")}, {field: inhalt.getFieldByName("Name")}],
                        fields:["Name", "Inhaltliche Einordnung", "Klassenbuch", "Jahrgang allgemein", "Jahrgang abgeschlossen"]
                });
                await queryResult.loadDataAsync();
                const records = queryResult.records;
                setLerneinheiten(records.map(function (r) {
                        let rec = {
                                "id": r.id,
                                "name": r.name,
                                "Inhaltliche Einordnung": r.getCellValue("Inhaltliche Einordnung"),
                                "Klassenbuch": r.getCellValue("Klassenbuch"),
                                "Jahrgang allgemein": r.getCellValue("Jahrgang allgemein"),
                                "Jahrgang abgeschlossen": r.getCellValue("Jahrgang abgeschlossen"),
                                "selected": false
                        };
                        rec[inhalt.getFieldByName("Name").id] = r.name
                        return rec;
                }));
                queryResult.unloadData();
        }
        const selectFach = async function () {
                setIsInhaltLoading(true);
                const queryResult = faecher.selectRecords({fields:["Name"]});
                await queryResult.loadDataAsync();
                const records = queryResult.records;
                const rec = await expandRecordPickerAsync(records, {fields:[inhalt.getFieldByName("Kategorie"), inhalt.getFieldByName("Tags")]});
                if (rec !== null) {
                        let newFach = {id: rec.id, name: rec.name };
                        setFach(newFach);
                        setThema(nil);
                } else {
                        setFach(nil);
                        setThema(nil);
                }
                queryResult.unloadData();

                //setLerneinheiten(getLerneinheiten.map(function(r) {r.selected = false; return r;}));
                if (getLerneinheiten.length === 0)
                        await loadLerneinheiten();
                setIsInhaltLoading(false);
                incCounter();
        }
        const selectThema = async function () {
                setIsInhaltLoading(true);
                const queryResult = themen.selectRecords({fields:["Name", "Inhaltliche Einordnung"]});
                await queryResult.loadDataAsync();
                let records = queryResult.records;
                if (getFach.id !== "")
                        records = records.filter(r => r.getCellValue("Inhaltliche Einordnung")?.some(p => p.id === getFach.id))
                const rec = await expandRecordPickerAsync(records, {
                        fields:[inhalt.getFieldByName("Inhaltliche Einordnung"), inhalt.getFieldByName("Kategorie"), inhalt.getFieldByName("Tags")]
                });
                if (rec !== null && rec.getCellValue("Inhaltliche Einordnung")?.length > 0) {
                        let newThema = {id: rec.id, name: rec.name};
                        setThema(newThema);
                        let newFach = {id: rec.getCellValue("Inhaltliche Einordnung")[0].id, name: rec.getCellValue("Inhaltliche Einordnung")[0].name};
                        setFach(newFach);
                } else {
                        setThema(nil);
                }
                queryResult.unloadData();

                if (getLerneinheiten.length === 0)
                        await loadLerneinheiten();
                setIsInhaltLoading(false);
                incCounter();
        }
        const selectDoz = async function () {
                const queryResult = doz.selectRecords({
                        fields:["Name", "Rolle"]
                });
                await queryResult.loadDataAsync();
                const records = queryResult.records;
                const rec = await expandRecordPickerAsync(records, {
                        fields:[personal.getFieldByName("Name"), personal.getFieldByName("Rolle")]
                });
                if (rec !== null) {
                        let ix = getDoz.findIndex(d => d.id === rec.id);
                        if (ix === -1) setDoz(getDoz.concat([{id: rec.id, name: rec.name }]));
                        else setDoz(getDoz.slice(0,ix).concat(getDoz.slice(ix+1)));
                } else {
                        setDoz([]);
                }
                queryResult.unloadData();
        }
        const checkDozPermission = async function () {
                const queryResult = doz.selectRecords({
                        fields:["Name", "Email"]
                });
                await queryResult.loadDataAsync();
                const result = queryResult.records.some(d => 
                        d.getCellValueAsString("Email").toLowerCase() === 
                        session.currentUser.email.toLowerCase());
                setHasDozPermission(result);
                queryResult.unloadData();
                return result;
        }
        const selectAssist = async function () {
                const queryResult = assist.selectRecords({
                        fields:["Name", "Rolle"]
                });
                await queryResult.loadDataAsync();
                const records = queryResult.records;
                const rec = await expandRecordPickerAsync(records, {
                        fields:[personal.getFieldByName("Name"), personal.getFieldByName("Rolle")]
                });
                if (rec !== null) {
                        let ix = getAssist.findIndex(a => a.id === rec.id);
                        if (ix === -1) setAssist(getAssist.concat([{id: rec.id, name: rec.name }]));
                        else setAssist(getAssist.slice(0,ix).concat(getAssist.slice(ix+1)));
                } else {
                        setAssist([]);
                }
                queryResult.unloadData();
        }
        //const selectLerneinheit = function () {
        //        setIsDialogOpen(true);
        //}
        const setConfig = async function () {
                if (globalConfig.hasPermissionToSet("apiKey", ""))
                        await globalConfig.setAsync("apiKey", getApiKey);
        }
        const toggleSelected = function (rec) {
                rec.selected = !rec.selected;
                setLerneinheiten(getLerneinheiten.map(r => r.id === rec.id ? rec : r));
                incCounter();
        }

        if (isShowingSettings)
                return (
                <Box padding={2}>
                        <FormField label="Airtable API-Key">
                                <Input value={globalConfig.hasPermissionToSet() ? getApiKey : ""} 
                                        type="text" onChange={e => setApiKey(e.target.value)} 
                                        disabled={!globalConfig.hasPermissionToSet()}/>
                        </FormField>
                        <Button marginRight="3" type="submit" 
                                disabled={!globalConfig.hasPermissionToSet()} 
                                onClick={setConfig}>Speichern</Button>
                </Box>);
        return (
        <Box padding={2}>
                <Box height={100}  opacity={0.7} 
                        style={{"background": "no-repeat center/contain url(https://dl.airtable.com/.attachments/d0cad55e7b6d128fa975a0299e9f9ebc/1b6ffe2b/STILL-ACADEMY-Osteopathieschule-in-Deutschland-Logo.png)"
                        }}>
                </Box>
                <FormField label="Ort"> 
                        <Button icon="link1" onClick={selectOrt}>{getOrt.id === "" ? "Datensatz auswählen ..." : getOrt.name}</Button>
                </FormField>
                <FormField label="Jahrgang*"> 
                        <Button icon="link1" onClick={getOrt.id === "" ? selectOrt : selectJahrgang}>
				{getJahrgang.id === "" ? "Datensatz auswählen ..." : getJahrgang.name}
			</Button>
                </FormField>
                <FormField label="Unterrichtsfach">
                        <Button icon="link1" onClick={selectFach}>{getFach.id === "" ? "Datensatz auswählen ..." : getFach.name}</Button>
                </FormField>
                <FormField label="Thema">
                        <Button icon="link1" onClick={selectThema}>{getThema.id === "" ? "Datensatz auswählen ..." : getThema.name}</Button>
                </FormField>
                <FormField label="">
                        <Switch label="Abgeschlossene Lerneinheiten ausblenden (falls nicht selektiert)" 
                                value={getHideFinishedLEs} 
                                onChange={newValue => { setHideFinishedLEs(newValue); incCounter() }} />
                </FormField>
                <FormField label="Lerneinheit(en)*">
                        {isInhaltLoading 
                                ? <Loader marginLeft={1} /> 
                                : <LerneinheitenAuswahl 
                                        Counter={getCounter}
                                        Base={base} Jahrgang={getJahrgang} Fach={getFach} Thema={getThema} 
                                        Lerneinheiten={getLerneinheiten} Klassenbuch={getKlassenbuch} HideFinishedLEs={getHideFinishedLEs}
                                        toggleSelected={toggleSelected} />}
                </FormField>
                <FormField label="Dozent:in(en)*">
                        <Button icon="link1" onClick={selectDoz}>
                                {getDoz.length === 0 ? "Datensätze auswählen ..." : getDoz.map(d => d.name).join(", ")}
                        </Button>
                </FormField>
                <FormField label="Assistent:in(en)">
                        <Button icon="link1" onClick={selectAssist}>
                                {getAssist.length === 0 ? "Datensätze auswählen ..." : getAssist.map(a => a.name).join(", ")}
                        </Button>
                </FormField>
                <FormField label="Datum*">
                        <Input value={getDatum} type="date" onChange={e => setDatum(e.target.value)} />
                </FormField>
                <FormField label="Stunden*">
                        <Input value={getStunden} type="text" onChange={e => setStunden(e.target.value.trim().replaceAll(",", "."))} />
                </FormField>
                <FormField label="">
                        <Switch label="Abgeschlossen" value={getStatusAbgeschlossen} onChange={newValue => setStatusAbgeschlossen(newValue)} />
                </FormField>
                <FormField label="Bemerkungen">
                        <Input value={getBemerkungen} type="text" onChange={e => setBemerkungen(e.target.value)} />
                </FormField>

                <Button marginRight="3" type="submit" onClick={validate}>Speichern</Button>
                <Button type="reset" onClick={reset}>Zurücksetzen</Button>
                <Box display="flex" justifyContent="flex-end">
                        <Text size="small" textColor="light">
                                Version: {version}
                        </Text>
                </Box>
                {isWarningOpen && 
                        (<Dialog onClose={()=>setIsWarningOpen(false)}>
                                <Dialog.CloseButton />
                                <Heading>Einige Pflichtangaben fehlen</Heading>
                                <ul>
                                        {(getJahrgang.id === "") && (<li>Jahrgang</li>)}
                                        {(getLerneinheiten.filter(r => r.selected).length === 0) && (<li>mind. 1 Lerneinheit</li>)}
                                        {(getDoz.length === 0) && (<li>mind. 1 Dozent:in</li>)}
                                        {(getDatum === "") && (<li>Datum</li>)}
                                        {(getStunden === "") && (<li>Stunden</li>)}
                                </ul>
                                <Button marginRight="3" onClick={()=>setIsWarningOpen(false)}>Ok</Button>
                        </Dialog>)}
                {isStundenWarningOpen &&
                        (<Dialog onClose={()=>setIsStundenWarningOpen(false)}>
                                <Dialog.CloseButton />
                                <Heading>Fehlerhafte Eingabe</Heading>
                                <Text variant="paragraph">Der eingegebene Stunden-Wert '{getStunden}' ist ungültig.</Text>
                                <Button marginRight="3" onClick={()=>setIsStundenWarningOpen(false)}>Ok</Button>
                        </Dialog>)}
                {isPermissionWarningOpen &&
                        (<Dialog onClose={()=>setIsPermissionWarningOpen(false)}>
                                <Dialog.CloseButton />
                                <Heading>Fehlende Berechtigung</Heading>
                                <Text variant="paragraph">
                                        Der/die aktuelle Benutzer:in '{session.currentUser.name} ({session.currentUser.email})' 
                                        ist in der Personaltabelle nicht bzw. nur ohne Dozent:in-Rolle vorhanden.
                                        Die Dozent:in-Rolle ist notwendig, um Daten mit Hilfe der App speichern zu können.
                                </Text>
                                <Text variant="paragraph">
                                        Die Zuordnung muss unter Verwendung der o.g. Email-Adresse erfolgen.
                                </Text>

                                <Button marginRight="3" onClick={()=>setIsPermissionWarningOpen(false)}>Ok</Button>
                        </Dialog>)}
                {isConfirmOpen &&
                        (<Dialog onClose={()=>setIsConfirmOpen(false)}>
                                <Dialog.CloseButton />
                                <Heading>Soll der folgende Datensatz erfasst werden?</Heading>
                                <ul>
                                        <li>Jahrgang: <b>{getJahrgang.name}</b></li>
                                        <li>Lerneinheiten:<ul>{getLerneinheiten.filter(r => r.selected).map(r => (<li key={r.id}><b>{r.name}</b></li>))}</ul></li>
                                        <li>Dozent:in(en): <b>{getDoz.map(d => d.name).join(", ")}</b></li>
                                        <li>Assistent:in(en): <b>{getAssist.map(a => a.name).join(", ")}</b></li>
                                        <li>Datum: <b>{getDatum}</b></li>
                                        <li>Stunden: <b>{getStunden}</b></li>
                                        <li>Abgeschlossen: <b>{getStatusAbgeschlossen ? "ja" : "nein"}</b></li>
                                        <li>Bemerkungen: <b>{getBemerkungen}</b></li>
                                </ul>
                                <Button marginRight="3" type="submit" onClick={() => { setIsConfirmOpen(false); save();} }>Speichern</Button>
                                <Button onClick={()=>setIsConfirmOpen(false)}>Abbrechen</Button>
                        </Dialog>)}
        </Box>);
}

initializeBlock(() => <EintragInsKlassenbuchApp />);
