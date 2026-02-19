use crate::models::ProposalIntent;

pub fn synthesize(intent: &ProposalIntent) -> String {
    format!("synthesis:{}", intent.summary)
}
