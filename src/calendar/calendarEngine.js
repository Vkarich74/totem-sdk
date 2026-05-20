// Phase 5 scaffold: calendar engine (no UI here)
export function generateTimeSlots(){
  // 07:00 -> 23:00 with 30 min step
  const slots = [];
  let h = 7, m = 0;
  while(true){
    const label = String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
    slots.push(label);
    if(h===23 && m===0) break;
    m += 30;
    if(m>=60){ m=0; h+=1; }
  }
  return slots;
}
