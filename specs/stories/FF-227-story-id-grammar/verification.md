# Verification Result: FF-227

Recorded after a complete root `make verify` on this working tree. The Story
declares `Risk level: medium` and `Architecture impact: medium`, so the required
profile is `lint static unit integration` plus `architecture`.

## Checks

* lint: pass — `make verify-typescript`
* static: pass — `make verify-protocol`
* unit: pass — `./tests/handoff-check.sh`
* integration: pass — `./tests/story-check.sh`
* architecture: pass — `./scripts/story-check specs/stories/FF-227-story-id-grammar`

## Evidence

* `AC-001`: pass — `FF227-AC-001 multi_segment_story_ids_are_recordable; DBCLI-PLAT-001 accepted as current, DBCLI-PLAT-002 as next, DBCLI-PLAT-013 as completed, with no "is not a Story ID" diagnostic`
* `AC-002`: pass — `FF227-AC-002 one_story_id_grammar_is_stated_where_a_story_is_named over protocol/story.md and protocol/handoff.md`
* `AC-003`: pass — `FF212-AC-004 the_story_id_form_is_unchanged, unedited; four accepted and eight rejected exactly as before, FF-1-2 among the rejected`
* `AC-004`: pass — `FF227-AC-004 story_ids_are_validated_where_a_story_is_written; DBCLI-PLAT-001-x passes, FF-1-2-x, ff-001-x and FF001-x each fail naming the directory and the grammar, with identical output and exit status under an empty PATH`
* `AC-005`: pass — `FF227-AC-005 the_two_checkers_agree_on_the_shared_corpus over 16 IDs, with a seeded disagreement proving the comparison can fail`
* `AC-006`: pass — `FF227-AC-006 the_story_id_grammar_is_breaking_for_0_6_0; VERSION 0.6.0, Breaking in protocol/versioning.md, migration guidance in docs/releases/0.6.0.md and docs/upgrading.md`
* `AC-007`: pass — `make verify exit 0; make verify-portability exit 0 under /bin/sh and /bin/dash`

## Authority Used

* plan
* modify
* commit

## Residual Risks

* `the directory-name rule falsely rejects a conforming Story whose slug begins with a segment of only uppercase letters or digits. FF-232-API-limits reads as FF-232-API and FF-115-3-way-merge reads as FF-115-3, and both fail, although FF-232 and FF-115 are conforming IDs. Reproduced against the implementation, not reasoned. This is a Breaking regression inside a Breaking release and the Story did not anticipate it. It is not fixable without amending AC-004: FF-1-2-x, which AC-004 requires to fail, is structurally identical to FF-115-3-way-merge, so any rule that rescues one rescues the other. The decision belongs to Carl and is stated in the delivery report; what is shipped here is the rule the approved acceptance criteria specify, with the failure documented in docs/releases/0.6.0.md, docs/upgrading.md and protocol/story.md and named in the diagnostic`
* `the Story's Scope states only that a middle segment "contains at least one uppercase letter". The implementation is stricter: a middle segment is uppercase letters and digits and contains at least one uppercase letter. The stricter rule is load-bearing in handoff-check, where it is what rejects the bare ID FF-Plat-001; story-check reaches the same verdict through directory extraction instead. So FF-Plat-001 is rejected where a literal reading of the Scope sentence would accept it. This is a narrowing of approved Story text and is Carl's to confirm`
* `slug wording is now load-bearing rather than a convention. Every existing directory in this repository and every fixture in the suite already uses lowercase word slugs, so nothing moved, but an author who writes an initialism or a leading number into the first slug segment meets a failure. The diagnostic names the ID it read, which is what distinguishes this case from a genuinely malformed ID; no checker can tell them apart on its own`
* `AC-001's acceptance evidence names one handoff "naming DBCLI-PLAT-001 as current, next, and completed". That is not constructible: the Handoff Contract requires completed Story IDs never to overlap the current or next Story. The test uses three distinct DBCLI-PLAT IDs, one per position, which is the criterion's intent; the literal fixture text is wrong and should be corrected in the Story rather than in the test`
* `AC-005's corpus is 16 bare IDs with no slug, because that is the domain the two checkers share: handoff-check judges an ID and story-check judges a directory name, and they agree only once the slug is removed. Agreement on that corpus is therefore evidence that the two copies of the grammar have not drifted apart, which the seeded-drift control proves it can detect; it is not evidence about directory extraction, which only story-check performs and which FF227-AC-004 covers instead`
* `the grammar lives in two scripts as duplicated shell, because the checkers are separate executables with no shared library and the builtin-only guarantee forbids sourcing anything the caller's PATH could influence. FF227-AC-005 is the only thing that will notice if one copy is edited and the other is not`
* `the 2026-09-07 survey compared Story IDs against the two grammars. It did not run the new directory-name extraction over the adopters, so it does not bound the slug-absorption failure above. docs/releases/0.6.0.md says so rather than presenting the empty result as coverage`
* `no adopter was touched or upgraded. The three surveyed repositories are at 0.3.2, 0.3.5 and 0.3.6, so none of them will see this change until it is separately adopted, and the 0.4.0 acceptance-evidence migration still blocks that upgrade. The eight DBCLI-PLAT Stories this Story exists for remain unrecordable in Dbcli until that separate work is done`
* `AC-002 is enforced by substring assertions over prose in two documents. They catch a dropped, renamed or reverted clause, which is the failure that produced this Story; they do not prove the surrounding paragraphs still say something sensible. protocol/story.md additionally carries the directory and slug rule, which protocol/handoff.md has no reason to state, so the two documents agree on the grammar rather than being identical`
