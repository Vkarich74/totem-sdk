const { chromium } = require("playwright")

const base = "http://localhost:4173/#/salon/dashboard"

async function run(){

const browser = await chromium.launch()

const page = await browser.newPage()

page.on("console",msg=>{

if(msg.type()==="error"){
console.log("ERROR:",msg.text())
}

})

page.on("pageerror",err=>{

console.log("RUNTIME:",err.message)

})

await page.goto(base,{waitUntil:"networkidle"})

await page.waitForTimeout(10000)

await browser.close()

}

run()