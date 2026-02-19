pub mod models;
pub mod ollama;
pub mod patch_synthesis;
pub mod policy;
pub mod reasoning;
pub mod risk;
pub mod telemetry;
pub mod validation;

pub fn health() -> &'static str {
    "oxide-brain:ok"
}
