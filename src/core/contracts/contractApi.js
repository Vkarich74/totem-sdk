import { apiGet, apiPost } from "../api";

export async function fetchActiveContract(masterId) {
  return apiGet(`/internal/contracts/master/${masterId}/active`);
}

export async function fetchContractHistory(masterId) {
  return apiGet(`/internal/contracts/master/${masterId}/history`);
}

export async function createContract(payload) {
  return apiPost("/contracts", payload);
}

export async function acceptContract(contractId, payload = {}) {
  return apiPost(`/contracts/${contractId}/accept`, payload);
}

export async function activateContract(contractId) {
  return apiPost(`/contracts/${contractId}/activate`);
}

export async function archiveContract(contractId) {
  return apiPost(`/contracts/${contractId}/archive`);
}