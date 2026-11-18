import {useEffect,useMemo,useRef,useState} from "react";
import {
  getMasterUsWorkingHours,putMasterUsWorkingHours,
} from "../../api/internal.js";
import {
  normalizeUsMasterHoursLocations,
  normalizeUsMasterHoursDetail,
  prepareUsMasterHoursPut,
  verifyUsMasterHoursSaved,
} from "../../us/usBookingModel.js";

const DAYS=["Воскресенье","Понедельник","Вторник",
  "Среда","Четверг","Пятница","Суббота"];
const style={
  panel:{border:"1px solid #cbd5e1",borderRadius:12,padding:16,
    background:"#f8fafc",display:"grid",gap:12},
  label:{display:"grid",gap:5,fontSize:13,color:"#334155"},
  field:{padding:"9px 10px",borderRadius:8,border:"1px solid #94a3b8",
    fontSize:14,background:"#fff",maxWidth:"100%",boxSizing:"border-box"},
  button:{padding:"10px 16px",border:"1px solid #334155",
    borderRadius:9,fontWeight:700,cursor:"pointer",background:"#fff",
    color:"#172033"},
  hint:{fontSize:13,lineHeight:1.55,color:"#475569"},
};

function errorText(problem){
  const code=String(problem?.message||problem?.code||"US_HOURS_ERROR");
  const known={
    US_HOURS_MASTER_SESSION_REQUIRED:"Войдите в кабинет мастера.",
    US_HOURS_MASTER_FORBIDDEN:"Нет доступа к этому мастеру.",
    US_HOURS_LOCATION_RELATION_NOT_FOUND:
      "Подключение мастера к этому действующему филиалу не подтверждено.",
    US_HOURS_REVISION_CONFLICT:
      "Расписание изменилось в другом окне. Обновите данные перед сохранением.",
    US_HOURS_FUTURE_BOOKINGS_CONFLICT:
      "Есть предстоящие подтверждённые записи в филиале. Изменение недельного графика заблокировано, чтобы не повредить бронирования.",
    US_HOURS_INPUT_INVALID:
      "Проверьте время начала, окончания и перерывы: только HH:MM, в пределах одного дня.",
    US_MASTER_HOURS_INPUT_INVALID:
      "Проверьте интервалы: HH:MM, окончание позже начала, перерыв внутри смены.",
    US_MASTER_HOURS_SAVE_NOT_CONFIRMED:
      "Сохранение не подтверждено повторным чтением. Обновите данные.",
    BILLING_BLOCKED:"Изменение недоступно из-за состояния подписки.",
    US_HOURS_DB_CONFLICT:"Данные изменились. Обновите расписание.",
  };
  return known[code]||"Расписание недоступно: "+code;
}

function formFromWeek(week){
  return week.map(day=>({
    weekday:day.weekday,configured:day.configured===true,
    start_time:day.configured ? day.start_time : "09:00",
    end_time:day.configured ? day.end_time : "18:00",
    has_break:day.break_start!=null&&day.break_end!=null,
    break_start:day.break_start||"12:00",
    break_end:day.break_end||"13:00",
  }));
}

