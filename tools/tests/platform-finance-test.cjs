const tests = [

{ name:"PLATFORM FINANCE", url:"https://api.totemv.com/internal/reports/platform/finance" },
{ name:"PLATFORM LEDGER", url:"https://api.totemv.com/internal/reports/platform/ledger" },
{ name:"PLATFORM RECONCILIATION", url:"https://api.totemv.com/internal/reports/platform/reconciliation" }

]

async function run(){

console.log("")
console.log("TOTEM PLATFORM FINANCE TEST")
console.log("===========================")
console.log("")

for(const t of tests){

try{

const r = await fetch(t.url)
const data = await r.json()

if(!r.ok){
console.log("FAIL",t.name,r.status,JSON.stringify(data))
continue
}

let summary = ""

if(data.platform_finance){
summary =
"revenue=" + data.platform_finance.revenue_total +
" payouts=" + data.platform_finance.payouts_total +
" wallets=" + data.platform_finance.wallets_total
}
else if(Array.isArray(data.ledger)){
summary = "ledger_rows=" + data.ledger.length
}
else if(Array.isArray(data.reconciliation)){
summary = "reconciliation_rows=" + data.reconciliation.length
}
else{
summary = "ok=true"
}

console.log("OK",t.name,r.status,summary)

}catch(err){

console.log("FAIL",t.name,err.message)

}

}

console.log("")
console.log("PLATFORM FINANCE TEST COMPLETE")
console.log("")

}

run()