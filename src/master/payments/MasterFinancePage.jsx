import { UiValue, uiMessage, uiMoney, uiDate, uiJoin, uiTemplate, uiConcat, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMaster } from "../MasterContext";

import {
  getMoneyCoreDestinationProviders,
  createMasterWithdrawDestination,
  getMasterActiveContract,
  getMasterContractHistory,
  getMasterCollectionAnchors,
  getMasterLostProfit,
  getMasterOwnerQrDestinations,
  getMoneyCoreFlags,
  getMasterMoneyCoreSummary,
  getMasterPaymentProjections,
  getMasterSplitAllocations,
  getMasterPayouts,
  getMasterSalaryObligations,
  getMasterRentObligations,
  getMasterSettlements,
  getMasterWalletBalance,
  getMasterWithdrawDestinations,
  getMasterWithdrawRequests,
  getMasterWithdrawSettings
} from "../../api/internal";

import {
  isContractActive
} from "../../core/contracts/contractEngine";

function displayStatus(value) { const state = String(value || "").toLowerCase(); const keys = { active: "active", grace: "grace", blocked: "blockedAccess", pending: "pending", processing: "processing", completed: "completed", failed: "failed", cancelled: "cancelled", expired: "expired", paid: "paid" }; return keys[state] ? uiMessage("salon.display." + keys[state]) : (value || "—"); }

function money(value, currency) { return uiMoney(value, currency); }

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function cleanStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function calculateProjectionStats(rows, destinations, withdrawRequests, ownerQr) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeDestinations = Array.isArray(destinations) ? destinations : [];
  const safeWithdrawRequests = Array.isArray(withdrawRequests) ? withdrawRequests : [];
  const safeOwnerQr = Array.isArray(ownerQr) ? ownerQr : [];

  const confirmedRows = safeRows.filter((row) => {
    const paymentStatus = cleanStatus(row?.payment_status);
    const bookingStatus = cleanStatus(row?.booking_status);
    return paymentStatus === "confirmed" && bookingStatus !== "cancelled" && bookingStatus !== "canceled";
  });

  const rejectedOrCancelledRows = safeRows.filter((row) => {
    const paymentStatus = cleanStatus(row?.payment_status);
    const bookingStatus = cleanStatus(row?.booking_status);
    return paymentStatus !== "confirmed" || bookingStatus === "cancelled" || bookingStatus === "canceled";
  });

  const confirmedGrossAmount = confirmedRows.reduce((sum, row) => {
    const grossAmount = toNumber(row?.gross_amount);
    if (grossAmount !== null) return sum + grossAmount;

    const rawGrossAmount = toNumber(row?.raw_gross_amount);
    if (rawGrossAmount !== null) return sum + rawGrossAmount;

    return sum + Number(row?.salon_share || 0) + Number(row?.master_share || 0) + Number(row?.platform_share || 0);
  }, 0);

  const salonShare = confirmedRows.reduce((sum, row) => sum + Number(row?.salon_share || 0), 0);
  const masterShare = confirmedRows.reduce((sum, row) => sum + Number(row?.master_share || 0), 0);
  const platformShare = confirmedRows.reduce((sum, row) => sum + Number(row?.platform_share || 0), 0);

  const openBalanceAmount = confirmedRows.reduce((sum, row) => {
    const explicitOpenBalance = toNumber(row?.open_transfer_amount);
    if (explicitOpenBalance !== null) {
      return sum + explicitOpenBalance;
    }

    return row?.included_in_open_balance === true
      ? sum + Number(row?.salon_share || 0) + Number(row?.master_share || 0) + Number(row?.platform_share || 0)
      : sum;
  }, 0);

  return {
    totalRows: safeRows.length,
    confirmedRows: confirmedRows.length,
    rejectedOrCancelledRows: rejectedOrCancelledRows.length,
    confirmedGrossAmount,
    salonShare,
    masterShare,
    platformShare,
    openBalanceAmount,
    collectorMissingCount: confirmedRows.filter((row) => !cleanStatus(row?.collector_owner_type)).length,
    destinationsCount: safeDestinations.length,
    withdrawRequestsCount: safeWithdrawRequests.length,
    ownerQrCount: safeOwnerQr.length
  };
}

function calculateSplitAllocatedStats(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return {
    splitAllocatedCount: safeRows.length,
    splitAllocatedAmount: safeRows.reduce((sum, row) => sum + Number(row?.owner_net_amount || 0), 0),
  };
}

const WITHDRAW_REQUEST_USER_STATUS_LABELS = Object.freeze({
  pending_validation: uiMessage("salon.s0839"),
  requires_review: uiMessage("salon.s0840"),
  locked: uiMessage("salon.s0840"),
  queued_for_payout: uiMessage("salon.s0840"),
  bank_processing: uiMessage("salon.s0840"),
  completed: uiMessage("salon.s0841"),
  failed: uiMessage("salon.s0842"),
  canceled: uiMessage("salon.s0843"),
  rejected: uiMessage("salon.s0843")
});

function getWithdrawRequestUserStatusLabel(status) {
  const normalizedStatus = cleanStatus(status);
  if (!normalizedStatus) return null;
  return WITHDRAW_REQUEST_USER_STATUS_LABELS[normalizedStatus] || null;
}

function getWithdrawRequestHistoryDetails(item) {
  const status = cleanStatus(item?.status);
  const details = [];
  const adminNote = cleanText(item?.admin_note);

  if (status) details.push(uiTemplate(["raw: ",""], [status]));
  if (adminNote) {
    details.push(uiMessage("salon.s0844", {p0: adminNote}));
  }

  return uiJoin(details, " · ");
}

function getWithdrawRequestPayoutResultDetails(item) {
  const payoutResult = parseMaybeJson(item?.payout_result) || (item?.payout_result && typeof item.payout_result === "object" ? item.payout_result : null) || null;
  const completedAt = cleanText(payoutResult?.completed_at || item?.completed_at);
  const failedAt = cleanText(payoutResult?.failed_at || item?.failed_at);
  const failureReason = cleanText(payoutResult?.failure_reason || item?.failure_reason);
  const userMessage = cleanText(payoutResult?.user_message);
  const details = [];

  if (completedAt) details.push(uiMessage("salon.s0845", {p0: formatDateTime(completedAt)}));
  if (failedAt) details.push(uiMessage("salon.s0846", {p0: formatDateTime(failedAt)}));
  if (failureReason) details.push(uiMessage("salon.s0847", {p0: failureReason}));
  if (userMessage) details.push(userMessage);

  return uiJoin(details, " · ");
}

function parseMaybeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const WITHDRAW_DESTINATION_RELATION_OPTIONS = [
  "self",
  "company_account",
  "authorized_person",
  "third_party",
  "unknown"
];

const WITHDRAW_DESTINATION_METHOD_OPTIONS = new Set([
  "wallet",
  "card",
  "bank_account",
  "manual_other"
]);

const WITHDRAW_DESTINATION_METHOD_LABELS = Object.freeze({
  wallet: uiMessage("salon.s0848"),
  card: uiMessage("salon.s0478"),
  bank_account: uiMessage("salon.s0849"),
  manual_other: uiMessage("salon.s0850")
});

const WITHDRAW_DESTINATION_RELATION_LABELS = Object.freeze({
  self: uiMessage("salon.s0851"),
  company_account: uiMessage("salon.s0852"),
  authorized_person: uiMessage("salon.s0853"),
  third_party: uiMessage("salon.s0854"),
  unknown: uiMessage("salon.s0855")
});

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function maskPhone(value) {
  const text = cleanText(value);
  if (!text) return "";
  if (text.includes("*")) return text;
  const digits = text.replace(/\D/g, "");
  if (digits.length <= 4) return text;
  const last4 = digits.slice(-4);
  if (digits.startsWith("996")) {
    return uiTemplate(["+996•••",""], [last4]);
  }
  if (text.startsWith("+")) {
    return uiTemplate(["+•••",""], [last4]);
  }
  return uiTemplate(["•••",""], [last4]);
}

function getWithdrawRequestDestinationSummary(item, destinationsById) {
  const destinationId = Number(item?.destination_id || 0);
  const destinationSummary = parseMaybeJson(item?.destination_summary) || (item?.destination_summary && typeof item.destination_summary === "object" ? item.destination_summary : null);
  const destinationByList = destinationsById instanceof Map && destinationId > 0 ? destinationsById.get(destinationId) || null : null;
  const destinationSnapshot = parseMaybeJson(item?.destination_snapshot);
  const destination = destinationSummary || destinationByList || destinationSnapshot || null;

  if (!destination && !destinationId) {
    return uiMessage("salon.s0856");
  }

  const method = cleanText(destination?.method);
  const providerCode = cleanText(destination?.provider_code || destination?.provider || destination?.wallet_provider);
  const walletProvider = cleanText(destination?.wallet_provider);
  const relation = cleanText(destination?.destination_relation);
  const bankName = cleanText(destination?.bank_name);
  const phone = maskPhone(destination?.phone_masked || destination?.phone);
  const accountMasked = cleanText(destination?.account_masked);
  const cardLast4 = cleanText(destination?.card_last4);

  const parts = [];
  if (method) parts.push(uiMessage("salon.s0857", {p0: WITHDRAW_DESTINATION_METHOD_LABELS[method] || method}));
  if (providerCode) parts.push(uiMessage("salon.s0858", {p0: providerCode}));
  if (walletProvider && walletProvider !== providerCode) parts.push(uiTemplate(["Wallet provider: ",""], [walletProvider]));
  if (relation) parts.push(uiMessage("salon.s0859", {p0: WITHDRAW_DESTINATION_RELATION_LABELS[relation] || relation}));
  if (bankName) parts.push(uiMessage("salon.s0860", {p0: bankName}));
  if (phone) parts.push(uiMessage("salon.s0861", {p0: phone}));
  if (accountMasked) parts.push(uiMessage("salon.s0862", {p0: accountMasked}));
  if (cardLast4) parts.push(uiMessage("salon.s0863", {p0: cardLast4}));

  if (!parts.length) {
    return destinationId > 0 ? uiMessage("salon.s0864", {p0: destinationId}) : uiMessage("salon.s0856");
  }

  return uiJoin(parts, " · ");
}

