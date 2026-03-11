const { chromium } = require("playwright")
const fs = require("fs")

const reportPath = "C:/Work/totem-sdk/tools/tests/reports/sdk-test-report.txt"

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

let report = []
report.push("TOTEM SDK DEEP TEST")
report.push("===================")
report.push("")

async function run(){

    const browser = await chromium.launch()
    const page = await browser.newPage()

    page.on("console",msg=>{
        if(msg.type()==="error"){
            report.push("CONSOLE ERROR: "+msg.text())
        }
    })

    page.on("pageerror",err=>{
        report.push("RUNTIME ERROR: "+err.message)
    })

    for(const r of routes){

        const url = base + "/" + r

        try{

            await page.goto(url,{waitUntil:"networkidle"})
            await page.waitForTimeout(1000)

            const body = await page.locator("body").count()

            if(body>0){
                report.push("OK "+r)
            }else{
                report.push("FAIL "+r+" body missing")
            }

        }catch(e){

            report.push("FAIL "+r+" "+e.message)

        }

    }

    await browser.close()

    fs.writeFileSync(reportPath,report.join("\n"))

    console.log("")
    console.log("TEST COMPLETE")
    console.log("REPORT SAVED:")
    console.log(reportPath)
    console.log("")
}

run()