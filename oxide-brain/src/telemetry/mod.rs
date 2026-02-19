use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InferenceTelemetry {
    pub determinism: f32,
    pub retry_count: u8,
    pub latency_ms: u64,
    pub correlation_id: String,
}

pub fn build_inference_telemetry(
    correlation_id: impl Into<String>,
    retry_count: u8,
    latency_ms: u64,
    deterministic_controls_active: bool,
) -> InferenceTelemetry {
    InferenceTelemetry {
        determinism: if deterministic_controls_active { 1.0 } else { 0.0 },
        retry_count,
        latency_ms,
        correlation_id: correlation_id.into(),
    }
}

pub fn emit(payload: &InferenceTelemetry) -> String {
    serde_json::to_string(payload).unwrap_or_else(|_| "{}".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_camel_case_payload() {
        let payload = build_inference_telemetry("corr-1", 2, 150, true);
        let serialized = emit(&payload);

        assert!(serialized.contains("\"determinism\":1.0"));
        assert!(serialized.contains("\"retryCount\":2"));
        assert!(serialized.contains("\"latencyMs\":150"));
        assert!(serialized.contains("\"correlationId\":\"corr-1\""));
    }
}
