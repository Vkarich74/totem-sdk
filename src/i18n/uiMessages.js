import { useMarketContext } from "../market/MarketContext.jsx";

const UI_VALUE = Symbol.for("totem.ui.value.v1");
const tagged = (kind, fields) => Object.freeze({ [UI_VALUE]: kind, ...fields });
export const uiMessage = (key, params = {}) => tagged("message", { key, params });
export const uiMoney = (value, currency) => tagged("money", { value, currency });
export const uiNumber = value => tagged("number", { value });
export const uiDate = (value, options = {}) => tagged("date", { value, options });
export const isUiValue = value => Boolean(value && typeof value === "object" && value[UI_VALUE]);
export function uiJoin(values, separator = ",") {
  return values.some(isUiValue) ? tagged("join", { values, separator }) : values.join(separator);
}
export function uiTemplate(strings, values) {
  if (!values.some(isUiValue)) return strings.reduce((out, text, i) => out + text + (i < values.length ? String(values[i]) : ""), "");
  const parts = strings.flatMap((text, i) => i < values.length ? [text, values[i]] : [text]);
  return tagged("join", { values: parts, separator: "" });
}
export function uiConcat(left, right) {
  return isUiValue(left) || isUiValue(right) ? tagged("join", { values: [left, right], separator: "" }) : left + right;
}
export function uiError(value, fallback = uiMessage("salon.error.generic")) {
  if (!value) return value;
  if (isUiValue(value)) return value;
  if (typeof value === "string" && /^(?:salon|master)\.s\d{4}$/.test(value)) return uiMessage(value);
  return fallback;
}
export function resolveUiValue(value, context) {
  if (Array.isArray(value)) return value.map(item => resolveUiValue(item, context));
  if (!isUiValue(value)) return value;
  switch (value[UI_VALUE]) {
    case "message": {
      const params = Object.fromEntries(Object.entries(value.params).map(([key, item]) => [key, resolveUiValue(item, context)]));
      return context.t(value.key, params);
    }
    case "join": return value.values.map(item => resolveUiValue(item, context)).join(value.separator);
    case "money": return context.formatMoney(value.value, value.currency);
    case "number": return context.formatNumber(value.value);
    case "date": return context.formatDateTime(value.value, value.options);
    default: throw new Error("UI_VALUE_KIND_INVALID");
  }
}
export function useUiMessages() {
  const context = useMarketContext();
  return { renderUi: value => resolveUiValue(value, context) };
}
export function UiValue({ value }) {
  const context = useMarketContext();
  return typeof value === "number" ? context.formatNumber(value) : resolveUiValue(value, context);
}
