import { useId } from "react";
import { useMarketContext } from "../market/MarketContext.jsx";
import { localeLabels, translate } from "./messages.js";

export default function LanguageSelector() {
  const id = useId();
  const { status, context, locale, setLocale, saveStatus, errorKey, t } = useMarketContext();
  if (status === "error") {
    return (
      <div role="alert" style={{ fontSize: 13, color: "#b42318" }}>
        <span lang="ru">{translate("ru-KG", "contextUnavailable")}</span>
        {" / "}
        <span lang="en">{translate("en-KG", "contextUnavailable")}</span>
      </div>
    );
  }
  if (status !== "ready") return null;
  const supported = context.supported_locales.filter(code => localeLabels[code]);
  if (!supported.length) return null;
  const feedback = errorKey || (saveStatus === "saving" ? "languageSaving" :
    saveStatus === "saved" ? "languageSaved" : saveStatus === "local" ? "languageLocal" : null);
  return (
    <div style={{ fontSize: 13 }}>
      <label htmlFor={id}>{t("languageLabel")}</label>{" "}
      <select id={id} value={locale} onChange={event => { void setLocale(event.target.value); }}
        disabled={saveStatus === "saving"} aria-describedby={feedback ? id + "-status" : undefined}>
        {supported.map(code => <option key={code} value={code}>{localeLabels[code]}</option>)}
      </select>
      {feedback ? <div id={id + "-status"} role="status" aria-live="polite">{t(feedback)}</div> : null}
    </div>
  );
}

