# Divisor de Gastos — Expense Splitter

A lightweight expense splitting app for groups — trips, meals, or any shared cost. Add your group members, log expenses by category, and the app automatically calculates who owes who and by how much. Settle up with the minimum number of transactions, mark payments as done, and export the full record when everything's wrapped up.

Built with plain HTML, CSS, and JavaScript. No frameworks, no installs, no build step.

---

## How to run

Open `Splitter.html` in any browser. That's it.

---

## How to deploy (Netlify — free)

1. Go to [netlify.com](https://netlify.com) and sign up
2. Drag and drop the `splitter-vanilla` folder onto the Netlify dashboard
3. Done — you'll get a live URL like `https://your-app.netlify.app`

---

## How to put it on GitHub

1. Go to [github.com](https://github.com) → New repository
2. Name it `divisor-de-gastos`, make it public
3. Upload the files — drag and drop on GitHub works fine

---

## Project structure

```
splitter-vanilla/
├── Splitter.html        ← page structure and UI
├── Splitter.css         ← all styles and design tokens
├── SplitterMainFunc.js  ← all JavaScript logic
└── README.md            ← this file
```

---

## How the code is organised

`SplitterMainFunc.js` is split into clearly labelled sections:

| Section | What it does |
|---|---|
| `PALETTES` | Assigns a unique colour to each member avatar |
| `CATE_COLORS` | Colour per expense category |
| `state` | Single source of truth — members, expenses, settlements |
| `saveState` / `loadState` | Persists everything to localStorage across page refreshes |
| `calcBalances` | Core algorithm — computes net balance per person |
| `calcSettlements` | Core algorithm — minimum transactions to settle all debts |
| `saveGroupName` | Updates group/trip name live as the user types |
| Render functions | Builds and injects HTML for each UI section |
| Actions | Handles user events — add, remove, delete, reset, export |
| `exportToCsv` | Builds and downloads a full trip record as a CSV file |
| Keyboard shortcuts | Enter key support on all inputs |

---

## Core algorithms

### Balance calculation — `calcBalances()`

For each expense:
1. The **payer** is credited the full amount paid.
2. **Every member** (including the payer) is debited an equal share.

```
balance = total_paid − total_share_owed
```

- Positive balance → they are owed money (gets back)
- Negative balance → they owe money (needs to pay)

### Settlement algorithm — `calcSettlements()`

Produces the **minimum number of transactions** to settle all debts using greedy creditor/debtor matching:

1. Split members into **creditors** (positive balance) and **debtors** (negative balance).
2. Sort both descending by absolute amount.
3. Match the largest debtor to the largest creditor. Transfer `min(debt, credit)`.
4. Whichever hits zero moves to the next person. Repeat until done.

This produces at most `n − 1` transactions for `n` members, which is optimal in most cases.

**Example** — 3 people, total RM 450, share = RM 150 each:

| Member | Paid | Share | Balance |
|--------|------|-------|---------|
| Alice  | 300  | 150   | +150    |
| Bob    | 90   | 150   | −60     |
| Carol  | 60   | 150   | −90     |

Result: Carol → Alice RM 90, Bob → Alice RM 60. That's 2 transactions instead of a naive approach that might need up to 6.

---

## Features

- **Group name** — set a trip or occasion name, shown as the page subtitle
- **Member management** — add and remove members with colour-coded avatars
- **Expense logging** — description, amount, who paid, and category
- **Expense categories** — Tickets, Food, Transportation, Housing, Shopping, or custom
- **Grouped expense log** — expenses grouped and colour-coded by category
- **Balances tab** — total spent, per-person share, and net balance per member
- **Settle Up tab** — minimum transactions to clear all debts
- **Mark as paid** — check off settlements once money has exchanged hands
- **Export to CSV** — download a full record including expenses and settlement status
- **localStorage persistence** — all data survives page refresh automatically

---

## Edge cases handled

| Case | How it's handled |
|---|---|
| Duplicate member name | Blocked with an error message |
| Remove a member | Their expenses are also removed |
| Zero or negative amount | Form validation blocks it |
| Floating point errors | All values rounded to 2dp |
| XSS / injection | User input escaped before inserting into HTML |
| Custom category left blank | Falls back to `'Other'` |
| Old saved data missing new fields | `loadState()` adds fallback defaults |
| Page refresh | Full state restored from localStorage automatically |

---

## What I'd add with more time

- Custom split ratios (not just equal splits among all members)
- Multiple currencies with conversion
- Edit an existing expense without deleting and re-adding
- Share a group via a link (would need a small backend or service like Firebase)
- Export to PDF for a cleaner printable record
- Multiple groups saved separately