# Apply recency audit to the requirement slices: log (2026-11-24)

Input: `requirements-recency-audit-2026-11-24.md` (table 2, section C). Edited only `requirements-review-2026-11-24/00-MASTER.md` and slices 01 to 08 (slice 08 only for the GC rows the master fixes name). No live call, no git write, no `.env` or `local.settings.json` read. Every edit is marked `[Recency 11/24]` (rows, notes) or stated in the row text.

Audit item ID used below = the table 2 "Where" cell (for example `2.2 02 CASE-049 L72`).

## 1. Result

| Slice | PROVEN-LIVE | PLANNED | OFFLINE-ONLY | MISSING-TEST | NOT-BUILT | BLOCKED | CONFLICT | PENDING | RETIRED | DEFERRED | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | 48 (was 48) | 22 (was 22) | 46 (was 46) | 16 (was 16) | 27 (was 26) | 0 (was 0) | 0 (was 2) | 6 (was 7) | 9 (was 7) | 7 (was 7) | 181 (was 181) |
| 02 | 63 (was 64) | 60 (was 57) | 56 (was 51) | 4 (was 4) | 0 (was 0) | 0 (was 7) | 1 (was 2) | 10 (was 11) | 15 (was 13) | 0 (was 0) | 209 (was 209) |
| 03 | 59 (was 59) | 42 (was 41) | 46 (was 46) | 0 (was 0) | 1 (was 1) | 2 (was 3) | 0 (was 0) | 11 (was 11) | 13 (was 13) | 3 (was 3) | 177 (was 177) |
| 04 | 39 (was 39) | 55 (was 51) | 37 (was 37) | 7 (was 7) | 1 (was 1) | 1 (was 4) | 0 (was 2) | 9 (was 9) | 4 (was 4) | 3 (was 2) | 156 (was 156) |
| 05 | 17 (was 17) | 25 (was 25) | 20 (was 20) | 4 (was 4) | 3 (was 3) | 0 (was 0) | 0 (was 0) | 2 (was 3) | 43 (was 42) | 4 (was 4) | 118 (was 118) |
| 06 | 21 (was 21) | 30 (was 31) | 15 (was 14) | 5 (was 5) | 1 (was 1) | 0 (was 7) | 1 (was 1) | 0 (was 0) | 1 (was 1) | 11 (was 4) | 85 (was 85) |
| 07 | 95 (was 95) | 153 (was 147) | 30 (was 29) | 9 (was 10) | 7 (was 7) | 4 (was 15) | 0 (was 1) | 29 (was 25) | 21 (was 18) | 3 (was 2) | 351 (was 349) |
| 08 | 12 (was 12) | 32 (was 29) | 14 (was 9) | 1 (was 2) | 4 (was 4) | 5 (was 12) | 1 (was 2) | 40 (was 40) | 14 (was 13) | 2 (was 2) | 125 (was 125) |
| **All slices (master)** | 354 (was 355) | 419 (was 403) | 264 (was 252) | 46 (was 48) | 44 (was 43) | 12 (was 48) | 3 (was 10) | 107 (was 106) | 120 (was 111) | 33 (was 24) | 1402 (was 1400) |

The master (section 1, section 2 table, Appendix A/B/C headings and contents, Appendix C slice counts) was recounted from the slices and cross-checked: Appendix A 153 rows, B 212 rows, C 264 rows, all matching the slice Status columns. The two rows added are TRG-218a and TRG-218b (slice 07).

Status changes made (63 plus TRG-273 and the late TRG-142 and STF-012 changes): see section 3.

## 2. Per audit item: applied or skipped

Format: audit item -> file, row: result. "applied" = the fix was written as the audit states it. "PARTIAL" = the row was found and edited but one quoted text was not found in the cell (the edit was written as a note instead). "SKIPPED" = not applied.

