export default function MasterHomePage() {
  const slug = window.MASTER_SLUG;

  return (
    <div style={{padding:40,fontFamily:"Arial"}}>
      <h1>Страница мастера</h1>
      <p>Публичная страница мастера работает.</p>
      <p>MASTER SLUG: <b>{slug}</b></p>

      <a href={`#/master/dashboard`}>
        Перейти в кабинет мастера
      </a>
    </div>
  );
}