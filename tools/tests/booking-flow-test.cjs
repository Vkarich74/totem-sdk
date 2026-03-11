const endpoints = [

{
name:"SALON INFO",
url:"https://api.totemv.com/internal/salons/totem-demo-salon"
},

{
name:"SALON MASTERS",
url:"https://api.totemv.com/internal/salons/totem-demo-salon/masters"
},

{
name:"SALON BOOKINGS",
url:"https://api.totemv.com/internal/salons/totem-demo-salon/bookings"
},

{
name:"MASTER INFO",
url:"https://api.totemv.com/internal/masters/totem-demo-master"
},

{
name:"MASTER METRICS",
url:"https://api.totemv.com/internal/masters/totem-demo-master/metrics"
}

]

async function run(){

console.log("")
console.log("TOTEM BOOKING FLOW TEST")
console.log("=======================")
console.log("")

for(const e of endpoints){

try{

const r = await fetch(e.url)
const data = await r.json()

console.log("OK",e.name,r.status)

}catch(err){

console.log("FAIL",e.name,err.message)

}

}

console.log("")
console.log("FLOW TEST COMPLETE")
console.log("")

}

run()