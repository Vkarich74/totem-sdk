import { getSystemMode } from "./mode"

export function getSystemContext() {

  const mode = getSystemMode()

  return {

    mode,

    salon_slug: window.SALON_SLUG || null,

    master_slug: window.MASTER_SLUG || null

  }

}