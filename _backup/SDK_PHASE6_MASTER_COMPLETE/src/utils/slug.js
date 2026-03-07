/*
====================================
TOTEM SLUG RESOLVER (CONTRACT)
====================================

Источник slug:

SALON
/salon/:slug

MASTER
/master/:slug

Этот файл — единственный источник slug в SDK.
Изменять логику получения slug запрещено.
*/

export function getSalonSlug(){

const parts = window.location.pathname.split("/")

if(parts[1] === "salon"){
return parts[2]
}

if(window.SALON_SLUG){
return window.SALON_SLUG
}

return null

}

export function getMasterSlug(){

const parts = window.location.pathname.split("/")

if(parts[1] === "master"){
return parts[2]
}

if(window.MASTER_SLUG){
return window.MASTER_SLUG
}

return null

}