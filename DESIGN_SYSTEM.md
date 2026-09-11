# MonoPOS Design System Guidelines (Luma + Geist + Zinc/Blue)

## 1. Non-Negotiable Layout Preservation
- Do NOT alter structural layouts, grid templates, flex directions, 60/40 splits, or keypad registers.
- All refactoring must strictly target styling (colors, borders, shadows, radii, typography).

## 2. Surfaces & Geometry
- App Canvas: bg-slate-50/70 or bg-[var(--background)]
- Cards & Containers: bg-white rounded-2xl border border-zinc-200/80 shadow-xs
- Dialogs / Modals: White cards with rounded-3xl border border-zinc-200 shadow-xl and bg-slate-900/40 backdrop-blur-xs overlay.

## 3. Button Hierarchy
- Primary Counter Actions (Pay, Save, Add Item): bg-primary hover:opacity-90 text-white rounded-xl h-11 px-5 shadow-xs font-medium
- Hardware & Execution (Print, Replenish, Finalize Shift): bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-5 shadow-xs font-medium
- Secondary & Dismiss (Cancel, Back, Done): bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl h-11 px-4 font-medium
- Destructive (Void, Discard): bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl h-11 px-4

## 4. Typography & Numbers
- Font: Geist Sans for UI text; Geist Mono for receipt tokens and barcodes.
- Financial Accuracy: Apply tabular-nums tracking-tight to all currency amounts (₹), quantities, percentages, and totals.
