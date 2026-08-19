/**
 * Squad Virtual Accounts Integration Sign-Off — Full 7-Test Suite
 *
 * Runs ALL 7 test scenarios from the Squad sign-off PDF form:
 *   1. Create Virtual Account (Individual)   — POST /virtual-account
 *   2. Create Virtual Account (Business)     — POST /virtual-account/business
 *   3. Simulate Payment                       — POST /virtual-account/simulate/payment
 *   4. Query Customer Transactions            — GET  /virtual-account/customer/transactions/{customer_identifier}
 *   5. Query Merchant Transactions            — GET  /virtual-account/merchant/transactions
 *   6. Retrieve VA Details (by VA number)     — GET  /virtual-account/customer/{virtual_account_number}
 *   7. Retrieve VA Details (by customer id)   — GET  /virtual-account/{customer_identifier}
 *
 * Results saved to squad-signoff-results.json
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const SANDBOX_KEY = "sandbox_sk_2c829a2bbab981b8c4de19940367406a1366a64e636f";
const SQUAD_BASE = "https://sandbox-api-d.squadco.com";
const RESULTS_FILE = path.join(__dirname, "squad-signoff-results.json");

const results = {
  testDate: new Date().toISOString(),
  sandboxKey: SANDBOX_KEY.substring(0, 15) + "****",
  tests: {},
};

function log(section, msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${section}] ${msg}`;
  console.log(line);
  if (!results.tests[section]) results.tests[section] = { logs: [], data: {} };
  results.tests[section].logs.push(line);
}

function makeRequest(url, options = {}, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          resolve({ status: res.statusCode, body: parsed, rawBody: data });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function saveResults() {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to ${RESULTS_FILE}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Create Virtual Account (Individual)
// POST https://sandbox-api-d.squadco.com/virtual-account
// ─────────────────────────────────────────────────────────────────────────────
async function test1_CreateIndividual() {
  const section = "TEST_1_CREATE_INDIVIDUAL";
  log(section, "═".repeat(70));
  log(section, "TEST 1: Create Virtual Account (Individual)");
  log(section, "═".repeat(70));

  const payload = {
    customer_identifier: "SMCLIENT_SIGNOFF_" + Date.now(),
    first_name: "Test",
    last_name: "Verification",
    middle_name: "Bryan",
    mobile_num: "08033455084",
    bvn: "22222222222",
    dob: "03/11/2002",
    gender: "1",
    address: "11 Bukole str, Aja, Lagos",
    email: "testsquad@test.com",
    beneficiary_account: "0123456789",
  };

  log(section, "Endpoint: POST " + SQUAD_BASE + "/virtual-account");
  log(section, "Payload: " + JSON.stringify(payload, null, 2));

  const res = await makeRequest(SQUAD_BASE + "/virtual-account", {
    method: "POST",
    headers: { Authorization: "Bearer " + SANDBOX_KEY, "Content-Type": "application/json" },
  }, payload);

  log(section, "Response Status: " + res.status);
  log(section, "Response Body: " + JSON.stringify(res.body, null, 2));

  results.tests[section].data = {
    endpoint: SQUAD_BASE + "/virtual-account",
    method: "POST",
    payload,
    response: res.body,
    httpStatus: res.status,
  };

  if (res.body?.success && res.body?.data?.virtual_account_number) {
    log(section, "✅ SUCCESS — Account: " + res.body.data.virtual_account_number);
    return {
      customerIdentifier: payload.customer_identifier,
      virtualAccountNumber: res.body.data.virtual_account_number,
      accountData: res.body.data,
    };
  }
  log(section, "❌ FAILED — " + (res.body?.message || "Unknown"));
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Create Virtual Account (Business)
// POST https://sandbox-api-d.squadco.com/virtual-account/business
// ─────────────────────────────────────────────────────────────────────────────
async function test2_CreateBusiness() {
  const section = "TEST_2_CREATE_BUSINESS";
  log(section, "═".repeat(70));
  log(section, "TEST 2: Create Virtual Account (Business)");
  log(section, "═".repeat(70));

  const payload = {
    customer_identifier: "SMCLIENT_BIZ_" + Date.now(),
    business_name: "FOO LTD",
    mobile_num: "08033455084",
    bvn: "22222222222",
    email: "testsquad@test.com",
    beneficiary_account: "0123456789",
  };

  log(section, "Endpoint: POST " + SQUAD_BASE + "/virtual-account/business");
  log(section, "Payload: " + JSON.stringify(payload, null, 2));

  const res = await makeRequest(SQUAD_BASE + "/virtual-account/business", {
    method: "POST",
    headers: { Authorization: "Bearer " + SANDBOX_KEY, "Content-Type": "application/json" },
  }, payload);

  log(section, "Response Status: " + res.status);
  log(section, "Response Body: " + JSON.stringify(res.body, null, 2));

  results.tests[section].data = {
    endpoint: SQUAD_BASE + "/virtual-account/business",
    method: "POST",
    payload,
    response: res.body,
    httpStatus: res.status,
  };

  if (res.body?.success) {
    log(section, "✅ SUCCESS — Account: " + res.body.data?.virtual_account_number);
    return res.body.data;
  }
  log(section, "❌ FAILED — " + (res.body?.message || "Unknown"));
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Simulate Payment
// POST https://sandbox-api-d.squadco.com/virtual-account/simulate/payment
// ─────────────────────────────────────────────────────────────────────────────
async function test3_SimulatePayment(virtualAccountNumber) {
  const section = "TEST_3_SIMULATE_PAYMENT";
  log(section, "═".repeat(70));
  log(section, "TEST 3: Simulate Payment");
  log(section, "═".repeat(70));

  const payload = {
    virtual_account_number: virtualAccountNumber,
    amount: "10000", // kobo = ₦100
  };

  log(section, "Endpoint: POST " + SQUAD_BASE + "/virtual-account/simulate/payment");
  log(section, "Payload: " + JSON.stringify(payload, null, 2));

  const res = await makeRequest(SQUAD_BASE + "/virtual-account/simulate/payment", {
    method: "POST",
    headers: { Authorization: "Bearer " + SANDBOX_KEY, "Content-Type": "application/json" },
  }, payload);

  log(section, "Response Status: " + res.status);
  log(section, "Response Body: " + JSON.stringify(res.body, null, 2));

  results.tests[section].data = {
    endpoint: SQUAD_BASE + "/virtual-account/simulate/payment",
    method: "POST",
    payload,
    response: res.body,
    httpStatus: res.status,
  };

  if (res.body?.success || res.status === 200) {
    log(section, "✅ SUCCESS — Payment simulated");
    return res.body;
  }
  log(section, "❌ FAILED — " + (res.body?.message || "Unknown"));
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Query Customer Transactions
// GET https://sandbox-api-d.squadco.com/virtual-account/customer/transactions/{customer_identifier}
// ─────────────────────────────────────────────────────────────────────────────
async function test4_QueryCustomerTransactions(customerIdentifier) {
  const section = "TEST_4_CUSTOMER_TRANSACTIONS";
  log(section, "═".repeat(70));
  log(section, "TEST 4: Query Customer Transactions");
  log(section, "═".repeat(70));

  const url = SQUAD_BASE + "/virtual-account/customer/transactions/" + customerIdentifier;
  log(section, "Endpoint: GET " + url);

  const res = await makeRequest(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + SANDBOX_KEY },
  });

  log(section, "Response Status: " + res.status);
  log(section, "Response Body: " + JSON.stringify(res.body, null, 2));

  results.tests[section].data = {
    endpoint: url,
    method: "GET",
    response: res.body,
    httpStatus: res.status,
  };

  if (res.body?.success || res.status === 200) {
    log(section, "✅ SUCCESS — Transactions retrieved");
    return res.body;
  }
  log(section, "❌ FAILED — " + (res.body?.message || "Unknown"));
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: Query Merchant Transactions
// GET https://sandbox-api-d.squadco.com/virtual-account/merchant/transactions
// ─────────────────────────────────────────────────────────────────────────────
async function test5_QueryMerchantTransactions() {
  const section = "TEST_5_MERCHANT_TRANSACTIONS";
  log(section, "═".repeat(70));
  log(section, "TEST 5: Query Merchant Transactions");
  log(section, "═".repeat(70));

  const url = SQUAD_BASE + "/virtual-account/merchant/transactions";
  log(section, "Endpoint: GET " + url);

  const res = await makeRequest(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + SANDBOX_KEY },
  });

  log(section, "Response Status: " + res.status);
  log(section, "Response Body: " + JSON.stringify(res.body, null, 2));

  results.tests[section].data = {
    endpoint: url,
    method: "GET",
    response: res.body,
    httpStatus: res.status,
  };

  if (res.body?.success || res.status === 200) {
    log(section, "✅ SUCCESS — Merchant transactions retrieved");
    return res.body;
  }
  log(section, "❌ FAILED — " + (res.body?.message || "Unknown"));
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: Retrieve VA Details (by virtual account number)
// GET https://sandbox-api-d.squadco.com/virtual-account/customer/{virtual_account_number}
// ─────────────────────────────────────────────────────────────────────────────
async function test6_RetrieveVAByAccountNumber(virtualAccountNumber) {
  const section = "TEST_6_RETRIEVE_VA_BY_NUMBER";
  log(section, "═".repeat(70));
  log(section, "TEST 6: Retrieve VA Details (by VA number)");
  log(section, "═".repeat(70));

  const url = SQUAD_BASE + "/virtual-account/customer/" + virtualAccountNumber;
  log(section, "Endpoint: GET " + url);

  const res = await makeRequest(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + SANDBOX_KEY },
  });

  log(section, "Response Status: " + res.status);
  log(section, "Response Body: " + JSON.stringify(res.body, null, 2));

  results.tests[section].data = {
    endpoint: url,
    method: "GET",
    response: res.body,
    httpStatus: res.status,
  };

  if (res.body?.success || res.status === 200) {
    log(section, "✅ SUCCESS — VA details retrieved");
    return res.body;
  }
  log(section, "❌ FAILED — " + (res.body?.message || "Unknown"));
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: Retrieve VA Details (by customer identifier)
// GET https://sandbox-api-d.squadco.com/virtual-account/{customer_identifier}
// ─────────────────────────────────────────────────────────────────────────────
async function test7_RetrieveVAByCustomerIdentifier(customerIdentifier) {
  const section = "TEST_7_RETRIEVE_VA_BY_CUSTOMER";
  log(section, "═".repeat(70));
  log(section, "TEST 7: Retrieve VA Details (by customer identifier)");
  log(section, "═".repeat(70));

  const url = SQUAD_BASE + "/virtual-account/" + customerIdentifier;
  log(section, "Endpoint: GET " + url);

  const res = await makeRequest(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + SANDBOX_KEY },
  });

  log(section, "Response Status: " + res.status);
  log(section, "Response Body: " + JSON.stringify(res.body, null, 2));

  results.tests[section].data = {
    endpoint: url,
    method: "GET",
    response: res.body,
    httpStatus: res.status,
  };

  if (res.body?.success || res.status === 200) {
    log(section, "✅ SUCCESS — VA details retrieved by customer identifier");
    return res.body;
  }
  log(section, "❌ FAILED — " + (res.body?.message || "Unknown"));
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("  SQUAD VIRTUAL ACCOUNTS INTEGRATION — FULL 7-TEST SIGN-OFF SUITE");
  console.log("  Date: " + new Date().toISOString());
  console.log("  Sandbox Key: " + SANDBOX_KEY.substring(0, 15) + "****");
  console.log("═".repeat(70) + "\n");

  // Test 1: Create Individual VA
  const t1 = await test1_CreateIndividual();
  await sleep(1000);

  if (!t1) {
    log("MAIN", "Test 1 failed — cannot proceed with dependent tests. Aborting.");
    saveResults();
    return;
  }

  const customerIdentifier = t1.customerIdentifier;
  const virtualAccountNumber = t1.virtualAccountNumber;

  // Test 2: Create Business VA
  await test2_CreateBusiness();
  await sleep(1000);

  // Test 3: Simulate Payment
  await test3_SimulatePayment(virtualAccountNumber);
  await sleep(2000);

  // Test 4: Query Customer Transactions
  await test4_QueryCustomerTransactions(customerIdentifier);
  await sleep(1000);

  // Test 5: Query Merchant Transactions
  await test5_QueryMerchantTransactions();
  await sleep(1000);

  // Test 6: Retrieve VA by account number
  await test6_RetrieveVAByAccountNumber(virtualAccountNumber);
  await sleep(1000);

  // Test 7: Retrieve VA by customer identifier
  await test7_RetrieveVAByCustomerIdentifier(customerIdentifier);

  // Summary
  console.log("\n" + "═".repeat(70));
  console.log("  TEST SUMMARY");
  console.log("═".repeat(70));
  const testNames = [
    "TEST_1_CREATE_INDIVIDUAL",
    "TEST_2_CREATE_BUSINESS",
    "TEST_3_SIMULATE_PAYMENT",
    "TEST_4_CUSTOMER_TRANSACTIONS",
    "TEST_5_MERCHANT_TRANSACTIONS",
    "TEST_6_RETRIEVE_VA_BY_NUMBER",
    "TEST_7_RETRIEVE_VA_BY_CUSTOMER",
  ];
  for (const t of testNames) {
    const d = results.tests[t]?.data;
    const ok = d && (d.response?.success === true || d.httpStatus === 200);
    console.log(`  ${ok ? "✅" : "❌"} ${t}`);
  }
  console.log("═".repeat(70));

  saveResults();
}

main().catch(err => {
  console.error("Fatal error:", err);
  saveResults();
});
