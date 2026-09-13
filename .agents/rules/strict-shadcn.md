---
name: strict-shadcn-components
description: Enforce strict usage of already-defined Shadcn UI components across all code changes
trigger: always_on
---

# Strict Shadcn UI Component Rule

1. **Already-Defined Components Only**:
   All UI modifications MUST strictly use the pre-installed Shadcn UI components in `@/components/ui/`:
   - `Button` from `@/components/ui/button`
   - `Badge` from `@/components/ui/badge`
   - `Card` from `@/components/ui/card`
   - `Dialog` from `@/components/ui/dialog`
   - `Input` from `@/components/ui/input`
   - `Label` from `@/components/ui/label`
   - `Select` from `@/components/ui/select`
   - `Table` from `@/components/ui/table`

2. **No Outside UI Libraries**:
   Do NOT import or install any outside UI libraries (MUI, Chakra, AntD, Mantine, Bootstrap).

3. **No Duplicate Ad-hoc Primitives**:
   Always use standard Shadcn primitives for buttons, badges, inputs, labels, cards, dialogs, and tables. Do not create fake custom `<div>` buttons or non-standard wrappers.

4. **Consistency**:
   Follow canonical Shadcn tokens (`bg-background`, `text-foreground`, `border-border`, etc.) and `lucide-react` icons.
