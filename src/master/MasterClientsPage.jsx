import { useMaster } from "./MasterContext"

export default function MasterClientsPage() {

const { clients, loading } = useMaster()

if (loading) {
  return <div>Загрузка...</div>
}

if (!clients || clients.length === 0) {
  return (
    <div>
      <h3>Клиенты</h3>
      <div>Клиенты пока отсутствуют</div>
    </div>
  )
}

return (

<div>

<h3>Клиенты</h3>

{clients.map(c => (

<div key={c.id} style={{
border:"1px solid #ddd",
padding:"12px",
borderRadius:"10px",
marginBottom:"10px",
background:"#fff"
}}>

<div style={{fontWeight:700}}>
{c.name || "Без имени"}
</div>

<div>
Телефон: {c.phone || "—"}
</div>

<div>
Визитов: {c.visits ?? 0}
</div>

</div>

))}

</div>

)

}