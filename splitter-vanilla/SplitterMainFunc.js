// ─── Avatar colour palettes ───────────────────────────────────────────────
const PALETTES = [
  { bg: '#2a1f4e', text: '#c4b5fd' },
  { bg: '#0d3326', text: '#6ee7b7' },
  { bg: '#3b1a0e', text: '#fdba74' },
  { bg: '#1a1042', text: '#93c5fd' },
  { bg: '#2d1515', text: '#fca5a5' },
  { bg: '#1a2e1a', text: '#86efac' },
  { bg: '#2e1d0e', text: '#fcd34d' },
  { bg: '#1e1a2e', text: '#d8b4fe' },
]

const CATE_COLORS = {
  Tickets: { bg: '#2a1f4e', text: '#c4b5fd' },
  Housing: { bg: '#0d3326', text: '#6ee7b7' },
  Transportation: { bg: '#3b1a0e', text: '#fdba74' },
  Food: { bg: '#1a1042', text: '#93c5fd' },
  Shopping: { bg: '#2d1515', text: '#fca5a5' },
  Others: { bg: '#1a2e1a', text: '#86efac' },
  Other:          { bg: '#2e1d0e', text: '#fcd34d' }, 
}

function paletteFor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % PALETTES.length
  return PALETTES[idx]
}

function avatarHTML(name, size = 32) {
  const p = paletteFor(name)
  const initials = name.slice(0, 2).toUpperCase()
  const fs = Math.round(size * 0.33)
  return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${fs}px;background:${p.bg};color:${p.text}">${initials}</div>`
}

// ─── State ────────────────────────────────────────────────────────────────
// All app data lives here. Saved to localStorage on every change.
// let state = {
//   GroupName: 'Saudi Trip 2026',
//   members: ['Alice', 'Bob', 'Carol'],
//   expenses: [
//     { id: 1, desc: 'Hotel',           amount: 300, payer: 'Alice' },
//     { id: 2, desc: 'Dinner',          amount: 90,  payer: 'Bob'   },
//     { id: 3, desc: 'Museum tickets',  amount: 60,  payer: 'Carol' },
//   ],
//   paidSettlements: [],
//   Payment_cat: '',
//   nextId: 4,
// }
let state = {
  GroupName: '',
  members: [],
  expenses: [],
  paidSettlements: [],
  Payment_cat: '',
  nextId: 1,
}

function saveState() {
  try { localStorage.setItem('splitease', JSON.stringify(state)) } catch {}
}

function loadState() {
  try {
    const saved = localStorage.getItem('splitease')
    if (saved) state = JSON.parse(saved)
  } catch {}

  if (!state.GroupName) {
    state.GroupName = ''
  }
  if (!state.paidSettlements) state.paidSettlements = []
}

// ─── Core Algorithm ───────────────────────────────────────────────────────

/**
 * calcBalances
 * Returns { memberName: netBalance } for every member.
 *   positive = they are owed money
 *   negative = they owe money
 *
 * For each expense:
 *   1. The payer is credited the full amount.
 *   2. Everyone is debited an equal share (amount / number of members).
 */
function calcBalances() {
  const bal = {}
  state.members.forEach(m => bal[m] = 0)

  state.expenses.forEach(exp => {
    const share = exp.amount / state.members.length
    bal[exp.payer] += exp.amount
    state.members.forEach(m => bal[m] -= share)
  })

  // Round to 2dp to avoid floating-point artifacts like 0.30000000000000004
  Object.keys(bal).forEach(k => {
    bal[k] = Math.round(bal[k] * 100) / 100
  })

  return bal
}

/**
 * calcSettlements
 * Returns the minimum list of { from, to, amount } transactions to settle all debts.
 *
 * Algorithm — greedy creditor/debtor matching:
 *   1. Split members into creditors (positive balance) and debtors (negative balance).
 *   2. Sort both descending by absolute amount.
 *   3. Match largest debtor → largest creditor, transfer min(debt, credit).
 *   4. Repeat until everyone is at zero.
 *
 * Produces at most n-1 transactions for n members.
 */
function calcSettlements() {
  const bal = calcBalances()
  const creditors = []
  const debtors = []

  Object.entries(bal).forEach(([name, amt]) => {
    if (amt > 0.01)  creditors.push({ name, amt })
    if (amt < -0.01) debtors.push({ name, amt: -amt })
  })

  creditors.sort((a, b) => b.amt - a.amt)
  debtors.sort((a, b) => b.amt - a.amt)

  const transactions = []
  let i = 0, j = 0

  while (i < creditors.length && j < debtors.length) {
    const transfer = Math.min(creditors[i].amt, debtors[j].amt)
    transactions.push({
      from:   debtors[j].name,
      to:     creditors[i].name,
      amount: Math.round(transfer * 100) / 100,
    })
    creditors[i].amt -= transfer
    debtors[j].amt   -= transfer
    if (creditors[i].amt < 0.01) i++
    if (debtors[j].amt  < 0.01) j++
  }

  return transactions
}

