const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(file){
return fs.readFileSync(path.join(root,file),"utf8");
}

function write(file,data){
fs.writeFileSync(path.join(root,file),data);
}

function patchDashboard(){

const file = "src/owner/OwnerDashboard.jsx";
let code = read(file);

if(code.includes("api.getMetrics")){
console.log("SKIP dashboard already patched");
return;
}

code = code.replace(
/const r = await fetch[\s\S]*?setMetrics\(j.metrics \|\| \{\}\);/,
`const res = await api.getMetrics(salonSlug);

if(!res.ok){
setError("METRICS_FETCH_FAILED");
return;
}

setMetrics(res.metrics || {});`
);

write(file,code);
console.log("PATCH dashboard");
}

function patchBookings(){

const file = "src/owner/OwnerBookingsPage.jsx";
let code = read(file);

if(code.includes("api.getBookings")){
console.log("SKIP bookings already patched");
return;
}

code = code.replace(
/const r = await fetch\(\s*`https:\/\/api\.totemv\.com\/internal\/salons\/\$\{salonSlug\}\/bookings`[\s\S]*?setBookings\(sorted\);/,
`const res = await api.getBookings(salonSlug);

if(res.ok){

const sorted = (res.bookings || []).sort((a,b)=>{
if(!a.start_at) return 1;
if(!b.start_at) return -1;
return new Date(a.start_at) - new Date(b.start_at);
});

setBookings(sorted);

}`
);

code = code.replace(
/const rm = await fetch\([\s\S]*?setMasters\(jm.masters \|\| \[\]\);/,
`const resMasters = await api.getMasters(salonSlug);

if(resMasters.ok){
setMasters(resMasters.masters || []);
}`
);

code = code.replace(
/const r = await fetch\([\s\S]*?await load\(\);/,
`const res = await api.bookingAction(id,type);

if(!res.ok){
console.error("BOOKING ACTION FAILED");
alert("Ошибка изменения статуса");
setLoadingAction(null);
return;
}

await load();`
);

write(file,code);
console.log("PATCH bookings");
}

console.log("PHASE 5 PATCH START");

patchDashboard();
patchBookings();

console.log("PHASE 5 PATCH DONE");