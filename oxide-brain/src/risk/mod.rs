use crate::models::ProposalIntent;

pub fn score(intent: &ProposalIntent) -> f32 {
    match intent.risk_level.as_str() {
        "low" => 0.1,
        "medium" => 0.5,
        "high" => 0.8,
        _ => 1.0,
    }
}
