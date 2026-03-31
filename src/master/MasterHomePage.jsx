import { useMaster } from "./MasterContext"

export default function MasterHomePage() {

  const { slug } = useMaster()

  return (
    <div style={{padding:40,fontFamily:"Arial"}}>
      <h1>Страница мастера</h1>
      <p>Публичная страница мастера работает.</p>
      <p>MASTER SLUG: <b>{slug}</b></p>

      <a href={`#/master/${slug}/dashboard`}>
        Перейти в кабинет мастера
      </a>
    </div>
  );
}