export async function sendWhatsAppMessage(phone, text, leadId, caseId, token) {
  if (!token) {
    throw new Error("WHATSAPP_AUTH_TOKEN_MISSING");
  }

  const result = {
    ok: true,
    provider: "stub",
    external_id: `stub_${Date.now()}`,
  };

  console.log("WHATSAPP_SEND_STUB", {
    phone,
    text,
    leadId,
    caseId,
    result,
  });

  return result;
}
