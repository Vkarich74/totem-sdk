const tests = [

{ name:"SALON WALLET", url:"https://api.totemv.com/internal/salons/totem-demo-salon/wallet" },
{ name:"SALON LEDGER", url:"https://api.totemv.com/internal/salons/totem-demo-salon/ledger" },
{ name:"SALON PAYOUTS", url:"https://api.totemv.com/internal/salons/totem-demo-salon/payouts" },

{ name:"MASTER WALLET", url:"https://api.totemv.com/internal/masters/totem-demo-master/wallet" },
{ name:"MASTER LEDGER", url:"https://api.totemv.com/internal/masters/totem-demo-master/ledger" },
{ name:"MASTER PAYOUTS", url:"https://api.totemv.com/internal/masters/totem-demo-master/payouts" }

]

async function run(){

console.log("")
console.log("TOTEM FINANCE TEST")
console.log("==================")
console.log("")

for(const t of tests){

try{

const r = await fetch(t.url)
const data = await r.json()

console.log("OK",t.name,r.status)

}catch(err){

console.log("FAIL",t.name,err.message)

}

}

console.log("")
console.log("FINANCE TEST COMPLETE")
console.log("")

}

run()