// ___ Group Name_________________
function saveGroupName() {
  const Group_Name = document.getElementById('GroupName')
  state.GroupName = Group_Name.value.trim()
  saveState()
  document.querySelector('.subtitle').textContent = state.GroupName || 'Split expenses, settle fairly'
}


// ─── Render functions ─────────────────────────────────────────────────────

function renderMembers() {
  const chips = document.getElementById('member-chips')

  if (state.members.length === 0) {
    chips.innerHTML = '<p class="empty-msg" style="margin-bottom:10px">Add at least 2 people to get started.</p>'
  } else {
    chips.innerHTML = state.members.map(m => `
      <div class="chip">
        ${avatarHTML(m, 24)}
        <span class="chip-name">${escHtml(m)}</span>
        <button class="chip-remove" onclick="removeMember('${escAttr(m)}')" aria-label="Remove ${escAttr(m)}">×</button>
      </div>
    `).join('')
  }

  // Keep payer dropdown in sync
  const payer = document.getElementById('exp-payer')
  const prev = payer.value
  payer.innerHTML = state.members.map(m =>
    `<option value="${escAttr(m)}" ${m === prev ? 'selected' : ''}>${escHtml(m)}</option>`
  ).join('')

  // Show/hide add form
  const locked = document.getElementById('add-form-locked')
  const fields = document.getElementById('add-form-fields')
  if (state.members.length < 2) {
    locked.style.display = 'block'
    fields.style.display = 'none'
  } else {
    locked.style.display = 'none'
    fields.style.display = 'block'
  }
}

function renderExpenses() {
  const list  = document.getElementById('expense-list')
  const totEl = document.getElementById('expense-total')
  const total = state.expenses.reduce((s, e) => s + e.amount, 0)
  totEl.textContent = state.expenses.length > 0 ? `RM ${total.toFixed(2)} total` : ''
  if (state.expenses.length === 0) {
    list.innerHTML = '<p class="empty-msg">No expenses yet. Add one above.</p>'
    return
  }
  // Group by category
  const grouped = {}
  for (const exp of state.expenses) {
    const cat = exp.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(exp)
  }
  // Render each group
  list.innerHTML = Object.entries(grouped).map(([category, expenses]) => {
    const col = CATE_COLORS[category] || CATE_COLORS['Other']

    const rows = [...expenses].reverse().map(exp => `
      <div class="expense-row">
        ${avatarHTML(exp.payer, 36)}
        <div style="flex:1;min-width:0">
          <div class="expense-desc">${escHtml(exp.desc)}</div>
          <div class="expense-meta">${escHtml(exp.payer)} paid · split equally</div>
        </div>
        <span class="expense-amount">RM ${exp.amount.toFixed(2)}</span>
        <button class="delete-btn" onclick="deleteExpense(${exp.id})">×</button>
      </div>
    `).join('')
    return `
      <div class="category-group">
        <div class="category-header" style="background: ${col.bg}; color: ${col.text}">${escHtml(category)}</div>
        ${rows}
      </div>
    `
  }).join('')
}

function renderBalances() {


  const bal    = calcBalances()
  const total  = state.expenses.reduce((s, e) => s + e.amount, 0)
  const perPerson = state.members.length > 0 ? total / state.members.length : 0

  document.getElementById('metrics-grid').innerHTML = `
    <div class="metric">
      <div class="metric-label">Total spent</div>
      <div class="metric-val">RM ${total.toFixed(2)}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Per person</div>
      <div class="metric-val">RM ${perPerson.toFixed(2)}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Expenses</div>
      <div class="metric-val">${state.expenses.length}</div>
    </div>
  `

  const list = document.getElementById('balance-list')
  if (state.members.length === 0) {
    list.innerHTML = '<p class="empty-msg">No members yet.</p>'
    return
  }

  list.innerHTML = state.members.map(m => {
    const b = bal[m] || 0
    const isPos = b > 0.01
    const isNeg = b < -0.01
    let rightHTML
    if (isPos) {
      rightHTML = `
        <div class="balance-right">
          <span class="tag tag-green">gets back</span>
          <span class="bal-amt bal-pos">RM ${b.toFixed(2)}</span>
        </div>`
    } else if (isNeg) {
      rightHTML = `
        <div class="balance-right">
          <span class="tag tag-red">owes</span>
          <span class="bal-amt bal-neg">RM ${Math.abs(b).toFixed(2)}</span>
        </div>`
    } else {
      rightHTML = `<span class="bal-zero">settled</span>`
    }
    return `
      <div class="balance-row">
        ${avatarHTML(m, 36)}
        <span class="balance-name">${escHtml(m)}</span>
        ${rightHTML}
      </div>`
  }).join('')
}

