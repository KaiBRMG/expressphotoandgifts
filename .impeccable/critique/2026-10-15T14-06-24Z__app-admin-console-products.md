---
target: app/admin/(console)/products
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/kai/Projects/expressphotoandgifts/app/admin/(console)/products"
timestamp: 2026-10-15T14-06-24Z
slug: app-admin-console-products
---
Method: dual-agent (A: design review · B: detector + browser). Coverage: products pages behind login; both assessments from source; overlay ran on login page only.

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | No loading.tsx/error.tsx under app/admin |
| 2 | Match System / Real World | 4 | Shop language throughout |
| 3 | User Control and Freedom | 2 | No undo after save; Back unguarded; no Duplicate |
| 4 | Consistency and Standards | 3 | Missing price has three names |
| 5 | Error Prevention | 3 | Live price change saves with no before→after; category pre-selected silently |
| 6 | Recognition Rather Than Recall | 3 | Flags visible but not filterable |
| 7 | Flexibility and Efficiency | 1 | Only ⌘S; no bulk, duplicate, row toggles, needs-work view; sort not in URL |
| 8 | Aesthetic and Minimalist Design | 3 | Row can say missing price twice |
| 9 | Error Recovery | 3 | New-product server error not on its field |
| 10 | Help and Documentation | 2 | "Type" vs category unexplained |
| **Total** | | **27/40** | **Acceptable** |

## Design Specificity Verdict
Voice and readiness model are shop-specific; structure is a generic Mantine admin list. Missing the real workload: readying ~100 imported products, seasonal Specials, product families. Detector: 0 findings on products and editor.

## Priority Issues
- [P1] Work queue visible but not workable: no Needs-work filter/sort, flags visually weak (ProductsTable.tsx:196-204, admin.css:556), no "next product" after save. → /impeccable layout, /impeccable onboard
- [P1] Phone at the counter: 76px rail at all widths (admin.css:215), status SegmentedControl flex:none overflows, nowrap price/status force sideways scroll, editor tabs hide scrollbar (admin.css:711). → /impeccable adapt
- [P2] No bulk actions, quick row toggles or Duplicate. → /impeccable shape
- [P2] Live-product saves: no before→after for prices or publishing, no undo. → /impeccable harden
- [P3] Duplicate "No price"/"Not priced"; New product pre-selects category (NewProductForm.tsx:12); server error not on field (:50-52); leave guard misses Back (useLeaveGuard.ts); no loading/error boundaries. → /impeccable clarify, /impeccable harden

## Persona Red Flags
- Alex: no bulk/duplicate/shortcuts; sort lost on Back; search misses SKU/tag/category.
- Sam: flags unlabelled spans; row overlay blocks copying code/SKU.
- Counter staff: filter overflow, sideways table, key fix on hidden last tab, preview below form, Showing vs Hidden only a 9px dot.

## Minor Observations
Blank thumbnail reads as loading; Retired barely recedes; long names unclamped on mobile; 13.5–14px text at 46–62rem; when() "Today" can disagree around midnight.

## Questions to Consider
Open on Needs work? Edit families/seasons rather than single products? Counter phone as the primary admin device?