function buildWithdrawDestinationPreview(providers, draft) {
  const selectedProvider = Array.isArray(providers)
    ? providers.find((item) => item?.code === draft.selectedProviderCode) || null
    : null;
  const method = cleanText(selectedProvider?.method);
  const destinationRelation = WITHDRAW_DESTINATION_RELATION_OPTIONS.includes(draft.destinationRelation)
    ? draft.destinationRelation
    : "unknown";
  const note = cleanText(draft.note);
  const accountHolder = cleanText(draft.accountHolder);
  const phone = cleanText(draft.phone);
  const bankName = cleanText(draft.bankName);
  const accountMasked = cleanText(draft.accountMasked);
  const cardLast4 = cleanText(draft.cardLast4);
  const errors = [];

  if (!selectedProvider) {
    errors.push(uiMessage("salon.s0865"));
  } else if (!WITHDRAW_DESTINATION_METHOD_OPTIONS.has(method)) {
    errors.push(uiMessage("salon.s0866"));
  }

  if (destinationRelation === "unknown" && draft.destinationRelation !== "unknown") {
    errors.push(uiMessage("salon.s0867"));
  }

  if (method === "bank_account") {
    if (!bankName) errors.push(uiMessage("salon.s0868"));
    if (!accountMasked) errors.push(uiMessage("salon.s0869"));
  } else if (method === "card") {
    if (!accountMasked && !cardLast4) errors.push(uiMessage("salon.s0870"));
  } else if (method === "wallet") {
    if (!phone) errors.push(uiMessage("salon.s0871"));
    if (selectedProvider?.code !== draft.selectedProviderCode) {
      errors.push(uiMessage("salon.s0872"));
    }
  } else if (method === "manual_other") {
    if (!accountHolder && !phone && !note && !accountMasked) {
      errors.push(uiMessage("salon.s0873"));
    }
  }

  const payloadPreview = !selectedProvider
    ? null
    : method === "bank_account"
      ? {
          method: "bank_account",
          provider_code: selectedProvider.code,
          bank_name: bankName,
          account_masked: accountMasked,
          account_holder: accountHolder,
          destination_relation: destinationRelation,
          payload: { note }
        }
      : method === "card"
        ? {
            method: "card",
            provider_code: selectedProvider.code,
            account_masked: accountMasked,
            card_last4: cardLast4,
            account_holder: accountHolder,
            destination_relation: destinationRelation,
            payload: { note }
          }
        : method === "wallet"
          ? {
              method: "wallet",
              provider_code: selectedProvider.code,
              wallet_provider: selectedProvider.code,
              phone,
              account_holder: accountHolder,
              destination_relation: destinationRelation,
              payload: { note }
            }
          : method === "manual_other"
            ? {
                method: "manual_other",
                provider_code: selectedProvider.code,
                account_holder: accountHolder,
                phone,
                account_masked: accountMasked,
                destination_relation: destinationRelation,
                payload: { note }
              }
            : {
                method,
                provider_code: selectedProvider.code,
                account_holder: accountHolder,
                phone,
                bank_name: bankName,
                account_masked: accountMasked,
                card_last4: cardLast4,
                destination_relation: destinationRelation,
                payload: { note }
              };

  return {
    selectedProvider,
    method,
    destinationRelation,
    accountHolder,
    phone,
    bankName,
    accountMasked,
    cardLast4,
    note,
    errors,
    isReady: errors.length === 0 && Boolean(selectedProvider),
    payloadPreview
  };
}

function buildWithdrawDestinationCreatePayload(preview) {
  if (!preview?.selectedProvider || !preview?.method) {
    return null;
  }

  const payload = {
    method: preview.method,
    provider_code: preview.selectedProvider.code,
    destination_relation: preview.destinationRelation,
  };

  if (preview.method === "wallet") {
    payload.wallet_provider = preview.selectedProvider.code;
  }

  if (preview.accountHolder) {
    payload.account_holder = preview.accountHolder;
  }

  if (preview.phone) {
    payload.phone = preview.phone;
  }

  if (preview.method === "bank_account" && preview.bankName) {
    payload.bank_name = preview.bankName;
  }

  if (preview.method === "bank_account" && preview.accountMasked) {
    payload.account_masked = preview.accountMasked;
  }

  if (preview.method === "card" && preview.accountMasked) {
    payload.account_masked = preview.accountMasked;
  }

  if (preview.method === "card" && preview.cardLast4) {
    payload.card_last4 = preview.cardLast4;
  }

  if (preview.method === "manual_other" && preview.accountMasked) {
    payload.account_masked = preview.accountMasked;
  }

  if (preview.note) {
    payload.payload = { note: preview.note };
  }

  return payload;
}

const DEFAULT_BUSINESS_TIME_ZONE = "Asia/Bishkek";

function resolveBusinessTimeZone(source) {
  const directTimezone = [
    source?.timezone,
    source?.time_zone,
    source?.business_timezone,
    source?.salon_timezone,
    source?.master_timezone,
    source?.contract_timezone
  ].find((value) => String(value || "").trim());

  if (directTimezone) {
    return String(directTimezone).trim();
  }

  const cityCandidates = [
    source?.city,
    source?.salon_city,
    source?.master_city,
    source?.location_city
  ];

  for (const cityValue of cityCandidates) {
    const city = String(cityValue || "").trim().toLowerCase();

    if (!city) {
      continue;
    }

    if (city.includes("bishkek") || city.includes("бишкек")) {
      return "Asia/Bishkek";
    }

    if (
      city.includes("almaty") ||
      city.includes("алматы") ||
      city.includes("астана") ||
      city.includes("nur-sultan") ||
      city.includes("нур-султан") ||
      city.includes("nur sultan")
    ) {
      return "Asia/Almaty";
    }
  }

  return DEFAULT_BUSINESS_TIME_ZONE;
}

function formatDateTime(iso, source) { if (!iso) return "—"; return uiDate(iso, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }

function formatSignedCurrency(value, sign, currency = "KGS") { const amount = Number(value); if (value == null || value === "" || !Number.isFinite(amount)) return String(value ?? ""); const prefix = sign === "-" ? "-" : sign === "+" ? "+" : ""; return uiConcat(prefix, uiMoney(Math.abs(amount), currency)); }

function normalizeObligationStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeContractResponse(payload) {
  if (!payload) return null;
  if (payload.contract) return payload.contract;
  if (payload.active_contract) return payload.active_contract;
  if (payload.ok && payload.data) return payload.data;
  return payload;
}

function normalizeHistoryResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.history)) return payload.history;
  if (Array.isArray(payload?.contracts)) return payload.contracts;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizeWalletResponse(payload) {
  if (!payload) return null;
  if (payload.wallet) return payload.wallet;
  if (payload.data?.wallet) return payload.data.wallet;
  if (typeof payload.balance !== "undefined") return payload;
  if (typeof payload.data?.balance !== "undefined") return payload.data;
  return payload;
}

function normalizeSettlementsResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.settlements)) return payload.settlements;
  if (Array.isArray(payload?.periods)) return payload.periods;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.settlements)) return payload.data.settlements;
  return [];
}

function normalizePayoutsResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.payouts)) return payload.payouts;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.payouts)) return payload.data.payouts;
  return [];
}

function getBillingSnapshot() {
  const snapshot = window.__TOTEM_MASTER_BILLING__ || {};

  return {
    billing: snapshot.billing || null,
    billingLoading: Boolean(snapshot.billingLoading),
    canWrite: typeof snapshot.canWrite === "boolean" ? snapshot.canWrite : true,
    canWithdraw: typeof snapshot.canWithdraw === "boolean" ? snapshot.canWithdraw : true,
    billingBlockReason: snapshot.billingBlockReason || null
  };
}

function formatBillingState(billing, billingLoading) {
  if (billingLoading) return uiMessage("master.s0625");

  const state = String(
    billing?.access_state ||
      billing?.subscription_status ||
      "active"
  ).toLowerCase();

  if (state === "active") return uiMessage("salon.s0420");
  if (state === "grace") return uiMessage("salon.display.grace");
  if (state === "blocked") return uiMessage("salon.display.blockedAccess");
  return state || "—";
}

function formatAccessFlag(value) {
  return value ? uiMessage("salon.s1068") : uiMessage("salon.s1069");
}

function sumAmounts(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0);
}

function getCollectionAnchorOwnerLabel(value) {
  const status = String(value || "").trim().toLowerCase();

  if (status === "master") return uiMessage("salon.s0287");
  if (status === "salon") return uiMessage("salon.s0288");
  if (status === "unknown") return uiMessage("salon.s0289");
  if (status === "conflict") return uiMessage("salon.s0290");
  return status ? status : "—";
}

function getCollectionAnchorStatusLabel(value) {
  const status = String(value || "").trim().toLowerCase();

  if (status === "open") return uiMessage("salon.s0047");
  if (status === "closed") return uiMessage("salon.s0291");
  if (status === "not_needed") return uiMessage("salon.s0292");
  if (status === "unknown") return uiMessage("salon.s0289");
  if (status === "conflict") return uiMessage("salon.s0290");
  return status ? status : "—";
}

function getCollectionAnchorRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.anchors)) return payload.anchors;
  return [];
}

function readCollectionAnchorMetric(summary, keys = []) {
  const source = summary && typeof summary === "object" ? summary : {};

  for (const key of keys) {
    const raw = source?.[key];
    if (raw && typeof raw === "object") {
      const count = Number(
        raw.count ??
        raw.total_count ??
        raw.items_count ??
        raw.row_count ??
        raw.anchor_count ??
        raw.value ??
        0
      );
      const amount = Number(
        raw.amount ??
        raw.total_amount ??
        raw.amount_total ??
        raw.sum ??
        0
      );
      return {
        count: Number.isFinite(count) ? count : null,
        amount: Number.isFinite(amount) ? amount : null
      };
    }
  }

  for (const key of keys) {
    const countKey = uiTemplate(["","_count"], [key]);
    const amountKey = uiTemplate(["","_amount"], [key]);
    const hasCount = Object.prototype.hasOwnProperty.call(source, countKey);
    const hasAmount = Object.prototype.hasOwnProperty.call(source, amountKey);
    const hasRaw = Object.prototype.hasOwnProperty.call(source, key);
    if (hasCount || hasAmount || hasRaw) {
      const count = hasCount ? Number(source?.[countKey]) : null;
      const amount = hasAmount ? Number(source?.[amountKey]) : (hasRaw ? Number(source?.[key]) : null);
      return {
        count: Number.isFinite(count) ? count : null,
        amount: Number.isFinite(amount) ? amount : null
      };
    }
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const amount = Number(source?.[key]);
      if (Number.isFinite(amount)) {
        return { count: null, amount };
      }
    }
  }

  return { count: null, amount: null };
}