function renderSettle() {
  const txns    = calcSettlements()
  const countEl = document.getElementById('settle-count')
  const list    = document.getElementById('settle-list')

  countEl.textContent = txns.length > 0
    ? `${txns.length} transaction${txns.length !== 1 ? 's' : ''}`
    : ''

  if (txns.length === 0) {
    list.innerHTML = `
      <div class="all-settled">
        <span class="checkmark">✓</span>
        <p class="settled-title">All settled up!</p>
        <p class="settled-sub">${
          state.expenses.length === 0
            ? 'Add some expenses to see who owes what.'
            : 'Everyone has paid their fair share.'
        }</p>
      </div>`
    return
  }

  list.innerHTML = txns.map(t => {
    const isPaid = state.paidSettlements.some(p =>
      p.from === t.from && p.to === t.to && p.amount === t.amount
    )

    if (isPaid) {
      return `
        <div class="settle-row" style="opacity:0.4">
          ${avatarHTML(t.from, 34)}
          <span class="settle-name" style="text-decoration:line-through">${escHtml(t.from)}</span>
          <span class="settle-arrow">→</span>
          <span class="settle-name" style="text-decoration:line-through">${escHtml(t.to)}</span>
          ${avatarHTML(t.to, 34)}
          <span class="settle-amt" style="text-decoration:line-through">RM ${t.amount.toFixed(2)}</span>
          <span style="font-size:12px;color:var(--text-muted)">Paid</span>
        </div>`
    }

    return `
      <div class="settle-row">
        ${avatarHTML(t.from, 34)}
        <span class="settle-name">${escHtml(t.from)}</span>
        <span class="settle-arrow">→</span>
        <span class="settle-name">${escHtml(t.to)}</span>
        ${avatarHTML(t.to, 34)}
        <span class="settle-amt">RM ${t.amount.toFixed(2)}</span>
        <button class="btn" onclick="markAsPaid('${escAttr(t.from)}', '${escAttr(t.to)}', ${t.amount})">
          Mark paid
        </button>
      </div>`
  }).join('') + `<p class="settle-note">Minimum transactions needed to settle all debts.</p>`
}

function renderAll() {
  document.getElementById('GroupName').value = state.GroupName || ''
  document.querySelector('.subtitle').textContent = state.GroupName || 'Split expenses, settle fairly'

  renderMembers()
  renderExpenses()
  renderBalances()
  renderSettle()
}

// ─── Actions ──────────────────────────────────────────────────────────────

function addGroupName() {
  const GroupNameInput = document.getElementById('GroupName')

  state.GroupName = GroupNameInput.value

  saveState()
  renderAll()
}

function addMember() {
  const input = document.getElementById('member-input')
  const errEl = document.getElementById('member-error')
  const name  = input.value.trim()

  if (!name) return
  if (state.members.includes(name)) {
    errEl.textContent = 'That name is already in the group.'
    errEl.style.display = 'block'
    return
  }

  state.members.push(name)
  input.value = ''
  errEl.style.display = 'none'
  saveState()
  renderAll()
}

function removeMember(name) {
  // Remove the member and any expenses they paid
  state.members  = state.members.filter(m => m !== name)
  state.expenses = state.expenses.filter(e => e.payer !== name)
  saveState()
  renderAll()
}

function addExpense() {
  const desc     = document.getElementById('exp-desc').value.trim()
  const amount   = parseFloat(document.getElementById('exp-amount').value)
  const payer    = document.getElementById('exp-payer').value
  const errEl    = document.getElementById('exp-error')
  const category = document.getElementById('exp-cate').value

  // Handle "Others" custom category
  let finalCategory = category
  if (category === 'Others') {
    finalCategory = document.getElementById('Other-Option').value.trim() || 'Other'
  }

  // Validate first — before anything else
  if (!desc)                        { showExpenseError('Add a description.');     return }
  if (isNaN(amount) || amount <= 0) { showExpenseError('Enter a valid amount.');  return }
  if (!payer)                       { showExpenseError('Select who paid.');        return }

  // Warn about paid settlements being reset
  if (state.paidSettlements.length > 0) {
    showModal(
      'Reset paid settlements?',
      'Adding an expense will reset all marked-as-paid settlements since the amounts will change.',
      () => {
        state.paidSettlements = []
        state.expenses.push({ id: state.nextId++, desc, amount, payer, category: finalCategory })
        document.getElementById('exp-desc').value   = ''
        document.getElementById('exp-amount').value = ''
        document.getElementById('exp-cate').value   = 'Tickets'
        errEl.style.display = 'none'
        saveState()
        renderAll()
      }
    )
    return
  }

  // No paid settlements — just add directly
  state.expenses.push({ id: state.nextId++, desc, amount, payer, category: finalCategory })
  document.getElementById('exp-desc').value   = ''
  document.getElementById('exp-amount').value = ''
  document.getElementById('exp-cate').value   = 'Tickets'
  errEl.style.display = 'none'
  saveState()
  renderAll()
}

