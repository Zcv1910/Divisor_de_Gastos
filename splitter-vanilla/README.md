# SplitEase — Expense Splitter (Vanilla JS)

A clean expense splitter built with plain HTML, CSS, and JavaScript. No frameworks, no installs, no build step.

## How to run

Just open `index.html` in any browser. That's it.

## How to deploy (Netlify — free)

1. Go to [netlify.com](https://netlify.com) and sign up (free)
2. Drag and drop the entire `splitter-vanilla` folder onto the Netlify dashboard
3. Done — you'll get a live URL like `https://your-app.netlify.app`

## How to deploy (Vercel — free)

1. Go to [vercel.com](https://vercel.com) and sign up
2. Install Vercel CLI: `npm install -g vercel` (needs Node.js)
3. Run `vercel` inside this folder and follow the prompts

## How to put it on GitHub

1. Go to [github.com](https://github.com) → New repository
2. Name it `expense-splitter`, make it public
3. Upload the files (drag and drop on GitHub works fine)

## Project structure

```
splitter-vanilla/
├── index.html    ← the entire app (HTML + CSS + JS in one file)
└── README.md     ← this file
```

Everything is in `index.html`, clearly sectioned:
- `<style>` — all CSS / design tokens
- HTML — the page structure and all UI panels
- `<script>` — all JavaScript, with comments explaining each section

## How the code is organised

The JavaScript is split into clearly labelled sections with comments:

| Section | What it does |
|---|---|
| Avatar colour palettes | Assigns a unique colour to each member |
| State | The single source of truth — members + expenses |
| `saveState` / `loadState` | Persists everything to localStorage |
| `calcBalances` | Core algorithm — computes net balance per person |
| `calcSettlements` | Core algorithm — minimum transactions to settle |
| Render functions | Builds and injects HTML for each UI section |
| Actions | Handles user events (add/remove/delete/reset) |
| Keyboard shortcuts | Enter key support on inputs |

## Core algorithm explained

### Balance calculation (`calcBalances`)

For each expense:
1. The **payer** is credited the full amount paid.
2. **Every member** (including the payer) is debited an equal share.

`balance = total_paid − total_share_owed`

- Positive → they are owed money
- Negative → they owe money

### Settlement algorithm (`calcSettlements`)

Produces the **minimum number of transactions** to settle all debts.

1. Split into **creditors** (positive) and **debtors** (negative).
2. Sort both descending by amount.
3. Match largest debtor to largest creditor. Transfer `min(debt, credit)`.
4. Whichever hits zero moves to the next person. Repeat.

**Example** — 3 people, total RM 450, share = RM 150 each:

| Member | Paid | Share | Balance |
|--------|------|-------|---------|
| Alice  | 300  | 150   | +150    |
| Bob    | 90   | 150   | −60     |
| Carol  | 60   | 150   | −90     |

Result: Carol → Alice RM 90, Bob → Alice RM 60 (2 transactions, not 6).

## Edge cases handled

| Case | How it's handled |
|---|---|
| Duplicate member name | Blocked with error message |
| Remove a member | Their expenses are also removed |
| Zero or negative amount | Form validation blocks it |
| Floating point errors | All values rounded to 2dp |
| XSS / injection | User input escaped before inserting into HTML |
| Empty state | Friendly empty messages shown |
| Page refresh | State restored from localStorage automatically |

## What I'd add with more time

- Custom split ratios (not just equal splits)
- Multiple currencies
- Expense categories / tags
- Mark a settlement as paid
- Export summary to PDF or CSV
- Share a group via a link (would need a backend)
