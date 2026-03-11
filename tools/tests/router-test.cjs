const { chromium } = require("playwright")

const routes = [

"#/",
"#/booking",
"#/bookings",

"#/salon/dashboard",
"#/salon/calendar",
"#/salon/masters",
"#/salon/clients",
"#/salon/bookings",
"#/salon/money",
"#/salon/transactions",
"#/salon/settlements",
"#/salon/payouts",
"#/salon/settings",

"#/master/dashboard",
"#/master/bookings",
"#/master/clients",
"#/master/schedule",
"#/master/money",
"#/master/transactions",
"#/master/settlements",
"#/master/payouts",
"#/master/settings"

]

const base = "http://localhost:4173"

async function run(){

const browser = await chromium.launch()
const page = await browser.newPage()

for(const r of routes){

const url = base + "/" + r

try{

await page.goto(url,{waitUntil:"networkidle"})

const title = await page.title()

console.log("OK",r,title)

}catch(e){

console.log("FAIL",r,e.message)

}

}

await browser.close()

}

run()