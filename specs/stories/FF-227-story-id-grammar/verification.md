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
* `AC-004`: pass — `FF227-AC-004 story_ids_are_validated_where_a_story_is_written; DBCLI-PLAT-001-x, FF-232-API-limits, FF-115-3-way-merge and FF-1-2-x pass with FF-1-2-x read as FF-1, ff-001-x, FF001-x and 1F-1a each fail naming the directory and the grammar, with identical output and exit status under an empty PATH`
* `AC-005`: pass — `FF227-AC-005 the_two_checkers_agree_on_the_shared_corpus over 16 IDs in both directions, with a drift seeded into a temporary copy of handoff-check's grammar proving the comparison reports it, and reported as FF-1-2 rather than anywhere else`
* `AC-006`: pass — `FF227-AC-006 the_story_id_grammar_is_breaking_for_0_6_0; VERSION 0.6.0, Breaking in protocol/versioning.md, migration guidance in docs/releases/0.6.0.md and docs/upgrading.md`
* `AC-007`: pass — `make verify exit 0; make verify-portability exit 0 under /bin/sh and /bin/dash`

## Authority Used

* plan
* modify
* commit
* push
* deploy

## Residual Risks

* `the Story text was amended three times on 2026-09-08, each by Carl's decision and each recorded in acceptance.md. AC-001's fixture asked for a handoff the Handoff Contract forbids and now names three distinct DBCLI-PLAT IDs, one per position. The Scope and R3 statements described a middle segment without the character-set restriction the checkers apply; relaxing the checkers to the literal wording was tried and the suite stayed green, so the restriction was a free choice, and Carl kept it because widening later is Additive while narrowing later is Breaking. FF-Plat-001 is rejected as a result. The risk that remains is the ordinary one: the approved text now matches the implementation, so nothing else guards against the grammar itself being the wrong grammar`
* `AC-004 was amended on 2026-09-08. As approved it required the directory FF-1-2-x to fail, which forces the ID to be the longest leading run of uppercase-and-digit segments and so absorbs a slug: FF-232-API-limits read as FF-232-API and FF-115-3-way-merge as FF-115-3, and both failed although FF-232 and FF-115 conform. Reproduced against the implementation, not reasoned. FF-1-2-x is structurally identical to FF-115-3-way-merge, so no rule rejects one and accepts the others; Carl chose the shortest-valid-prefix rule and dropped FF-1-2-x from the rejected fixtures. The amendment is recorded in acceptance.md. The ID grammar itself did not move`
* `under the amended rule FF-1-2-x names FF-1 with the slug 2-x, so a directory an author meant as FF-1-2 is silently read as a different Story. story-check reports the ID it read for every Story, which is what makes this visible, but nothing rejects it. The trade accepted here is a surprising read over a false rejection`
* `AC-005 asserts that the two checkers never disagree about what is recordable, in both directions, over 16 IDs chosen to cover the grammar's decision points. Agreement on that corpus is not agreement on every string. What it guards is the two verbatim copies of the grammar drifting apart, which the seeded-drift control proves it detects`
* `the grammar lives in two scripts as duplicated shell, because the checkers are separate executables with no shared library and the builtin-only guarantee forbids sourcing anything the caller's PATH could influence. FF227-AC-005 is the only thing that will notice if one copy is edited and the other is not`
* `story-check now prints an INFO line naming the Story ID for every Story it checks. That is new output for every adopter and is deliberate, because it is what makes an ambiguously named directory visible. It also means any adopter tooling that parses story-check output sees a line it did not see before`
* `the 2026-09-07 survey compared Story IDs against the two grammars. It did not run the new check over the adopters, and docs/releases/0.6.0.md says so rather than presenting the empty result as coverage`
* `no adopter was touched or upgraded. The three surveyed repositories are at 0.3.2, 0.3.5 and 0.3.6, so none of them will see this change until it is separately adopted, and the 0.4.0 acceptance-evidence migration still blocks that upgrade. The eight DBCLI-PLAT Stories this Story exists for remain unrecordable in Dbcli until that separate work is done`
* `AC-002 is enforced by substring assertions over prose in two documents. They catch a dropped, renamed or reverted clause, which is the failure that produced this Story; they do not prove the surrounding paragraphs still say something sensible. protocol/story.md additionally carries the directory and slug rule, which protocol/handoff.md has no reason to state, so the two documents agree on the grammar rather than being identical`
