# Formula corrections — 11 October 2026

The calculation fixes preserve the bundled example's current calibration: LT1 14.76 km/h, LT2 15.74 km/h, the seven-zone speed boundaries, ordinary interval targets, repetition/recovery presets, and race predictions with and without the 18:00 5 km input.

## Corrected behavior

- Fixed-lactate methods require an actual rising curve crossing, including genuine tested endpoints. Flat curves, missing tangent/inflection solutions, and unidentifiable Dmax shapes return unavailable results instead of arbitrary endpoints.
- Repeated speeds use arithmetic sum/count means for lactate and HR. Fitting failures and insufficient distinct speeds are handled without crashing. Negative lactate, nonpositive pace/speed, and malformed time components are rejected.
- Baseline-based methods require an initial measurement block before the first qualifying rise. A nonflat test with no qualifying rise is not averaged in its entirety as a baseline.
- Manual interval edits require ordered time and repetition bounds. Valid time edits update category pace/speed summaries. Edits to recovery or repetitions preserve the existing pace precision.
- The Daniels solver checks for a root within the intersection of the existing 5–28 km/h speed range and 3.5–260 minute duration range. Rounding remains within those bounds, and final threshold-capped durations are checked again.
- An observed result at the exact requested race distance takes priority over cross-distance projections. When several results exist at that distance, the fastest valid observation is used deterministically. Other distances retain median Riegel projections and the existing blend.
- For short repeats anchored to an observed same-distance performance, factors below one represent a fraction of speed and therefore divide time. A 200 m best of 30 s yields sprint targets of 31.58–33.33 s at 95–90% of its average speed. The existing time windows for short repeats projected from an endurance race are preserved.
- Maximum HR constraints below recorded HR are rejected with an explanation. Inverted or overlapping HR boundaries are left unavailable rather than shifted downward. HR ranges identify interpolated, estimated, partial, and unavailable support; partial ranges are not labeled reliable.
- The maximum-lactate result retains both the separate all-out reading and the stage peak. The highest eligible observed lactate feeds maximum-dependent calculations, without adding the all-out measurement to the threshold curve.
- The existing 3% test-peak adjustment fades continuously from its full value at 4 mmol/L to zero at 6 mmol/L. The threshold term is unchanged; endpoints at or above 6, including the example's 12 mmol/L, retain the previous peak term. This removes a numerical discontinuity without claiming a new physiological calibration.
- A sharp terminal lactate rise remains a warning. It is not labeled an outlier solely because it is large; residual inconsistencies or explicit user flags still support outlier handling. Relevant critical warnings accompany threshold results.
- Method labels describe the retained LT1-anchored Dmax variant and the polynomial-inflection comparison. Legacy IDs remain compatible.

## Preserved example outputs

| Output | Lactate example only | With an entered 18:00 5 km |
|---|---:|---:|
| LT1 | 14.76 km/h | 14.76 km/h |
| LT2 | 15.74 km/h | 15.74 km/h |
| Easy 1000 m | 4:01.5–4:16.7 | Same |
| Threshold 1000 m | 3:41.0–3:49.9 | Same |
| VO2 400 m | 1:15.3–1:20.8 | Same |
| Sprint 200 m | 32.8–35.8 s | 32.1–33.8 s |
| Predicted 5 km | 18:04 | 18:00 |
| Predicted 10 km | 38:19 | 37:56 |
| Predicted marathon | 3:04:53 | 3:01:01 |

The zone speed ranges remain 9.6–11.8, 11.8–14.0, 14.0–15.3, 15.3–15.7, 15.7–16.2, 16.2–18.9, and above 18.9 km/h. Improved HR support labels and method descriptions are intentional display changes.

## Verification

- All 64 local Vitest cases pass, including 45 added regression cases covering the example and fake input scenarios.
- TypeScript compilation and production build succeed. Lint succeeds with the existing Fast Refresh warning in the chart module; the production build retains its existing bundle-size advisory.
- Older reference expectations were corrected to use current zone percentages and measured HR interpolation. The tests now leave unmeasured low-speed HR unavailable and avoid overlapping VO2/NMR ranges when there is no distinct HR boundary.
- Two independent WebAgentGPT workers proposed and checked bounded code changes. Their proposals were reviewed locally before integration; the full application was verified locally rather than relying on a worker's partial harness.
- A separate WebAgentGPT worker executed the final transpiled calculation bundle directly in Node.js 22.16.0: all 50 checks passed, comprising 43 fake-data cases and seven example checks. Sixteen cases deliberately returned unavailable results, with no execution errors. The complete returned records are in [the browser test evidence](formula-corrections-browser-tests-2026-10-11.json).

Fake input tests verify arithmetic and handling of unsupported inputs; the example is a preservation fixture rather than evidence of physiological prediction accuracy.
