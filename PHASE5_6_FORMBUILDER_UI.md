# PHASE 5 — FORM BUILDER COMPLETE REDESIGN
### Non-Technical User Friendly · dnd-kit · Three-Panel Layout
### Requires Phases 1–4 complete

---

> **GOAL:** A complete rebuild of the form builder UI.
> The existing form builder works technically but is confusing for non-technical users.
> After this phase, any person must be able to create a player form in under 5 minutes
> without reading any instructions.
> Do NOT change the backend FormConfig schema — only the frontend UI changes.

---

## Step 5.1 — Install Dependencies

```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Why dnd-kit:**
- `react-beautiful-dnd` is unmaintained (last commit 2022) — do NOT use it
- dnd-kit is the current standard: accessible, touch-friendly, TypeScript-first, actively maintained
- Works with React 19 without compatibility issues

---

## Step 5.2 — Redesign the Form Builder Layout (Three-Panel)

**Replace the existing form builder component entirely** with this layout.
Keep the same file name and route so nothing else breaks.

The new form builder must have exactly three panels in a horizontal layout:

```
┌─────────────────────┬───────────────────────────────┬──────────────────────────┐
│   ADD FIELDS        │   YOUR FORM                    │   PREVIEW                │
│   (Panel 1)         │   (Panel 2 — drag to reorder) │   (Panel 3 — read only)  │
│                     │                                │                          │
│  [📝 Short Text  ]  │  ⠿ Player Name    [Required]  │  Player Name *           │
│  [🔢 Number      ]  │        [✎ Edit] [🗑 Delete]   │  ┌──────────────────┐    │
│  [📋 Dropdown    ]  │                                │  │                  │    │
│  [🖼️ Photo       ]  │  ⠿ Photo          [Optional]  │  └──────────────────┘    │
│  [📄 Long Text   ]  │        [✎ Edit] [🗑 Delete]   │                          │
│  [☑️ Yes/No       ]  │                                │  Photo                   │
│  [📅 Date        ]  │  ⠿ Category       [Required]  │  ┌──────────────────┐    │
│                     │        [✎ Edit] [🗑 Delete]   │  │  Choose File     │    │
│  ──────────────── │  │                                │  └──────────────────┘    │
│  Sport Templates:   │  [+ Click a field type         │                          │
│  [Cricket]          │     on the left to add it]     │  Category *              │
│  [Football]         │                                │  ┌──────────────────┐    │
│  [Basketball]       │  ───────────────────────────── │  │ Select...      ▼ │    │
│  [General]          │  [💾 Save Form]                │  └──────────────────┘    │
└─────────────────────┴───────────────────────────────┴──────────────────────────┘
```

**Responsive behavior:**
- On screens wider than 1024px: three panels side by side
- On screens 768–1024px: Panel 1 as a top bar, Panels 2 and 3 stacked
- On mobile: show Panels 1 and 2 only (preview is collapsed into a "Preview" tab)

---

## Step 5.3 — Panel 1: Field Type Picker

Each button in the field picker must:
- Show a large, recognizable icon
- Have a short, plain-English label (no technical terms)
- Have a tooltip explaining WHEN to use it
- Add the field instantly to the canvas on click (no dialog, no modal)

**Implement these field types with these exact labels:**

| Internal fieldType | Button Label | Icon | Tooltip |
|---|---|---|---|
| `text` | Short Text | 📝 | "For names, jersey numbers, hometown, and other short answers" |
| `number` | Number | 🔢 | "For age, weight, height, years of experience, and other numeric values" |
| `select` | Dropdown | 📋 | "For choosing from a list — e.g. position, category, skill level" |
| `file` | Photo Upload | 🖼️ | "Lets players upload a profile photo or document" |
| `textarea` | Long Text | 📄 | "For longer answers like player bio, achievements, or notes" |
| `checkbox` | Yes / No | ☑️ | "For a simple yes or no question — e.g. 'Is this player a captain?'" |
| `date` | Date | 📅 | "For date of birth, registration date, or any calendar date" |
| `email` | Email Address | 📧 | "For collecting player's email address" |
| `tel` | Phone Number | 📞 | "For collecting player's phone number" |

When clicked, the field is added to the canvas with smart defaults:
- Label: "[Field Type] [auto-number]" e.g. "Short Text 1", "Dropdown 2"
- Required: false (default optional, user changes if needed)
- The new field appears at the BOTTOM of the canvas and the canvas scrolls to it
- Immediately open the edit panel for the newly added field (so the user is prompted to name it)

**Sport Templates section** (at the bottom of Panel 1):
Show 4 template buttons. Clicking one REPLACES the current canvas with the template fields.
Show a confirmation: "This will replace your current form. Are you sure?"
Templates come from the existing backend hardcoded templates — use those.

---

## Step 5.4 — Panel 2: Form Canvas with Drag-and-Drop

**Implement with dnd-kit:**

```tsx
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Each field card is a SortableItem:
function FieldCard({ field, onEdit, onDelete, isSystemField }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.fieldName });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`bg-white border rounded-lg p-3 mb-2 ${isDragging ? 'shadow-xl' : 'shadow-sm'}`}>
      <div className="flex items-center gap-3">
        {/* Drag handle — always visible */}
        <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 text-xl select-none">
          ⠿
        </div>

        {/* Field type icon */}
        <span className="text-lg">{FIELD_TYPE_ICONS[field.fieldType]}</span>

        {/* Field label */}
        <div className="flex-1">
          <p className="font-medium text-gray-800">{field.fieldLabel}</p>
          <p className="text-xs text-gray-400">{FIELD_TYPE_LABELS[field.fieldType]} · {field.required ? 'Required' : 'Optional'}</p>
        </div>

        {/* Required badge */}
        <span className={`text-xs px-2 py-0.5 rounded-full ${field.required ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
          {field.required ? 'Required' : 'Optional'}
        </span>

        {/* Actions */}
        {!isSystemField && (
          <div className="flex gap-1">
            <button onClick={() => onEdit(field)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Edit field">✎</button>
            <button onClick={() => onDelete(field)} className="p-1.5 text-red-400 hover:bg-red-50 rounded" title="Delete field">🗑</button>
          </div>
        )}
        {isSystemField && (
          <span className="text-xs text-gray-400 italic">System field</span>
        )}
      </div>

      {/* Inline edit panel — expands below the card when editing */}
      {isEditing && <FieldEditPanel field={field} onChange={onFieldChange} />}
    </div>
  );
}
```

**Empty state for canvas:**
When no fields have been added yet, show:
```jsx
<div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400">
  <div className="text-4xl mb-3">👈</div>
  <p className="text-lg font-medium">Click a field type on the left to start</p>
  <p className="text-sm mt-1">Or choose a sport template to get started quickly</p>
</div>
```

---

## Step 5.5 — Inline Field Edit Panel (NO MODALS)

When the user clicks ✎ on a field, an edit panel **expands inline below that field card** — no modal, no drawer, no popup.

The edit panel must show only settings relevant to that field type. Plain English labels on everything.

**Fields shown for ALL types:**
```
Field Label:     [________________________]   (the name shown to players)
Helper Text:     [________________________]   (optional hint shown below the input)
Required?        [Toggle: ON / OFF]
```

**Additional fields for specific types:**

For `number` only:
```
Minimum value:   [___]   (leave blank for no minimum)
Maximum value:   [___]   (leave blank for no maximum)
```

For `select` (Dropdown) only:
```
Options:
  Option 1: [________________] [×]
  Option 2: [________________] [×]
  [+ Add another option]

Allow selecting multiple?  [Toggle: ON / OFF]
```

For `file` (Photo Upload) only:
```
Max file size:  [Dropdown: 1 MB / 2 MB / 5 MB / 10 MB]
```

For `text` and `textarea`:
```
Max characters:  [___]   (leave blank for unlimited)
```

**DO NOT SHOW:**
- "Field Name" (the technical internal key — auto-generate from label)
- "Field Type" (user already chose this by clicking the button)
- "Order" (managed by drag-and-drop)
- "Validation regex" or any regex field
- Any developer-facing concepts

**Auto-generate `fieldName` from label:**
```javascript
function labelToFieldName(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}
// "Player Name" → "player_name"
// "Date of Birth" → "date_of_birth"
```

---

## Step 5.6 — Pre-Populate with Starter Template

When the form builder opens for a **NEW form** (no existing FormConfig), automatically populate with:

```javascript
const STARTER_FIELDS = [
  {
    fieldName: 'name',
    fieldLabel: 'Player Name',
    fieldType: 'text',
    required: true,
    order: 1,
    isSystemField: true,  // Cannot be deleted
  },
  {
    fieldName: 'photo',
    fieldLabel: 'Player Photo',
    fieldType: 'file',
    required: false,
    order: 2,
  },
  {
    fieldName: 'category',
    fieldLabel: 'Category',
    fieldType: 'select',
    required: true,
    options: ['Category A', 'Category B', 'Category C'],
    order: 3,
  },
];
```

The "Player Name" field must be marked as `isSystemField: true` — show it with a lock icon, no delete button, and a tooltip: "Player Name is required and cannot be removed."

---

## Step 5.7 — Panel 3: Live Preview

Panel 3 renders the exact form the player will see, in real time as the canvas changes.

Rules for the preview:
- Non-interactive: inputs are shown but cannot be typed into (use `disabled` or `readOnly` attribute, styled to look like the real form)
- Shows asterisks on required fields
- Shows placeholder text / helper text
- Shows dropdown options for select fields
- Updates instantly as fields are added, deleted, reordered, or renamed
- Has a small "This is how players will see your form" label at the top

---

## Step 5.8 — Save Button & Auto-Draft

**Save button behavior:**
- Sticky at the bottom of Panel 2
- Shows "💾 Save Form" normally
- Shows "✓ Saved" (green) for 2 seconds after a successful save
- Shows "Saving..." with a spinner while saving
- If there are validation errors, shows them inline (not in a toast) — e.g., "Dropdown field 'Position' has no options"

**Auto-draft every 30 seconds:**
- Save the current form state to localStorage as a draft every 30 seconds
- Show a quiet indicator: "Draft auto-saved 30s ago"
- On page load, if a draft exists that's newer than the last saved form, show: "You have unsaved changes from [time]. [Restore] [Discard]"

**Unsaved changes indicator:**
- Show a yellow dot in the browser tab title: "● Form Builder" when there are unsaved changes
- Show "Unsaved changes" text below the Save button

---

## Step 5.9 — Delete Confirmation (Safety)

When the user clicks 🗑 to delete a field:

**If the form has never been saved / has no registered players:**
Delete immediately without confirmation.

**If there are already registered players:**
Show an inline warning card (not a modal) directly below the field:
```
⚠️  23 players have already filled in "Jersey Number".
    Deleting this field will remove their answers permanently.

    [Cancel]  [Yes, delete this field]
```

This check requires a call to `GET /api/players/count` filtered by auctioneer — make this fast (countDocuments only, no data returned).

---

## Verification After Phase 5

**Test 1 — First-time user flow:**
1. Clear all form configs from the database
2. Open the form builder fresh
3. Confirm: starter template is pre-populated (Name, Photo, Category)
4. Confirm: Panel 3 preview shows the starter form immediately

**Test 2 — Add and configure a field:**
1. Click "Dropdown" in Panel 1
2. Confirm: new field appears in Panel 2, edit panel opens automatically
3. Change the label to "Playing Position"
4. Add options: "Batsman", "Bowler", "All-Rounder"
5. Confirm: Panel 3 preview immediately shows a dropdown called "Playing Position" with those 3 options

**Test 3 — Drag to reorder:**
1. Have 4 fields in the canvas
2. Drag field 3 to position 1
3. Confirm: the reorder works smoothly
4. Confirm: Panel 3 preview reflects the new order immediately

**Test 4 — Cannot delete system field:**
1. Try to delete "Player Name"
2. Confirm: there is no delete button on this field

**Test 5 — Save and reload:**
1. Build a form with 5 fields
2. Click Save
3. Confirm: "✓ Saved" appears
4. Refresh the page
5. Confirm: the same 5 fields load correctly

---

---

# PHASE 6 — UI POLISH & DISPLAY IMPROVEMENTS
### Apply to Every Page · Numbers, Colors, Empty States, Layout
### Requires Phases 1–5 complete

---

## Step 6.1 — Shared Currency Formatter (Apply Everywhere)

Create `frontend/src/utils/formatters.ts`:

```typescript
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};
// ₹0 → ₹0    ₹10000 → ₹10,000    ₹100000 → ₹1,00,000

export const formatNumber = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-IN').format(n);
};

export const getBudgetColorClass = (remaining: number, initial: number): string => {
  if (!initial || initial === 0) return 'text-gray-500';
  const pct = remaining / initial;
  if (pct > 0.4) return 'text-green-600';   // >40% left — comfortable
  if (pct > 0.15) return 'text-amber-500';  // 15–40% — caution
  return 'text-red-600';                     // <15% — danger
};

export const getBudgetBgClass = (remaining: number, initial: number): string => {
  if (!initial || initial === 0) return 'bg-gray-100';
  const pct = remaining / initial;
  if (pct > 0.4) return 'bg-green-50';
  if (pct > 0.15) return 'bg-amber-50';
  return 'bg-red-50';
};
```

Search the entire frontend for any hardcoded `₹`, `.toLocaleString()`, `toFixed()`, or manual budget math.
Replace ALL of them with calls to `formatCurrency()`.

---

## Step 6.2 — Teams Page: Redesigned Team Cards

Each team card must show:

```
┌─────────────────────────────────────────────┐
│  [Logo]  Team Name                  [●FULL] │  ← Red "FULL" badge when no slots left
│                                              │
│  Budget Used:  ████████░░░░  67%            │  ← Progress bar
│  ₹6,700 spent of ₹10,000                    │
│  ₹3,300 remaining          (green/amber/red) │
│                                              │
│  Players: 4 / 6 slots filled                │
│  ────────────────────────────────           │
│  • Rahul Kumar         ₹2,100               │
│  • Anjali Singh        ₹1,800               │
│  • Mohammed Faiz       ₹1,400               │
│  • Priya Nair          ₹1,400               │
│  [Show all 4 players ▼]                     │
└─────────────────────────────────────────────┘
```

**Implementation details:**
- Budget progress bar: width = `(totalSpent / budget) * 100%`
- Progress bar color: green → amber → red based on `getBudgetBgClass`
- Player list: show first 3, then "Show all X players ▼" expandable
- Sort teams by: most players first (teams actively buying should be at top)
- When team has 0 slots remaining: show red "FULL" badge in top right, hide from bidding UI
- When team has 0 budget: show red "Budget Exhausted" badge

---

## Step 6.3 — Live Auction Page: Budget Sidebar

In the live auction view, the sidebar showing all teams must:

- Show remaining budget in large, color-coded text (using `getBudgetColorClass`)
- Gray out teams that cannot afford the current base price (if a base price is set for the current player)
- Show a 🔥 icon next to teams with less than 15% budget remaining
- Show a "FULL" badge next to teams with no slot remaining
- Sort teams by remaining budget DESCENDING (teams with most to spend at top — most relevant during bidding)
- When a player is sold, the winning team's card should briefly flash/highlight to confirm the sale

---

## Step 6.4 — Results Page: Complete Redesign

Replace the current results page with this structure:

**Section 1 — Summary Bar (top):**
```
[Total Registered: 45] | [Sold: 32] | [Unsold: 8] | [Available: 5] | [Total Spent: ₹3,24,000]
```
These come from the `getAuctionResults` endpoint built in Phase 3.

**Section 2 — Team Standings Table:**
| Rank | Team | Players | Total Spent | Remaining Budget | Slots Used |
|------|------|---------|-------------|------------------|------------|
| 1 | Mumbai XI | 8 | ₹1,20,000 | ₹30,000 | 8/10 |
| 2 | Delhi Kings | 7 | ₹95,000 | ₹5,000 | 7/10 |

- Click on a row to expand it and show all players for that team
- Sort by clicking column headers
- Export as CSV button (generates downloadable file)

**Section 3 — Unsold Players:**
A collapsible section showing all players with status "unsold".
Show player photo, name, category, and base price.

**Section 4 — Available (Not Yet Auctioned) Players:**
A collapsible section showing players still in "available" status.

**All numbers on this page must come from the `getAuctionResults` API endpoint (Phase 3)**, not from local state or accumulated counters.

---

## Step 6.5 — Meaningful Empty States (Replace All Misleading Zeros)

Search the entire frontend for places where `0` or empty arrays are displayed without context.

Replace each one with an appropriate message:

| Current Display | Replace With |
|---|---|
| "Remaining Budget: ₹0" when no budget set | "No budget limit set" |
| "0 players" on a new team | "No players yet — start bidding!" |
| "Filled: 0 / 5" on a new team | "0 / 5 players · Waiting for auction" |
| Empty results table | "Auction hasn't started yet — results will appear here" |
| "0 sold" on results page before auction | "Auction in progress..." |
| Player card with no photo | Show a person silhouette icon placeholder |

---

## Step 6.6 — Player Status Badges (Consistent, Color-Coded)

Create a shared `<StatusBadge status={player.status} />` component.
Use it everywhere a player status is displayed.

```tsx
const STATUS_STYLES = {
  available: 'bg-green-100 text-green-700 border border-green-200',
  sold: 'bg-blue-100 text-blue-700 border border-blue-200',
  unsold: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const STATUS_LABELS = {
  available: '● Available',
  sold: '✓ Sold',
  unsold: '✗ Unsold',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status] || ''}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
```

---

## Step 6.7 — Player Cards: Display Sold Amount Prominently

When a player has been sold, their card must show:
- "✓ SOLD" badge in blue
- "₹[amount]" in large text below the name
- Team name the player was sold to

When a player is unsold:
- "✗ UNSOLD" badge in gray
- No amount shown

When a player is available:
- "● Available" badge in green
- Base price shown (if configured)

---

## Final Verification (End-to-End)

Run through these complete flows and confirm everything works:

**Flow A — Full auction lifecycle:**
1. Create account → build form (add 4 fields including dropdown and photo) → save form ✓
2. Share registration link → register 10 test players with photos ✓
3. Create 3 teams with different budgets and slot limits ✓
4. Start auction → sell 8 players, mark 2 as unsold ✓
5. View results → confirm all numbers are accurate ✓
6. Export results as CSV ✓

**Flow B — Numbers accuracy check:**
1. After selling a player for ₹5,000 to a team with ₹20,000 budget:
   - Team page shows: ₹15,000 remaining (NOT ₹20,000, NOT ₹0) ✓
   - Results page shows: ₹5,000 total spent for that team ✓
   - Player card shows: "✓ SOLD — ₹5,000 — [Team Name]" ✓

**Flow C — Register number removed from form:**
1. Open form builder → delete "Register Number" field → save ✓
2. Register 3 players → zero errors ✓
3. All 3 players appear in the player list ✓

**Flow D — Budget enforcement:**
1. Team with ₹3,000 remaining tries to bid ₹5,000 → blocked with clear error ✓
2. Team at full slots tries to buy another player → blocked with clear error ✓

---

**When all phases are complete:**

Provide a final summary containing:
1. Every file changed across all phases
2. Every npm package added and why
3. Every bug fixed (reference B1–B15 from the audit)
4. Any known remaining limitations or follow-up work recommended
