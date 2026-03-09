import { useMaster } from "./MasterContext"
import PageSection from "../cabinet/PageSection"
import TableSection from "../cabinet/TableSection"
import EmptyState from "../cabinet/EmptyState"

export default function MasterClientsPage() {

const { clients, loading } = useMaster()

if (loading) {
  return (
    <div style={{padding:"20px"}}>
      Загрузка...
    </div>
  )
}

if (!clients || clients.length === 0) {
  return (
    <div style={{padding:"20px"}}>
      <PageSection title="Клиенты">
        <EmptyState
          title="Клиенты пока отсутствуют"
          message="После первых записей клиенты появятся здесь"
        />
      </PageSection>
    </div>
  )
}

return (

<div style={{padding:"20px"}}>

<PageSection title="Клиенты">

<TableSection>

<table>

<thead>
<tr>
<th>Имя</th>
<th>Телефон</th>
<th>Визитов</th>
</tr>
</thead>

<tbody>

{clients.map(c => (

<tr key={c.id}>

<td>
{c.name || "Без имени"}
</td>

<td>
{c.phone || "—"}
</td>

<td>
{c.visits ?? 0}
</td>

</tr>

))}

</tbody>

</table>

</TableSection>

</PageSection>

</div>

)

}