import { useEffect, useRef, useState } from "react";
import { getUsOwnerPrice, putUsOwnerPrice } from "./usOwnerPriceClient.js";
import {
  parseUsdMinor, priceMinorToInput, formatUsdMinor,
  parseUsPriceResponse, assertUsPriceReadback,
} from "./usOwnerPriceModel.js";

const ui = {
  panel: { border:"1px solid #cad5e2", borderRadius:10, padding:12,
    marginTop:12, background:"#f8fafc", color:"#1f2937" },
  row: { display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" },
  field: { minWidth:140, maxWidth:230, padding:"10px 11px",
    border:"1px solid #9ca3af", borderRadius:8, fontSize:16 },
  button: { padding:"10px 13px", border:"1px solid #9ca3af",
    borderRadius:8, background:"#fff", cursor:"pointer", fontWeight:600 },
  small: { fontSize:12, color:"#4b5563", lineHeight:1.5 },
};

function russianError(error) {
  const code = String(error?.code || error?.message || "US_PRICE_REQUEST_FAILED");
  switch(code) {
    case "US_PRICE_OWNER_SESSION_REQUIRED":
    case "US_PRICE_OWNER_SESSION_INVALID":
      return "Для просмотра цены требуется действующий вход владельца.";
    case "US_PRICE_SERVICE_NOT_FOUND":
      return "Услуга не найдена в активном салоне США либо доступ не подтверждён.";
    case "US_PRICE_VERSION_CONFLICT":
      return "Цена изменена в другом окне. Обновите данные перед повторным сохранением.";
    case "US_PRICE_AMOUNT_OR_VERSION_INVALID":
      return "Некорректная сумма или устаревшая версия цены.";
    case "US_PRICE_READBACK_CONTRACT_MISMATCH":
    case "US_PRICE_WRITE_READBACK_FAILED":
      return "Не удалось подтвердить цену по ответу сервера. Обновите данные.";
    default:
      return "Цена USD недоступна: " + code;
  }
}

// This component never creates a salon, service, booking, payment or test data.
// It edits ONLY an existing salon_master_services.id via the US-only API.
export default function UsOwnerPriceEditor({
  ownerType, ownerSlug, serviceLinkId, isUsMarket, canWrite = false,
}) {
  const [phase, setPhase] = useState("loading");
  const [record, setRecord] = useState(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const saveController = useRef(null);

  useEffect(() => {
    if (!isUsMarket || !ownerSlug || !serviceLinkId) {
      setPhase("absent");
      setRecord(null);
      return undefined;
    }
    let alive = true;
    const abort = new AbortController();
    setPhase("loading");
    setRecord(null);
    setInput("");
    setError("");
    setNotice("");
    getUsOwnerPrice(ownerType, ownerSlug, serviceLinkId, {signal:abort.signal})
      .then(raw => {
        const parsed = parseUsPriceResponse(raw, ownerType, ownerSlug, serviceLinkId);
        if (!alive || abort.signal.aborted) return;
        setRecord(parsed);
        setInput(parsed.configured ? priceMinorToInput(parsed.amount_minor) : "");
        setPhase("ready");
      })
      .catch(problem => {
        if (!alive || abort.signal.aborted || problem?.name === "AbortError") return;
        setPhase("error");
        setError(russianError(problem));
      });
    return () => { alive = false; abort.abort(); saveController.current?.abort(); };
  }, [ownerType, ownerSlug, serviceLinkId, isUsMarket, revision]);

  async function save(event) {
    event.preventDefault();
    if (!isUsMarket || !canWrite || saving ||
        phase !== "ready" || record == null) return;
    const amount = parseUsdMinor(input);
    if (amount == null) {
      setError("Введите сумму в USD от $0.01 до $999,999.99 (не более двух знаков после точки).");
      setNotice("");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    const abort = new AbortController();
    saveController.current = abort;
    try {
      // Concurrent writes are prevented by the server's expected_version.
      // No optimistic success: independent GET must confirm saved cents.
      const writtenRaw = await putUsOwnerPrice(
        ownerType, ownerSlug, serviceLinkId, amount, record.price_version,
        { signal: abort.signal }
      );
      const written = parseUsPriceResponse(
        writtenRaw, ownerType, ownerSlug, serviceLinkId);
      const freshRaw = await getUsOwnerPrice(
        ownerType, ownerSlug, serviceLinkId, { signal: abort.signal });
      const fresh = parseUsPriceResponse(
        freshRaw, ownerType, ownerSlug, serviceLinkId);
      assertUsPriceReadback(record, written, fresh, amount);
      if (abort.signal.aborted) return;
      setRecord(fresh);
      setInput(priceMinorToInput(fresh.amount_minor));
      setNotice("Цена USD сохранена и подтверждена сервером.");
    } catch(problem) {
      if (abort.signal.aborted || problem?.name === "AbortError") return;
      setError(russianError(problem));
      // A failed write/readback must require a new canonical GET.
      setPhase("error");
    } finally {
      if (saveController.current === abort) saveController.current = null;
      if (!abort.signal.aborted) setSaving(false);
    }
  }

  if (!isUsMarket || phase === "absent") return null;

  return (
    <section style={ui.panel} aria-label="Тариф услуги в долларах США">
      <div style={{fontWeight:700,marginBottom:7}}>Цена услуги · USD</div>
      <p style={{...ui.small,marginTop:0}}>
        Отдельная цена для действующего салона США, в долларах и центах.
        Не рассчитывается из исторической цены услуги и не включает налог.
      </p>
      {phase === "loading" ? (
        <p role="status" style={ui.small}>Загрузка подтверждённой цены…</p>
      ) : null}
      {phase === "ready" && record ? (
        <>
          <p style={{margin:"5px 0 10px",fontWeight:600}}>
            {record.configured
              ? formatUsdMinor(record.amount_minor)
              : "Цена пока не установлена — бронирование этой услуги США недоступно."}
            <span style={{...ui.small,marginLeft:9}}>
              Версия {record.price_version}
            </span>
          </p>
          <form onSubmit={save} style={ui.row}>
            <label style={{fontSize:13,fontWeight:600}}>
              Цена в USD
              <input
                aria-label="Сумма в долларах США"
                style={{...ui.field,display:"block",marginTop:4}}
                inputMode="decimal" type="text" value={input}
                autoComplete="off" maxLength={11}
                onChange={event => {
                  setInput(event.target.value);
                  setError("");
                  setNotice("");
                }}
                placeholder="150.25" disabled={!canWrite || saving}
              />
            </label>
            <button type="submit" style={ui.button}
              disabled={!canWrite || saving || parseUsdMinor(input) == null}>
              {saving ? "Сохранение…" : "Сохранить USD"}
            </button>
            <button type="button" style={ui.button}
              disabled={saving} onClick={() => setRevision(n => n + 1)}>
              Обновить
            </button>
          </form>
          {!canWrite ? (
            <p style={ui.small}>Изменения запрещены правами или состоянием подписки.</p>
          ) : null}
        </>
      ) : null}
      {phase === "error" ? (
        <button type="button" style={ui.button}
          onClick={() => setRevision(n => n + 1)}>
          Повторно загрузить подтверждённую цену
        </button>
      ) : null}
      {error ? <p role="alert" style={{fontSize:13,color:"#b42318"}}>{error}</p> : null}
      {notice ? <p role="status" style={{fontSize:13,color:"#047857"}}>{notice}</p> : null}
    </section>
  );
}