function formatCollectionAnchorMetric(summary, keys = []) {
  const metric = readCollectionAnchorMetric(summary, keys);

  if (metric.amount === null && metric.count === null) {
    return "—";
  }

  if (metric.count === null) {
    return money(metric.amount, metric?.currency_code || metric?.currency);
  }

  if (metric.amount === null) {
    return String(metric.count);
  }

  return uiTemplate([""," / ",""], [Number(metric.count), money(metric.amount, metric?.currency_code || metric?.currency)]);
}

function getCollectionAnchorRowKey(row, index) {
  return String(row?.id || row?.payment_id || row?.source_id || uiTemplate(["",""], [index]));
}

function getCollectionAnchorSalonLabel(row) {
  return String(
    row?.salon_name ||
    row?.salon_slug ||
    row?.salon?.name ||
    row?.salon?.slug ||
    row?.salon_id ||
    "—"
  ).trim() || "—";
}

function StatCard({ label, value, hint }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}><UiValue value={label} /></div>
      <div style={styles.cardValue}><UiValue value={value} /></div>
      {hint ? <div style={styles.cardHint}><UiValue value={hint} /></div> : null}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyStateTitle}><UiValue value={title} /></div>
      <div style={styles.emptyStateText}><UiValue value={text} /></div>
    </div>
  );
}

function PreviewRow({ title, meta, status, value }) {
  return (
    <div style={styles.previewRow}>
      <div style={{ minWidth: 0, flex: "1 1 240px" }}>
        <div style={styles.previewTitle}><UiValue value={title} /></div>
        {meta ? <div style={styles.previewMeta}><UiValue value={meta} /></div> : null}
      </div>
      <div style={styles.previewAside}>
        {typeof value !== "undefined" ? <div style={styles.previewValue}><UiValue value={value} /></div> : null}
        {status ? <div style={styles.previewStatus}><UiValue value={status} /></div> : null}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <div style={styles.panelTitle}><UiValue value={title} /></div>
          {subtitle ? <div style={styles.panelSubtitle}><UiValue value={subtitle} /></div> : null}
        </div>
      </div>
      <UiValue value={children} />
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <div style={styles.infoLabel}><UiValue value={label} /></div>
      <div style={styles.infoValue}><UiValue value={value} /></div>
    </div>
  );
}

function FinanceNav({ masterSlug, active }) {
  const items = [
    { key: "finance", label: uiMessage("salon.s0017"), note: uiMessage("salon.s1070"), to: uiTemplate(["/master/","/finance"], [masterSlug]) },
    { key: "money", label: uiMessage("salon.s0412"), note: uiMessage("salon.s0902"), to: uiTemplate(["/master/","/money"], [masterSlug]) },
    { key: "settlements", label: uiMessage("salon.s0029"), note: uiMessage("salon.s1071"), to: uiTemplate(["/master/","/settlements"], [masterSlug]) },
    { key: "payouts", label: uiMessage("salon.s0030"), note: uiMessage("salon.s1072"), to: uiTemplate(["/master/","/payouts"], [masterSlug]) },
    { key: "transactions", label: uiMessage("salon.s0031"), note: uiMessage("salon.s1073"), to: uiTemplate(["/master/","/transactions"], [masterSlug]) }
  ];

  return (
    <div style={styles.navGrid}>
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            to={item.to}
            style={{
              ...styles.navCard,
              borderColor: isActive ? "#dbeafe" : "#e5e7eb",
              background: isActive ? "#eff6ff" : "#ffffff"
            }}
          >
            <div style={{ ...styles.navTitle, color: isActive ? "#1d4ed8" : "#111827" }}><UiValue value={item.label} /></div>
            <div style={styles.navNote}><UiValue value={item.note} /></div>
          </Link>
        );
      })}
    </div>
  );
}

