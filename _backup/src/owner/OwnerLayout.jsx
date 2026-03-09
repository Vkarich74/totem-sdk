import { Outlet } from "react-router-dom"
import SalonSidebar from "../salon/SalonSidebar"
import CabinetHeader from "../cabinet/CabinetHeader"
import CabinetLayout from "../cabinet/CabinetLayout"

function getSalonSlug() {

  if (window.SALON_SLUG) {
    return window.SALON_SLUG
  }

  const parts = window.location.pathname.split("/")

  if (parts.length >= 3 && parts[1] === "salon") {
    return parts[2]
  }

  return null
}

export default function OwnerLayout() {

  const slug = getSalonSlug()

  function logout() {
    window.location.href = "/"
  }

  return (

    <CabinetLayout

      header={
        <CabinetHeader slug={slug} onLogout={logout} />
      }

      sidebar={
        <SalonSidebar slug={slug} />
      }

      page={
        <Outlet/>
      }

      odoo={
        <div
          style={{
            width: "30%",
            overflow: "auto",
            padding: "20px",
            minHeight: 0
          }}
          dangerouslySetInnerHTML={{
            __html:
              window.SALON_CMS_HTML ||
              "<p>Salon CMS</p>"
          }}
        />
      }

    />

  )

}