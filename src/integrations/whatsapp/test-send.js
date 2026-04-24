import { sendWhatsAppMessage } from './send.js';

async function main() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo4OCwicm9sZSI6ImFkbWluIiwic2Vzc2lvbl9pZCI6IjQxN2Y5MTMzLTU0MDUtNGYxOS04N2E3LTBkN2VhNjg3NjMwYiIsImlhdCI6MTc3Njk5ODU3NiwiZXhwIjoxNzc3MDAyMTc2fQ.fvIkJluDwWM53bMEsqf6jHc_3YMHkYD6voDY0DPD4II';
  const result = await sendWhatsAppMessage('+996556250974'.trim(), 'test message', 'lead_1', 'case_1', token);
  console.log(result);
}

main();
