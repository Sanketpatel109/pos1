# Strict Engineering & UI Rules for MonoPOS

## Active Design System & Style Guide: Preset `b1ZhhFbQB` (`base-lyra` / `zinc`)

The repository exclusively uses the official Shadcn UI **Preset `b1ZhhFbQB`**:
- **Style**: `base-lyra` (Base UI primitives via `@base-ui/react`)
- **Base Color**: `zinc`
- **Tailwind CSS**: v4 with `@theme inline` design tokens in `src/index.css`
- **Component Registry**: `@/components/ui/` (`components/ui/`)

All previous style guides (e.g. `base-vega`, `olive`) are deprecated and removed. Only preset `b1ZhhFbQB` is permitted.

### 1. Only Use Pre-Defined Shadcn Components
All visual UI elements (buttons, inputs, cards, dialogs, badges, selects, tables, labels, tabs, checkboxes) must **strictly and exclusively** use the Shadcn UI components installed in `@/components/ui/` (`components/ui/`):

| Component | Import Path | Allowed Variants & Sub-components |
| :--- | :--- | :--- |
| **Button** | `@/components/ui/button` | `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`; sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg` |
| **Badge** | `@/components/ui/badge` | `default`, `secondary`, `outline`, `destructive` |
| **Card** | `@/components/ui/card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| **Dialog** | `@/components/ui/dialog` | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` |
| **Input** | `@/components/ui/input` | `Input` (standard Shadcn text/number/search/tel input) |
| **Label** | `@/components/ui/label` | `Label` |
| **Select** | `@/components/ui/select` | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator` |
| **Table** | `@/components/ui/table` | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` |
| **Tabs** | `@/components/ui/tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| **Checkbox** | `@/components/ui/checkbox` | `Checkbox` |
| **Separator** | `@/components/ui/separator` | `Separator` |

### 2. Explicitly Prohibited
- **NO External Component Libraries**: Do not install or import MUI, Ant Design, Chakra UI, React-Bootstrap, Mantine, or any outside UI libraries.
- **NO Ad-hoc Custom Primitives**: Do not write custom `<div className="...">` wrappers pretending to be buttons, badges, inputs, or cards when a Shadcn component already exists.
- **NO Inlined Non-Standard Styles**: Do not override canonical Shadcn layouts or inject arbitrary borders/shadows that distort official Shadcn components (maintain standard `Card`, `Button`, and `Dialog` conventions).
- **NO New UI Components Without Direct User Approval**: If a new primitive is needed from Shadcn, install using `pnpm dlx shadcn@latest add <component>` adhering to preset `b1ZhhFbQB`.

### 3. Design Tokens & Styling Conventions
- Always use Tailwind CSS classes mapped to Shadcn CSS variables:
  - Backgrounds: `bg-background`, `bg-card`, `bg-muted`, `bg-popover`, `bg-primary`, `bg-accent`, `bg-destructive`
  - Foregrounds / Text: `text-foreground`, `text-muted-foreground`, `text-primary-foreground`, `text-destructive-foreground`
  - Borders: `border-border`, `border-input`
  - Rings: `ring-ring`
- For icons, strictly use `lucide-react` with standard sizing (`size-3.5`, `size-4`, `size-5`).

### 4. Enforcement Checklist Before Any Git Commit or Deployment
1. Did you import components from `@/components/ui/...`?
2. Are all buttons `<Button ...>`?
3. Are all inputs `<Input ...>`?
4. Are all badges `<Badge ...>`?
5. Are all modal overlays `<Dialog ...>`?
6. Are all card surfaces `<Card><CardContent>...</CardContent></Card>`?
7. Does `npm run build` pass with zero TypeScript/lint errors?
