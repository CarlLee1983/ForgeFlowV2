# Acceptance Criteria

## Happy Path

* [ ] AC-01: Pull requests and pushes trigger one Ubuntu verification job with
  read-only contents permission and a finite timeout.
* [ ] AC-02: The job installs supported Node, exact pnpm, Go, and locked
  dependencies before running root `make verify`.
* [ ] AC-03: Third-party actions use immutable commit SHAs.

## Business Rules

* [ ] AC-04: Workflow YAML delegates review readiness to root `make verify`
  without copying protocol, bootstrap, TypeScript, or Go test commands.
* [ ] AC-05: The adopter CI template remains generic and independent of the
  repository workflow.

## Failure Cases

* [ ] AC-06: Setup, install, and verification failures cannot be ignored or
  converted to success.
* [ ] AC-07: Invalid workflow syntax or removal of the root gate invocation
  fails static verification.

## Regression Requirements

* [ ] AC-08: Local root `make verify` remains successful.
* [ ] AC-09: The exact revision receives a successful real GitHub Actions Linux
  run before remote CI coverage is claimed complete.

## Verification Notes

Run the pinned workflow validator and root `make verify`. A remote GitHub Actions
run is additionally required for AC-09; creating or pushing a remote requires
separate user authorization.
