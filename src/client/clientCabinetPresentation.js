// TOTEM US06-CABINET — US-only presentation contract for shared client data.
// USD and business time zone derive from server-bound booking market/location.
// KG/KZ presentation is deliberately identical to its earlier legacy behavior.
// Never infer currency or time zone from browser locale, ZIP, phone, or state.
export const CLIENT_CABINET_RU = Object.freeze({
  title: "Кабинет клиента",
  loading: "Загружаем кабинет клиента…",
  incompleteLink: "Ссылка на кабинет неполная",
  intro: "Здесь хранится ваша запись, история посещений и личная ссылка на кабинет.",
  profile: "Профиль",
  name: "Имя",
  yourName: "Ваше имя",
  phone: "Телефон",
  phoneReadOnly: "Телефон в V1 нельзя менять из кабинета.",
  saving: "Сохраняем…",
  save: "Сохранить",
  saved: "Данные сохранены",
  personalLink: "Личная ссылка",
  personalLinkNote: "Сохраните ссылку. По ней можно вернуться в кабинет без пароля.",
  copyLink: "Скопировать ссылку",
  copied: "Ссылка скопирована",
  copyManual: "Скопируйте ссылку вручную",
  currentBooking: "Текущая запись",
  bookingHistory: "История записей",
  noBooking: "Записей пока нет.",
  noHistory: "История появится после первой записи.",
  service: "Услуга",
  master: "Мастер",
  salon: "Салон",
  repeat: "Повторить запись",
  total: "Всего записей",
  active: "Активные",
  completed: "Завершённые",
  retry: "Повторить",
  pushUnavailable: "",
  notifications: "Уведомления",
  notificationsLoading: "Загружаем уведомления…",
  notificationsError: "Не удалось загрузить уведомления",
  notificationsEmpty: "Новых уведомлений пока нет.",
  notificationsNew: "Новое",
  notificationsRead: "Прочитано",
  notificationsOpen: "Открыть",
});
export const CLIENT_CABINET_EN = Object.freeze({
  title: "Client dashboard",
  loading: "Loading your client dashboard…",
  incompleteLink: "This client link is incomplete.",
  intro: "Your appointments, visit history and private dashboard link.",
  profile: "Profile",
  name: "Name",
  yourName: "Your name",
  phone: "Phone",
  phoneReadOnly: "Phone changes are not available in this version.",
  saving: "Saving…",
  save: "Save",
  saved: "Changes saved",
  personalLink: "Private dashboard link",
  personalLinkNote: "Keep this private link to access your dashboard without a password.",
  copyLink: "Copy link",
  copied: "Link copied",
  copyManual: "Copy the link manually",
  currentBooking: "Current appointment",
  bookingHistory: "Appointment history",
  noBooking: "No appointments yet.",
  noHistory: "Your history will appear after your first appointment.",
  service: "Service",
  master: "Professional",
  salon: "Salon",
  repeat: "Book again",
  total: "Total appointments",
  active: "Active",
  completed: "Completed",
  retry: "Try again",
  pushUnavailable: "Browser push notifications are not enabled for the US test market.",
  notifications: "Notifications",
  notificationsLoading: "Loading notifications…",
  notificationsError: "Unable to load notifications",
  notificationsEmpty: "No notifications yet.",
  notificationsNew: "New",
  notificationsRead: "Read",
  notificationsOpen: "Open",
});
export function isUsClientDashboard(data) {
  const market = String(data?.client?.market_code || "").toUpperCase();
  if (market === "US") return true;
  if (market === "KG" || market === "KZ") return false;
  const bookings = Array.isArray(data?.bookings) ? data.bookings : [];
  return bookings.length > 0 &&
    bookings.every(item => String(item.market_code || "").toUpperCase() === "US");
}
export function clientCabinetLabels(data) {
  return isUsClientDashboard(data) ? CLIENT_CABINET_EN : CLIENT_CABINET_RU;
}
function isUsBooking(booking) {
  return String(booking?.market_code || "").toUpperCase() === "US";
}
export function formatClientBookingTime(booking) {
  const value = booking?.start_at;
  if (!value) return "—";
  if (!isUsBooking(booking)) {
    // Pre-US legacy behavior: browser-local date with ru-RU formatting.
    try {
      return new Date(value).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return "—"; }
  }
  const timezone = String(booking?.booking_timezone || "");
  if (!timezone) return "Time zone unavailable";
  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Time unavailable";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
      timeZoneName: "short",
    }).format(date);
  } catch {
    return "Time zone unavailable";
  }
}
export function formatClientBookingMoney(booking) {
  const value = booking?.price_snapshot;
  if (!isUsBooking(booking)) {
    // Keep the existing KGS/KZ legacy display untouched in this US-only gate.
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return "0 сом";
    return `${amount.toLocaleString("ru-RU")} сом`;
  }
  if (String(booking?.currency_code || "").toUpperCase() !== "USD") {
    return "Price unavailable";
  }
  if (value === null || value === undefined || value === "" ||
      !Number.isFinite(Number(value))) return "Price unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
  }).format(Number(value));
}
export function clientBookingStatusLabel(booking) {
  const status = String(booking?.status || "").toLowerCase();
  if (isUsBooking(booking)) {
    return ({
      reserved: "Reserved", confirmed: "Confirmed",
      completed: "Completed", canceled: "Canceled", cancelled: "Canceled",
    })[status] || String(booking?.status || "—");
  }
  return ({
    reserved: "Забронировано", confirmed: "Подтверждено",
    completed: "Завершено", canceled: "Отменено", cancelled: "Отменено",
  })[status] || String(booking?.status || "—");
}
export function clientBookingPaymentLabel(booking) {
  if (!isUsBooking(booking)) {
    const label = String(booking?.payment_label_ru || "").trim();
    if (label) return label;
    const provider = String(booking?.payment_provider || "").toLowerCase();
    const status = String(booking?.payment_status || "").toLowerCase();
    if (status === "failed") return "Оплата не прошла";
    if (status === "refunded") return "Оплата возвращена";
    if (provider === "direct" && status === "pending") return "Наличные ожидают подтверждения";
    if (provider === "direct" && status === "confirmed") return "Оплата наличными подтверждена";
    if (provider === "xpay" && status === "pending") return "Ожидаем оплату XPAY";
    if (provider === "xpay" && status === "confirmed") return "Оплата получена";
    return "Оплата не выбрана";
  }
  const provider = String(booking?.payment_provider || "").toLowerCase();
  const status = String(booking?.payment_status || "").toLowerCase();
  if (status === "failed") return "Payment failed";
  if (status === "refunded") return "Payment refunded";
  if (provider === "direct" && status === "pending") return "Payment pending at salon";
  if (provider === "direct" && status === "confirmed") return "Payment confirmed";
  if (status === "confirmed") return "Payment received";
  if (status === "pending") return "Payment pending";
  return "Payment not selected";
}
