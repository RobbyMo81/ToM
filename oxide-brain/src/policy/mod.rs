use crate::models::ProposalIntent;

pub fn policy_allows(intent: &ProposalIntent) -> bool {
    intent.risk_level != "critical"
}
