import { useState } from "react"

export default function SalonContractsPage() {

  const [model, setModel] = useState("percentage")

  return (

    <div style={{padding:"20px"}}>

      <h2 style={{marginBottom:"20px"}}>Контракты</h2>

      {/* Model Selector */}
      <div style={{
        border:"1px solid #eee",
        padding:"15px",
        borderRadius:"8px",
        marginBottom:"20px",
        background:"#fff"
      }}>

        <div style={{marginBottom:"10px",fontWeight:"600"}}>
          Модель контракта
        </div>

        <select
          value={model}
          onChange={(e)=>setModel(e.target.value)}
          style={{padding:"8px",width:"250px"}}
        >
          <option value="percentage">Процент</option>
          <option value="fixed">Фикс аренда</option>
          <option value="salary">Зарплата</option>
          <option value="hybrid">Гибрид</option>
        </select>

      </div>

      {/* Placeholder block */}
      <div style={{
        border:"1px dashed #ddd",
        padding:"20px",
        borderRadius:"8px",
        color:"#777"
      }}>
        Здесь будет:
        <br/>- создание контракта
        <br/>- активные контракты
        <br/>- pending
        <br/>- история
      </div>

    </div>

  )

}