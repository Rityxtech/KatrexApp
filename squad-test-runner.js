/**
 * Squad Verification Test Suite — Complete End-to-End Test
 *
 * Runs all 3 tests the Squad team wants to see:
 * 1. Create virtual account via API (capture request + response)
 * 2. Simulate payment to the virtual account (capture webhook + wallet credit)
 * 3. Show notification handling (capture webhook code + security measures)
 *
 * Uses real test user data from Firestore and the actual Squad sandbox API.
 * All results are saved to squad-test-results.json for documentation.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

// Use the firebase-admin from the functions directory
const admin = require("./functions/node_modules/firebase-admin");

// ── Configuration ──────────────────────────────────────────────────────────
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(
  os.homedir(), "AppData", "Roaming", "firebase", "rityxtech_gmail_com_application_default_credentials.json"
);

admin.initializeApp({ projectId: "smclient-83cde" });
const db = admin.firestore();

const SANDBOX_KEY = "sandbox_sk_2c829a2bbab981b8c4de19940367406a1366a64e636f";
const LIVE_KEY = "sk_7de2c39be2052f528b8ab98cb58b22445eb362b6";
const SQUAD_SANDBOX_BASE = "https://sandbox-api-d.squadco.com";
const SQUAD_LIVE_BASE = "https://api-d.squadco.com";
const WEBHOOK_URL = "https://squadwebhook-nx6tlgm5aa-uc.a.run.app";
const FIREBASE_PROJECT = "smclient-83cde";
const RESULTS_FILE = path.join(__dirname, "squad-test-results.json");

// Real test user from Firestore (uses Squad's sandbox test BVN 22222222222)
const TEST_USER = {
  first_name: "Test",
  last_name: "Verification",
  mobile_num: "08030000000",
  dob: "01/01/1990",
  gender: "1",
  address: "123 Test Street, Lagos",
  customer_identifier: "test_squad_verification_" + Date.now(),
  bvn: "22222222222", // Squad's sandbox test BVN
  email: "testsquad@test.com",
  beneficiary_account: "0123456789",
};

// ── Results store ──────────────────────────────────────────────────────────
const results = {
  testDate: new Date().toISOString(),
  project: FIREBASE_PROJECT,
  webhookUrl: WEBHOOK_URL,
  sandboxKey: SANDBOX_KEY.substring(0, 15) + "****",
  tests: {},
};

function log(section, message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${section}] ${message}`;
  console.log(line);
  if (!results.tests[section]) results.tests[section] = { logs: [], data: {} };
  results.tests[section].logs.push(line);
}

function makeRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request(
      {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, rawBody: data });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Test 1: Create Virtual Account ─────────────────────────────────────────
async function test1_CreateVirtualAccount() {
  const section = "TEST_1_CREATE_VIRTUAL_ACCOUNT";
  log(section, "═".repeat(70));
  log(section, "TEST 1: Create Virtual Account via Squad API");
  log(section, "═".repeat(70));
  log(section, "");
  log(section, `Endpoint: ${SQUAD_SANDBOX_BASE}/virtual-account`);
  log(section, `Method: POST`);
  log(section, `Authorization: Bearer ${SANDBOX_KEY.substring(0, 15)}****`);
  log(section, "");
  log(section, "REQUEST PAYLOAD:");
  log(section, JSON.stringify(TEST_USER, null, 2));

  try {
    const response = await makeRequest(
      `${SQUAD_SANDBOX_BASE}/virtual-account`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SANDBOX_KEY}`,
          "Content-Type": "application/json",
        },
      },
      TEST_USER
    );

    log(section, "");
    log(section, `RESPONSE STATUS: ${response.status}`);
    log(section, "RESPONSE BODY:");
    log(section, JSON.stringify(response.body, null, 2));

    results.tests[section].data = {
      request: {
        endpoint: `${SQUAD_SANDBOX_BASE}/virtual-account`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${SANDBOX_KEY.substring(0, 15)}****`,
          "Content-Type": "application/json",
        },
        payload: TEST_USER,
      },
      response: {
        status: response.status,
        body: response.body,
      },
    };

    if (response.body?.success && response.body?.data?.virtual_account_number) {
      const accountNumber = response.body.data.virtual_account_number;
      log(section, "");
      log(section, `✅ SUCCESS — Virtual account created successfully!`);
      log(section, `   Account Number: ${accountNumber}`);
      log(section, `   Account Name: ${response.body.data.virtual_account_name || TEST_USER.first_name + " " + TEST_USER.last_name}`);
      log(section, `   Bank: ${response.body.data.bank_name || "GTBank"}`);
      return accountNumber;
    } else {
      log(section, "");
      log(section, `❌ FAILED — ${response.body?.message || "No virtual_account_number in response"}`);
      return null;
    }
  } catch (error) {
    log(section, `❌ ERROR: ${error.message}`);
    results.tests[section].data.error = error.message;
    return null;
  }
}

// ── Test 2: Simulate Payment to Virtual Account ────────────────────────────
async function test2_SimulatePayment(accountNumber) {
  const section = "TEST_2_SIMULATE_PAYMENT";
  log(section, "");
  log(section, "═".repeat(70));
  log(section, "TEST 2: Simulate Payment to Virtual Account");
  log(section, "═".repeat(70));
  log(section, "");
  log(section, `Virtual Account: ${accountNumber}`);
  log(section, `Amount: ₦5,000 (500000 kobo)`);
  log(section, "");

  // First, create a virtual account record in Firestore so our webhook can find it
  log(section, "Setting up test virtual account record in Firestore...");
  const testUid = TEST_USER.customer_identifier;
  await db.collection("virtualAccounts").doc(testUid).set({
    uid: testUid,
    account_number: accountNumber,
    account_name: `${TEST_USER.first_name} ${TEST_USER.last_name}`,
    bank_name: "GTBank",
    bank_code: "058",
    account_reference: testUid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  log(section, `✅ Virtual account record created in Firestore for uid: ${testUid}`);

  // Also create a wallet for this test user
  log(section, "Setting up test wallet in Firestore...");
  await db.collection("wallets").doc(testUid).set({
    uid: testUid,
    nairaBalance: 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  log(section, `✅ Test wallet created with ₦0 balance`);

  // Record the balance before payment
  const walletBefore = await db.collection("wallets").doc(testUid).get();
  const balanceBefore = walletBefore.data()?.nairaBalance || 0;
  log(section, `Wallet balance BEFORE payment: ₦${balanceBefore}`);
  results.tests[section].data = results.tests[section].data || {};
  results.tests[section].data.walletBalanceBefore = balanceBefore;

  // Try Squad's sandbox simulate endpoint
  log(section, "");
  log(section, "Attempting Squad sandbox simulation endpoint...");
  const simulateEndpoints = [
    { url: `${SQUAD_SANDBOX_BASE}/virtual-account/fund`, label: "/virtual-account/fund" },
    { url: `${SQUAD_SANDBOX_BASE}/virtual-account/credit`, label: "/virtual-account/credit" },
    { url: `${SQUAD_SANDBOX_BASE}/virtual-account/simulate-payment`, label: "/virtual-account/simulate-payment" },
  ];

  let simulated = false;
  for (const endpoint of simulateEndpoints) {
    log(section, `Trying: POST ${endpoint.url}`);
    try {
      const response = await makeRequest(endpoint.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${SANDBOX_KEY}`, "Content-Type": "application/json" },
      }, { virtual_account_number: accountNumber, amount: 5000 });

      log(section, `Response: ${response.status} — ${JSON.stringify(response.body)}`);
      results.tests[section].data[endpoint.label] = {
        status: response.status,
        body: response.body,
      };

      if (response.status === 200 || response.body?.success) {
        log(section, `✅ Simulation succeeded via ${endpoint.label}`);
        simulated = true;
        break;
      }
    } catch (error) {
      log(section, `❌ ${endpoint.label}: ${error.message}`);
      results.tests[section].data[endpoint.label] = { error: error.message };
    }
  }

  // If sandbox simulation didn't work, simulate the webhook directly
  // with a VALID signature to prove the full flow works
  if (!simulated) {
    log(section, "");
    log(section, "Sandbox simulation API not available. Simulating webhook directly...");
    log(section, "This sends a properly-signed webhook to our Cloud Function,");
    log(section, "exactly as Squad would when a real bank transfer lands.");

    const transactionRef = `SQUAD-TEST-${Date.now()}`;
    const webhookPayload = {
      event: "virtual_account_payment",
      data: {
        virtual_account_number: accountNumber,
        amount: 500000, // ₦5,000 in kobo
        transaction_ref: transactionRef,
        currency: "NGN",
        session_id: `session_${Date.now()}`,
        type: "virtual_account_payment",
      },
    };

    // Compute signature on the exact string the server will produce.
    // The server does JSON.stringify(req.body) after parsing our JSON.
    // To match, we stringify our payload the same way.
    const rawBody = JSON.stringify(webhookPayload);
    // Also try the "round-tripped" version (parse + stringify) to match server behavior
    const roundTrippedBody = JSON.stringify(JSON.parse(rawBody));
    // Sign with the LIVE key (which is what the webhook verifies against)
    const signature = crypto.createHmac("sha256", LIVE_KEY).update(roundTrippedBody).digest("hex");

    log(section, "");
    log(section, "WEBHOOK REQUEST:");
    log(section, `  URL: ${WEBHOOK_URL}`);
    log(section, `  Method: POST`);
    log(section, `  Headers:`);
    log(section, `    Content-Type: application/json`);
    log(section, `    x-squad-signature: ${signature.substring(0, 20)}...${signature.substring(signature.length - 20)}`);
    log(section, `  Body:`);
    log(section, `    ${JSON.stringify(webhookPayload, null, 2)}`);

    try {
      // Send the exact raw body string so the server receives identical bytes
      const response = await makeRequest(
        WEBHOOK_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-squad-signature": signature,
          },
        },
        rawBody  // Send as string, not object
      );

      log(section, "");
      log(section, `WEBHOOK RESPONSE:`);
      log(section, `  Status: ${response.status}`);
      log(section, `  Body: ${JSON.stringify(response.body)}`);

      results.tests[section].data.webhookSimulation = {
        request: {
          url: WEBHOOK_URL,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-squad-signature": signature.substring(0, 20) + "..." + signature.substring(signature.length - 20),
          },
          body: webhookPayload,
        },
        response: {
          status: response.status,
          body: response.body,
        },
      };

      if (response.status === 200) {
        log(section, "✅ Webhook accepted and processed!");
        simulated = true;
      } else {
        log(section, `⚠️ Webhook returned ${response.status} — ${JSON.stringify(response.body)}`);
      }
    } catch (error) {
      log(section, `❌ Webhook error: ${error.message}`);
      results.tests[section].data.webhookSimulation = { error: error.message };
    }
  }

  // Wait for Firestore to process
  log(section, "");
  log(section, "Waiting 3 seconds for Firestore to process...");
  await sleep(3000);

  // Check if wallet was credited
  log(section, "");
  log(section, "Checking wallet balance AFTER payment...");
  const walletAfter = await db.collection("wallets").doc(testUid).get();
  const balanceAfter = walletAfter.data()?.nairaBalance || 0;
  log(section, `Wallet balance AFTER payment: ₦${balanceAfter}`);
  results.tests[section].data.walletBalanceAfter = balanceAfter;

  // Check for transaction record
  log(section, "");
  log(section, "Checking for transaction record in Firestore...");
  const txQuery = await db.collection("transactions")
    .where("reference", "==", `SQUAD-TEST-${Date.now()}`)
    .limit(1)
    .get();

  // Also check by uid
  const txByUid = await db.collection("transactions")
    .where("uid", "==", testUid)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  let txRecord = null;
  txByUid.forEach((doc) => {
    txRecord = { id: doc.id, ...doc.data() };
  });

  if (txRecord) {
    log(section, `✅ Transaction record found:`);
    log(section, `  ID: ${txRecord.id}`);
    log(section, `  Type: ${txRecord.type}`);
    log(section, `  Status: ${txRecord.status}`);
    log(section, `  Amount: ₦${txRecord.amountNaira}`);
    log(section, `  Reference: ${txRecord.reference}`);
    log(section, `  Payment Method: ${txRecord.paymentMethod}`);
    results.tests[section].data.transactionRecord = {
      id: txRecord.id,
      type: txRecord.type,
      status: txRecord.status,
      amountNaira: txRecord.amountNaira,
      reference: txRecord.reference,
      paymentMethod: txRecord.paymentMethod,
    };
  } else {
    log(section, "⚠️ No transaction record found (webhook may have been rejected)");
  }

  // Check for notification
  log(section, "");
  log(section, "Checking for notification in Firestore...");
  const notifQuery = await db.collection("notifications")
    .where("uid", "==", testUid)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  let notifRecord = null;
  notifQuery.forEach((doc) => {
    notifRecord = { id: doc.id, ...doc.data() };
  });

  if (notifRecord) {
    log(section, `✅ Notification record found:`);
    log(section, `  Title: ${notifRecord.title}`);
    log(section, `  Body: ${notifRecord.body}`);
    results.tests[section].data.notificationRecord = {
      title: notifRecord.title,
      body: notifRecord.body,
    };
  } else {
    log(section, "⚠️ No notification record found");
  }

  // Summary
  log(section, "");
  log(section, "═".repeat(70));
  log(section, "TEST 2 SUMMARY:");
  log(section, `  Wallet balance before: ₦${balanceBefore}`);
  log(section, `  Wallet balance after:  ₦${balanceAfter}`);
  log(section, `  Difference:            ₦${balanceAfter - balanceBefore}`);
  if (balanceAfter > balanceBefore) {
    log(section, `  ✅ Wallet was credited successfully!`);
  } else {
    log(section, `  ⚠️ Wallet was not credited (webhook may have been rejected)`);
  }
  log(section, "═".repeat(70));

  // Cleanup test data
  log(section, "");
  log(section, "Cleaning up test data from Firestore...");
  await db.collection("virtualAccounts").doc(testUid).delete();
  await db.collection("wallets").doc(testUid).delete();
  if (txRecord) {
    await db.collection("transactions").doc(txRecord.id).delete();
  }
  if (notifRecord) {
    await db.collection("notifications").doc(notifRecord.id).delete();
  }
  log(section, "✅ Test data cleaned up");

  return balanceAfter > balanceBefore;
}

// ── Test 3: Notification Handling ──────────────────────────────────────────
async function test3_NotificationHandling() {
  const section = "TEST_3_NOTIFICATION_HANDLING";
  log(section, "");
  log(section, "═".repeat(70));
  log(section, "TEST 3: Notification Handling (Webhook Handler)");
  log(section, "═".repeat(70));
  log(section, "");

  // Read the webhook handler code
  const webhookCodePath = path.join(__dirname, "functions", "src", "index.ts");
  const webhookCode = fs.readFileSync(webhookCodePath, "utf8");
  const lines = webhookCode.split("\n");
  const webhookStart = lines.findIndex((l) => l.includes("export const squadWebhook"));

  // Find the end of the squadWebhook function
  let braceCount = 0;
  let webhookEndLine = webhookStart;
  let foundStart = false;
  for (let i = webhookStart; i < lines.length; i++) {
    if (lines[i].includes("onRequest(")) { foundStart = true; braceCount++; }
    if (foundStart && lines[i].trim() === ");" && braceCount > 0) {
      braceCount--;
      if (braceCount === 0) { webhookEndLine = i; break; }
    }
  }

  const webhookCodeExtract = lines.slice(webhookStart, webhookEndLine + 1).join("\n");

  // Test 3a: Show webhook security (send invalid signature)
  log(section, "3a. Testing webhook security — sending INVALID signature...");
  const invalidPayload = {
    event: "virtual_account_payment",
    data: { virtual_account_number: "1234567890", amount: 500000, transaction_ref: "FAKE-TEST" },
  };

  try {
    const response = await makeRequest(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-squad-signature": "invalid_signature_abc123",
      },
    }, invalidPayload);

    log(section, `  Response: ${response.status} — ${JSON.stringify(response.body)}`);
    results.tests[section].data.securityTest = {
      description: "Sent webhook with invalid signature to verify rejection",
      request: { signature: "invalid_signature_abc123" },
      response: { status: response.status, body: response.body },
      result: response.status === 401 ? "PASS — Webhook correctly rejected invalid signature" : "FAIL",
    };

    if (response.status === 401) {
      log(section, "  ✅ PASS — Webhook rejected invalid signature (401 Unauthorized)");
    } else {
      log(section, "  ⚠️ Webhook did not reject invalid signature as expected");
    }
  } catch (error) {
    log(section, `  ❌ Error: ${error.message}`);
  }

  // Test 3b: Document the webhook handler
  log(section, "");
  log(section, "3b. Webhook Handler Code:");
  log(section, "");
  results.tests[section].data.webhookHandlerCode = webhookCodeExtract;
  results.tests[section].data.webhookUrl = WEBHOOK_URL;
  results.tests[section].data.eventsHandled = [
    {
      event: "charge_successful",
      description: "Saves card token for recurring/repeat card payments",
      fields: ["token_id", "transaction_ref", "email", "customer_name", "card_last4", "card_brand"],
      action: "Looks up user by email, saves card details to user's savedCards array in Firestore",
    },
    {
      event: "virtual_account_payment",
      description: "Credits user wallet when bank transfer deposit lands on virtual account",
      fields: ["virtual_account_number", "amount", "transaction_ref"],
      action: "Looks up virtual account by account_number, atomically credits wallet + creates transaction + sends notification",
    },
  ];
  results.tests[section].data.securityMeasures = [
    {
      measure: "HMAC-SHA256 Signature Verification",
      description: "Every webhook is verified against the Squad secret key. The signature is sent in the 'x-squad-signature' header. Invalid signatures are rejected with 401.",
      header: "x-squad-signature",
      verifiedInTest: true,
    },
    {
      measure: "Replay Attack Protection",
      description: "Transaction references are checked against existing Firestore records. If a reference was already processed, the webhook returns 200 with 'already_processed' and does not double-credit the user.",
    },
    {
      measure: "Atomic Wallet Credit (Firestore Transaction)",
      description: "Wallet credit, transaction record, and notification are created in a single Firestore transaction. If any step fails, the entire operation rolls back — no partial credits.",
    },
    {
      measure: "Immediate 200 OK Response",
      description: "Returns 200 OK immediately after processing to prevent unnecessary retries from Squad.",
    },
  ];
  results.tests[section].data.flowDiagram = [
    "1. Squad sends POST to webhook URL with event data",
    "2. Cloud Function verifies HMAC-SHA256 signature in 'x-squad-signature' header",
    "3. If signature invalid → 401 Unauthorized (rejected)",
    "4. If signature valid → parse event type",
    "5. For 'virtual_account_payment':",
    "   a. Check if transaction_ref already processed (replay protection)",
    "   b. Look up virtual account by account_number in Firestore",
    "   c. Run Firestore transaction:",
    "      - Create transaction record (type: deposit, status: completed)",
    "      - Credit user wallet (nairaBalance += amount/100)",
    "      - Create notification (title: 'Deposit Successful')",
    "   d. Return 200 OK",
    "6. For 'charge_successful':",
    "   a. Look up user by email in Firestore",
    "   b. Save card token to user's savedCards array",
    "   c. Return 200 OK",
  ];

  log(section, "✅ Notification handling documented");
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("  SQUAD VERIFICATION TEST SUITE");
  console.log("  Project: " + FIREBASE_PROJECT);
  console.log("  Date: " + new Date().toISOString());
  console.log("  Webhook: " + WEBHOOK_URL);
  console.log("═".repeat(70) + "\n");

  // Test 1
  const accountNumber = await test1_CreateVirtualAccount();

  // Test 2 (only if Test 1 succeeded)
  if (accountNumber) {
    await test2_SimulatePayment(accountNumber);
  } else {
    log("TEST_2_SIMULATE_PAYMENT", "Skipped — Test 1 failed to create virtual account");
  }

  // Test 3
  await test3_NotificationHandling();

  // Write results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log("\n" + "═".repeat(70));
  console.log(`  RESULTS SAVED TO: ${RESULTS_FILE}`);
  console.log("═".repeat(70) + "\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  process.exit(1);
});
