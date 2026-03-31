import { useMaster } from "./MasterContext"
import PageSection from "../cabinet/PageSection"
import TableSection from "../cabinet/TableSection"
import EmptyState from "../cabinet/EmptyState"

export default function MasterClientsPage() {

  const {
    clients,
    loading,
    error,
    slug
  } = useMaster()

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <PageSection title="Клиенты">
          <div style={{
            border: "1px solid #f5c2c7",
            background: "#fff5f5",
            color: "#b42318",
            borderRadius: "10px",
            padding: "12px"
          }}>
            Ошибка загрузки клиентов
          </div>

          {slug ? (
            <div style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}>
              slug: {slug}
            </div>
          ) : null}
        </PageSection>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        Загрузка...
      </div>
    )
  }

  if (!clients || clients.length === 0) {
    return (
      <div style={{ padding: "20px" }}>
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

    <div style={{ padding: "20px" }}>

      <PageSection title="Клиенты">

        <TableSection>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>

            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px" }}>Имя</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Телефон</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Визитов</th>
              </tr>
            </thead>

            <tbody>

              {clients.map(c => (

                <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>

                  <td style={{ padding: "8px" }}>
                    {c.name || "Без имени"}
                  </td>

                  <td style={{ padding: "8px" }}>
                    {c.phone || "—"}
                  </td>

                  <td style={{ padding: "8px" }}>
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