export default function MasterFinancePage() {
  const { renderUi } = useUiMessages();
  const { master, slug: contextSlug } = useMaster() || {};
  const masterSlug = master?.slug || contextSlug || null;

  const [activeContract, setActiveContract] = useState(null);
  const [history, setHistory] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [moneyCoreSummary, setMoneyCoreSummary] = useState(null);
  const [moneyCoreFlags, setMoneyCoreFlags] = useState(null);
  const [paymentProjectionSummary, setPaymentProjectionSummary] = useState(null);
  const [moneyCoreDestinationProviders, setMoneyCoreDestinationProviders] = useState([]);
  const [moneyCoreWithdrawDestinations, setMoneyCoreWithdrawDestinations] = useState([]);
  const [moneyCoreWithdrawSettings, setMoneyCoreWithdrawSettings] = useState(null);
  const [moneyCoreWithdrawRequests, setMoneyCoreWithdrawRequests] = useState([]);
  const [moneyCoreOwnerQr, setMoneyCoreOwnerQr] = useState([]);
  const [moneyCoreSplitAllocations, setMoneyCoreSplitAllocations] = useState([]);
  const [moneyCoreSplitAllocationsError, setMoneyCoreSplitAllocationsError] = useState("");
  const [paymentProjectionRows, setPaymentProjectionRows] = useState([]);
  const [selectedProviderCode, setSelectedProviderCode] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountMasked, setAccountMasked] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [destinationRelation, setDestinationRelation] = useState("self");
  const [note, setNote] = useState("");
  const [destinationSaving, setDestinationSaving] = useState(false);
  const [destinationSaveStatus, setDestinationSaveStatus] = useState(null);
  const [lostProfit, setLostProfit] = useState(null);
  const [lostProfitLoading, setLostProfitLoading] = useState(true);
  const [lostProfitError, setLostProfitError] = useState("");
  const [collectionAnchors, setCollectionAnchors] = useState(null);
  const [collectionAnchorsLoading, setCollectionAnchorsLoading] = useState(true);
  const [collectionAnchorsError, setCollectionAnchorsError] = useState("");
  const [rentObligations, setRentObligations] = useState([]);
  const [rentObligationsSummary, setRentObligationsSummary] = useState(null);
  const [rentObligationsLoading, setRentObligationsLoading] = useState(true);
  const [rentObligationsError, setRentObligationsError] = useState("");
  const [salaryObligations, setSalaryObligations] = useState([]);
  const [salaryObligationsSummary, setSalaryObligationsSummary] = useState(null);
  const [salaryObligationsLoading, setSalaryObligationsLoading] = useState(true);
  const [salaryObligationsError, setSalaryObligationsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFinance() {
      try {
        setLoading(true);
        setError(null);

        if (!masterSlug) {
          if (!cancelled) {
            setActiveContract(null);
            setHistory([]);
            setWallet(null);
            setSettlements([]);
            setPayouts([]);
            setPaymentProjectionSummary(null);
            setPaymentProjectionRows([]);
            setMoneyCoreSplitAllocations([]);
            setMoneyCoreSplitAllocationsError("");
            setError(uiError(uiMessage("master.s0201")));
          }
          return;
        }

          const [
            activeResult,
            historyResult,
            walletResult,
            settlementsResult,
          payoutsResult,
          paymentProjectionResult,
          moneyCoreResult,
          moneyCoreFlagsResult
          ] = await Promise.allSettled([
            getMasterActiveContract(masterSlug),
            getMasterContractHistory(masterSlug),
            getMasterWalletBalance(masterSlug),
            getMasterSettlements(masterSlug),
            getMasterPayouts(masterSlug),
            getMasterPaymentProjections(masterSlug),
            getMasterMoneyCoreSummary(masterSlug),
            getMoneyCoreFlags()
          ]);

        if (cancelled) return;

        setActiveContract(
          activeResult.status === "fulfilled" && activeResult.value?.ok
            ? normalizeContractResponse(activeResult.value)
            : null
        );

        setHistory(
          historyResult.status === "fulfilled" && historyResult.value?.ok
            ? normalizeHistoryResponse(historyResult.value)
            : []
        );

        setWallet(
          walletResult.status === "fulfilled" && walletResult.value?.ok
            ? normalizeWalletResponse(walletResult.value)
            : null
        );

        setSettlements(
          settlementsResult.status === "fulfilled" && settlementsResult.value?.ok
            ? normalizeSettlementsResponse(settlementsResult.value)
            : []
        );

        setPayouts(
          payoutsResult.status === "fulfilled" && payoutsResult.value?.ok
            ? normalizePayoutsResponse(payoutsResult.value)
            : []
          );

        setPaymentProjectionSummary(
          paymentProjectionResult.status === "fulfilled" && paymentProjectionResult.value?.ok
            ? paymentProjectionResult.value.summary || null
            : null
        );
        setPaymentProjectionRows(
          paymentProjectionResult.status === "fulfilled" && paymentProjectionResult.value?.ok && Array.isArray(paymentProjectionResult.value?.rows)
            ? paymentProjectionResult.value.rows
            : []
        );

        const summarySource =
          moneyCoreResult.status === "fulfilled" ? moneyCoreResult.value : null;
        const summary =
          summarySource?.summary ||
          summarySource?.data ||
          summarySource ||
          null;
        setMoneyCoreSummary(summary);
        setMoneyCoreFlags(
          moneyCoreFlagsResult.status === "fulfilled" && moneyCoreFlagsResult.value?.ok
            ? moneyCoreFlagsResult.value.flags || moneyCoreFlagsResult.value.data || moneyCoreFlagsResult.value
            : null
        );

        const moneyCoreOwnerType = summary?.owner?.type || null;
        const moneyCoreOwnerId = summary?.owner?.id || null;

        if (moneyCoreOwnerType && moneyCoreOwnerId) {
          const splitResult = await getMasterSplitAllocations(masterSlug, { owner_id: moneyCoreOwnerId });
          if (!cancelled) {
            setMoneyCoreSplitAllocations(splitResult?.ok && Array.isArray(splitResult.allocations) ? splitResult.allocations : []);
            setMoneyCoreSplitAllocationsError(uiError(splitResult?.ok ? "" : uiMessage("salon.s0882")));
          }
        } else if (!cancelled) {
          setMoneyCoreSplitAllocations([]);
          setMoneyCoreSplitAllocationsError("");
        }

        if (
          (activeResult.status === "rejected" || !activeResult.value?.ok) &&
          (historyResult.status === "rejected" || !historyResult.value?.ok) &&
          (walletResult.status === "rejected" || !walletResult.value?.ok) &&
          (settlementsResult.status === "rejected" || !settlementsResult.value?.ok) &&
          (payoutsResult.status === "rejected" || !payoutsResult.value?.ok)
        ) {
          setError(uiError(uiMessage("master.s0642")));
        }
      } catch (e) {
        console.error("MASTER_FINANCE_OVERVIEW_LOAD_FAILED", e);

        if (!cancelled) {
          setActiveContract(null);
          setHistory([]);
          setWallet(null);
          setSettlements([]);
          setPayouts([]);
          setPaymentProjectionSummary(null);
          setPaymentProjectionRows([]);
          setMoneyCoreSummary(null);
          setMoneyCoreFlags(null);
          setMoneyCoreSplitAllocations([]);
          setMoneyCoreSplitAllocationsError("");
          setError(uiError(uiMessage("master.s0642")));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFinance();

    return () => {
      cancelled = true;
    };
  }, [masterSlug]);

  useEffect(() => {
    let cancelled = false;

    async function loadLostProfit() {
      if (!masterSlug) {
        if (!cancelled) {
          setLostProfit(null);
          setLostProfitLoading(false);
          setLostProfitError("");
        }
        return;
      }

      try {
        setLostProfitLoading(true);
        setLostProfitError("");

        const result = await getMasterLostProfit(undefined, { limit: 50 });

        if (cancelled) return;

        if (result?.ok) {
          setLostProfit(result.result || null);
        }
        else {
          setLostProfit(null);
          setLostProfitError(uiError(uiMessage("salon.s0881")));
        }
      }
      catch (e) {
        console.error("MASTER_LOST_PROFIT_LOAD_FAILED", e);

        if (!cancelled) {
          setLostProfit(null);
          setLostProfitError(uiError(uiMessage("salon.s0881")));
        }
      }
      finally {
        if (!cancelled) {
          setLostProfitLoading(false);
        }
      }
    }

    void loadLostProfit();

    return () => {
      cancelled = true;
    };
  }, [masterSlug]);

  async function fetchCollectionAnchors() {
    if (!masterSlug) {
      return { ok: false, error: "MASTER_SLUG_MISSING" };
    }

    return getMasterCollectionAnchors(masterSlug, { limit: 100 });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadCollectionAnchors() {
      if (!masterSlug) {
        if (!cancelled) {
          setCollectionAnchors(null);
          setCollectionAnchorsLoading(false);
          setCollectionAnchorsError("");
        }
        return;
      }

      try {
        if (!cancelled) {
          setCollectionAnchorsLoading(true);
          setCollectionAnchorsError("");
        }

        const result = await fetchCollectionAnchors();

        if (cancelled) return;

        if (result?.ok) {
          setCollectionAnchors(result);
        }
        else {
          setCollectionAnchors(null);
          setCollectionAnchorsError(uiError(uiMessage("master.s0644")));
        }
      }
      catch (e) {
        console.error("MASTER_COLLECTION_ANCHORS_LOAD_FAILED", e);

        if (!cancelled) {
          setCollectionAnchors(null);
          setCollectionAnchorsError(uiError(uiMessage("master.s0644")));
        }
      }
      finally {
        if (!cancelled) {
          setCollectionAnchorsLoading(false);
        }
      }
    }

    void loadCollectionAnchors();

    return () => {
      cancelled = true;
    };
  }, [masterSlug]);

  useEffect(() => {
    let cancelled = false;

    async function loadSalaryObligations() {
      if (!masterSlug) {
        if (!cancelled) {
          setSalaryObligations([]);
          setSalaryObligationsSummary(null);
          setSalaryObligationsError("");
          setSalaryObligationsLoading(false);
        }
        return;
      }

      try {
        setSalaryObligationsLoading(true);
        setSalaryObligationsError("");

        const result = await getMasterSalaryObligations(masterSlug);

        if (cancelled) return;

        if (result?.ok) {
          setSalaryObligations(Array.isArray(result?.obligations) ? result.obligations : []);
          setSalaryObligationsSummary(result?.summary || null);
        }
        else {
          setSalaryObligations([]);
          setSalaryObligationsSummary(null);
          setSalaryObligationsError(uiError(uiMessage("salon.s0036")));
        }
      }
      catch (e) {
        console.error("MASTER_SALARY_OBLIGATIONS_LOAD_FAILED", e);

        if (!cancelled) {
          setSalaryObligations([]);
          setSalaryObligationsSummary(null);
          setSalaryObligationsError(uiError(uiMessage("salon.s0036")));
        }
      }
      finally {
        if (!cancelled) {
          setSalaryObligationsLoading(false);
        }
      }
    }

    void loadSalaryObligations();

    return () => {
      cancelled = true;
    };
  }, [masterSlug]);

  useEffect(() => {
    let cancelled = false;

    async function loadMoneyCoreCabinet() {
      const masterSlugValue = masterSlug;

        if (!masterSlugValue) {
          if (!cancelled) {
            setMoneyCoreDestinationProviders([]);
            setMoneyCoreWithdrawDestinations([]);
            setMoneyCoreWithdrawSettings(null);
            setMoneyCoreWithdrawRequests([]);
            setMoneyCoreOwnerQr([]);
          }
          return;
        }

      try {
        const [
          providersResult,
          destinationsResult,
          settingsResult,
          requestsResult,
          ownerQrResult,
        ] = await Promise.all([
          getMoneyCoreDestinationProviders({ enabled: true }),
          getMasterWithdrawDestinations(masterSlugValue),
          getMasterWithdrawSettings(masterSlugValue),
          getMasterWithdrawRequests(masterSlugValue, { limit: 10, offset: 0 }),
          getMasterOwnerQrDestinations(masterSlugValue),
        ]);

        if (cancelled) return;

        setMoneyCoreDestinationProviders(Array.isArray(providersResult?.providers) ? providersResult.providers : []);
        setMoneyCoreWithdrawDestinations(Array.isArray(destinationsResult?.destinations) ? destinationsResult.destinations : []);
        setMoneyCoreWithdrawSettings(settingsResult?.settings || null);
        setMoneyCoreWithdrawRequests(Array.isArray(requestsResult?.requests) ? requestsResult.requests : []);
        setMoneyCoreOwnerQr(Array.isArray(ownerQrResult?.destinations) ? ownerQrResult.destinations : []);
      } catch (e) {
        if (!cancelled) {
          setMoneyCoreDestinationProviders([]);
          setMoneyCoreWithdrawDestinations([]);
          setMoneyCoreWithdrawSettings(null);
          setMoneyCoreWithdrawRequests([]);
          setMoneyCoreOwnerQr([]);
        }
      }
    }

    loadMoneyCoreCabinet();

    return () => {
      cancelled = true;
    };
  }, [masterSlug]);

  useEffect(() => {
    let cancelled = false;

    async function loadRentObligations() {
      if (!masterSlug) {
        if (!cancelled) {
          setRentObligations([]);
          setRentObligationsSummary(null);
          setRentObligationsError("");
          setRentObligationsLoading(false);
        }
        return;
      }

      try {
        setRentObligationsLoading(true);
        setRentObligationsError("");

        const result = await getMasterRentObligations(masterSlug);

        if (cancelled) return;

        if (result?.ok) {
          setRentObligations(Array.isArray(result?.obligations) ? result.obligations : []);
          setRentObligationsSummary(result?.summary || null);
        }
        else {
          setRentObligations([]);
          setRentObligationsSummary(null);
          setRentObligationsError(uiError(uiMessage("salon.s0035")));
        }
      }
      catch (e) {
        console.error("MASTER_RENT_OBLIGATIONS_LOAD_FAILED", e);

        if (!cancelled) {
          setRentObligations([]);
          setRentObligationsSummary(null);
          setRentObligationsError(uiError(uiMessage("salon.s0035")));
        }
      }
      finally {
        if (!cancelled) {
          setRentObligationsLoading(false);
        }
      }
    }

    void loadRentObligations();

    return () => {
      cancelled = true;
    };
  }, [masterSlug]);

  const billingSnapshot = getBillingSnapshot();
  const billingStateLabel = formatBillingState(
    billingSnapshot.billing,
    billingSnapshot.billingLoading
  );

  const contractIsActive = useMemo(() => {
    return activeContract ? isContractActive(activeContract) : false;
  }, [activeContract]);

  const walletBalance = useMemo(() => {
    if (typeof wallet?.balance === "undefined") return 0;
    return Number(wallet.balance) || 0;
  }, [wallet]);

  const settlementTotal = useMemo(() => sumAmounts(settlements), [settlements]);
  const payoutTotal = useMemo(() => sumAmounts(payouts), [payouts]);
  const moneyCoreZones = moneyCoreSummary || {};
  const moneyCoreFlagsData = moneyCoreFlags?.flags || moneyCoreFlags?.data || moneyCoreFlags || null;
  const moneyCoreOpen = Boolean(
    moneyCoreFlagsData &&
      moneyCoreFlagsData.MONEY_CORE_ENABLED === true &&
      moneyCoreFlagsData.MONEY_CORE_READ_ONLY === false &&
      moneyCoreFlagsData.MONEY_CORE_WRITE_ENABLED === true &&
      moneyCoreFlagsData.WITHDRAW_REQUESTS_V2_ENABLED === true
  );
  const moneyCoreDestinationWriteOpen = Boolean(
    moneyCoreFlagsData &&
      moneyCoreFlagsData.MONEY_CORE_ENABLED === true &&
      moneyCoreFlagsData.MONEY_CORE_READ_ONLY === false &&
      moneyCoreFlagsData.MONEY_CORE_WRITE_ENABLED === true &&
      moneyCoreFlagsData.WITHDRAW_DESTINATIONS_WRITE_ENABLED === true
  );
  const moneyCoreWithdrawPanelNote = moneyCoreOpen
    ? uiMessage("salon.s0883")
    : uiMessage("salon.s0884");
  const moneyCoreWithdrawStateText = moneyCoreOpen
    ? uiMessage("salon.s0885")
    : uiMessage("salon.s0886");
  const moneyCoreWithdrawSettingsText = moneyCoreOpen
    ? uiMessage("salon.s0887")
    : uiMessage("salon.s0888");
  const moneyCoreWithdrawRequestsText = moneyCoreOpen
    ? uiMessage("salon.s0889")
    : uiMessage("salon.s0890");
  const moneyCoreCreateRequestText = moneyCoreOpen
    ? uiMessage("salon.s0891")
    : uiMessage("salon.s0892");
  const moneyCoreAddRequisitesText = moneyCoreDestinationWriteOpen
    ? uiMessage("salon.s0893")
    : uiMessage("salon.s0894");
  const selectedWithdrawProvider = useMemo(
    () => buildWithdrawDestinationPreview(moneyCoreDestinationProviders, {
      selectedProviderCode,
      accountHolder,
      phone,
      bankName,
      accountMasked,
      cardLast4,
      destinationRelation,
      note,
    }),
    [
      moneyCoreDestinationProviders,
      selectedProviderCode,
      accountHolder,
      phone,
      bankName,
      accountMasked,
      cardLast4,
      destinationRelation,
      note,
    ]
  );
  const destinationSaveReady = Boolean(
    moneyCoreDestinationWriteOpen &&
      selectedWithdrawProvider.isReady &&
      !destinationSaving
  );

  async function handleSaveWithdrawDestination() {
    if (!moneyCoreDestinationWriteOpen) {
      setDestinationSaveStatus({
        tone: "error",
        text: uiMessage("salon.s0895"),
      });
      return;
    }

    if (!selectedWithdrawProvider.isReady) {
      setDestinationSaveStatus({
        tone: "error",
        text: uiError(selectedWithdrawProvider.errors[0], uiMessage("salon.s0896")),
      });
      return;
    }

    const payload = buildWithdrawDestinationCreatePayload(selectedWithdrawProvider);

    if (!payload) {
      setDestinationSaveStatus({
        tone: "error",
        text: uiMessage("salon.s0897"),
      });
      return;
    }

    setDestinationSaving(true);
    setDestinationSaveStatus(null);

    try {
      const result = await createMasterWithdrawDestination(masterSlug, payload);

      if (result?.ok && result.destination) {
        const refreshed = await getMasterWithdrawDestinations(masterSlug);
        if (refreshed?.ok && Array.isArray(refreshed.destinations)) {
          setMoneyCoreWithdrawDestinations(refreshed.destinations);
        } else {
          setMoneyCoreWithdrawDestinations((current) => {
            const currentList = Array.isArray(current) ? current : [];
            return [result.destination, ...currentList.filter((item) => item?.id !== result.destination.id)];
          });
        }

        setSelectedProviderCode("");
        setAccountHolder("");
        setPhone("");
        setBankName("");
        setAccountMasked("");
        setCardLast4("");
        setDestinationRelation("self");
        setNote("");
        setDestinationSaveStatus({
          tone: "success",
          text: uiMessage("salon.s0898"),
        });
        return;
      }

      const blockedByFlag =
        result?.detail?.error === "MONEY_CORE_WITHDRAW_DESTINATIONS_WRITE_DISABLED" ||
        result?.detail?.statusCode === 403;

      setDestinationSaveStatus({
        tone: "error",
        text: blockedByFlag
          ? uiMessage("salon.s0895")
          : uiError(result?.detail?.message || result?.message || result?.error, uiMessage("salon.s0899")),
      });
    } catch (error) {
      setDestinationSaveStatus({
        tone: "error",
        text: uiError(error?.message, uiMessage("salon.s0899")),
      });
    } finally {
      setDestinationSaving(false);
    }
  }
  const moneyCoreOwnerType = moneyCoreSummary?.owner?.type || null;
  const moneyCoreOwnerId = moneyCoreSummary?.owner?.id || null;
  const lostProfitSummary = lostProfit?.summary || null;
  const lostProfitMonthly = Array.isArray(lostProfit?.monthly) ? lostProfit.monthly : [];
  const financeStats = useMemo(
    () => calculateProjectionStats(paymentProjectionRows, moneyCoreWithdrawDestinations, moneyCoreWithdrawRequests, moneyCoreOwnerQr),
    [paymentProjectionRows, moneyCoreWithdrawDestinations, moneyCoreWithdrawRequests, moneyCoreOwnerQr]
  );
  const withdrawDestinationById = useMemo(() => {
    const map = new Map();
    for (const item of moneyCoreWithdrawDestinations) {
      const id = Number(item?.id || item?.destination_id || 0);
      if (Number.isFinite(id) && id > 0) {
        map.set(id, item);
      }
    }
    return map;
  }, [moneyCoreWithdrawDestinations]);
  const splitAllocatedStats = useMemo(
    () => calculateSplitAllocatedStats(moneyCoreSplitAllocations),
    [moneyCoreSplitAllocations]
  );
  const collectionAnchorsSummary = collectionAnchors?.summary || null;
  const collectionAnchorRows = getCollectionAnchorRows(collectionAnchors);

  const lastSettlement = useMemo(() => {
    if (!settlements.length) return null;

    return [...settlements].sort((a, b) => {
      return new Date(b?.period_end || b?.created_at || 0) - new Date(a?.period_end || a?.created_at || 0);
    })[0];
  }, [settlements]);

  const historyPreview = useMemo(() => history.slice(0, 5), [history]);

  const formatObligationStatus = (value) => {
    const status = normalizeObligationStatus(value);

    if (status === "overdue") return uiMessage("salon.s0045");
    if (status === "upcoming") return uiMessage("salon.s0046");
    if (status === "open") return uiMessage("salon.s0047");
    if (status === "paid") return uiMessage("salon.s0048");
    if (status === "cancelled") return uiMessage("salon.s0049");
    if (status === "voided") return uiMessage("salon.s0050");
    return value || "—";
  };

  const formatCurrencyAmount = (value, currencyCode = "KGS") => {
    const amount = Number(value || 0);
    if (Number.isNaN(amount)) return "—";
    return uiTemplate([""," ",""], [new Intl.NumberFormat("ru-RU").format(amount), currencyCode]);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}><UiValue value={uiMessage("master.s0669")} /></div>
            <h1 style={styles.title}><UiValue value={uiMessage("salon.s0017")} /></h1>
            <p style={styles.subtitle}><UiValue value={uiMessage("master.s0670")} /></p>
          </div>
        </header>

        {masterSlug ? <FinanceNav masterSlug={masterSlug} active="finance" /> : null}

        {loading ? <div style={styles.loadingCard}><UiValue value={uiMessage("master.s0671")} /></div> : null}

        {!loading && error ? (
          <div style={styles.errorBanner}>
            <div style={styles.errorTitle}><UiValue value={uiMessage("salon.s1036")} /></div>
            <div style={styles.errorText}><UiValue value={uiError(error)} /></div>
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <section style={styles.grid}>
              <StatCard label={uiMessage("salon.s1082")} value={money(walletBalance)} hint={uiMessage("master.s0674")} />
              <StatCard label={uiMessage("master.s0675")} value={billingStateLabel} hint={uiMessage("master.s0676", {p0: formatAccessFlag(billingSnapshot.canWrite), p1: formatAccessFlag(billingSnapshot.canWithdraw)})} />
              <StatCard label={uiMessage("salon.s0029")} value={String(settlements.length)} hint={money(settlementTotal)} />
              <StatCard label={uiMessage("salon.s0030")} value={String(payouts.length)} hint={money(payoutTotal)} />
              <StatCard label={uiMessage("salon.s0920")} value={money(paymentProjectionSummary?.history_amount)} hint={uiMessage("master.s0678", {p0: Number(paymentProjectionSummary?.history_count || 0)})} />
              <StatCard label={uiMessage("salon.s0922")} value={money(paymentProjectionSummary?.open_balance_amount)} hint={uiMessage("master.s0680", {p0: Number(paymentProjectionSummary?.open_balance_count || 0)})} />
            </section>

            <Panel
              title={uiMessage("salon.s0946")}
              subtitle={uiMessage("master.s0682")}
            >
              {lostProfitError ? (
                <div style={{ marginBottom: 12, fontSize: 13, color: "#b42318", background: "#fff5f5", border: "1px solid #f5c2c7", borderRadius: 12, padding: 12 }}>
                  <UiValue value={lostProfitError} />
                </div>
              ) : null}

              {lostProfitLoading ? (
                <EmptyState
                  title={uiMessage("salon.s0948")}
                  text={uiMessage("master.s0684")}
                />
              ) : lostProfitSummary ? (
                <div style={{ display: "grid", gap: 16 }}>
                  <section style={styles.grid}>
                    <StatCard label={uiMessage("salon.s0147")} value={money(lostProfitSummary.lost_profit_amount, lostProfitSummary?.currency_code || lostProfitSummary?.currency)} hint={uiMessage("salon.s0946")} />
                    <StatCard label={uiMessage("salon.s0950")} value={String(Number(lostProfitSummary.cancelled_count || 0))} hint={uiMessage("salon.s0951")} />
                    {Number(lostProfitSummary.missing_price_count || 0) > 0 ? (
                      <StatCard label={uiMessage("salon.s0952")} value={String(Number(lostProfitSummary.missing_price_count || 0))} hint={uiMessage("salon.s0953")} />
                    ) : null}
                  </section>

                  {lostProfitMonthly.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0956")} /></div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {lostProfitMonthly.map((item) => (
                          <PreviewRow
                            key={item.month}
                            title={item.month || "—"}
                            meta={uiMessage("salon.s0957", {p0: Number(item.cancelled_count || 0)})}
                            value={money(item.lost_profit_amount, item?.currency_code || item?.currency)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  title={uiMessage("salon.s0958")}
                  text={uiMessage("salon.s0959")}
                />
              )}
            </Panel>

            <Panel
              title={uiMessage("master.s0694")}
              subtitle={uiMessage("master.s0695")}
            >
              {collectionAnchorsError ? (
                <div style={{ marginBottom: 12, fontSize: 13, color: "#b42318", background: "#fff5f5", border: "1px solid #f5c2c7", borderRadius: 12, padding: 12 }}>
                  <UiValue value={collectionAnchorsError} />
                </div>
              ) : null}

              {collectionAnchorsLoading ? (
                <EmptyState
                  title={uiMessage("master.s0696")}
                  text={uiMessage("master.s0697")}
                />
              ) : collectionAnchors?.ok && collectionAnchorRows.length ? (
                <div style={{ display: "grid", gap: 16 }}>
                  <section style={styles.grid}>
                    <StatCard label={uiMessage("salon.s0147")} value={formatCollectionAnchorMetric(collectionAnchorsSummary, ["total_paid_for_my_services", "collected_by_master", "paid_for_my_services"])} hint={uiMessage("master.s0698")} />
                    <StatCard label={uiMessage("salon.s0287")} value={formatCollectionAnchorMetric(collectionAnchorsSummary, ["collected_by_master"])} hint={uiMessage("master.s0699")} />
                    <StatCard label={uiMessage("salon.s0288")} value={formatCollectionAnchorMetric(collectionAnchorsSummary, ["open_at_salon", "open_to_transfer"])} hint={uiMessage("master.s0700")} />
                    <StatCard label={uiMessage("salon.s0291")} value={formatCollectionAnchorMetric(collectionAnchorsSummary, ["closed_by_salon", "closed_transfers"])} hint={uiMessage("salon.s0376")} />
                    <StatCard label={uiMessage("salon.s0289")} value={formatCollectionAnchorMetric(collectionAnchorsSummary, ["unknown"])} hint={uiMessage("salon.s0976")} />
                    <StatCard label={uiMessage("salon.s0290")} value={formatCollectionAnchorMetric(collectionAnchorsSummary, ["conflict"])} hint={uiMessage("master.s0703")} />
                  </section>

                  <div style={{ display: "grid", gap: 8 }}>
                    {collectionAnchorRows.slice(0, 12).map((row, index) => {
                      const amount = Number(row?.amount || row?.payment_amount || row?.price_snapshot || 0);
                      const masterLabel = String(
                        row?.master_name ||
                        row?.master_slug ||
                        row?.master?.name ||
                        row?.master?.slug ||
                        row?.master_id ||
                        row?.beneficiary_master_id ||
                        "—"
                      ).trim() || "—";
                      const salonLabel = getCollectionAnchorSalonLabel(row);
                      const rowKey = getCollectionAnchorRowKey(row, index);

                      return (
                        <PreviewRow
                          key={rowKey}
                          title={uiMessage("master.s0704", {p0: row?.payment_id || "—"})}
                          meta={uiMessage("master.s0705", {p0: row?.booking_id || "—", p1: salonLabel, p2: masterLabel, p3: String(row?.source_type || row?.source || "—").trim() || "—"})}
                          value={money(amount, row?.currency_code || row?.currency)}
                          status={uiTemplate([""," · ",""], [getCollectionAnchorOwnerLabel(row?.collector_owner_type), getCollectionAnchorStatusLabel(row?.anchor_status)])}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title={uiMessage("master.s0706")}
                  text={uiMessage("master.s0707")}
                />
              )}
            </Panel>

            <Panel
              title={uiMessage("salon.s0960")}
              subtitle={moneyCoreOpen ? uiMessage("salon.s0961") : uiMessage("salon.s0962")}
            >
              <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: moneyCoreOpen ? "#ecfdf3" : "#fff7ed", border: moneyCoreOpen ? "1px solid #abefc6" : "1px solid #fed7aa", color: moneyCoreOpen ? "#065f46" : "#92400e" }}>
                <UiValue value={moneyCoreWithdrawStateText} />
              </div>

              {moneyCoreSummary ? (
                <section style={styles.grid}>
                  <StatCard label={uiMessage("salon.s0965")} value={money(moneyCoreZones.provider_hold)} hint={uiMessage("salon.s0965")} />
                  <StatCard label={uiMessage("salon.s0966")} value={money(moneyCoreZones.pending_settlement)} hint={uiMessage("salon.s0966")} />
                  <StatCard label={uiMessage("salon.s0967")} value={money(moneyCoreZones.available)} hint={uiMessage("salon.s0968")} />
                  <StatCard label={uiMessage("salon.s0969")} value={money(moneyCoreZones.locked)} hint={uiMessage("master.s0716")} />
                  <StatCard label={uiMessage("salon.s0971")} value={money(moneyCoreZones.paid_out)} hint={uiMessage("salon.s0972")} />
                  <StatCard label={uiMessage("salon.s0973")} value={money(moneyCoreZones.refunded)} hint={uiMessage("salon.s0973")} />
                  <StatCard label={uiMessage("salon.s0974")} value={money(moneyCoreZones.reversed)} hint={uiMessage("salon.s0975")} />
                  <StatCard label={uiMessage("salon.s0976")} value={money(moneyCoreZones.requires_review)} hint={uiMessage("salon.s0976")} />
                  <StatCard label={uiMessage("salon.s0977")} value={money(moneyCoreZones.commission)} hint={uiMessage("salon.s0978")} />
                  <StatCard label={uiMessage("salon.s0979")} value={money(moneyCoreZones.fee_reserved)} hint={uiMessage("salon.s0979")} />
                </section>
              ) : (
                <EmptyState
                  title={uiMessage("salon.s0980")}
                  text={uiMessage("salon.s0981")}
                />
              )}

              <Panel
                title={uiMessage("salon.s0924")}
                subtitle={uiMessage("master.s0728")}
              >
                <section style={styles.grid}>
                  <StatCard label={uiMessage("salon.s0926")} value={money(financeStats.confirmedGrossAmount)} hint={uiMessage("salon.s0927")} />
                  <StatCard label={uiMessage("salon.s0928")} value={money(financeStats.salonShare)} hint={uiMessage("salon.s0929")} />
                  <StatCard label={uiMessage("salon.s0930")} value={money(financeStats.masterShare)} hint={uiMessage("salon.s0931")} />
                  <StatCard label={uiMessage("salon.s0932")} value={money(splitAllocatedStats.splitAllocatedAmount)} hint={uiMessage("salon.s0933")} />
                  <StatCard label={uiMessage("salon.s0934")} value={money(financeStats.openBalanceAmount)} hint={uiMessage("salon.s0935")} />
                  <StatCard label={uiMessage("salon.s0936")} value={uiMessage("salon.s0937", {p0: financeStats.collectorMissingCount})} hint={uiMessage("salon.s0938")} />
                  <StatCard label={uiMessage("salon.s0939")} value={uiTemplate([""," / ",""], [financeStats.destinationsCount, financeStats.withdrawRequestsCount])} hint={uiMessage("salon.s0940")} />
                  <StatCard label={uiMessage("salon.s0941")} value={String(financeStats.ownerQrCount)} hint={uiMessage("salon.s0942")} />
                </section>

                <div style={{ display: "grid", gap: 8, marginTop: 14, fontSize: 13, lineHeight: 1.5, color: "#475569" }}>
                  {financeStats.confirmedGrossAmount > 0 && financeStats.openBalanceAmount === 0 ? (
                    <div><UiValue value={uiMessage("salon.s0943")} /></div>
                  ) : null}
                  {moneyCoreSplitAllocationsError ? (
                    <div><UiValue value={moneyCoreSplitAllocationsError} /></div>
                  ) : null}
                  {financeStats.destinationsCount === 0 ? (
                    <div><UiValue value={uiMessage("salon.s0944")} /></div>
                  ) : null}
                  {financeStats.withdrawRequestsCount === 0 ? (
                    <div><UiValue value={uiMessage("salon.s0945")} /></div>
                  ) : null}
                </div>
              </Panel>

              {moneyCoreOwnerType && moneyCoreOwnerId ? (
                <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                  <Panel title={uiMessage("salon.s0982")} subtitle={uiMessage("salon.s0983")}>
                    {moneyCoreDestinationProviders.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {moneyCoreDestinationProviders.map((item) => (
                          <PreviewRow
                            key={item.code}
                            title={item.name || item.code}
                            meta={uiTemplate([""," · ",""], [item.code, item.method || "—"])}
                            status={item.enabled ? uiMessage("salon.s0984") : uiMessage("salon.s0421")}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title={uiMessage("salon.s0985")}
                        text={uiMessage("salon.s0986")}
                      />
                    )}
                  </Panel>

                  <Panel title={uiMessage("salon.s0987")} subtitle={uiMessage("salon.s0988")}>
                    {moneyCoreWithdrawDestinations.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {moneyCoreWithdrawDestinations.map((item) => (
                          <PreviewRow
                            key={item.id}
                            title={item.method || "—"}
                            meta={uiTemplate([""," · ",""], [item.status || "—", item.destination_relation || "—"])}
                            value={item.phone || item.bank_name || item.account_masked || item.card_last4 || "—"}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title={uiMessage("salon.s0989")}
                        text={uiMessage("salon.s0990")}
                      />
                    )}

                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e5e7eb", display: "grid", gap: 12 }}>
                      <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                        <UiValue value={moneyCoreAddRequisitesText} />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0991")} /></span>
                          <select
                            disabled={!moneyCoreDestinationWriteOpen}
                            value={selectedProviderCode}
                            onChange={(event) => setSelectedProviderCode(event.target.value)}
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                              color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: moneyCoreDestinationWriteOpen ? "pointer" : "not-allowed"
                            }}
                          >
                            <option value=""><UiValue value={uiMessage("salon.s0992")} /></option>
                            {moneyCoreDestinationProviders.map((item) => (
                              <option key={item.code} value={item.code}>
                                <UiValue value={item.name || item.code} /> · <UiValue value={item.method || "—"} />
                              </option>
                            ))}
                          </select>
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0993")} /></span>
                          <input
                            disabled={!moneyCoreDestinationWriteOpen}
                            value={accountHolder}
                            onChange={(event) => setAccountHolder(event.target.value)}
                            placeholder={renderUi(uiMessage("salon.s0994"))}
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                              color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: moneyCoreDestinationWriteOpen ? "text" : "not-allowed"
                            }}
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0230")} /></span>
                          <input
                            disabled={!moneyCoreDestinationWriteOpen}
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            placeholder="+996..."
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                              color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: moneyCoreDestinationWriteOpen ? "text" : "not-allowed"
                            }}
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0849")} /></span>
                          <input
                            disabled={!moneyCoreDestinationWriteOpen}
                            value={bankName}
                            onChange={(event) => setBankName(event.target.value)}
                            placeholder={renderUi(uiMessage("salon.s0996"))}
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                              color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: moneyCoreDestinationWriteOpen ? "text" : "not-allowed"
                            }}
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0997")} /></span>
                          <input
                            disabled={!moneyCoreDestinationWriteOpen}
                            value={accountMasked}
                            onChange={(event) => setAccountMasked(event.target.value)}
                            placeholder="**** 1234"
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                              color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: moneyCoreDestinationWriteOpen ? "text" : "not-allowed"
                            }}
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0999")} /></span>
                          <input
                            disabled={!moneyCoreDestinationWriteOpen}
                            value={cardLast4}
                            onChange={(event) => setCardLast4(event.target.value)}
                            placeholder="1234"
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                              color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: moneyCoreDestinationWriteOpen ? "text" : "not-allowed"
                            }}
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s1001")} /></span>
                          <select
                            disabled={!moneyCoreDestinationWriteOpen}
                            value={destinationRelation}
                            onChange={(event) => setDestinationRelation(event.target.value)}
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                              color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: moneyCoreDestinationWriteOpen ? "pointer" : "not-allowed"
                            }}
                          >
                            {WITHDRAW_DESTINATION_RELATION_OPTIONS.map((relation) => (
                              <option key={relation} value={relation}>
                                <UiValue value={relation} />
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s1002")} /></span>
                        <textarea
                          disabled={!moneyCoreDestinationWriteOpen}
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder={renderUi(uiMessage("salon.s1003"))}
                          rows={3}
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: moneyCoreDestinationWriteOpen ? "#ffffff" : "#f9fafb",
                            color: moneyCoreDestinationWriteOpen ? "#111827" : "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            resize: "vertical",
                            cursor: moneyCoreDestinationWriteOpen ? "text" : "not-allowed"
                          }}
                        />
                      </label>

                      <div style={{ display: "grid", gap: 8, padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s1004")} /></div>
                        <div style={{ fontSize: 13, color: selectedWithdrawProvider.isReady ? "#065f46" : "#92400e", lineHeight: 1.5 }}>
                          <UiValue value={selectedWithdrawProvider.isReady
                            ? uiMessage("salon.s1005")
                            : uiMessage("salon.s1006", {p0: selectedWithdrawProvider.errors.length ? uiTemplate([": ",""], [selectedWithdrawProvider.errors[0]]) : ""})} />
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}><UiValue value={uiMessage("salon.s1007")} /><UiValue value={selectedWithdrawProvider.method || "—"} /><UiValue value={uiMessage("salon.s1008")} /><UiValue value={selectedWithdrawProvider.selectedProvider?.code || "—"} /><UiValue value={uiMessage("salon.s1009")} /><UiValue value={selectedWithdrawProvider.destinationRelation || "—"} />
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                          <UiValue value={selectedWithdrawProvider.method === "wallet"
                            ? uiTemplate(["wallet_provider: ",""], [selectedWithdrawProvider.selectedProvider?.code || "—"])
                            : selectedWithdrawProvider.method === "bank_account"
                              ? uiTemplate(["bank_name: ",""], [selectedWithdrawProvider.bankName || "—"])
                              : selectedWithdrawProvider.method === "card"
                                ? uiTemplate(["card_last4: ",""], [selectedWithdrawProvider.cardLast4 || "—"])
                                : uiTemplate(["safe fields: ",""], [[selectedWithdrawProvider.accountHolder, selectedWithdrawProvider.phone, selectedWithdrawProvider.accountMasked, selectedWithdrawProvider.note].filter(Boolean).length])} />
                        </div>
                      </div>

                    <button
                      type="button"
                      disabled={!destinationSaveReady}
                      onClick={handleSaveWithdrawDestination}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 12,
                        background: destinationSaveReady ? "#f8fafc" : "#e5e7eb",
                        color: destinationSaveReady ? "#111827" : "#6b7280",
                        padding: "12px 16px",
                        fontWeight: 700,
                        opacity: destinationSaveReady ? 1 : 0.55,
                        cursor: destinationSaveReady ? "pointer" : "not-allowed",
                        justifySelf: "start"
                      }}
                    ><UiValue value={uiMessage("salon.s1010")} /></button>
                    <div style={{ fontSize: 12, color: destinationSaveStatus?.tone === "error" ? "#b91c1c" : destinationSaveStatus?.tone === "success" ? "#065f46" : "#6b7280", lineHeight: 1.5 }}>
                      <UiValue value={destinationSaveStatus?.text || moneyCoreAddRequisitesText} />
                    </div>
                  </div>
                </Panel>

                  <Panel title={uiMessage("salon.s1011")} subtitle={moneyCoreWithdrawPanelNote}>
                    {moneyCoreWithdrawSettings ? (
                      <div style={styles.grid}>
                        <StatCard title={uiMessage("salon.s1012")} value={moneyCoreWithdrawSettings.mode || "—"} note={uiMessage("salon.s1013")} />
                        <StatCard title={uiMessage("salon.s1014")} value={String(Boolean(moneyCoreWithdrawSettings.auto_submit_enabled))} note={uiMessage("salon.s1015")} />
                        <StatCard title={uiMessage("salon.s1016")} value={String(Boolean(moneyCoreWithdrawSettings.requires_admin_review))} note={uiMessage("salon.s1017")} />
                        <StatCard title={uiMessage("salon.s1018")} value={moneyCoreWithdrawSettings.amount_mode || "—"} note={uiMessage("salon.s1019")} />
                      </div>
                    ) : (
                      <EmptyState
                        title={uiMessage("salon.s1020")}
                        text={moneyCoreWithdrawSettingsText}
                      />
                    )}
                  </Panel>

                  <Panel title={uiMessage("salon.s1021")} subtitle={uiMessage("salon.s1022")}>
                    {moneyCoreWithdrawRequests.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {moneyCoreWithdrawRequests.map((item) => {
                          const withdrawRequestStatus = getWithdrawRequestUserStatusLabel(item?.status) || uiMessage("salon.s1023");
                          const withdrawRequestDetails = getWithdrawRequestHistoryDetails(item);
                          const withdrawRequestPayoutResultDetails = getWithdrawRequestPayoutResultDetails(item);
                          const withdrawRequestDestinationDetails = getWithdrawRequestDestinationSummary(item, withdrawDestinationById);

                          return (
                            <PreviewRow
                              key={item.id}
                              title={withdrawRequestStatus}
                              meta={uiMessage("salon.s1024", {p0: item.id || "—", p1: formatDateTime(item.created_at), p2: withdrawRequestDetails ? uiTemplate([" · ",""], [withdrawRequestDetails]) : "", p3: withdrawRequestPayoutResultDetails ? uiTemplate([" · ",""], [withdrawRequestPayoutResultDetails]) : "", p4: withdrawRequestDestinationDetails ? uiTemplate([" · ",""], [withdrawRequestDestinationDetails]) : ""})}
                              value={money(item.amount, item?.currency_code || item?.currency)}
                              status={cleanStatus(item?.status) || null}
                            />
                          );
                        })}
                      </div>
                    ) : (
                    <EmptyState
                      title={uiMessage("salon.s1025")}
                      text={moneyCoreWithdrawRequestsText}
                    />
                  )}

                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e5e7eb", display: "grid", gap: 12 }}>
                    <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                        <UiValue value={moneyCoreCreateRequestText} />
                    </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s0968")} /></div>
                          <div style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 12, background: "#f9fafb", padding: "12px 14px", fontSize: 14, color: "#111827" }}>
                            <UiValue value={money(moneyCoreZones.available)} />
                          </div>
                        </div>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s1026")} /></span>
                          <input
                            disabled
                            defaultValue=""
                            placeholder={renderUi(uiMessage("salon.s0246"))}
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: "#f9fafb",
                              color: "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: "not-allowed"
                            }}
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s1027")} /></span>
                          <select
                            disabled
                            defaultValue=""
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: "#f9fafb",
                              color: "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: "not-allowed"
                            }}
                          >
                            <option value=""><UiValue value={uiMessage("salon.s1028")} /></option>
                          </select>
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}><UiValue value={uiMessage("salon.s1029")} /></span>
                          <textarea
                            disabled
                            defaultValue=""
                            placeholder={renderUi(uiMessage("salon.s1030"))}
                            rows={3}
                            style={{
                              width: "100%",
                              border: "1px solid #d1d5db",
                              borderRadius: 12,
                              background: "#f9fafb",
                              color: "#6b7280",
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: "not-allowed",
                              resize: "vertical"
                            }}
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        disabled
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 12,
                          background: "#e5e7eb",
                          color: "#6b7280",
                          padding: "12px 16px",
                          fontWeight: 700,
                          opacity: 0.55,
                          cursor: "not-allowed",
                          justifySelf: "start"
                        }}
                      ><UiValue value={uiMessage("salon.s1031")} /></button>
                    </div>
                  </Panel>
                </div>
              ) : null}
            </Panel>

            <section style={styles.actionsGrid}>
              <Link to={uiTemplate(["/master/","/money"], [masterSlug])} style={styles.actionCard}>
                <div style={styles.actionTitle}><UiValue value={uiMessage("salon.s0028")} /></div>
                <div style={styles.actionText}><UiValue value={uiMessage("master.s0798")} /></div>
              </Link>

              <Link to={uiTemplate(["/master/","/settlements"], [masterSlug])} style={styles.actionCard}>
                <div style={styles.actionTitle}><UiValue value={uiMessage("salon.s0029")} /></div>
                <div style={styles.actionText}><UiValue value={uiMessage("master.s0799")} /></div>
              </Link>

              <Link to={uiTemplate(["/master/","/payouts"], [masterSlug])} style={styles.actionCard}>
                <div style={styles.actionTitle}><UiValue value={uiMessage("salon.s0030")} /></div>
                <div style={styles.actionText}><UiValue value={uiMessage("master.s0800")} /></div>
              </Link>

              <Link to={uiTemplate(["/master/","/transactions"], [masterSlug])} style={styles.actionCard}>
                <div style={styles.actionTitle}><UiValue value={uiMessage("salon.s0031")} /></div>
                <div style={styles.actionText}><UiValue value={uiMessage("master.s0801")} /></div>
              </Link>
            </section>

            <div style={styles.stack}>
              <Panel title={uiMessage("master.s0802")} subtitle={uiMessage("master.s0803")}>
                <div style={styles.infoGrid}>
                  <InfoRow label={uiMessage("master.s0804")} value={contractIsActive ? uiMessage("salon.s0628") : uiMessage("salon.s0629")} />
                  <InfoRow label={uiMessage("master.s0807")} value={activeContract?.contract_id || activeContract?.id || "—"} />
                  <InfoRow label={uiMessage("salon.s0099")} value={activeContract?.model_type || activeContract?.terms_json?.model || "—"} />
                  <InfoRow label={uiMessage("salon.s1082")} value={money(walletBalance)} />
                  <InfoRow label={uiMessage("salon.s1084")} value={billingStateLabel} />
                  <InfoRow label={uiMessage("salon.s0920")} value={money(paymentProjectionSummary?.history_amount)} />
                  <InfoRow label={uiMessage("salon.s0922")} value={money(paymentProjectionSummary?.open_balance_amount)} />
                  <InfoRow label={uiMessage("master.s0810")} value={formatAccessFlag(billingSnapshot.canWrite)} />
                  <InfoRow label={uiMessage("master.s0811")} value={formatAccessFlag(billingSnapshot.canWithdraw)} />
                  <InfoRow label={uiMessage("master.s0812")} value={billingSnapshot.billingBlockReason || "—"} />
                </div>
              </Panel>

              <Panel title={uiMessage("salon.s1096")} subtitle={uiMessage("master.s0814")}>
                {lastSettlement ? (
                  <div style={styles.infoGrid}>
                    <InfoRow label={uiMessage("salon.s1098")} value={lastSettlement.id || "—"} />
                    <InfoRow label={uiMessage("salon.s1099")} value={formatDateTime(lastSettlement.period_start || lastSettlement.start_date)} />
                    <InfoRow label={uiMessage("salon.s1100")} value={formatDateTime(lastSettlement.period_end || lastSettlement.end_date)} />
                    <InfoRow label={uiMessage("salon.s0147")} value={money(lastSettlement.amount, lastSettlement?.currency_code || lastSettlement?.currency)} />
                    <InfoRow label={uiMessage("salon.s0148")} value={displayStatus(lastSettlement.status || "—")} />
                    <InfoRow label={uiMessage("salon.s1160")} value={formatDateTime(lastSettlement.created_at)} />
                  </div>
                ) : (
                  <div style={styles.emptyText}><UiValue value={uiMessage("salon.s1101")} /></div>
                )}
              </Panel>

              <Panel title={uiMessage("master.s0820")} subtitle={uiMessage("master.s0821")}>
                {rentObligationsError ? (
                  <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", fontSize: 14 }}>
                    <UiValue value={rentObligationsError} />
                  </div>
                ) : null}

                <div style={styles.infoGrid}>
                  <InfoRow label={uiMessage("salon.s0047")} value={rentObligationsLoading ? "..." : String(Number(rentObligationsSummary?.open_count ?? 0))} />
                  <InfoRow label={uiMessage("master.s0822")} value={rentObligationsLoading ? "..." : formatSignedCurrency(rentObligationsSummary?.open_amount ?? 0, "-")} />
                  <InfoRow label={uiMessage("salon.s0048")} value={rentObligationsLoading ? "..." : String(Number(rentObligationsSummary?.paid_count ?? 0))} />
                  <InfoRow label={uiMessage("master.s0823")} value={rentObligationsLoading ? "..." : formatSignedCurrency(rentObligationsSummary?.paid_amount ?? 0, "-")} />
                </div>

                {rentObligationsLoading ? (
                  <div style={{ marginTop: 12, color: "#6b7280", fontSize: 14 }}><UiValue value={uiMessage("master.s0824")} /></div>
                ) : null}

                {!rentObligationsLoading && !rentObligationsError && rentObligations.length === 0 ? (
                  <div style={{ marginTop: 12 }}>
                    <EmptyState
                      title={uiMessage("master.s0825")}
                      text={uiMessage("master.s0826")}
                    />
                  </div>
                ) : null}

                {!rentObligationsLoading && !rentObligationsError && rentObligations.length > 0 ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {rentObligations.map((item, index) => {
                      const periodLabel = uiTemplate([""," — ",""], [formatDateTime(item?.period_start, item), formatDateTime(item?.period_end, item)]);
                      const amountLabel = formatSignedCurrency(item?.amount, "-", item?.currency || "KGS");
                      const dueLabel = formatDateTime(item?.due_at, item);

                      return (
                        <PreviewRow
                          key={item?.id || uiTemplate(["","-",""], [item?.contract_id || "obligation", index])}
                          title={periodLabel}
                          meta={uiMessage("master.s0827", {p0: dueLabel})}
                          value={amountLabel}
                          status={formatObligationStatus(item?.status)}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </Panel>

              <Panel title={uiMessage("master.s0828")} subtitle={uiMessage("master.s0829")}>
                {salaryObligationsError ? (
                  <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", fontSize: 14 }}>
                    <UiValue value={salaryObligationsError} />
                  </div>
                ) : null}

                <div style={styles.infoGrid}>
                  <InfoRow label={uiMessage("salon.s0047")} value={salaryObligationsLoading ? "..." : String(Number(salaryObligationsSummary?.open_count ?? 0))} />
                  <InfoRow label={uiMessage("master.s0830")} value={salaryObligationsLoading ? "..." : formatSignedCurrency(salaryObligationsSummary?.open_amount ?? 0, "+")} />
                  <InfoRow label={uiMessage("salon.s0048")} value={salaryObligationsLoading ? "..." : String(Number(salaryObligationsSummary?.paid_count ?? 0))} />
                  <InfoRow label={uiMessage("master.s0831")} value={salaryObligationsLoading ? "..." : formatSignedCurrency(salaryObligationsSummary?.paid_amount ?? 0, "+")} />
                </div>

                {salaryObligationsLoading ? (
                  <div style={{ marginTop: 12, color: "#6b7280", fontSize: 14 }}><UiValue value={uiMessage("master.s0832")} /></div>
                ) : null}

                {!salaryObligationsLoading && !salaryObligationsError && salaryObligations.length === 0 ? (
                  <div style={{ marginTop: 12 }}>
                    <EmptyState
                      title={uiMessage("master.s0833")}
                      text={uiMessage("master.s0834")}
                    />
                  </div>
                ) : null}

                {!salaryObligationsLoading && !salaryObligationsError && salaryObligations.length > 0 ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {salaryObligations.map((item, index) => {
                      const periodLabel = uiTemplate([""," — ",""], [formatDateTime(item?.period_start, item), formatDateTime(item?.period_end, item)]);
                      const amountLabel = formatSignedCurrency(item?.amount, "+", item?.currency || "KGS");
                      const dueLabel = formatDateTime(item?.due_at, item);

                      return (
                        <PreviewRow
                          key={item?.id || uiTemplate(["","-",""], [item?.contract_id || "salary-obligation", index])}
                          title={periodLabel}
                          meta={uiMessage("master.s0835", {p0: dueLabel})}
                          value={amountLabel}
                          status={formatObligationStatus(item?.status)}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </Panel>

              <Panel title={uiMessage("master.s0836")} subtitle={uiMessage("master.s0837")}>
                {historyPreview.length === 0 ? (
                  <div style={styles.emptyText}><UiValue value={uiMessage("master.s0838")} /></div>
                ) : (
                  <div style={styles.historyList}>
                    {historyPreview.map((item, index) => (
                      <details key={item?.id || item?.contract_id || index} style={styles.historyItem}>
                        <summary style={styles.historySummary}>
                          <span><UiValue value={item?.contract_id || item?.id || uiMessage("master.s0839", {p0: index + 1})} /></span>
                          <span><UiValue value={item?.status || item?.state || "—"} /></span>
                        </summary>
                        <div style={styles.historyBody}>
                          <InfoRow label={uiMessage("salon.s0099")} value={item?.model_type || item?.terms_json?.model || "—"} />
                          <InfoRow label={uiMessage("master.s0840")} value={item?.version || "—"} />
                          <InfoRow label={uiMessage("salon.s1099")} value={formatDateTime(item?.start_date || item?.created_at)} />
                          <InfoRow label={uiMessage("master.s0841")} value={formatDateTime(item?.end_date || item?.closed_at)} />
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  navGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px",
    marginBottom: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  navCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px 14px",
    textDecoration: "none",
    display: "block",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  navTitle: {
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "4px"
  },
  navNote: {
    fontSize: "12px",
    color: "#6b7280"
  },
  page: {
    padding: "20px",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflowX: "hidden",
    boxSizing: "border-box"
  },
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  eyebrow: {
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#6b7280",
    fontWeight: 700,
    marginBottom: "6px"
  },
  title: {
    margin: 0,
    fontSize: "28px",
    lineHeight: 1.1,
    color: "#111827",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#6b7280",
    fontSize: "14px",
    maxWidth: "720px",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  loadingCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "18px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  errorBanner: {
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#991b1b",
    borderRadius: "14px",
    padding: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  errorTitle: {
    fontWeight: 700,
    marginBottom: "6px"
  },
  errorText: {
    fontSize: "14px",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  cardLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "8px"
  },
  cardValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#111827"
  },
  cardHint: {
    marginTop: "6px",
    fontSize: "12px",
    color: "#6b7280",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  actionCard: {
    display: "block",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px",
    textDecoration: "none",
    color: "#111827",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  actionTitle: {
    fontSize: "16px",
    fontWeight: 700,
    marginBottom: "6px"
  },
  actionText: {
    fontSize: "13px",
    color: "#6b7280",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  panel: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  panelHeader: {
    marginBottom: "12px"
  },
  panelTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827"
  },
  panelSubtitle: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#6b7280",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "10px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  infoRow: {
    border: "1px solid #eef2f7",
    borderRadius: "12px",
    padding: "12px",
    background: "#f8fafc",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  infoLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "6px"
  },
  infoValue: {
    fontSize: "14px",
    color: "#111827",
    fontWeight: 600,
    wordBreak: "break-word"
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  historyItem: {
    border: "1px solid #eef2f7",
    borderRadius: "12px",
    background: "#f8fafc",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  historySummary: {
    cursor: "pointer",
    listStyle: "none",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 14px",
    fontWeight: 600,
    color: "#111827",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  historyBody: {
    padding: "0 14px 14px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  emptyText: {
    fontSize: "14px",
    color: "#6b7280",
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  }
};