export default function UsMasterWorkingHoursEditor({
  masterSlug,canWrite=false,
}){
  const [locations,setLocations]=useState([]);
  const [scopeKey,setScopeKey]=useState("");
  const [listStatus,setListStatus]=useState("loading");
  const [detailStatus,setDetailStatus]=useState("idle");
  const [record,setRecord]=useState(null);
  const [days,setDays]=useState([]);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [revision,setRevision]=useState(0);
  const [saving,setSaving]=useState(false);
  const savingAbort=useRef(null);

  useEffect(()=>{
    if(!masterSlug){
      setListStatus("error");
      setError("US_MASTER_HOURS_MASTER_REQUIRED");
      return undefined;
    }
    let live=true;
    const abort=new AbortController();
    setListStatus("loading");
    setError("");
    setNotice("");
    getMasterUsWorkingHours(masterSlug,{signal:abort.signal})
      .then(raw=>{
        const items=normalizeUsMasterHoursLocations(raw,masterSlug);
        if(!live||abort.signal.aborted)return;
        setLocations(items);
        setScopeKey(items.length
          ? items[0].salon_slug+"/"+items[0].location_code:"");
        setListStatus("ready");
      })
      .catch(e=>{
        if(!live||abort.signal.aborted||e?.name==="AbortError")return;
        setListStatus("error");setError(errorText(e));
      });
    return ()=>{live=false;abort.abort();savingAbort.current?.abort()};
  },[masterSlug]);

  const location=useMemo(
    ()=>locations.find(item=>
      item.salon_slug+"/"+item.location_code===scopeKey)||null,
    [locations,scopeKey]
  );

  useEffect(()=>{
    if(listStatus!=="ready"||!location){
      setRecord(null);setDays([]);
      setDetailStatus("idle");
      return undefined;
    }
    let live=true;
    const abort=new AbortController();
    setDetailStatus("loading");
    setError("");
    setNotice("");
    setRecord(null);setDays([]);
    getMasterUsWorkingHours(masterSlug,{
      salonSlug:location.salon_slug,locationCode:location.location_code,
      signal:abort.signal,
    }).then(raw=>{
      const verified=normalizeUsMasterHoursDetail(raw,masterSlug,location);
      if(!live||abort.signal.aborted)return;
      setRecord(verified);
      setDays(formFromWeek(verified.week));
      setDetailStatus("ready");
    }).catch(e=>{
      if(!live||abort.signal.aborted||e?.name==="AbortError")return;
      setDetailStatus("error");
      setError(errorText(e));
    });
    return ()=>{live=false;abort.abort();savingAbort.current?.abort()};
  },[listStatus,masterSlug,location,revision]);

  function changeDay(weekday,patch){
    setDays(list=>list.map(item=>item.weekday===weekday
      ?{...item,...patch}:item));
    setNotice("");
  }

  const prepared=useMemo(()=>{
    if(!record||days.length!==7)return {ok:false};
    try{
      const body=prepareUsMasterHoursPut(record,days);
      return {
        ok:true,body,changed:
          JSON.stringify(body.hours)!==JSON.stringify(record.hours),
      };
    }catch(e){
      return {ok:false,issue:errorText(e)};
    }
  },[record,days]);

  async function save(e){
    e.preventDefault();
    if(!record||!location||!prepared.ok||!prepared.changed||
       !canWrite||saving||detailStatus!=="ready")return;
    setSaving(true);setError("");setNotice("");
    const abort=new AbortController();
    savingAbort.current=abort;
    try{
      const target={
        salonSlug:location.salon_slug,
        locationCode:location.location_code,signal:abort.signal,
      };
      const writtenRaw=await putMasterUsWorkingHours(masterSlug,{
        ...target,body:prepared.body,
      });
      const written=normalizeUsMasterHoursDetail(
        writtenRaw,masterSlug,location);
      const reloadedRaw=await getMasterUsWorkingHours(masterSlug,target);
      const fresh=normalizeUsMasterHoursDetail(
        reloadedRaw,masterSlug,location);
      const verified=verifyUsMasterHoursSaved(
        record,written,fresh,prepared.body.hours);
      if(abort.signal.aborted)return;
      setRecord(verified);
      setDays(formFromWeek(verified.week));
      setNotice("Недельное расписание сохранено и подтверждено сервером.");
    }catch(problem){
      if(abort.signal.aborted||problem?.name==="AbortError")return;
      setDetailStatus("error");
      setError(errorText(problem));
      setRecord(null);
    }finally{
      if(savingAbort.current===abort)savingAbort.current=null;
      if(!abort.signal.aborted)setSaving(false);
    }
  }

  return (
    <section style={style.panel}
      aria-label="Недельные рабочие часы мастера США">
      <h3 style={{margin:0,fontSize:18}}>Рабочие часы · США</h3>
      <p style={{...style.hint,margin:0}}>
        Настройки действуют исключительно для выбранного салона и филиала.
        Время задаётся в локальном часовом поясе филиала. Другие филиалы,
        рынки KG/KZ и существующие записи не изменяются.
      </p>
      {listStatus==="loading"&&<p role="status">Загрузка филиалов…</p>}
      {listStatus==="error"&&<p role="alert" style={{color:"#b42318"}}>
        {error}
      </p>}
      {listStatus==="ready"&&locations.length===0&&(
        <p role="status" style={style.hint}>
          Активных филиалов США, связанных с этим мастером, нет.
          Недельные рабочие часы недоступны.
        </p>
      )}
      {locations.length>0&&(
        <label style={style.label}>
          Действующий салон и филиал
          <select style={style.field} value={scopeKey}
            disabled={saving||listStatus!=="ready"}
            onChange={e=>setScopeKey(e.target.value)}>
            {locations.map(item=>{
              const key=item.salon_slug+"/"+item.location_code;
              return <option key={key} value={key}>
                {item.salon_name||item.salon_slug} ·
                {" "}{item.city_name||item.location_code},
                {" "}{item.state_code} · {item.timezone}
              </option>;
            })}
          </select>
        </label>
      )}
      {location&&<div role="status" style={style.hint}>
        Филиал: <strong>{location.location_code}</strong> ·
        {" "}{location.timezone}
      </div>}
      {detailStatus==="loading"&&<p role="status">Загрузка рабочего графика…</p>}
      {detailStatus==="error"&&(
        <div role="alert" style={{color:"#b42318"}}>
          <p>{error}</p>
          <button style={style.button} type="button"
            onClick={()=>setRevision(n=>n+1)}>Повторно загрузить</button>
        </div>
      )}
      {detailStatus==="ready"&&record&&(
        <form onSubmit={save} style={{display:"grid",gap:10}}>
          {days.map(day=>(
            <fieldset key={day.weekday} style={{
              border:"1px solid #d8e1ed",borderRadius:9,padding:10,
              display:"grid",gap:8,
            }}>
              <legend style={{fontWeight:650,padding:"0 5px"}}>
                {DAYS[day.weekday]}
              </legend>
              <label style={{...style.label,display:"flex",alignItems:"center",gap:8}}>
                <input type="checkbox" checked={day.configured}
                  disabled={!canWrite||saving}
                  onChange={e=>changeDay(day.weekday,{
                    configured:e.target.checked,
                  })}/>
                Рабочий день
              </label>
              {day.configured&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:9}}>
                  <label style={style.label}>Начало
                    <input type="time" step={60} style={style.field}
                      value={day.start_time} disabled={!canWrite||saving}
                      onChange={e=>changeDay(day.weekday,{
                        start_time:e.target.value,
                      })}/>
                  </label>
                  <label style={style.label}>Окончание
                    <input type="time" step={60} style={style.field}
                      value={day.end_time} disabled={!canWrite||saving}
                      onChange={e=>changeDay(day.weekday,{
                        end_time:e.target.value,
                      })}/>
                  </label>
                  <label style={{...style.label,justifyContent:"end"}}>
                    Перерыв
                    <input type="checkbox" checked={day.has_break}
                      disabled={!canWrite||saving}
                      onChange={e=>changeDay(day.weekday,{
                        has_break:e.target.checked,
                      })}/>
                  </label>
                  {day.has_break&&(
                    <>
                      <label style={style.label}>Перерыв с
                        <input type="time" step={60} style={style.field}
                          value={day.break_start} disabled={!canWrite||saving}
                          onChange={e=>changeDay(day.weekday,{
                            break_start:e.target.value,
                          })}/>
                      </label>
                      <label style={style.label}>Перерыв до
                        <input type="time" step={60} style={style.field}
                          value={day.break_end} disabled={!canWrite||saving}
                          onChange={e=>changeDay(day.weekday,{
                            break_end:e.target.value,
                          })}/>
                      </label>
                    </>
                  )}
                </div>
              )}
            </fieldset>
          ))}
          {!prepared.ok&&prepared.issue&&
            <p role="alert" style={{color:"#b42318"}}>{prepared.issue}</p>}
          {!canWrite&&<p style={{...style.hint,color:"#92400e"}}>
            Изменение ограничено правами или состоянием подписки.
          </p>}
          <p style={{...style.hint,margin:0}}>
            Если в этом филиале есть предстоящие подтверждённые
            записи, изменение недельного графика блокируется, чтобы
            не нарушить обязательства перед клиентами.
          </p>
          <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
            <button type="submit" style={style.button}
              disabled={!canWrite||saving||!prepared.ok||!prepared.changed}>
              {saving?"Сохранение…":"Сохранить рабочие часы"}
            </button>
            <button type="button" style={style.button}
              disabled={saving} onClick={()=>setRevision(n=>n+1)}>
              Обновить из базы
            </button>
          </div>
          {notice&&<p role="status" style={{color:"#067647"}}>{notice}</p>}
          {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
        </form>
      )}
    </section>
  );
}
