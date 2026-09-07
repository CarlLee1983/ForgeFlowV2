# Verification Result: FF-224

Recorded after a complete root `make verify` on this working tree. The Story
declares `Risk level: medium` and `Architecture impact: medium`, so the required
profile is `lint static unit integration architecture`.

## Checks

* lint: pass — `make verify-typescript`
* static: pass — `make verify-protocol`
* unit: pass — `./tests/execution-governance.sh`
* integration: pass — `make verify`
* architecture: pass — `./scripts/story-check specs/stories/FF-224-execution-governance`

## Evidence

* `AC-001`: pass — `FF224-AC-001 defaults_preserve_a_story_without_declarations`
* `AC-002`: pass — `FF224-AC-002 a_story_can_declare_its_execution_contract`
* `AC-003`: pass — `FF224-AC-003 evidence_mode_never_authorizes_mutation`
* `AC-004`: pass — `FF224-AC-004 authority_escalation_is_explicit`
* `AC-005`: pass — `FF224-AC-005 architecture_metadata_must_resolve`
* `AC-006`: pass — `FF224-AC-006 risk_declarations_stay_honest`
* `AC-007`: pass — `FF224-AC-007 the_profile_follows_risk_and_architecture_impact`
* `AC-008`: pass — `FF224-AC-008 an_unproven_result_is_partial_not_pass`
* `AC-009`: pass — `FF224-AC-009 used_authority_must_have_been_granted`
* `AC-010`: pass — `FF224-AC-010 a_malformed_or_silent_result_is_reported`
* `AC-011`: pass — `FF224-AC-011 the_gate_and_the_builtin_guarantee_hold`
* `AC-012`: pass — `FF224-AC-012 the_new_model_is_documented`

## Authority Used

* plan
* modify
* commit

## Residual Risks

* `this repository has no contract or end-to-end verification layer, so a Story that declared high risk here could not report a complete profile`
* `the checkers validate declarations, not their truthfulness: a Story may understate its risk or architecture impact and still pass`
