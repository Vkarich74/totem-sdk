import { sendWhatsAppMessage } from "./send.js";

async function main() {
  const result = await sendWhatsAppMessage(
    "+996556250974",
    "test message",
    "lead_1",
    "case_1",
  );

  console.log(result);
}

main();
