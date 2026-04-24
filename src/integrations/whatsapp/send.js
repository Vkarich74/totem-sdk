export async function sendWhatsAppMessage(phone, text, leadId, caseId) {
  const response = await fetch("https://api.totemv.com/admin/messages/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: "whatsapp",
      recipient_type: "lead",
      recipient_id: phone,
      lead_id: leadId,
      moderation_case_id: caseId,
      text,
    }),
  });

  return response.json();
}
