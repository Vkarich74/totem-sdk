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

function getPathParts(){
  return window.location.pathname.split("/").filter(Boolean)
}

function getHashParts(){
  const hash = window.location.hash || ""
  return hash.replace(/^#/, "").split("/").filter(Boolean)
}

export function getSalonSlug(){

const parts = getPathParts()

if(parts[0] === "salon" && parts[1]){
return parts[1]
}

const hashParts = getHashParts()

if(hashParts[0] === "salon" && hashParts[1]){
return hashParts[1]
}

if(window.SALON_SLUG){
return window.SALON_SLUG
}

return null

}

export function getMasterSlug(){

const parts = getPathParts()

if(parts[0] === "master" && parts[1]){
return parts[1]
}

const hashParts = getHashParts()

if(hashParts[0] === "master" && hashParts[1]){
return hashParts[1]
}

if(window.MASTER_SLUG){
return window.MASTER_SLUG
}

return null

}
