/* TOTEM DEV BOOTSTRAP */

function applyDevContext() {
    const host = window.location.hostname

    const isLocal =
        host === "localhost" ||
        host === "127.0.0.1"

    if (!isLocal) {
        return
    }

    if (!window.API_BASE) {
        window.API_BASE = "https://api.totemv.com"
    }

    console.log("TOTEM DEV CONTEXT ACTIVE")
    console.log("SALON_SLUG:", window.SALON_SLUG)
    console.log("MASTER_SLUG:", window.MASTER_SLUG)
    console.log("API_BASE:", window.API_BASE)
}

applyDevContext()