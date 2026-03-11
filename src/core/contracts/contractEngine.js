import { CONTRACT_STATUS } from "./contractModel";

export function isContractDraft(contract) {
  return contract?.status === CONTRACT_STATUS.DRAFT;
}

export function isContractPending(contract) {
  return contract?.status === CONTRACT_STATUS.PENDING;
}

export function isContractActive(contract) {
  return contract?.status === CONTRACT_STATUS.ACTIVE;
}

export function isContractArchived(contract) {
  return contract?.status === CONTRACT_STATUS.ARCHIVED;
}

export function validateContract(contract) {
  if (!contract) {
    throw new Error("Contract is required");
  }

  if (!contract.salon_id) {
    throw new Error("Contract requires salon_id");
  }

  if (!contract.master_id) {
    throw new Error("Contract requires master_id");
  }

  if (!contract.model_type) {
    throw new Error("Contract requires model_type");
  }

  if (!contract.start_date) {
    throw new Error("Contract requires start_date");
  }

  return true;
}

export function markContractPending(contract) {
  validateContract(contract);

  return {
    ...contract,
    status: CONTRACT_STATUS.PENDING
  };
}

export function activateContract(contract) {
  validateContract(contract);

  return {
    ...contract,
    status: CONTRACT_STATUS.ACTIVE
  };
}

export function archiveContract(contract) {
  validateContract(contract);

  return {
    ...contract,
    status: CONTRACT_STATUS.ARCHIVED
  };
}

export function canActivateContract(contract, nowDate = null) {
  if (!contract) return false;
  if (contract.status !== CONTRACT_STATUS.PENDING) return false;
  if (!contract.start_date) return false;

  if (!nowDate) return true;

  const start = new Date(contract.start_date);
  const now = new Date(nowDate);

  return start.getTime() <= now.getTime();
}

export function canHaveOnlyOneActiveContract(contracts, salonId, masterId) {
  if (!Array.isArray(contracts)) {
    return true;
  }

  const activeCount = contracts.filter((item) => {
    return (
      item &&
      item.salon_id === salonId &&
      item.master_id === masterId &&
      item.status === CONTRACT_STATUS.ACTIVE
    );
  }).length;

  return activeCount <= 1;
}

export function getActiveContract(contracts, salonId, masterId) {
  if (!Array.isArray(contracts)) {
    return null;
  }

  return (
    contracts.find((item) => {
      return (
        item &&
        item.salon_id === salonId &&
        item.master_id === masterId &&
        item.status === CONTRACT_STATUS.ACTIVE
      );
    }) || null
  );
}

export function getContractHistory(contracts, salonId, masterId) {
  if (!Array.isArray(contracts)) {
    return [];
  }

  return contracts.filter((item) => {
    return (
      item &&
      item.salon_id === salonId &&
      item.master_id === masterId
    );
  });
}