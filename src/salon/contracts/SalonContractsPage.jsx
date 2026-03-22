import { useEffect, useState } from "react"

export default function SalonContractsPage() {

  const salonSlug = "totem-demo-salon"

  const [contracts, setContracts] = useState([])
  const [masters, setMasters] = useState([])

  const [selectedMasterId, setSelectedMasterId] = useState("")
  const [masterPercent, setMasterPercent] = useState("")
  const [salonPercent, setSalonPercent] = useState("")
  const [platformPercent, setPlatformPercent] = useState("")
  const [payoutSchedule, setPayoutSchedule] = useState("manual")
  const [effectiveFrom, setEffectiveFrom] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadContracts()
    loadMasters()
  }, [])

  async function loadContracts() {
    try {
      const res = await fetch(`/internal/salons/${salonSlug}/contracts`)
      const data = await res.json()
      setContracts(data.contracts || [])
    } catch {
      setError("Ошибка загрузки")
    }
  }

  async function loadMasters() {
    try {
      const res = await fetch(`/internal/salons/${salonSlug}/masters`)
      const data = await res.json()
      setMasters(data.masters || [])
    } catch {
      setError("Ошибка загрузки")
    }
  }

  async function createContract(e) {
    e.preventDefault()
    setError("")

    const mp = Number(masterPercent)
    const sp = Number(salonPercent)
    const pp = Number(platformPercent)

    if (!selectedMasterId) {
      setError("Выбери мастера")
      return
    }

    if (mp + sp + pp !== 100) {
      setError("Сумма процентов: 100")
      return
    }

    try {
      setLoading(true)

      const res = await fetch(`/internal/salons/${salonSlug}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          master_id: selectedMasterId,
          effective_from: effectiveFrom || null,
          terms_json: {
            master_percent: mp,
            salon_percent: sp,
            platform_percent: pp,
            payout_schedule: payoutSchedule
          }
        })
      })

      const data = await res.json()

      if (!data.ok) {
        setError("Ошибка создания")
        return
      }

      await loadContracts()

      setSelectedMasterId("")
      setMasterPercent("")
      setSalonPercent("")
      setPlatformPercent("")
      setEffectiveFrom("")

    } catch {
      setError("Ошибка сети")
    } finally {
      setLoading(false)
    }
  }

  const activeContracts = contracts.filter(c => c.status === "active")
  const pendingContracts = contracts.filter(c => c.status === "pending")

  function getMasterName(id) {
    const m = masters.find(x => x.id === id)
    return m ? m.name : id
  }

  return (
    <div style={{ padding: 20 }}>

      <h2>Контракты</h2>

      {/* СВОДКА */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        <div>Активные: {activeContracts.length}</div>
        <div>Ожидающие: {pendingContracts.length}</div>
        <div>Всего: {contracts.length}</div>
      </div>

      {/* СОЗДАНИЕ */}
      <form onSubmit={createContract}>

        <div>
          <select value={selectedMasterId} onChange={e => setSelectedMasterId(e.target.value)}>
            <option value="">Выбери мастера</option>
            {masters.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <input placeholder="Master %" value={masterPercent} onChange={e => setMasterPercent(e.target.value)} />
        <input placeholder="Salon %" value={salonPercent} onChange={e => setSalonPercent(e.target.value)} />
        <input placeholder="Platform %" value={platformPercent} onChange={e => setPlatformPercent(e.target.value)} />

        <div>
          <select value={payoutSchedule} onChange={e => setPayoutSchedule(e.target.value)}>
            <option value="manual">Вручную</option>
            <option value="daily">Daily</option>
          </select>
        </div>

        <input type="datetime-local" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />

        <div>
          Сумма процентов: {Number(masterPercent||0)+Number(salonPercent||0)+Number(platformPercent||0)}
        </div>

        <button disabled={loading}>Создать</button>

        {error && <div style={{ color: "red" }}>{error}</div>}

      </form>

      {/* АКТИВНЫЕ */}
      <h3>Активные</h3>
      {activeContracts.map(c => (
        <div key={c.id}>
          {c.id} — {getMasterName(c.master_id)} — {c.terms_json?.master_percent}% — Активный
        </div>
      ))}

      {/* ОЖИДАЮЩИЕ */}
      <h3>Ожидают</h3>
      {pendingContracts.map(c => (
        <div key={c.id}>
          {c.id} — {getMasterName(c.master_id)} — {c.terms_json?.master_percent}% — Ожидает
        </div>
      ))}

    </div>
  )
}