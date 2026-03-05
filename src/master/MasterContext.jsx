
import {createContext,useContext,useEffect,useState} from "react"
import {getMasterMetrics,getMasterBookings,getMasterClients} from "../api/master"

const C=createContext()

export function MasterProvider({children}){

const slug=window.MASTER_SLUG

const [metrics,setMetrics]=useState(null)
const [bookings,setBookings]=useState([])
const [clients,setClients]=useState([])
const [loading,setLoading]=useState(true)

async function load(){

const m=await getMasterMetrics(slug)
setMetrics(m.metrics||m)

const b=await getMasterBookings(slug)
setBookings(b)

const c=await getMasterClients(slug)
setClients(c.clients||[])

setLoading(false)

}

useEffect(()=>{load()},[])

return(

<C.Provider value={{
metrics,
bookings,
clients,
loading,
reload:load
}}>

{children}

</C.Provider>

)

}

export function useMaster(){
return useContext(C)
}
