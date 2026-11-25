import { useEffect, useMemo, useRef, useState } from "react";
import {
  getOwnerCabinetProfile, saveOwnerCabinetProfile, verifyOwnerCabinetProfileSave,
} from "./ownerProfileClient.js";
import {
  PROFILE_FIELDS, ownerProfileChanged,
} from "./ownerProfileModel.js";

const css = {
  box: {display:"grid",gap:14},
  fields: {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(225px,1fr))",
    gap:14},
  field: {display:"grid",gap:5,color:"#344054",fontSize:13,fontWeight:650},
  input: {width:"100%",maxWidth:"100%",boxSizing:"border-box",
    padding:"10px 12px",border:"1px solid #bbc6d4",borderRadius:8,
    background:"#fff",color:"#111827",fontSize:16},
  button: {padding:"11px 17px",border:"1px solid #17203a",borderRadius:9,
    background:"#17203a",color:"#fff",fontWeight:650,cursor:"pointer"},
  minor: {fontSize:13,color:"#475467",lineHeight:1.55},
};

const FIELDS = Object.freeze({
  name: { salon:"Название салона", master:"Имя мастера", max:160 },
  description: { salon:"Описание салона",max:3000 },
  city: { salon:"Город",max:120 },
  phone: { salon:"Контактный телефон",max:40 },
  logo_url: { salon:"Ссылка на логотип (HTTPS)",max:1024 },
});

function messageFor(error) {
  const code = String(error?.message || error?.code || "PROFILE_REQUEST_FAILED");
  const labels = {
    PROFILE_SESSION_REQUIRED:"Войдите в кабинет владельца повторно.",
    PROFILE_SESSION_INVALID:"Сессия завершена. Войдите повторно.",
    PROFILE_OWNER_NOT_FOUND:"Доступ к этому профилю не подтверждён.",
    PROFILE_FIELDS_UNSUPPORTED:"Запрошены поля без подтверждённого хранилища.",
    PROFILE_REVISION_CONFLICT:"Профиль изменился в другом окне. Обновите данные.",
    PROFILE_BILLING_BLOCKED:"Редактирование ограничено состоянием подписки.",
    PROFILE_FIELD_INVALID:"Проверьте длину и заполнение полей.",
    PROFILE_PHONE_INVALID:"Телефон не соответствует правилам выбранного рынка.",
    PROFILE_LOGO_URL_INVALID:"Укажите действительную ссылку HTTPS на логотип.",
    PROFILE_READBACK_CONTRACT_MISMATCH:
      "Ответ сервера не соответствует контракту профиля. Изменения не подтверждены.",
    PROFILE_PERSISTENCE_VERIFICATION_FAILED:
      "Не удалось подтвердить сохранение независимым чтением. Проверьте данные.",
    PROFILE_STORAGE_READBACK_MISMATCH:
      "Сервер не подтвердил записанные значения. Изменения отменены.",
  };
  return labels[code] || "Ошибка профиля: " + code;
}

function editableForm(record) {
  return Object.fromEntries(
    (PROFILE_FIELDS[record.owner_type] || []).map(key =>
      [key, String(record.profile[key] ?? "")]
    )
  );
}

