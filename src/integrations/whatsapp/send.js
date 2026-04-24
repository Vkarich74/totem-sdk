export async function sendWhatsAppMessage(phone, text, leadId, caseId, token) {
  if (!token) {
    throw new Error("WHATSAPP_AUTH_TOKEN_MISSING");
  }

  const response = await fetch("https://api.totemv.com/internal/admin/messages/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
