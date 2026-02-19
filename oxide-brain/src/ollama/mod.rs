use serde::{Deserialize, Serialize};
use thiserror::Error;
use std::time::Instant;

use crate::telemetry::{build_inference_telemetry, InferenceTelemetry};

pub const MAX_TEMPERATURE: f32 = 0.3;
pub const MAX_TOKENS: u32 = 2048;
pub const MAX_RETRIES: u8 = 5;
pub const MAX_TIMEOUT_MS: u64 = 30_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaAdapterConfig {
    pub base_url: String,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: u32,
    pub retry_count: u8,
    pub timeout_ms: u64,
}

impl Default for OllamaAdapterConfig {
    fn default() -> Self {
        Self {
            base_url: "http://127.0.0.1:11434".to_string(),
            model: "llama3.1:8b".to_string(),
            temperature: 0.2,
            max_tokens: 600,
            retry_count: 2,
            timeout_ms: 10_000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaGenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
    pub options: OllamaGenerateOptions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaGenerateOptions {
    pub temperature: f32,
    pub num_predict: u32,
    pub seed: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafeModeNoOp {
    pub reason: String,
    pub autonomous_change_allowed: bool,
    pub configured_retry_count: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeterministicInferenceResult {
    pub request: OllamaGenerateRequest,
    pub response_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InferenceOutcome {
    Deterministic(DeterministicInferenceResult),
    SafeMode(SafeModeNoOp),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceExecution {
    pub outcome: InferenceOutcome,
    pub telemetry: InferenceTelemetry,
}

#[derive(Debug, Error)]
pub enum AdapterConfigError {
    #[error("base_url must target local Ollama endpoint")]
    NonLocalBaseUrl,
    #[error("model must be non-empty")]
    EmptyModel,
    #[error("temperature {0} exceeds deterministic cap {MAX_TEMPERATURE}")]
    TemperatureTooHigh(f32),
    #[error("max_tokens {0} exceeds cap {MAX_TOKENS}")]
    MaxTokensTooHigh(u32),
    #[error("retry_count {0} exceeds cap {MAX_RETRIES}")]
    RetryCountTooHigh(u8),
    #[error("timeout_ms {0} exceeds cap {MAX_TIMEOUT_MS}")]
    TimeoutTooHigh(u64),
}

#[derive(Debug, Error)]
pub enum AdapterRequestError {
    #[error("prompt must be non-empty")]
    EmptyPrompt,
}

#[derive(Debug, Error)]
pub enum AdapterRuntimeError {
    #[error("inference unavailable: {0}")]
    InferenceUnavailable(String),
    #[error("inference timeout after {0}ms")]
    Timeout(u64),
}

pub struct OllamaAdapter {
    config: OllamaAdapterConfig,
}

impl OllamaAdapter {
    pub fn new(config: OllamaAdapterConfig) -> Result<Self, AdapterConfigError> {
        validate_config(&config)?;
        Ok(Self { config })
    }

    pub fn config(&self) -> &OllamaAdapterConfig {
        &self.config
    }

    pub fn build_generate_request(
        &self,
        prompt: &str,
        seed: u64,
    ) -> Result<OllamaGenerateRequest, AdapterRequestError> {
        let trimmed_prompt = prompt.trim();
        if trimmed_prompt.is_empty() {
            return Err(AdapterRequestError::EmptyPrompt);
        }

        Ok(OllamaGenerateRequest {
            model: self.config.model.clone(),
            prompt: trimmed_prompt.to_string(),
            stream: false,
            options: OllamaGenerateOptions {
                temperature: self.config.temperature,
                num_predict: self.config.max_tokens,
                seed,
            },
        })
    }

    pub fn retry_delays_ms(&self) -> Vec<u64> {
        (1..=self.config.retry_count)
            .map(|attempt| u64::from(attempt) * 250)
            .collect()
    }

    pub fn generate_with_safe_mode<F>(
        &self,
        prompt: &str,
        seed: u64,
        execute: F,
    ) -> Result<InferenceOutcome, AdapterRequestError>
    where
        F: Fn(&OllamaGenerateRequest) -> Result<String, AdapterRuntimeError>,
    {
        let execution = self.generate_with_safe_mode_and_telemetry(prompt, seed, "oxide-corr-default", execute)?;
        Ok(execution.outcome)
    }

    pub fn generate_with_safe_mode_and_telemetry<F>(
        &self,
        prompt: &str,
        seed: u64,
        correlation_id: &str,
        execute: F,
    ) -> Result<InferenceExecution, AdapterRequestError>
    where
        F: Fn(&OllamaGenerateRequest) -> Result<String, AdapterRuntimeError>,
    {
        let request = self.build_generate_request(prompt, seed)?;
        let started = Instant::now();
        let mut attempts: u8 = 0;

        loop {
            attempts = attempts.saturating_add(1);
            match execute(&request) {
                Ok(response_text) => {
                    let retries_used = attempts.saturating_sub(1);
                    let latency_ms = started.elapsed().as_millis() as u64;
                    let telemetry =
                        build_inference_telemetry(correlation_id, retries_used, latency_ms, true);

                    return Ok(InferenceExecution {
                        outcome: InferenceOutcome::Deterministic(DeterministicInferenceResult {
                            request,
                            response_text,
                        }),
                        telemetry,
                    });
                }
                Err(error) => {
                    let max_attempts = self.config.retry_count.saturating_add(1);
                    if attempts >= max_attempts {
                        let retries_used = attempts.saturating_sub(1);
                        let latency_ms = started.elapsed().as_millis() as u64;
                        let telemetry =
                            build_inference_telemetry(correlation_id, retries_used, latency_ms, true);

                        return Ok(InferenceExecution {
                            outcome: InferenceOutcome::SafeMode(SafeModeNoOp {
                                reason: error.to_string(),
                                autonomous_change_allowed: false,
                                configured_retry_count: self.config.retry_count,
                            }),
                            telemetry,
                        });
                    }
                }
            }
        }
    }
}

pub fn validate_config(config: &OllamaAdapterConfig) -> Result<(), AdapterConfigError> {
    if !is_local_base_url(&config.base_url) {
        return Err(AdapterConfigError::NonLocalBaseUrl);
    }

    if config.model.trim().is_empty() {
        return Err(AdapterConfigError::EmptyModel);
    }

    if config.temperature > MAX_TEMPERATURE {
        return Err(AdapterConfigError::TemperatureTooHigh(config.temperature));
    }

    if config.max_tokens > MAX_TOKENS {
        return Err(AdapterConfigError::MaxTokensTooHigh(config.max_tokens));
    }

    if config.retry_count > MAX_RETRIES {
        return Err(AdapterConfigError::RetryCountTooHigh(config.retry_count));
    }

    if config.timeout_ms > MAX_TIMEOUT_MS {
        return Err(AdapterConfigError::TimeoutTooHigh(config.timeout_ms));
    }

    Ok(())
}

fn is_local_base_url(url: &str) -> bool {
    let normalized = url.trim().to_ascii_lowercase();
    normalized.starts_with("http://127.0.0.1")
        || normalized.starts_with("http://localhost")
        || normalized.starts_with("http://[::1]")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_non_local_base_url() {
        let config = OllamaAdapterConfig {
            base_url: "https://example.com".to_string(),
            ..OllamaAdapterConfig::default()
        };

        let result = validate_config(&config);
        assert!(matches!(result, Err(AdapterConfigError::NonLocalBaseUrl)));
    }

    #[test]
    fn builds_deterministic_request() {
        let adapter = OllamaAdapter::new(OllamaAdapterConfig::default()).expect("valid default config");
        let request = adapter
            .build_generate_request("Summarize the policy gate.", 42)
            .expect("prompt should be valid");

        assert!(!request.stream);
        assert_eq!(request.options.seed, 42);
        assert!(request.options.temperature <= MAX_TEMPERATURE);
    }

    #[test]
    fn returns_safe_mode_noop_when_inference_fails() {
        let adapter = OllamaAdapter::new(OllamaAdapterConfig::default()).expect("valid default config");

        let outcome = adapter
            .generate_with_safe_mode("Run proposal synthesis", 77, |_request| {
                Err(AdapterRuntimeError::InferenceUnavailable(
                    "ollama endpoint unreachable".to_string(),
                ))
            })
            .expect("request build should succeed");

        match outcome {
            InferenceOutcome::SafeMode(noop) => {
                assert!(!noop.autonomous_change_allowed);
                assert!(noop.reason.contains("inference unavailable"));
            }
            _ => panic!("expected safe mode fallback"),
        }
    }

    #[test]
    fn returns_deterministic_result_when_inference_succeeds() {
        let adapter = OllamaAdapter::new(OllamaAdapterConfig::default()).expect("valid default config");

        let outcome = adapter
            .generate_with_safe_mode("Run proposal synthesis", 91, |_request| {
                Ok("deterministic-response".to_string())
            })
            .expect("request build should succeed");

        match outcome {
            InferenceOutcome::Deterministic(result) => {
                assert_eq!(result.response_text, "deterministic-response");
                assert_eq!(result.request.options.seed, 91);
            }
            _ => panic!("expected deterministic result"),
        }
    }

    #[test]
    fn includes_required_telemetry_fields_on_safe_mode() {
        let adapter = OllamaAdapter::new(OllamaAdapterConfig {
            retry_count: 1,
            ..OllamaAdapterConfig::default()
        })
        .expect("valid default config");

        let execution = adapter
            .generate_with_safe_mode_and_telemetry("Run proposal synthesis", 11, "corr-safe-1", |_request| {
                Err(AdapterRuntimeError::InferenceUnavailable(
                    "network path unavailable".to_string(),
                ))
            })
            .expect("request build should succeed");

        assert_eq!(execution.telemetry.correlation_id, "corr-safe-1");
        assert_eq!(execution.telemetry.retry_count, 1);
        assert!(execution.telemetry.latency_ms < u64::MAX);
        assert_eq!(execution.telemetry.determinism, 1.0);
    }

    #[test]
    fn includes_required_telemetry_fields_on_success() {
        let adapter = OllamaAdapter::new(OllamaAdapterConfig::default()).expect("valid default config");

        let execution = adapter
            .generate_with_safe_mode_and_telemetry("Run proposal synthesis", 21, "corr-ok-1", |_request| {
                Ok("ok".to_string())
            })
            .expect("request build should succeed");

        assert_eq!(execution.telemetry.correlation_id, "corr-ok-1");
        assert_eq!(execution.telemetry.retry_count, 0);
        assert!(execution.telemetry.latency_ms < u64::MAX);
        assert_eq!(execution.telemetry.determinism, 1.0);
    }
}
