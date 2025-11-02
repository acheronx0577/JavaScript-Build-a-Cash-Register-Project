let price = 1.87;
let cid = [
  ['PENNY', 1.01],
  ['NICKEL', 2.05],
  ['DIME', 3.1],
  ['QUARTER', 4.25],
  ['ONE', 90],
  ['FIVE', 55],
  ['TEN', 20],
  ['TWENTY', 60],
  ['ONE HUNDRED', 100]
];

let transactionCount = 0;

// Currency units and their values in descending order
const currencyUnits = [
  ["ONE HUNDRED", 100],
  ["TWENTY", 20],
  ["TEN", 10],
  ["FIVE", 5],
  ["ONE", 1],
  ["QUARTER", 0.25],
  ["DIME", 0.1],
  ["NICKEL", 0.05],
  ["PENNY", 0.01]
];

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('price').value = price;
  displayCID();
  updateDrawerTotal();
  updateTransactionCount();

  document.getElementById('purchase-btn').addEventListener('click', handlePurchase);
  document.getElementById('clear-btn').addEventListener('click', clearInputs);

  document.getElementById('cash').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      handlePurchase();
    }
  });
});

// Display cash in drawer
function displayCID() {
  const cidDisplay = document.getElementById('cid-display');
  cidDisplay.innerHTML = '';
  cid.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cid-item';
    div.innerHTML = `
      <span class="currency">${item[0]}:</span>
      <span class="amount">$${item[1].toFixed(2)}</span>
    `;
    cidDisplay.appendChild(div);
  });
}

// Update drawer total
function updateDrawerTotal() {
  const total = cid.reduce((sum, item) => sum + item[1], 0);
  document.getElementById('drawer-total').textContent = `Total: $${total.toFixed(2)}`;
}

// Update transaction count
function updateTransactionCount() {
  document.getElementById('transaction-count').textContent = transactionCount;
}

// Clear inputs
function clearInputs() {
  document.getElementById('cash').value = '';
  document.getElementById('change-due').innerHTML =
    '<div class="placeholder">Transaction results will appear here...</div>';
  document.getElementById('change-due').className = 'results-content';
  document.getElementById('results-status').textContent = 'READY';
  document.getElementById('status').textContent = 'AWAITING_TRANSACTION';
  document.getElementById('cash').focus();
}

// Handle purchase button click
function handlePurchase() {
  const cashInput = document.getElementById('cash');
  const cash = parseFloat(cashInput.value);
  const changeDueElement = document.getElementById('change-due');
  const resultsStatus = document.getElementById('results-status');
  const statusElement = document.getElementById('status');

  if (isNaN(cash) || cash === '') {
    alert("Please enter a valid cash amount");
    cashInput.focus();
    return;
  }

  if (cash < 0) {
    alert("Cash amount cannot be negative");
    cashInput.focus();
    return;
  }

  if (cash < price) {
    alert("Customer does not have enough money to purchase the item");
    cashInput.focus();
    return;
  }

  if (cash === price) {
    changeDueElement.textContent = "No change due - customer paid with exact cash";
    changeDueElement.className = 'results-content valid';
    resultsStatus.textContent = 'EXACT_CASH';
    statusElement.textContent = 'COMPLETED';
    transactionCount++;
    updateTransactionCount();
    return;
  }

  const changeDue = cash - price;
  const result = checkCashRegister(price, cash, cid);

  displayResult(result, changeDueElement, resultsStatus, statusElement);

  if (result.status === "OPEN" || result.status === "CLOSED") {
    transactionCount++;
    updateTransactionCount();
  }
}

// Main cash register function
function checkCashRegister(price, cash, cid) {
  let changeDue = Math.round((cash - price) * 100) / 100;

  let totalCID = cid.reduce((sum, item) => sum + item[1], 0);
  totalCID = Math.round(totalCID * 100) / 100;

  if (changeDue > totalCID) {
    return { status: "INSUFFICIENT_FUNDS", change: [] };
  }

  // ✅ FIXED: handle CLOSED case properly (lowest to highest)
  if (changeDue === totalCID) {
    const closedChange = cid.map(item => [item[0], item[1]]);
    return { status: "CLOSED", change: closedChange };
  }

  const change = [];
  let remainingChange = changeDue;
  const cidCopy = JSON.parse(JSON.stringify(cid));

  for (let i = 0; i < currencyUnits.length; i++) {
    const [unit, value] = currencyUnits[i];
    const cidIndex = findCIDIndex(cidCopy, unit);
    if (cidIndex === -1) continue;

    const availableAmount = cidCopy[cidIndex][1];
    const maxUnitsFromDrawer = Math.floor(availableAmount / value);
    const neededUnits = Math.floor(remainingChange / value);

    const unitsToUse = Math.min(maxUnitsFromDrawer, neededUnits);
    if (unitsToUse > 0) {
      const amount = Math.round(unitsToUse * value * 100) / 100;
      change.push([unit, amount]);
      remainingChange = Math.round((remainingChange - amount) * 100) / 100;
      cidCopy[cidIndex][1] = Math.round((availableAmount - amount) * 100) / 100;
    }

    if (remainingChange === 0) break;
  }

  if (remainingChange > 0) {
    return { status: "INSUFFICIENT_FUNDS", change: [] };
  }

  change.sort((a, b) => {
    const valA = currencyUnits.find(u => u[0] === a[0])[1];
    const valB = currencyUnits.find(u => u[0] === b[0])[1];
    return valB - valA;
  });


  return { status: "OPEN", change: change };
}

// Helper function
function findCIDIndex(cid, currency) {
  for (let i = 0; i < cid.length; i++) {
    if (cid[i][0] === currency) return i;
  }
  return -1;
}

// Display result
function displayResult(result, element, resultsStatus, statusElement) {
  element.innerHTML = '';

  if (result.status === "INSUFFICIENT_FUNDS") {
    element.textContent = "Status: INSUFFICIENT_FUNDS";
    element.className = 'results-content invalid';
    resultsStatus.textContent = 'INSUFFICIENT_FUNDS';
    statusElement.textContent = 'FAILED';

  } else if (result.status === "CLOSED") {
    let output = "Status: CLOSED";
    result.change.forEach(item => {
      if (item[1] > 0) {
        output += `<br>${item[0]}: $${item[1].toFixed(2)}`;
      }
    });
    element.innerHTML = output;
    element.className = 'results-content valid';
    resultsStatus.textContent = 'CLOSED';
    statusElement.textContent = 'COMPLETED';
    updateCashDrawerForClosed();
  } else if (result.status === "OPEN") {
    let output = "Status: OPEN";
    result.change.forEach(item => {
      if (item[1] > 0) {
        output += `<br>${item[0]}: $${item[1].toFixed(2)}`;
      }
    });
    element.innerHTML = output;
    element.className = 'results-content valid';
    resultsStatus.textContent = 'OPEN';
    statusElement.textContent = 'COMPLETED';
    updateCashDrawer(result.change);
  }

  displayCID();
  updateDrawerTotal();
}

// Empty drawer for CLOSED
function updateCashDrawerForClosed() {
  cid.forEach(item => { item[1] = 0; });
}

// Update drawer after OPEN transaction
function updateCashDrawer(changeArray) {
  changeArray.forEach(changeItem => {
    const index = findCIDIndex(cid, changeItem[0]);
    if (index !== -1) {
      cid[index][1] = Math.round((cid[index][1] - changeItem[1]) * 100) / 100;
    }
  });
}
