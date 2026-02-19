use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillSignal {
    pub key: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposalIntent {
    pub proposal_type: String,
    pub risk_level: String,
    pub summary: String,
}