- `2.1 01 OBJ-033 L62` -> 01 OBJ-033: note (L62)
- `2.1 01 OBJ-034 L63` -> 01 OBJ-034: col3 edited; col11 edited; col12 edited; note (L63)
- `2.1 01 OBJ-035 L64` -> 01 OBJ-035: col3 edited; col11 edited; note (L64)
- `2.1 01 API-019 L85` -> 01 API-019: col5 edited; col7 edited; note (L85)
- `2.1 01 API-029 L95` -> 01 API-029: col5 edited; col7 edited; note (L95)
- `2.1 01 STF-006 L107` -> 01 STF-006: status set to RETIRED; note (L107)
- `2.1 01 STF-013 L114` -> 01 STF-013: col3 edited; note (L114)
- `2.1 01 STF-018 L119` -> 01 STF-018: status set to NOT-BUILT; col5 edited; note (L119)
- `2.1 01 STF-026 L127 (also STF-028, STF-035, STF-060, STF-063)` -> 01 STF-026: note (L127); 01 STF-028: note (L129); 01 STF-035: note (L136); 01 STF-060: note (L161); 01 STF-063: note (L164)
- `2.1 01 STF-076 L177` -> 01 STF-076: note (L177)
- `2.1 01 STF-077 L178` -> 01 STF-077: col11 edited; note (L178)
- `2.1 01 STF-086 L203` -> 01 STF-086: status set to NOT-BUILT; note (L203)
- `2.1 01 gap a2 L215` -> 01 | a2 |: applied (L215)
- `2.1 01 d6 L256` -> 01 | d6 |: applied (L256)
- `2.1 01 d7 L257` -> 01 | d7 |: applied (L257)
- `2.1 01 e1 L264` -> 01 | e1 |: applied (L264)
- `2.1 01 e5 L266` -> 01 | e5 |: applied (L266)
- `2.1 01 e4 L268` -> 01 | e4 |: applied (L268)
- `2.1 01 U8 L300` -> 01 | U8 |: applied (L300)
- `2.1 01 §7 Q1 L327` -> 01 ~1. **The item 10 roles have no change signal.**: applied (L327)
- `2.1 01 §7 Q2 L328` -> 01 ~2. **Association-only CR updates.**: applied (L328)
- `2.1 01 §7 Q3 L329` -> 01 ~3. **Where the new staffing tests go.**: applied (L329)
- `2.1 01 STF-083 L184` -> 01 STF-083: note (L184)
- `2.1 01 STF-085 L186` -> 01 STF-085: note (L186)
- `2.1 01 R-Q1 L437` -> 01 ~- **R-Q1 (STF-086).**: applied (L437)
- `2.1 01 R-Q2 L438` -> 01 ~- **R-Q2 (STF-018, d6).**: applied (L438)
- `2.3 07 TRG-142 L166 / 2.4 App B TRG-142 L988 / section C` -> 07 TRG-142: status set to RETIRED; note (L166)
- `2.4 master App B STF-012 L918` -> 01 STF-012: status set to RETIRED; note (L113)
- `2.1 01 totals L349` -> 01 ~Conflicts are listed in section 3 (d) against the rows they touch: applied (L351)
- `2.4 master App B STF-060 L938` -> 01 STF-060: col3 edited; note (L161)
- `2.4 master App B STF-035 L932` -> 01 STF-035: col3 edited; note (L136)
- `2.4 master App B STF-028 L927` -> 01 STF-028: col3 edited; note (L129)
- `2.1 05 CLB-063 L87` -> 05 CLB-063: col11 edited; note (L87)
- `2.1 05 CLB-069 L93` -> 05 CLB-069: col11 edited; col3 edited; note (L93)
- `2.1 05 CLB-133 L146` -> 05 CLB-133: status set to RETIRED; note (L146)
- `2.1 05 R-A3 L388` -> 05 ~- **R-A3.**: applied (L388)
- `2.1 05 CLB-153 L152` -> 05 CLB-153: status set to PLANNED; note (L152)
- `2.1 05 CLB-160 L159` -> 05 CLB-160: col3 edited; note (L159)
- `2.1 05 Q4 L295` -> 05 ~4. **[R] Managed-label rule in Zeke: applied (L295)
- `2.1 05 Q5 L296` -> 05 ~5. **[R] Sweep runs and the label retry (CLB-160).**: applied (L296)
- `2.1 05 §8 Q1 L292` -> 05 ~1. **CR "Case Stage" sublabels.**: applied (L292)
- `2.1 05 §8 Q2 L293` -> 05 ~2. **Deleted-label test (A-18, CLB-123).**: applied (L293)
- `2.1 05 §8 Q3 L294` -> 05 ~3. **States for non-state rules.**: applied (L294)
- `2.1 05 CLB-123 L141` -> 05 CLB-123: note (L141)
- `2.1 05 gap G8 L177` -> 05 | G8 |: applied (L177)
- `2.1 05 L236` -> 05 ~"Acceptable" means the code path has no state branch: applied (L236)
- `2.1 06 LBL-027 to LBL-033 L46-52` -> 06 LBL-027: status set to DEFERRED; note (L46); 06 LBL-028: status set to DEFERRED; note (L47); 06 LBL-029: status set to DEFERRED; note (L48); 06 LBL-030: status set to DEFERRED; note (L49); 06 LBL-031: status set to DEFERRED; note (L50); 06 LBL-032: status set to DEFERRED; note (L51); 06 LBL-033: status set to DEFERRED; note (L52)
- `2.1 06 LBL-080 L99` -> 06 LBL-080: status set to OFFLINE-ONLY; note (L99)
- `2.1 06 (c) L133` -> 06 ~- None outside the deferred, blocked and pending rows: applied (L133)
- `2.1 06 (e)1 L143` -> 06 ~1. **LBL-027 to LBL-033 (credential labels: applied (L143)
- `2.1 06 state table L155` -> 06 | BCBA credential, Medicaid (LBL-025: applied (L155)
- `2.1 06 state table L156` -> 06 | BCBA credential, commercial (LBL-027: applied (L156)
- `2.1 06 L304` -> 06 ~5. **CO credential counts (LBL-030 to -033): applied (L304)
- `2.1 06 Q1 L196` -> 06 ~1. **Sandbox rows for Behavior Technician NJ: applied (L196)
- `2.1 06 gap a1 L110` -> 06 ~1. **BT NJ, NJ-only BT/RBT (LBL-053, LBL-066).**: applied (L110)
- `2.1 06 gap a2 L111` -> 06 ~2. **BT with two Work States (LBL-058).**: applied (L111)
- `2.1 06 Q2 L197` -> 06 ~2. **BCBA credential labels Aetna / Cigna / Carelon / CO Medicaid: applied (L197)
- `2.3 07 TRG-143 L167` -> 07 TRG-143: col3 edited; col11 edited; note (L167)
- `2.3 07 TRG-141 L165` -> 07 TRG-141: status set to RETIRED; note (L165)
- `2.3 07 TRG-142 L166` -> 07 TRG-142: status set to OFFLINE-ONLY; note (L166)
- `2.3 07 TRG-263 L298` -> 07 TRG-263: status set to OFFLINE-ONLY; col11 edited; note (L298)
- `2.3 07 TRG-128 L152` -> 07 TRG-128: status set to OFFLINE-ONLY; col11 edited; note (L152)
- `2.3 07 TRG-145 L169` -> 07 TRG-145: col11 edited; note (L169)
- `2.3 07 TRG-146 L170` -> 07 TRG-146: status set to OFFLINE-ONLY; col11 edited; note (L170)
- `2.3 07 TRG-159 L183` -> 07 TRG-159: status set to RETIRED; col11 edited; note (L183)
- `2.3 07 TRG-269 L304` -> 07 TRG-269: col11 edited; note (L304)
- `2.3 07 TRG-317 L352` -> 07 TRG-317: col11 edited; note (L352)
- `2.3 07 TRG-217 L243` -> 07 TRG-217: note (L243)
- `2.3 07 TRG-316 L351` -> 07 TRG-316: col9 edited; note (L351)
- `2.3 07 TRG-197 L223` -> 07 TRG-197: status set to PLANNED; note (L223)
- `2.3 07 TRG-270 L305, TRG-314 L349` -> 07 TRG-270: status set to PLANNED; note (L305); 07 TRG-314: status set to PLANNED; note (L349)
- `2.3 07 TRG-310 L345` -> 07 TRG-310: note (L345)
- `2.3 07 TRG-084 L103` -> 07 TRG-084: status set to PENDING; col14 edited; note (L103)
- `2.3 07 TRG-022 L41` -> 07 TRG-022: status set to PENDING; note (L41)
- `2.3 07 TRG-021 L40; TRG-095 L114; e7 L505` -> 07 TRG-021: status set to PENDING; note (L40); 07 TRG-095: status set to PENDING; note (L114)
- `2.3 07 TRG-015 L34, TRG-064 L83, TRG-069 L88` -> 07 TRG-015: status set to PLANNED; note (L34); 07 TRG-064: status set to PLANNED; note (L83); 07 TRG-069: status set to PLANNED; note (L88)
- `2.3 07 TRG-245 L280` -> 07 TRG-245: status set to DEFERRED; note (L280)
- `2.3 07 TRG-284 L319` -> 07 TRG-284: status set to PENDING; note (L319)
- `2.3 07 TRG-222 L248` -> 07 TRG-222: note (L248)
- `2.3 07 TRG-177 L203` -> 07 TRG-177: col14 edited (L203)
- `2.3 07 e1 L499 (also TRG-035 L54, TRG-134 L158, TRG-254 L289, TRG-332 L367, a1 L450, L910)` -> 07 TRG-035: note (L54); 07 TRG-134: note (L158); 07 TRG-254: note (L289); 07 TRG-332: note (L367)
- `2.3 07 a1 L450` -> 07 | a1 |: applied (L450)
- `2.3 07 e1 L499` -> 07 ~- e1 TRG-134 / a1: which sandbox re-enrolment triggers exist: applied (L499)
- `2.3 07 L910` -> 07 ~- Which property enrolled each Deal webhook: applied (L910)
- `2.3 07 a2 L451` -> 07 | a2 |: applied (L451)
- `2.3 07 e2 L500` -> 07 ~- e2 TRG-128, 142, 263, 143: applied (L500)
- `2.3 07 e3 L501` -> 07 ~- e3 TRG-197: do Contact-mirror changes fire: applied (L501)
- `2.3 07 e4 L502` -> 07 ~- e4 TRG-084: Pkg E question 24: applied (L502)
- `2.3 07 e5 L503` -> 07 ~- e5 TRG-270, 314: Pkg E question 27: applied (L503)
- `2.3 07 e7 L505` -> 07 ~- e7 TRG-021, 022, 095: create signal: applied (L505)
- `2.3 07 a6 L455` -> 07 | a6 |: applied (L455)
- `2.3 07 e10 L508` -> 07 ~- e10 TRG-243: B11 BCBA Care Coordinator: applied (L508)
- `2.3 07 d1 L493` -> 07 ~- d1 TRG-284: guide L1714: applied (L493)
- `2.3 07 state coverage L531` -> 07 | Contact fan-out (TRG-143) |: applied (L531)
- `2.3 07 L583` -> 07 ~Already waiting on Zeke (cited, not re-asked): RL L180: applied (L583)
- `2.3 07 Q1 L585` -> 07 ~1. **Update rounds per state.**: applied (L585)
- `2.3 07 Q2 L586` -> 07 ~2. **Poller-failure alert.**: applied (L586)
- `2.3 07 Q3 L587` -> 07 ~3. **Production sync workflows (TRG-284).**: applied (L587)
- `2.3 07 Q4 L588` -> 07 ~4. **HubSpot webhook retries (TRG-273).**: applied (L588)
- `2.3 07 Q5 L589` -> 07 ~5. **Retired settings and unused queues.**: applied (L589)
- `2.3 07 Q6 L590` -> 07 ~6. **Action group receiver.**: applied (L590)
- `2.3 07 Azure change 4 L598` -> 07 ~4. Optional: add an email receiver to `uca-sync-deadletter-owners`: applied (L598)
- `2.3 07 Azure change 12 L608` -> 07 ~12. Item 19 alert rule; a poller-failure alert: applied (L608)
- `2.3 07 corr. L687` -> 07 | TRG-222 | Did not say that while decision 39 stands: applied (L687)
- `2.3 07 guide update G-09 L553` -> 07 | G-09 |: applied (L553)
- `2.3 07 L924` -> 07 ~- TRG-142: query 4 totals 93: applied (L924)
- `2.3 07 TRG-217/218 L243-244` -> 07 TRG-218a, TRG-218b: added two PLANNED rows (email, phone triggers)
- `2.4 master App B TRG-273 L1054` -> 07 TRG-273: status set to OFFLINE-ONLY; note (L310)
- `2.4 master C11 L112; GC-106 L916; TRG-285 L994` -> 07 TRG-285: note (L322); 08 GC-106: note (L129)
- `2.3 04 BT-083 L111` -> 04 BT-083: status set to PLANNED; col5 edited; col8 edited; note (L111)
- `2.3 04 BT-079 L107` -> 04 BT-079: col3 edited; col5 edited; note (L107)
- `2.3 04 BT-081 L109` -> 04 BT-081: col5 edited; note (L109)
- `2.3 04 BT-036 L64` -> 04 BT-036: status set to DEFERRED; col5 edited; note (L64)
- `2.3 04 BT-053 L81` -> 04 BT-053: status set to PENDING; note (L81)
- `2.3 04 BT-025 L53` -> 04 BT-025: status set to PLANNED; note (L53)
- `2.3 04 BT-109 L137` -> 04 BT-109: status set to PLANNED; note (L137)
- `2.3 04 BT-140 L168` -> 04 BT-140: status set to PLANNED; note (L168)
- `2.3 04 BT-145 L173` -> 04 BT-145: note (L173)
- `2.3 04 gap (a)1 L193` -> 04 ~- R1-U1, NY: one mapped-field edit (for example `apartment__work`): applied (L193)
- `2.3 04 gap (a)1 L194` -> 04 ~- R1-U1, NY: the next push with the BT/RBT workflow off: applied (L194)
- `2.3 04 gap (a)2 L196` -> 04 ~2. **BT + New Jersey → Behavior Technician NJ 1132652: applied (L196)
- `2.3 04 gap (a)8 L205` -> 04 ~8. **A BT/RBT update with a blank date of birth (BT-083).**: applied (L205)
- `2.3 04 gap (b)3 L215` -> 04 ~3. BT-083: once question 1 is answered: applied (L215)
- `2.3 04 (d)1 L229` -> 04 ~1. **BT-140.** [R] Corrected: applied (L229)
- `2.3 04 (d)5 L233` -> 04 ~5. [R] **BT-109, guide L337: applied (L233)
- `2.3 04 (e)1 L237` -> 04 ~1. BT-083: PKG question 27 (waiting on Zeke): applied (L237)
- `2.3 04 (e)2 L238` -> 04 ~2. BT-025: MX BR11 held: applied (L238)
- `2.3 04 (e)4 L240` -> 04 ~4. BT-053: the production create signal: applied (L240)
- `2.3 04 (e)5 L241` -> 04 ~5. BT-036: PKG question 24: applied (L241)
- `2.3 04 GU6 L286` -> 04 | 6 | L337 (GER-REQ) | BT/RBT ContactForm: applied (L286)
- `2.3 04 A7 L309` -> 04 ~7. The guide's date-of-birth placeholder rule (L342): applied (L309)
- `2.3 04 A11 L313` -> 04 ~11. Package questions 7, 24, 25, 26, 27 and the un-hold: applied (L313)
- `2.3 04 Q1 L317` -> 04 ~1. **Does package question 27 cover the BT/RBT too?**: applied (L317)
- `2.3 04 Q2 L318` -> 04 ~2. **How should the sandbox test BT/RBTs get `active_cases_count`: applied (L318)
- `2.3 04 Q3 L319` -> 04 ~3. **May R3 add one New-Jersey-only BT: applied (L319)
- `2.3 04 Q4 L321` -> 04 ~4. **[R] Should a BT/RBT whose Work States hold Colorado: applied (L321)
- `2.3 04 L323` -> 04 ~Not re-asked (already waiting or decided): package Q24: applied (L323)
- `2.3 04 corrections L391` -> 04 | `BT-109` | PLANNED as if decided: applied (L391)
- `2.4 master App B GC-023` -> 08 GC-023: status set to PLANNED; note (L46)
- `2.4 master App B GC-038` -> 08 GC-038: status set to RETIRED; note (L61)
- `2.4 master App B GC-036` -> 08 GC-036: status set to OFFLINE-ONLY; note (L59)
- `2.4 master App B GC-028` -> 08 GC-028: status set to OFFLINE-ONLY; note (L51)
- `2.4 master App B GC-050` -> 08 GC-050: status set to OFFLINE-ONLY; note (L73)
- `2.4 master App B GC-124` -> 08 GC-124: status set to OFFLINE-ONLY; note (L147)
- `2.4 master App B GC-120` -> 08 GC-120: status set to OFFLINE-ONLY; note (L143)
- `2.4 master App B GC-030` -> 08 GC-030: status set to PLANNED; note (L53)
- `2.4 master App B GC-044` -> 08 GC-044: status set to PLANNED; note (L67)
- `2.4 master App B GC-037 L958` -> 08 GC-037: note (L60); M 08 GC-037: applied
- `2.4 master App B GC-125 L1162` -> 08 GC-125: note (L148); M 08 GC-125: applied
- `2.4 master App B GC-084 L1148` -> 08 GC-084: note (L107); M 08 GC-084: applied
- `2.4 master R2-17 L414; GC-027 L957` -> 08 GC-027: note (L50)
- `2.4 master App B GC-123 L1008` -> 08 GC-123: col3 edited; note (L146); M 08 GC-123: applied
- `2.4 master App B GC-012 L1126` -> 08 GC-012: note (L35); M 08 GC-012: applied
- `2.2 02 CASE-014 L37` -> 02 CASE-014: col3 edited; note (L37)
- `2.2 02 CASE-019 L42` -> 02 CASE-019: status set to PLANNED; note (L42)
- `2.2 02 CASE-049 L72` -> 02 CASE-049: col11 edited; note (L72)
- `2.2 02 CASE-062 L85` -> 02 CASE-062: col11 edited (L85)
- `2.2 02 CASE-063 L86` -> 02 CASE-063: col11 edited; note (L86)
- `2.2 02 CASE-068 L91` -> 02 CASE-068: status set to RETIRED; note (L91)
- `2.2 02 CASE-069 L92` -> 02 CASE-069: status set to PLANNED; col7 edited; note (L92)
- `2.2 02 CASE-079 L102` -> 02 CASE-079: col3 edited; note (L102)
- `2.2 02 CASE-090 L113` -> 02 CASE-090: status set to OFFLINE-ONLY; col7 edited; note (L113)
- `2.2 02 CASE-125 L148` -> 02 CASE-125: col3 edited; note (L148)
- `2.2 02 CASE-128 L151` -> 02 CASE-128: status set to OFFLINE-ONLY; col7 edited; note (L151)
- `2.2 02 CASE-130 L153` -> 02 CASE-130: status set to PLANNED; col7 edited; note (L153)
- `2.2 02 CASE-131 L154` -> 02 CASE-131: status set to PLANNED; col7 edited; note (L154)
- `2.2 02 CASE-132 L155` -> 02 CASE-132: col7 edited; note (L155)
- `2.2 02 CASE-137 L160` -> 02 CASE-137: status set to PLANNED; col7 edited; note (L160)
- `2.2 02 CASE-160 L183` -> 02 CASE-160: status set to PLANNED; col7 edited; note (L183)
- `2.2 02 CASE-169 L192` -> 02 CASE-169: col14 edited (L192)
- `2.2 02 CASE-170 L193` -> 02 CASE-170: col3 edited; note (L193)
- `2.2 02 CASE-174 L197` -> 02 CASE-174: status set to OFFLINE-ONLY; col11 edited; note (L197)
- `2.2 02 CASE-175 L198` -> 02 CASE-175: status set to OFFLINE-ONLY; col11 edited; note (L198)
- `2.2 02 CASE-176 L199` -> 02 CASE-176: note (L199)
- `2.2 02 CASE-177 to CASE-180 L200-203` -> 02 CASE-177: col11 edited; note (L200); 02 CASE-178: col11 edited; note (L201); 02 CASE-179: col11 edited; note (L202); 02 CASE-180: col11 edited; note (L203)
- `2.2 02 CASE-182 L205` -> 02 CASE-182: status set to OFFLINE-ONLY; col11 edited; note (L205)
- `2.2 02 CASE-184 L207` -> 02 CASE-184: col11 edited; note (L207)
- `2.2 02 CASE-186 L209` -> 02 CASE-186: status set to RETIRED; note (L209)
- `2.2 02 CASE-188 L211` -> 02 CASE-188: col11 edited (L211)
- `2.2 02 gap a2 L243` -> 02 | a2 |: applied (L243)
- `2.2 02 gap a11 L252` -> 02 | a11 |: applied (L252)
- `2.2 02 gap a12 L253` -> 02 | a12 |: applied (L253)
- `2.2 02 gap a16 L257` -> 02 | a16 |: applied (L257)
- `2.2 02 gap a17 L258` -> 02 | a17 |: applied (L258)
- `2.2 02 (b)3 L270` -> 02 ~3. Item 2 tests (pkg L183): applied (L270)
- `2.2 02 (b)4 L271` -> 02 ~4. Reconcile S7GP:273 and :365: applied (L271)
- `2.2 02 (b)8 L275` -> 02 ~8. Items 3 and 8 tests (pkg L200, L330): applied (L275)
- `2.2 02 (c) L282` -> 02 ~[R] Reviewer's later read of the WT (2026-11-24): item 5: applied (L282)
- `2.2 02 (c) L286` -> 02 ~- Item 2 "Other" text (CASE-160), item 6: applied (L286)
- `2.2 02 (c) L287` -> 02 ~- Items 3 and 8: held (CASE-130: applied (L287)
- `2.2 02 (d) L291` -> 02 ~- CASE-090: working tree keeps the typed supplier: applied (L291)
- `2.2 02 (e) L296` -> 02 ~- Pkg E7 Address 2 junk (CASE-128); E25: applied (L296)
- `2.2 02 (e) L297` -> 02 ~- O-17 coordinator email (CASE-070); O-21: applied (L297)
- `2.2 02 guide update L331` -> 02 ~| L361, L510 | Care Coordinator via owners API: applied (L331)
- `2.2 02 guide update L332` -> 02 ~| L363, L512 | Supervising BCBA = typed supplier: applied (L332)
- `2.2 02 guide update L342` -> 02 ~| L374, L523 | Allergies Yes/No: applied (L342)
- `2.2 02 guide update L343` -> 02 ~| L377, L526 | Severity Level 1-3: applied (L343)
- `2.2 02 guide update L349` -> 02 ~| L451 | Route through type 3 / Parent/Guardian: applied (L349)
- `2.2 02 A-1 L356` -> 02 ~- A-1. The working tree read on 2026-11-24: applied (L358)
- `2.2 02 Q4 L374` -> 02 ~4. **Contact fan-out routing.**: applied (L376)
- `2.2 02 Q5 L375` -> 02 ~5. **Mixed Grad Permit holders (E26).**: applied (L377)
- `2.2 02 L379` -> 02 ~Already waiting on you and not re-asked: pkg E7: applied (L381)
- `2.2 02 prod addendum L486` -> 02 ~2. **Run failure if shipped early.**: applied (L488)
- `2.2 02 prod addendum L507` -> 02 ~- 404s: `referral_other`, `care_coordinator_first_name`: applied (L509)
- `2.2 02 corrections L441` -> 02 | CASE-090 | CONFLICT confirmed and sharpened: applied (L443)
- `2.2 02 guide update L349 (missing rows)` -> 02 guide update table: added 2 rows (L452/L455/L790; C25 null and O-59)
- `§2 L42` -> M L42 - **Proven live means: applied
- `D8 L137` -> M L137 | D8 |: applied
- `K6 L258` -> M L258 | K6 |: applied
- `K8 L260` -> M L260 | K8 |: applied
- `K16 L268 (2)` -> M L268 | K16 [C] |: applied
- `U-04 L315` -> M L315 | U-04 |: applied
- `G-5 L388` -> M L388 | G-5 |: applied
- `§4.10 L455` -> M L455 Link-property history: applied
- `§7.4 N-8 L618` -> M L618 | N-8 |: applied
- `Q35 L696` -> M L696 35. **Contact fan-out routing*: applied
- `§7.4 #33 L599` -> M L599 | 33 |: applied
- `§9 Q9 L667` -> M L667 9. **Package question 17: applied
- `A5 L73` -> M L73 | A5 |: applied
- `U2-4 L368` -> M L368 | U2-4 |: applied
- `R3-9 L437` -> M L437 | R3-9 |: applied
- `§5.2 L481` -> M L481 | 1 BCBA `date_of_birth`: applied
- `§7.4 #6 L572` -> M L572 | 6 |: applied
- `Q5 L663` -> M L663 5. **Package question 27: applied
- `A4 L72` -> M L72 | A4 |: applied
- `Q3 L661` -> M L661 3. **Package question 25: applied
- `B3 L93` -> M L93 | B3 |: applied
- `§4.0 L283` -> M L283 | Rewrite C10: applied
- `§5.2 L488` -> M L488 | 2 Referral "Other" text: applied
- `§7.4 #15 L581` -> M L581 | 15 |: applied
- `H5 L215` -> M L215 | H5 |: applied
- `R2-17 L414` -> M L414 | R2-17 |: applied
- `H14 L224` -> M L224 | H14 |: applied
- `A7 L75` -> M L75 | A7 |: applied
- `Q1 L659` -> M L659 1. **Package question 7: applied
- `§7.4 #14 L580` -> M L580 | 14 |: applied
- `R3-1 L429` -> M L429 | R3-1 |: applied
- `A2 L70` -> M L70 | A2 |: applied
- `N1 L465` -> M L465 | N1 |: applied
- `§5.2 L483` -> M L483 | 9 Grad Permit: applied
- `Q4 L662` -> M L662 4. **Package question 26: applied
- `§10 #6 L714` -> M L714 | 6 |: applied
- `A3 L71` -> M L71 | A3 |: applied
- `N2 L466` -> M L466 | N2 |: applied
- `§7.1 L545` -> M L545 1. **Answer O-58 first**: applied
- `§7.3 E/E2 L561` -> M L561 | E, E2 |: applied
- `Q7 L665` -> M L665 7. **The guide write: applied
- `U-14 L325` -> M L325 | U-14 |: applied
- `C10 L111` -> M L111 | C10 |: applied
- `Q8 L666` -> M L666 8. **O-57, O-58, O-59**: applied
- `A8 L76` -> M L76 | A8 |: applied
- `C2 L103` -> M L103 | C2 |: applied
- `Q6 L664` -> M L664 6. **Un-hold items 3: applied
- `§5.2 L489` -> M L489 | 3 Allergies, 8 Severity: applied
- `§7.4 #9 L575` -> M L575 | 9 |: applied
- `§7.4 #18 L584` -> M L584 | 18 |: applied
- `C15 L116` -> M L116 | C15 |: applied
- `Q2 L660` -> M L660 2. **Package question 24: applied
- `A1 L69` -> M L69 | A1 |: applied
- `A10 L78` -> M L78 | A10 |: applied
- `C11 L112` -> M L112 | C11 |: applied
- `§9 Q10 L671` -> M L671 10. **Item 1: applied
- `§9 Q11 L672` -> M L672 11. **A BCBA: applied
- `§9 Q12 L673` -> M L673 12. **Item 1: applied
- `§9 Q13 L674` -> M L674 13. **Sandbo: applied
- `§9 Q14 L675` -> M L675 14. **How to: applied
- `§9 Q15 L676` -> M L676 15. **"RBT C: applied
- `§9 Q16 L677` -> M L677 16. **Checkl: applied
- `§9 Q17 L678` -> M L678 17. **CR "Ca: applied
- `§9 Q18 L679` -> M L679 18. **Delete: applied
- `§9 Q19 L680` -> M L680 19. **Manage: applied
- `§9 Q20 L681` -> M L681 20. **Sweep: applied
- `§9 Q21 L682` -> M L682 21. **BCBA c: applied
- `§9 Q22 L683` -> M L683 22. **One st: applied
- `§9 Q23 L684` -> M L684 23. **Update: applied
- `§9 Q24 L685` -> M L685 24. **Produc: applied
- `§9 Q25 L686` -> M L686 25. **HubSpo: applied
- `§9 Q26 L687` -> M L687 26. **Retire: applied
- `§9 Q27 L688` -> M L688 27. **Dead-l: applied
- `§9 Q28 L689` -> M L689 28. **Poller: applied
- `§9 Q29 L690` -> M L690 29. **Guide: applied
- `§9 Q30 L691` -> M L691 30. **Insert: applied
- `§9 Q31 L692` -> M L692 31. **Write: applied
- `§9 Q32 L693` -> M L693 32. **Gate p: applied
- `§9 Q33 L694` -> M L694 33. **G20: o: applied
- `§9 Q34 L695` -> M L695 34. **Auth P: applied
- `§9 Q35 L696` -> M L696 35. **Contac: applied
- `§9 Q36 L697` -> M L697 36. **Associ: applied
- `§9 Q37 L698` -> M L698 37. **Where: applied
- `§9 Q38 L699` -> M L699 38. **Edit-w: applied
- `master C18 L119` -> M L119 | C18 |: applied
- `master C19 L120` -> M L120 | C19 |: applied
- `master C20 L121` -> M L121 | C20 |: applied
- `master C21 L122` -> M L122 | C21 |: applied
- `master D16 L145` -> M L145 | D16 |: applied
- `master F25 L189` -> M L189 | F25 |: applied
- `master G9 L205` -> M L205 | G9 |: applied
- `master A11 L79` -> M L79 | A11 |: applied
- `master A15 L83` -> M L83 | A15 |: applied
- `master C3 L104` -> M L104 | C3 |: applied
- `master D3 L132` -> M L132 | D3 |: applied
- `master D10 L139` -> M L139 | D10 |: applied
- `master D17 L146` -> M L146 | D17 |: applied
- `master E3 L155` -> M L155 | E3 |: applied
- `G-8 L391` -> M L391 | G-8 |: applied
- `R2-15 L412` -> M L412 | R2-15 |: applied
- `R2-20 L417` -> M L417 | R2-20 |: applied
- `R3-6 L434` -> M L434 | R3-6 |: applied
- `R3-7 L435` -> M L435 | R3-7 |: applied
- `N8 L472` -> M L472 | N8 |: applied
- `N-7 L617` -> M L617 | N-7 |: applied
- `N-12 L622` -> M L622 | N-12 |: applied
- `N-19 L629` -> M L629 | N-19 |: applied
- `§10 #1 L709` -> M L709 | 1 |: applied
- `§10 #2 L710` -> M L710 | 2 |: applied
- `§10 #4 L712` -> M L712 | 4 |: applied
- `§10 #8 L716` -> M L716 | 8 |: applied
- `§10 #9 L717` -> M L717 | 9 |: applied
- `2.4 master §9 Q10-Q38 header L669` -> M **New (the sources did not settle them):**: applied (L669)
- `2.4 master §9 Q10-Q38 L701` -> M **Count:** 38 questions: 9 already asked: applied (L701)
- `2.4 master App B STF-083 L1023` -> M | 01 STF-083 |: applied (L1005)
- `2.4 master App B TRG-035 L1045` -> M | 07 TRG-035 |: PARTIAL: text not found: Already waiting on Zeke: which sandbox triggers ex; M | 07 TRG-035 |: applied (L1027)
- `2.4 master App B 01 STF-018` -> M 01 STF-018: applied (note on the moved appendix row)
- `2.4 master App B 01 STF-086` -> M 01 STF-086: applied (note on the moved appendix row)
- `2.4 master App B 04 BT-053` -> M 04 BT-053: applied (note on the moved appendix row)
- `2.4 master App B 07 TRG-021` -> M 07 TRG-021: applied (note on the moved appendix row)
- `2.4 master App B 07 TRG-022` -> M 07 TRG-022: applied (note on the moved appendix row)
- `2.4 master App B 07 TRG-084` -> M 07 TRG-084: applied (note on the moved appendix row)
- `2.4 master App B 07 TRG-095` -> M 07 TRG-095: applied (note on the moved appendix row)
- `2.4 master App B 07 TRG-284` -> M 07 TRG-284: applied (note on the moved appendix row)
- `2.4 master App A TRG-222 L882` -> M 07 TRG-222: applied
- `2.4 master App B STF-083` -> M 01 STF-083: applied
- `2.4 master App B BT-145` -> M 04 BT-145: applied
- `2.4 master §4.3 L310-359` -> M U-04a: added the Guardian-edit U-row (path both, record `source`)
- `2.4 master App B 01 STF-060` -> M 01 STF-060: applied (note)
- `2.4 master App B 01 STF-035` -> M 01 STF-035: applied (note)
- `2.4 master App B 01 STF-028` -> M 01 STF-028: applied (note)
- `2.4 master App B 07 TRG-285` -> M 07 TRG-285: applied (note)
- `2.2 03 BCBA-109 L153` -> 03 BCBA-109: status set to PLANNED; col5 edited; col7 edited; note (L153)
- `2.2 03 (b) b3 L292` -> 03 ~- b3 (BCBA-109): the update-with-blank: applied (L292)
- `2.2 03 (e) L313` -> 03 ~- BCBA-109: blank `date_of_birth` on a linked update: applied (L313)
- `2.2 03 guide update L353` -> 03 | L342 (DateOfBirth) |: applied (L353)
- `2.2 03 L389` -> 03 ~Only questions the guide and package do not settle. Already waiting: applied (L389)
- `2.2 03 gaps (a) L261-286` -> 03 gap a23: added a23 (R1-U2 -> CR keeps 1990-01-15)

Totals items applied (no per-row log entry): 01 totals (table, recount line, L349 note and the later recount lines), 02 totals, 03 totals, 04, 05, 06 totals (table rows, recount line and the later totals lines tagged "[Recency 11/24] Now"), master section 1 and section 2 (see section 1 above).

## 3. Status changes (old -> new)

- 01 STF-006: PENDING -> RETIRED
- 01 STF-012: NOT-BUILT -> RETIRED
- 01 STF-018: CONFLICT -> NOT-BUILT
- 01 STF-086: CONFLICT -> NOT-BUILT
- 02 CASE-019: BLOCKED -> PLANNED
- 02 CASE-068: PROVEN-LIVE -> RETIRED
- 02 CASE-069: BLOCKED -> PLANNED
- 02 CASE-090: CONFLICT -> OFFLINE-ONLY
- 02 CASE-128: BLOCKED -> OFFLINE-ONLY
- 02 CASE-130: BLOCKED -> PLANNED
- 02 CASE-131: BLOCKED -> PLANNED
- 02 CASE-137: BLOCKED -> PLANNED
- 02 CASE-160: BLOCKED -> PLANNED
- 02 CASE-174: PLANNED -> OFFLINE-ONLY
- 02 CASE-175: PLANNED -> OFFLINE-ONLY
- 02 CASE-182: PLANNED -> OFFLINE-ONLY
- 02 CASE-186: PENDING -> RETIRED
- 03 BCBA-109: BLOCKED -> PLANNED
- 04 BT-025: BLOCKED -> PLANNED
- 04 BT-036: PENDING -> DEFERRED
- 04 BT-053: BLOCKED -> PENDING
- 04 BT-083: BLOCKED -> PLANNED
- 04 BT-109: CONFLICT -> PLANNED
- 04 BT-140: CONFLICT -> PLANNED
- 05 CLB-133: PLANNED -> RETIRED
- 05 CLB-153: PENDING -> PLANNED
- 06 LBL-027: BLOCKED -> DEFERRED
- 06 LBL-028: BLOCKED -> DEFERRED
- 06 LBL-029: BLOCKED -> DEFERRED
- 06 LBL-030: BLOCKED -> DEFERRED
- 06 LBL-031: BLOCKED -> DEFERRED
- 06 LBL-032: BLOCKED -> DEFERRED
- 06 LBL-033: BLOCKED -> DEFERRED
- 06 LBL-080: PLANNED -> OFFLINE-ONLY
- 07 TRG-015: OFFLINE-ONLY -> PLANNED
- 07 TRG-021: BLOCKED -> PENDING
- 07 TRG-022: BLOCKED -> PENDING
- 07 TRG-064: OFFLINE-ONLY -> PLANNED
- 07 TRG-069: OFFLINE-ONLY -> PLANNED
- 07 TRG-084: BLOCKED -> PENDING
- 07 TRG-095: BLOCKED -> PENDING
- 07 TRG-128: BLOCKED -> OFFLINE-ONLY
- 07 TRG-141: PENDING -> RETIRED
- 07 TRG-142: BLOCKED -> RETIRED
- 07 TRG-146: PLANNED -> OFFLINE-ONLY
- 07 TRG-159: PLANNED -> RETIRED
- 07 TRG-197: BLOCKED -> PLANNED
- 07 TRG-218a: added as PLANNED
- 07 TRG-218b: added as PLANNED
- 07 TRG-245: BLOCKED -> DEFERRED
- 07 TRG-263: BLOCKED -> OFFLINE-ONLY
- 07 TRG-270: BLOCKED -> PLANNED
- 07 TRG-273: MISSING-TEST -> OFFLINE-ONLY
- 07 TRG-284: CONFLICT -> PENDING
- 07 TRG-314: BLOCKED -> PLANNED
- 08 GC-023: BLOCKED -> PLANNED
- 08 GC-028: MISSING-TEST -> OFFLINE-ONLY
- 08 GC-030: BLOCKED -> PLANNED
- 08 GC-036: BLOCKED -> OFFLINE-ONLY
- 08 GC-038: BLOCKED -> RETIRED
- 08 GC-044: BLOCKED -> PLANNED
- 08 GC-050: BLOCKED -> OFFLINE-ONLY
- 08 GC-120: BLOCKED -> OFFLINE-ONLY
- 08 GC-124: CONFLICT -> OFFLINE-ONLY

## 4. Not applied, ambiguous, in conflict, or needing Zeke (rows left as they were, or only noted)

- `2.4 master App B CASE-119` (and `§10 #9`, `TRG-284` for the CONFLICT re-status): audit says "Settled / Re-status" with no target status; CASE-119 stays CONFLICT. Ledger fix says COVERED by C23 (Q34 keep the code).
- `2.4 master App B GC-123` (and slice 08 GC-123): the wording is restated (split only when a state precedes the ZIP) but the status stays BLOCKED, because the audit gives only "Restate". Likely OFFLINE-ONLY (O-59 decided).
- `2.3 04 BT-145` (O-1 answered, "nothing reads it"): note added; status left PENDING, because the audit says "Answered" with no target status.
- `2.4 master C11 / GC-106 / TRG-285` (Ruling B): noted "likely settled, needs Zeke"; status unchanged (GC-106 CONFLICT, TRG-285 BLOCKED), as the audit says "Ask Zeke to confirm".
- Conflicts between audit fixes, resolved by the more specific or more frequent one: TRG-142 (slice 07 fix OFFLINE-ONLY; master App B, section C and ledger say RETIRED): set RETIRED, noted. CASE-128 / GC-036 (master fix "PLANNED / OFFLINE-ONLY"; slice 02 fix OFFLINE-ONLY): set OFFLINE-ONLY in both, with the live R3 junk Address 2 step added as master R3-1 note and ledger fix. CASE-069 / GC-038 ("PLANNED / RETIRED"): CASE-069 PLANNED, GC-038 RETIRED.
- Interpretations (the audit gives the idea, not the word): STF-018 and STF-086 "pending build, offline proof" -> NOT-BUILT (the file's status for "in the uncommitted build with offline tests"); BT-053, TRG-021, TRG-022, TRG-095 "Decided / UC answer non-blocking" -> PENDING; TRG-084 and TRG-284 "PENDING (cutover)" -> PENDING; CASE-174 "RETIRED / offline" -> OFFLINE-ONLY; BT-036 "DEFERRED (phase 2)" -> DEFERRED; TRG-273 "Accepted offline" -> OFFLINE-ONLY (master row only; also set in slice 07).
- `2.4 master §4.0 L283` ("Add `ready` and not-ready rows" for C10): written as a note on the row, no new matrix row text (the matrix is the ledger/matrix worker's). `§7.4 #15`, `N-8`, `Q35`, `A5` etc. are written as notes where the audit says "Rewrite" without giving the new text.
- `2.4 master App B TRG-035 L1045`: note text in the shortened appendix row did not contain the quoted sentence; the slice 07 row (TRG-035) carries the deletion.
- No-production-Contact-workflow conclusion: written everywhere as "pending Zeke's confirmation, recommended" (CASE-186, TRG-141, TRG-142, D8, K16, master Q9, section C rows). O-21 itself is NOT closed in any file; ask Zeke for the one-line confirmation.
- Inferred points kept as P1 test needs, not closed: a property-sync change fires the Case workflow; it moves the Case `hs_lastmodifieddate` (poller); the four Guardian properties and `location` are on the sandbox and production Case trigger lists (not recorded in the repo).
- The webhook / poller scan figures and the state-table gap counts (23 / 50 / 42) in master section 1 and 2 were not re-run (no source to recount); noted in section 1 of the master.
- Slice 08 was not in the audit; only its GC rows named by the master fixes were edited (so the master appendices, generated from the slices, stay consistent).

## 5. Table 2 fixes whose target is not a slice or master file (for other workers, verbatim)

Columns are the audit's: Override | Where | What it says | What is current | Effect | Fix. Effect codes: RT = test row proves a retired rule; FB = false gap / false BLOCKED; MT = missing test; WV = wrong expected value; SW = stale wording. Pn = package/handoff rulings table 1c of the audit; dN = BUILD-PLAN decision N; R01/R02/R06 = the audit's Guardian findings (R02: Guardian first name, last name, email and phone are Case property-sync fields; the fan-out is optional code).

### 5.1 `sandbox-coverage-ledger-2026-11-24.md` (audit 2.5, 55 findings)

| Override | Where | What it says | What is current | Effect | Fix |
|---|---|---|---|---|---|
| R02 | header L14 | fan-out lines "become BLOCKED on O-21" | Case path | FB | Replace the caveat |
| R02 | OBJ-033 L79 | "BLOCKED on O-21 if no Contact webhook" | Optional code | SW | OFFLINE-ONLY |
| R02 | OBJ-034 L80 | "needs … (O-21)" | Case path | FB | K1 restated |
| R02; d24 | OBJ-035 L81 | "Fan-out reads the Guardian Contact" | HubSpot sync | SW | OFFLINE-ONLY |
| R02 | STF-076 L194 | "the fan-out finds the Case by it" | HubSpot sync input | SW | Reword |
| R02 | STF-077 L195 | BLOCKED on O-21 if no webhook | Case path | FB | Cite R1-1/R2-1/R3-1 and K1 |
| d24 | STF-078 L196 | waits on F22 | Decided by d24 | FB | COVERED / OFFLINE-ONLY |
| R02 | CASE-053 L279 (X02-5) | path "fan-out, then poller" | Case workflow or poll | WV | Restate X02-5 |
| R02 | CASE-049 L275 | "Fan-out BLOCKED on O-21" | Case path | FB | K1 (email) by both paths |
| R02 | CASE-062 L288 | webhook "U-04" | Case path | WV | Replace |
| R02 | CASE-063 L289 | "Fan-out BLOCKED on O-21" | Case path | FB | As CASE-049 |
| R01 | CASE-159 L385 | `referral_source` via U-04/U-48 | Case sync → Case run | WV | Replace |
| R02 | CASE-172 L398 | CO/NJ via R2-23g/R3-13g as fan-out rows | Case path | WV | Restate those rows |
| R02 | CASE-174 L400 | BLOCKED on O-21 if no webhook | K1 Case path | FB | Restate |
| R02 | CASE-175 L401 | `contactChange` → fan-out | Optional code | SW | OFFLINE-ONLY |
| R02 | CASE-177 L403, CASE-178 L404, CASE-179 L405, CASE-180 L406 | webhook U-04, poller U-48 | K1 by both paths (U-48 tests `location` only) | WV | Replace |
| R02 | CASE-182 L408 | K4 | Optional code | SW | OFFLINE-ONLY |
| R02 | CASE-184 L410 | BLOCKED on O-21 | Case gate (G-2, G-6, G-7) | FB | Restate |
| R02 | CASE-186 L412 | Contact workflow at cutover | Not needed | RT | RETIRED, pending Zeke's word |
| R02 | CASE-188 L414 | via U-04, R2-23g, R3-13g | Case path | WV | Restate |
| R02 | CLB-063 L833 | "depends on O-21" | Case trigger list (K6) | FB | Replace |
| R02 | CLB-069 L839 | BLOCKED on O-21 | Case path | FB | Replace |
| R02 | CLB-133 L888 | "fan-out needs a Contact webhook" | U-48 is the Case path | FB | Restate |
| R02 | LBL-080 L986 | depends on O-21 | Optional code | SW | OFFLINE-ONLY |
| R02 | TRG-128 L1129 | BLOCKED, needs O-21 | Optional code | SW | OFFLINE-ONLY |
| R02 | TRG-141 L1142 | production Contact workflow | Not needed | RT | RETIRED |
| R02 | TRG-142 L1143 | BLOCKED O-21 | Not needed | RT | RETIRED |
| R01 | TRG-143 L1144 | "Fan-out needs O-21" | Case path | WV | K1 by both paths |
| R02 | TRG-145 L1146 | needs O-21 | Case gate | FB | G-2/G-6 |
| R02 | TRG-146 L1147 | needs O-21 | K1 Case run, no CR contact | FB | Restate |
| R02 | TRG-159 L1160 | needs O-21 | Superseded | RT | Restate as met by Case sync |
| R01 | TRG-195 L1203 | BLOCKED on O-21 | Case path | WV | K1 |
| R01 | TRG-217 L1225, TRG-218 L1226 | poller U-48 | K1 by poll | SW | Replace |
| R02 | TRG-263 L1280 | BLOCKED O-21 | Optional code | SW | OFFLINE-ONLY |
| R02 | TRG-269 L1286 | O-21 | Case run | FB | K1 |
| R01 | TRG-289 L1306 | webhook U-04 | K1 | WV | Replace |
| R01; P25 (Q13) | TRG-316 L1333 | webhook U-04; Q13 open | K1/C20 Case run; Q13 decided | WV | Replace |
| R02 | TRG-317 L1334 | O-21 | K1, U-27, U-33 | FB | Replace |
| R01 | TRG-190 L1198 | K1 expects the fan-out | Case run | WV | Fixed by restating K1 |
| R01 | cited M K1 L280, U-04 L507, R2-23g L468, R3-13g L492, G-5 L429, U-48 L552; SU-6 L402 | no row expects a Case run with `source` recorded after a Guardian edit; SU-6 does not check the Guardian triggers | Current rule | MT | Restate K1, R2-23g, R3-13g; add the four Guardian fields, `location` and `referral_source` to SU-6 |
| d36 | TRG-009 L1005 | C9 test values per round | Second phone dropped | SW | Note it |
| d49 | BCBA-171 L588 | "BCBA `email` = the Contact email" | The BCBA's own `email` | SW | Reword |
| P25 (Q13) | header L15; BT-104 L726; BT-151 L773; TRG-140 L1141 | wait on question 13 | Decided (Zeke's workflow check) | SW | Prerequisite |
| P25 (Q34) | CASE-119 L345 | BLOCKED, waits on Q34 | Keep the code | FB | COVERED by C23 |
| P24 | BT-036 L658 | "package Q24 still open" | Closed | SW | Delete |
| d17; Q15 | BT-109 L731 | BLOCKED, waits on Q15 | Decided | FB | COVERED |
| F23; RN names | BT-149 L771 | BLOCKED "#" names | Retired | FB | RETIRED |
| Q19 | CLB-153 L893 | BLOCKED | Decided | FB | COVERED |
| Q19 | TRG-118 L1114 | waits on Q19 | Decided | SW | Drop |
| P24 | TRG-084 L1080 | BLOCKED q24 | Closed | FB | PRODUCTION-ONLY |
| Q12 | TRG-164 L1165 | BLOCKED Q12 | Accepted, measure once | FB | COVERED (U-15) |
| Q25 | TRG-273 L1290 | BLOCKED Q25 | Accepted untested | FB | OFFLINE-ONLY |
| Q24 (master) | TRG-284 L1301 | BLOCKED | Decided | FB | PRODUCTION-ONLY |
| all | totals L23-35 | "GAPS: 0" | About 17 lines have no valid proof on at least one path; 9 false BLOCKED | WV | Restate the rows, recount, re-run the 0-gap check |

Section C rows for the ledger (restatement text; slice and master parts are already applied): CASE-049, -062, -063, -174, -177 to -180, -184, -188; OBJ-034; STF-077; CLB-063, -069, -133; TRG-143, -145, -146, -159, -195, -269, -289, -317 -> "Edit the Guardian Contact's phone (or email, first name, last name, state); the Case sync property changes; the Case workflow sends the webhook (or the poll queues the Case); the run's source is `hubspotWorkflow` (or `intakePoller`); CR shows the new value." A run that arrives only by `intakePoller` while the Case workflow is on is a trigger-list gap for Zeke. TRG-128, TRG-263 -> OFFLINE-ONLY (`stage6ContactRouting.test.mjs` [K4][6.2], [K1][6.1]); TRG-142 -> RETIRED pending Zeke's word; TRG-141, CASE-186 -> RETIRED for the Guardian half ("the production Case refresh workflow triggers on `guardian_first_name`, `guardian_last_name`, `email`, `phone`, `location` (d51; Ruling A deploys it from the sandbox)"). Count: 3 ledger lines in the BLOCKED class on O-21, 18 ledger lines "BLOCKED on O-21 if no Contact webhook" (counting the header caveat).

### 5.2 `sandbox-test-matrix.md` (audit 2.6, rows with M, and section C)

| Override | Where | What it says | What is current | Effect | Fix |
|---|---|---|---|---|---|
| P16 | M L77 (round 1 notes) | the script sets `care_coordinator_name` | Item 6 fields | SW | Reword |
| d53 | M L78 | sets `dob` = B5, `date_of_birth` = decoy | Reverse: B5 is `date_of_birth`, `dob` is the decoy | SW | Reverse the sentence |
| d50 (T9) | M L80 | "code at 793e2db still requests `personal_email` on the BT/RBT … push waits" | Held; not requested | SW | Strike |
| d58 | M BR10/BR3 L148 | "no format check yet (O-8)" | 7-digit check | SW | Replace |
| R02 | M C6 L180, C7 L181, C8 L182 (U1) | "via K1" | Case sync property → Case webhook or poll | SW | Replace |
| R02 | M C8 unreadable L183 | "from the Contact fan-out, K1, or the Case `phone` webhook" | Case webhook or poll | SW | Drop the fan-out |
| d56 | M C24 L200 | lists `full_home_address` among the set properties | Not read, not set | SW | Remove |
| d56 | M C24 U1 L200 | "`service__stateregion_2` blank → the Case state" | The script always fills it, so the fallback is never exercised | MT | Blank it in an S4 step |
| P15 | M C25 L201 | no junk Address 2 case | `null` | MT | Add an R3 More Than One Location step `",  , New Jersey "` → 138091 blank |
| P16 | M C36 L212 | waits on "the build change, item 2" | Built | SW | Delete condition (1) |
| R02 | M K1 L280 | "Log (fan-out queued 1 Case)" | Case run `source` `hubspotWorkflow` (or `intakePoller`) | FB | Change the check |
| d44 | M K3 L282 | "K1 checks that the fan-out queued 1 Case and no BCBA" | No fan-out | SW | Reword |
| R02 | M K4 L283 | Contact `test_record` → "fan-out queues nothing" | Optional code | FB | Optional; out of P1 |
| O-26 | M K5 L284 | "The daily sweep is the fallback" | Poller, then sweep | SW | Reword |
| P16 | M exclusions L299 | "138851 = `care_coordinator_name`" | First + last when `ready` | WV | Replace |
| P18 | M L327 | "update-with-blank rule is HELD (question 27)" | Decided | SW | Strike |
| P16 | M L370 | "Decision 39: C10 reads `care_coordinator_name`" | Superseded | SW | Add the supersession |
| P15-P19 | M L389 and tags at C10 L186, C12 L188, C26 L202, C28 L204, R2-17 L456, R2-27 L472, R2-29 L473, R3-16 L494, R3-17 L495, R3-18 L496, U-14c L519, U-49 L553, L580 | "(build pending)", "being built", "rule 7 test pending" | In the WT (uncommitted) | SW | Replace with "built, uncommitted" |
| R02 | M path legend L389 | "fan-out" = Contact webhook | Optional; Guardian rows use "both" | SW | Add a note |
| R02; d51 | M SU-6 L402 | trigger check lists only `service__stateregion_2` and the coordinator fields | Must also list `guardian_first_name`, `guardian_last_name`, `email`, `phone`, `location` (and `referral_source`) | MT | Add them |
| R02 | M G-5 L429 | "Contact fan-out … BLOCKED on O-21" | Case run `skipped` `record_gate` | FB | Path "both"; drop BLOCKED |
| R02 | M R2-23g L468 | "`contactFanOut` queued 1 Case … BLOCKED on O-21" | Case `phone` sync → Case webhook | FB | Restate |
| P15 | M R2-27 L472 | `home_apt` = "Colorado" → `null` | The junk rule covers C25 (`service_address__other` → 138091) only; core `home_apt` has none (`buildClientPayload.mjs:54`) | WV | Replace with the C25 junk row |
| R02 | M R3-13g L492 | as R2-23g | Case path | FB | Restate |
| R02 | M U-04 L507 | "sends a Contact webhook … BLOCKED on O-21" | Case path, `source` `hubspotWorkflow` | FB | Restate |
| R02 | M U-48 L552 | "no run within one poll = depends on O-21" | A trigger-list gap for Zeke | FB | Restate |
| R02; R06 | M X02-5 L599 | "fan-out, then poller" | Path "both"; no Case property change, so no run or `noop` | FB | Restate |
| (not a recency override) | M X07a-1 L606; path legend L389 | BT/RBT poll `source` `intakePoller` | Employee poll runs carry `employeePoller` (`intakePollerWorkflow.mjs:84`); only the Case poll is `intakePoller` (`:101`) | WV (extra; not counted above) | Use `employeePoller` for BT/RBT and BCBA |

Section C rows for the matrix: K1, U-04, R2-23g, R3-13g: "Edit the Guardian Contact's phone (or email, first name, last name, state); the Case sync property changes; the Case workflow sends the webhook (or the poll queues the Case); the run's source is `hubspotWorkflow` (or `intakePoller`); CR shows the new value." U-04 also checks "one Case run, no BCBA run". G-5: "Edit the R1 Guardian Contact's `firstname`; `guardian_first_name` changes; the Case workflow sends the webhook; the run ends `skipped` `record_gate`, `crCalls` empty; the poller does not queue it". U-48: "Guardian `state_dropdown` -> New Jersey; Case `location` recalculates; Case webhook if `location` is a trigger, else the poll; record `source` and delay; NY Client removed, NJ Client added." No run within one poll is a Case trigger or K6 item, not O-21. X02-5: path "both"; a second Guardian's edit changes no Case property, so no Case run (or `noop`); CR unchanged. K4: optional fan-out code; not P1. Add the four Guardian fields, `location` and `referral_source` to SU-6 (cutover 4.10 too).

### 5.3 `sandbox-rounds/retest-run-sheet-2026-11-24.md` (audit 2.6, rows with RS, and section C)

| Override | Where | What it says | What is current | Effect | Fix |
|---|---|---|---|---|---|
| R02 | RS #2 L14 | prerequisite "sandbox Contact workflow (O-21)" | The Case trigger list holds the Guardian sync fields | FB | Replace |
| R02 | RS S3b L71 | G-5 "(fan-out; BLOCKED on O-21 …)" | Case path | FB | Replace |
| R02 | RS S4 L78 (old line 64) | reuses "fan-out queued 1 Case" | Case run `source` | FB | Add line 64 to the change list |
| P19 | RS S4 L78 (old line 44) | Meta 126214 "No" | "None" | WV | Add to the change list |
| d54 | RS S4 L78 (old line 48) | "Dr AzT 1 Commercial, 2000000001" | One space, no comma | WV | Add to the change list |
| P15 | RS S4 CO L79 | `home_apt` → "Colorado" (R2-27) | C25 on a More Than One Location Case | WV | Move to NJ / C25 |
| R02 | RS S4 L79, L80 | Guardian `phone` (R2-23g / R3-13g) as fan-out | Case path | FB | Relabel |
| R02 | RS S7 L101 (K4, old 72-74) | "`contactFanOut` skipped … Needs the Contact webhook" | Optional | FB | Not P1 |
| P19 | RS S7 L101 / S5 L92 (old line 76) | Meta 133826 "Level 3" | "3" | WV | Restate |
| R02 | RS Q1 L134 | "Without it U-04, G-5, R2-23g, R3-13g … become BLOCKED" | Only K4 needs a Contact webhook | FB | Settle (Zeke to confirm) |

Section C rows for the run sheet: RS L14, L134: replace "sandbox Contact workflow (O-21)" with "the Case trigger list holds the four Guardian sync fields and `location`". RS S3b L71 = G-5 text above. K4; RS S7 L101: optional fan-out code, not P1.

### 5.4 Scripts (audit 2.6)

| Override | Where | What it says | What is current | Effect | Fix |
|---|---|---|---|---|---|
| P16 | `scripts/sandbox/create-test-records.mjs` L265-267 | `care_coordinator_name` set to the same name as the new fields | Not read; it should be a decoy | MT | Give it a different value |
| P19, P16 | `scripts/sandbox/check-cr-record.mjs` L202, L215 | "being built"; "FAILs until the build change" | Built | SW | Update the comments |

Also (audit 2.7): `scripts/check-triggers.mjs` L13-14 still says `CONTACT_TRIGGER_PROPERTIES` are for "a Guardian or BCBA Contact change". The BCBA half is retired (d44), and under section C the Guardian half belongs on the Case list, which already carries the four properties. Reword the comment.

### 5.5 `BUILD-PLAN.md` (audit 2.7; last edited 11/24 10:53)

- **BUILD-PLAN.md** (last edited 11/24 10:53):
  - Decision 55 text (L194) still says "a blank supplier sends blank" and "Held: rule 7 … typed supplier as typed".
  - C10 (L620) still names decision 39 and O-53.
  - C12 (L622) says "A blank typed supplier clears 131308 (O-58)".
  - C13, C25, C26, C28 and C36 rows: "held/not built" (O-54, O-55, O-56, O-60).
  - B5 (L671): "held for review (O-52)".
  - B10 (L676): "Label or profile field? (O-27)", answered by P26.
  - K1 (L725) "Waits on O-21"; K5 (L729); Stage 6 note L925, "Live testing … waits for the sandbox Contact workflow (O-21)".
  - O-21, O-27 and O-52 to O-60 (L1029-1068) still open.
  - O-15 and O-16 rest on decision 55 without the 11/24 confirmation.
- **BUILD-PACKAGE-DRAFT** still assumes a Contact workflow exists: D18 a (L767), L818 ("the Contact workflow only fans out"), BR4-X step 2 "(fan-out)" (L871), L932, G24 (L1016).
- **scripts/check-triggers.mjs** L13-14 still says `CONTACT_TRIGGER_PROPERTIES` are for "a Guardian or BCBA Contact change". The BCBA half is retired (d44), and under section C the Guardian half belongs on the Case list, which already carries the four properties.

Section C also asks BUILD-PLAN: K1 (L725) "Waits on O-21" and Stage 6 note L925 -> Case path; O-21 -> ask Zeke for the one-line confirmation that it is superseded for the Guardian fields (do not close it without his word).

### 5.6 `BUILD-PACKAGE-DRAFT-2026-11-23.md` (audit 2.7)

- Still assumes a Contact workflow exists: D18 a (L767), L818 ("the Contact workflow only fans out"), BR4-X step 2 "(fan-out)" (L871), L932, G24 (L1016). Restate BR4-X step 2 as: edit the Guardian Contact `firstname`; `guardian_first_name` changes; the Case workflow sends the webhook; the run ends `skipped` `record_gate`, `crCalls` empty (G-5).

### 5.7 Guide draft / guide inserts (audit section D)

Insert-only notes for the guide are listed in audit section D (lines 934-972 of the audit file), including the Contact-workflow lines L455, L790, L822, L860, L1268, L1598, L1608 (Guardian values are Case sync fields; no Contact workflow is needed, subject to Zeke's word on O-21), L452/L456, BCBA personal email lines, L342, L346, L337, L338/L405/L432/L210, L204, L280, L361/L510, L363-366/L512-513/L552-561, L369/L517, L370/L518, L373/L521-522, L374/L377, L380/L530, L382, L383-384/L418/L605-609/L693, staffing label lines, L387-389/L672-679, L413/L439/L686/L700/L741, L416-417/L692, L440, L392/L420/L442/L1040-1194, L599/L771. The guide draft file itself (`GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md` and the inserts) was not audited and not touched; the guide-currency slice 08 section 5 keeps the crosswalk. Another worker should apply section D to the draft by reading audit lines 934-972.

