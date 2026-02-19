use crate::models::{ProposalIntent, SkillSignal};

pub fn draft_intent(signal: &SkillSignal) -> ProposalIntent {
    ProposalIntent {
        proposal_type: "policy_change".to_string(),
        risk_level: "low".to_string(),
        summary: format!("Drafted intent from signal {}", signal.key),
    }
}
