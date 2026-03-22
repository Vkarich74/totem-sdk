import { useEffect, useState } from "react"

export default function SalonContractsPage({ slug }) {

  const [contracts, setContracts] = useState([])
  const [masters, setMasters] = useState([])

  const [selectedMasterId, setSelectedMasterId] = useState("")
  const [masterPercent, setMasterPercent] = useState("")
  const [salonPercent, setSalonPercent] = useState("")
  const [platformPercent, setPlatformPercent] = useState("")
  const [payoutSchedule, setPayoutSchedule] = useState("daily")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const API_BASE = window.API_BASE

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {

      const [contractsRes, mastersRes] = await Promise.all([
        fetch(`${API_BASE}/internal/salons/${slug}/contracts`),
        fetch(`${API_BASE}/internal/salons/${slug}/masters`)
      ])

      const contractsData = await contractsRes.json()
      const mastersData = await mastersRes.json()

      setContracts(contractsData.contracts || [])
      setMasters(mastersData.masters || [])

    } catch (e) {
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

    if (isNaN(mp) || isNaN(sp) || isNaN(pp)) {
      setError("Проценты должны быть числами")
      return
    }

    if (mp + sp + pp !== 100) {
      setError("Сумма должна быть 100%")
      return
    }

    try {

      setLoading(true)

      const res = await fetch(`${API_BASE}/internal/salons/${slug}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          master_id: selectedMasterId,
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

      await loadData()

      setSelectedMasterId("")
      setMasterPercent("")
      setSalonPercent("")
      setPlatformPercent("")

    } catch (e) {
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

    <div style={{ padding: "20px" }}>

      <h2 style={{ marginBottom: "20px" }}>Контракты</h2>

      {/* CREATE */}
      <div style={{ border: "1px solid #eee", padding: "15px", marginBottom: "20px", borderRadius: "8px" }}>
        <h3>Создать контракт</h3>

        <form onSubmit={createContract}>

          <div style={{ marginBottom: "10px" }}>
            <select
              value={selectedMasterId}
              onChange={e => setSelectedMasterId(e.target.value)}
            >
              <option value="">Выбери мастера</option>
              {masters.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <input placeholder="Master %" value={masterPercent} onChange={e => setMasterPercent(e.target.value)} />
            <input placeholder="Salon %" value={salonPercent} onChange={e => setSalonPercent(e.target.value)} />
            <input placeholder="Platform %" value={platformPercent} onChange={e => setPlatformPercent(e.target.value)} />
          </div>

          <div style={{ marginTop: "10px" }}>
            <select value={payoutSchedule} onChange={e => setPayoutSchedule(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <button disabled={loading} style={{ marginTop: "10px" }}>
            Создать
          </button>

          {error && <div style={{ color: "red", marginTop: "10px" }}>{error}</div>}

        </form>
      </div>

      {/* ACTIVE */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Активные</h3>

        {activeContracts.map(c => (
          <div key={c.id} style={{ border: "1px solid #eee", padding: "10px", marginBottom: "10px" }}>
            {getMasterName(c.master_id)} — {c.terms_json?.master_percent}%
          </div>
        ))}

      </div>

      {/* PENDING */}
      <div>
        <h3>Ожидают</h3>

        {pendingContracts.map(c => (
          <div key={c.id} style={{ border: "1px solid #eee", padding: "10px", marginBottom: "10px" }}>
            {getMasterName(c.master_id)} — pending
          </div>
        ))}

      </div>

    </div>

  )
}