function toggleOtherOption() {
  const other = document.getElementById('Other-Option')
  if (document.getElementById('exp-cate').value === 'Others') {
    other.style.display = 'block'
  } else {
    other.style.display = 'none'
    other.value = ''
  }
}

function showExpenseError(msg) {
  const el = document.getElementById('exp-error')
  el.textContent = msg
  el.style.display = 'block'
}

function deleteExpense(id) {
  if (state.paidSettlements.length > 0) {
    showModal(
      'Reset paid settlements?',
      'Deleting an expense will reset all marked-as-paid settlements since the amounts will change.',
      () => {
        state.paidSettlements = []
        state.expenses = state.expenses.filter(e => e.id !== id)
        saveState()
        renderAll()
      }
    )
    return
  }
  state.expenses = state.expenses.filter(e => e.id !== id)
  saveState()
  renderAll()
}

function resetAll() {
  showModal(
    'Reset everything?',
    'This will clear all members, expenses, and settlements. This cannot be undone.',
    () => {
      state = {
        GroupName: '',
        members: [],
        expenses: [],
        paidSettlements: [],
        Payment_cat: '',
        nextId: 1,
      }
      saveState()
      renderAll()
    }
  )
}

function markAsPaid(from, to, amount) {

  const payment = { from, to, amount }

  state.paidSettlements.push(payment)

  saveState()
  renderAll()
}

function exportToCsv() {
  // summary
  const total = state.expenses.reduce((s, e) => s + e.amount, 0)
  const today = new Date().toLocaleDateString()

  const summary = [
    [`SplitEase Export - ${state.GroupName || 'Untitled Trip'}`],
    [`Exported: ${today}`],
    [`Total Spent: RM ${total.toFixed(2)}`],
    [`Members: ${state.members.join(', ')}`],
    [],  // blank row
  ]

  // make the hearder
  const headers = ['Description', 'Category', 'Paid By', 'Amount']

  // make the rows 
  const rows = state.expenses.map(expense => [
    `"${expense.desc}"`,
    expense.category || 'Other',
    expense.payer,
    `RM ${expense.amount.toFixed(2)}`
  ])

  const settleHeaders = ['From', 'To', 'Amount', 'Status']

  const settleRows = calcSettlements().map(t => {
    const isPaid = state.paidSettlements.some(p =>
      p.from === t.from && p.to === t.to && p.amount === t.amount
    )
    return [t.from, t.to, `RM ${t.amount.toFixed(2)}`, isPaid ? 'Paid' : 'Unpaid']
  })
  
  const csvContent = [
    ...summary,
    headers,
    ...rows,
    [],               // blank row
    ['SETTLEMENTS'],
    settleHeaders,
    ...settleRows,
  ].map(e => e.join(',')).join('\n')

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${state.GroupName || 'splitease'}-record.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  console.log(csvContent)

}

function showModal(title, msg, onConfirm) {
  document.getElementById('modal-title').textContent = title
  document.getElementById('modal-msg').textContent = msg
  document.getElementById('modal-overlay').style.display = 'flex'
  document.getElementById('modal-confirm').onclick = () => {
    closeModal()
    onConfirm()
  }
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none'
}
// ─── Tab switching ────────────────────────────────────────────────────────

function switchTab(name, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
  btn.classList.add('active')
  document.getElementById('tab-' + name).classList.add('active')
}

// ─── Helpers ──────────────────────────────────────────────────────────────

// Prevent XSS when inserting user-entered names into HTML
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
function escAttr(str) {
  return str.replace(/'/g, "\\'")
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────

document.getElementById('GroupName').addEventListener('keydown', e => {
  if (e.key === 'Enter') addGroupName()
})

document.getElementById('member-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addMember()
})
document.getElementById('exp-desc').addEventListener('keydown', e => {
  if (e.key === 'Enter') addExpense()
})
document.getElementById('exp-amount').addEventListener('keydown', e => {
  if (e.key === 'Enter') addExpense()
})

// ─── Boot ─────────────────────────────────────────────────────────────────
loadState()
renderAll()