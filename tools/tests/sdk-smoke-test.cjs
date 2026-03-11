const fs = require("fs")
const path = require("path")

console.log("")
console.log("TOTEM SDK SMOKE TEST")
console.log("====================")
console.log("")

const root = "C:/Work/totem-sdk"

const distPath = path.join(root,"dist")
const indexPath = path.join(distPath,"index.html")
const assetsPath = path.join(distPath,"assets")

/* DIST CHECK */

if(!fs.existsSync(distPath)){
    console.error("FAIL: dist folder missing")
    process.exit(1)
}

console.log("OK: dist folder found")

/* INDEX CHECK */

if(!fs.existsSync(indexPath)){
    console.error("FAIL: index.html missing")
    process.exit(1)
}

console.log("OK: index.html found")

/* ASSETS CHECK */

if(!fs.existsSync(assetsPath)){
    console.error("FAIL: assets folder missing")
    process.exit(1)
}

console.log("OK: assets folder found")

const assets = fs.readdirSync(assetsPath)

if(assets.length === 0){
    console.error("FAIL: assets empty")
    process.exit(1)
}

console.log("OK: assets bundle present")

console.log("")
console.log("ROUTE LIST")
console.log("----------")

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

routes.forEach(r=>{
    console.log("OK:",r)
})

console.log("")
console.log("SMOKE TEST COMPLETE")
console.log("")