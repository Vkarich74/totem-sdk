const endpoints = [

"https://api.totemv.com/health",
"https://api.totemv.com/internal/salons/totem-demo-salon",
"https://api.totemv.com/internal/salons/totem-demo-salon/bookings",
"https://api.totemv.com/internal/salons/totem-demo-salon/masters",
"https://api.totemv.com/internal/masters/totem-demo-master"

]

async function run(){

for(const e of endpoints){

try{

const r = await fetch(e)

console.log("OK",e,r.status)

}catch(err){

console.log("FAIL",e,err.message)

}

}

}

run()