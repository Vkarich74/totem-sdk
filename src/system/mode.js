export function getSystemMode() {

  if (window.MASTER_SLUG) {
    return "master"
  }

  if (window.SALON_SLUG) {
    return "salon"
  }

  return "public"
}