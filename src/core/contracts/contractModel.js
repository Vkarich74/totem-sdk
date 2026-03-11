export const CONTRACT_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  ACTIVE: "active",
  ARCHIVED: "archived"
};

export const CONTRACT_MODEL = {
  PERCENTAGE: "percentage",
  RENT: "rent",
  SALARY: "salary",
  HYBRID: "hybrid"
};

export function createEmptyContract() {
  return {
    contract_id: null,
    salon_id: null,
    master_id: null,

    model_type: CONTRACT_MODEL.PERCENTAGE,

    percentage: null,
    fixed_amount: null,
    salary_amount: null,

    start_date: null,
    end_date: null,

    status: CONTRACT_STATUS.DRAFT,

    created_at: null,
    updated_at: null,

    previous_contract_id: null,
    accepted_by_master: false,
    accepted_at: null,
    change_reason: ""
  };
}