export default function OwnerProfileSettings({
  ownerType, ownerSlug, canWrite = false, onPersisted,
  persistedConfirmation, onClearConfirmation,
}) {
  const [state,setState] = useState("loading");
  const [record,setRecord] = useState(null);
  const [form,setForm] = useState({});
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const [saving,setSaving] = useState(false);
  const [refresh,setRefresh] = useState(0);
  const savingController = useRef(null);

  useEffect(() => {
    if (!ownerSlug || !PROFILE_FIELDS[ownerType]) {
      setState("error");
      setError("Профиль не определён: отсутствует тип владельца или slug.");
      return undefined;
    }
    let alive=true;
    const abort=new AbortController();
    setState("loading");
    setRecord(null);
    setMessage("");
    setError("");
    getOwnerCabinetProfile(ownerType,ownerSlug,{signal:abort.signal})
      .then(payload=>{
        if (!alive || abort.signal.aborted) return;
        setRecord(payload);
        setForm(editableForm(payload));
        setState("ready");
      })
      .catch(problem=>{
        if (!alive || abort.signal.aborted || problem?.name==="AbortError") return;
        setState("error");
        setError(messageFor(problem));
      });
    return ()=>{
      alive=false;
      abort.abort();
      savingController.current?.abort();
    };
  },[ownerType,ownerSlug,refresh]);

  const modified=useMemo(
    ()=>ownerProfileChanged(record,form),
    [record,form]
  );
  const writable=state==="ready" && !saving &&
    canWrite===true && record?.can_write===true;
  // The salon context can remount this editor after a successful readback.
  // Retain confirmation only for the exact same owner/session/revision.
  const persistedMessage=record && persistedConfirmation &&
    persistedConfirmation.owner_id===record.owner_id &&
    persistedConfirmation.owner_slug===record.owner_slug &&
    persistedConfirmation.auth_revision===record.auth_revision &&
    persistedConfirmation.revision===record.revision && !modified && !saving
    ? "Профиль сохранён. Совпадение данных подтверждено повторным чтением." : "";

  async function save(event) {
    event.preventDefault();
    if (!writable || !modified || !record) return;
    onClearConfirmation?.();
    setSaving(true);
    setError("");
    setMessage("");
    const abort=new AbortController();
    savingController.current=abort;
    try{
      const patched=await saveOwnerCabinetProfile(record,form,{
        signal:abort.signal,
      });
      const fresh=await getOwnerCabinetProfile(ownerType,ownerSlug,{
        signal:abort.signal,
      });
      const verified=verifyOwnerCabinetProfileSave(record,patched,fresh);
      if (abort.signal.aborted) return;
      setRecord(verified);
      setForm(editableForm(verified));
      setMessage("Профиль сохранён. Совпадение данных подтверждено повторным чтением.");
      await onPersisted?.(verified);
    }catch(problem){
      if (abort.signal.aborted || problem?.name==="AbortError") return;
      setError(messageFor(problem));
      // An uncertain PATCH/GET outcome must never be shown as success.
      // Re-load canonical server values before allowing another write.
      setState("error");
    }finally{
      if (savingController.current===abort) savingController.current=null;
      if (!abort.signal.aborted) setSaving(false);
    }
  }

  if (state==="loading") return (
    <p role="status" style={css.minor}>Загрузка профиля из базы данных…</p>
  );
  if (state==="error") return (
    <div role="alert" style={{...css.box,color:"#b42318"}}>
      <p>{error || "Профиль недоступен"}</p>
      <button type="button" style={css.button}
        onClick={()=>setRefresh(n=>n+1)}>Повторно загрузить профиль</button>
    </div>
  );

  return (
    <div style={css.box}>
      <p style={{...css.minor,margin:0}}>
        Изменения записываются только в существующие поля владельца.
        Сохранение подтверждается повторным запросом к серверу.
      </p>
      <form onSubmit={save} style={css.box} aria-label="Редактирование профиля владельца">
        <div style={css.fields}>
          {PROFILE_FIELDS[ownerType].map(key=>{
            const item=FIELDS[key];
            return (
              <label key={key} style={css.field}>
                {item[ownerType]}
                {key==="description" ? (
                  <textarea rows={4} style={css.input}
                    value={form[key] ?? ""} maxLength={item.max}
                    disabled={!writable}
                    onChange={event=>{
                      setForm(prev=>({...prev,[key]:event.target.value}));
                      setMessage("");
                      onClearConfirmation?.();
                    }} />
                ) : (
                  <input type={key==="logo_url"?"url":"text"} style={css.input}
                    value={form[key] ?? ""} maxLength={item.max}
                    disabled={!writable}
                    placeholder={key==="phone"?"+996 555 123456 / +1 202 555 0143":
                      key==="logo_url"?"https://example.com/logo.png":""}
                    required={key==="name"}
                    onChange={event=>{
                      setForm(prev=>({...prev,[key]:event.target.value}));
                      setMessage("");
                      onClearConfirmation?.();
                    }} />
                )}
              </label>
            );
          })}
        </div>
        <label style={css.field}>
          Email для входа — только чтение
          <input style={{...css.input,background:"#f2f4f7"}}
            type="email" readOnly disabled
            value={record?.profile.email || ""}/>
        </label>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <button style={{...css.button,opacity:(!writable||!modified)?0.55:1}}
            disabled={!writable||!modified} type="submit">
            {saving?"Сохранение…":"Сохранить профиль"}
          </button>
          <button type="button"
            style={{...css.button,background:"#fff",color:"#17203a"}}
            disabled={saving} onClick={()=>{onClearConfirmation?.();setRefresh(n=>n+1);}}>
            Обновить данные
          </button>
          <span style={css.minor}>
            {modified?"Есть несохранённые изменения":"Нет несохранённых изменений"}
          </span>
        </div>
        {!canWrite || !record?.can_write ? (
          <p style={{...css.minor,color:"#92400e"}}>
            Редактирование заблокировано правами или состоянием подписки.
          </p>
        ) : null}
        {(message || persistedMessage) && <p role="status" style={{color:"#067647"}}>{message || persistedMessage}</p>}
        {error && <p role="alert" style={{color:"#b42318"}}>{error}</p>}
      </form>
      <div style={{borderTop:"1px solid #e2e8f0",paddingTop:12}}>
        <strong style={{fontSize:13}}>Другие параметры профиля</strong>
        <p style={{...css.minor,margin:"6px 0 0"}}>
          {ownerType==="master"
            ? "Биография, фотография, контактный телефон, WhatsApp и настройки интервалов записи не имеют подтверждённых полей в текущей таблице мастера. Они не выдаются за сохранённые. Email меняется только через отдельное подтверждение."
            : "WhatsApp и настройки интервалов записи не имеют подтверждённого контракта сохранения в таблице салона. Email меняется только через отдельное подтверждение."}
        </p>
      </div>
    </div>
  );
}
