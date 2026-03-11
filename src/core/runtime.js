export function getMasterSlug(){

if(window.MASTER_SLUG){
return window.MASTER_SLUG
}

const parts = window.location.pathname.split("/")

if(parts.length>=3 && parts[1]==="master"){
return parts[2]
}

return null

}

export function getSalonSlug(){

if(window.SALON_SLUG){
return window.SALON_SLUG
}

const parts = window.location.pathname.split("/")

if(parts.length>=3 && parts[1]==="salon"){
return parts[2]
}

return null

}

export function getHashParts(){

const hash = window.location.hash || ""

if(!hash){
return []
}

return hash.replace("#","").split("/").filter(Boolean)

}

export function getCurrentSection(){

const parts = getHashParts()

if(parts.length<2){
return "dashboard"
}

return parts[1]

}

export function navigate(path){

window.location.hash = path

}

export function reload(){

window.location.reload()

}