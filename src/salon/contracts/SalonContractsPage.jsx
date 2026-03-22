import { useEffect, useState } from "react"

export default function SalonContractsPage({ slug }) {

  const API_BASE = window.API_BASE

  const [contracts, setContracts] = useState([])
  const [masters, setMasters] = useState([])

  const [selectedMasterId, setSelectedMasterId] = useState("")
  const [masterPercent, setMasterPercent] = useState("")
  const [salonPercent, setSalonPercent] = useState("")
  const [platformPercent, setPlatformPercent] = useState("")
  const [payoutSchedule, setPayoutSchedule] = useState("manual")
  const [effectiveFrom, setEffectiveFrom] = useState("")

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [cRes, mRes] = await Promise.all([
        fetch(`${API_BASE}/internal/salons/${slug}/contracts`),
        fetch(`${API_BASE}/internal/salons/${slug}/masters`)
      ])

      const cData = await cRes.json()
      const mData = await mRes.json()

      setContracts(cData.contracts || [])
      setMasters(mData.masters || [])

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

    if (mp + sp + pp !== 100) {
      setError("Сумма процентов: 100")
      return
    }

    try {
      setLoading(true)

      const res = await fetch(`${API_BASE}/internal/salons/${slug}/contracts`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
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

      await loadData()

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

  const active = contracts.filter(c => c.status === "active")
  const pending = contracts.filter(c => c.status === "pending")

  function masterName(id) {
    const m = masters.find(x => x.id === id)
    return m ? m.name : id
  }

  return (
    <div style={{ padding: 24 }}>

      <h2 style={{ marginBottom: 20 }}>Контракты</h2>

      {/* СВОДКА */}
      <div style={{ display:"flex", gap:20, marginBottom:20 }}>

        <div style={card}>
          <div>Активные</div>
          <b>{active.length}</b>
          <small>Используются в расчётах</small>
        </div>

        <div style={card}>
          <div>Ожидающие</div>
          <b>{pending.length}</b>
          <small>Ожидают активации</small>
        </div>

        <div style={card}>
          <div>Всего</div>
          <b>{contracts.length}</b>
          <small>История контрактов</small>
        </div>

      </div>

      {/* СОЗДАНИЕ */}
      <div style={block}>
        <h3>Создать контракт</h3>

        <form onSubmit={createContract}>

          <div>
            <select value={selectedMasterId} onChange={e=>setSelectedMasterId(e.target.value)}>
              <option value="">Выбери мастера</option>
              {masters.map(m=>(
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div style={{marginTop:10}}>
            <input placeholder="Master %" value={masterPercent} onChange={e=>setMasterPercent(e.target.value)} />
            <input placeholder="Salon %" value={salonPercent} onChange={e=>setSalonPercent(e.target.value)} />
            <input placeholder="Platform %" value={platformPercent} onChange={e=>setPlatformPercent(e.target.value)} />
          </div>

          <div style={{marginTop:10}}>
            <select value={payoutSchedule} onChange={e=>setPayoutSchedule(e.target.value)}>
              <option value="manual">Вручную</option>
              <option value="daily">Daily</option>
            </select>
          </div>

          <div style={{marginTop:10}}>
            <input
              type="datetime-local"
              value={effectiveFrom}
              onChange={e=>setEffectiveFrom(e.target.value)}
            />
          </div>

          <button disabled={loading} style={{marginTop:10}}>Создать</button>

          <div style={{marginTop:10}}>
            Сумма процентов: {Number(masterPercent||0)+Number(salonPercent||0)+Number(platformPercent||0)}
          </div>

          {error && <div style={{color:"red"}}>{error}</div>}

        </form>
      </div>

      {/* АКТИВНЫЕ */}
      <div style={block}>
        <h3>Активные контракты</h3>

        {active.map(c=>(
          <div key={c.id} style={row}>
            {c.id} — {masterName(c.master_id)} — {c.terms_json?.master_percent}% — Активный
          </div>
        ))}
      </div>

      {/* ОЖИДАЮЩИЕ */}
      <div style={block}>
        <h3>Ожидающие контракты</h3>

        {pending.map(c=>(
          <div key={c.id} style={row}>
            {c.id} — {masterName(c.master_id)} — {c.terms_json?.master_percent}% — Ожидает
          </div>
        ))}
      </div>

    </div>
  )
}

const card = {
  border:"1px solid #eee",
  padding:15,
  borderRadius:8,
  width:180
}

const block = {
  border:"1px solid #eee",
  padding:15,
  borderRadius:8,
  marginBottom:20
}

const row = {
  borderBottom:"1px solid #eee",
  padding:"8px 0"
}