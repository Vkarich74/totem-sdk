import { useEffect, useState } from "react"

import PageSection from "../../cabinet/PageSection"
import TableSection from "../../cabinet/TableSection"
import EmptyState from "../../cabinet/EmptyState"

const API_BASE = import.meta.env.VITE_API_BASE

function getMasterSlug() {

  if (window.MASTER_SLUG) {
    return window.MASTER_SLUG
  }

  const parts = window.location.pathname.split("/")

  if (parts.length >= 3 && parts[1] === "salon") {
    return parts[2]
  }

  if (parts.length >= 3 && parts[1] === "master") {
    return parts[2]
  }

  return null
}

function money(value){
  const n = Number(value) || 0
  return new Intl.NumberFormat("ru-RU").format(n) + " сом"
}

function formatDate(iso){
  const d = new Date(iso)
  return d.toLocaleDateString("ru-RU") + " " +
  d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})
}

export default function MasterTransactionsPage(){

  const [transactions,setTransactions] = useState([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{

    async function loadTransactions(){

      try{

        const slug = getMasterSlug()

        if(!slug){
          console.error("MASTER_SLUG_NOT_FOUND")
          setLoading(false)
          return
        }

        const res = await fetch(
          `${API_BASE}/internal/masters/${slug}/ledger`
        )

        if(!res.ok){
          throw new Error("LEDGER_FETCH_FAILED")
        }

        const data = await res.json()

        setTransactions(data.ledger || [])

      }catch(e){

        console.error("Transactions load error",e)

      }finally{

        setLoading(false)

      }

    }

    loadTransactions()

  },[])

  return(

    <PageSection title="Транзакции">

      {loading && <div>Загрузка...</div>}

      {!loading && transactions.length === 0 && (
        <EmptyState text="Транзакций пока нет" />
      )}

      {!loading && transactions.length > 0 && (

        <TableSection>

          <table style={{width:"100%",borderCollapse:"collapse"}}>

            <thead>
              <tr>
                <th align="left">Дата</th>
                <th align="left">Тип</th>
                <th align="left">Сумма</th>
                <th align="left">Направление</th>
              </tr>
            </thead>

            <tbody>

              {transactions.map(t => (

                <tr key={t.id}>

                  <td>{formatDate(t.created_at)}</td>

                  <td>{t.reference_type}</td>

                  <td>{money(t.amount)}</td>

                  <td>{t.direction}</td>

                </tr>

              ))}

            </tbody>

          </table>

        </TableSection>

      )}

    </PageSection>

  )

}
