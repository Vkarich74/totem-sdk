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

  const feedback = errorKey || (
    saveStatus === "saving"
      ? "languageSaving"
      : saveStatus === "saved"
        ? "languageSaved"
        : saveStatus === "local"
          ? "languageLocal"
          : null
  );

  return (
    <div style={{ display: "grid", justifyItems: "end", gap: "5px", fontSize: 13 }}>
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "6px 8px 6px 12px",
        border: "1px solid #dbe3ee",
        borderRadius: "14px",
        background: "#fff",
        color: "#475569",
        boxShadow: "0 6px 16px rgba(15, 23, 42, 0.07)"
      }}>
        <label htmlFor={id} style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
          {t("languageLabel")}
        </label>
        <select
          id={id}
          value={locale}
          onChange={event => { void setLocale(event.target.value); }}
          disabled={saveStatus === "saving"}
          aria-describedby={feedback ? id + "-status" : undefined}
          style={{
            minHeight: "34px",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            padding: "0 30px 0 10px",
            background: saveStatus === "saving" ? "#f1f5f9" : "#f8fafc",
            color: "#111827",
            fontFamily: "inherit",
            fontSize: "13px",
            fontWeight: 700,
            cursor: saveStatus === "saving" ? "wait" : "pointer",
            outlineOffset: "2px"
          }}
        >
          {supported.map(code => (
            <option key={code} value={code}>{localeLabels[code]}</option>
          ))}
        </select>
      </div>
      {feedback ? (
        <div
          id={id + "-status"}
          role="status"
          aria-live="polite"
          style={{ color: errorKey ? "#b42318" : "#64748b", paddingRight: "4px" }}
        >
          {t(feedback)}
        </div>
      ) : null}
    </div>
  );
}
