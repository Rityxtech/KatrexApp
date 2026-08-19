# Squad Live Access Verification — Meeting Demo Guide

This document explains exactly what to show the Squad team during your verification call.
Each section maps to what they asked you to demonstrate.

---

## Quick Reference — Your Infrastructure

| Item | Value |
|------|-------|
| **Project** | `smclient-83cde` (Firebase, us-central1) |
| **Webhook URL** | `https://squadwebhook-nx6tlgm5aa-uc.a.run.app` (or `https://us-central1-smclient-83cde.cloudfunctions.net/squadWebhook`) |
| **Virtual Account Endpoint (sandbox)** | `https://sandbox-api-d.squadco.com/virtual-account` |
| **Virtual Account Endpoint (live)** | `https://api-d.squadco.com/virtual-account` |
| **Card Payment Endpoint (live)** | `https://api-d.squadco.com/transaction/initiate` |
| **Transaction Verify Endpoint (live)** | `https://api-d.squadco.com/transaction/verify/{ref}` |

> **IMPORTANT:** Before the meeting, log into the Squad dashboard and set your
> **Webhook URL** to the URL above. Without this, notifications won't reach your app.

---

## 1. "Call the endpoint via the payload pass, to see the response I got"

### What they mean
They want to see you make a **real API call** to the virtual-account creation endpoint
with the correct payload, and show them the JSON response that comes back.

### How to demonstrate

#### Option A: Show it live in the app (preferred)
1. Open the Smclient app on your phone (or emulator)
2. Go to the **Deposit** screen → **Virtual Account** tab
3. Tap **"Generate Virtual Account"**
4. The app calls the `createVirtualAccount` Cloud Function, which calls Squad's API
5. Show them the generated account number + bank name that appears on screen
6. Then open the **Firebase Console → Functions → Logs** and show them the log line:
   ```
   Squad virtual account created: {account_number, account_name, ...}
   ```

#### Option B: Show the raw API call with curl
If they want to see the raw HTTP request/response, run this in a terminal:

```bash
curl -X POST https://sandbox-api-d.squadco.com/virtual-account \
  -H "Authorization: Bearer YOUR_SANDBOX_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "mobile_num": "08012345678",
    "dob": "01/15/1990",
    "gender": "1",
    "address": "123 Main St, Lagos",
    "customer_identifier": "test_uid_123",
    "bvn": "12345678901",
    "email": "john.doe@example.com",
    "beneficiary_account": "0123456789"
  }'
```

**Expected response (success):**
```json
{
  "success": true,
  "message": "Virtual Account Generated",
  "data": {
    "virtual_account_number": "0123456789",
    "virtual_account_name": "John Doe",
    "bank_name": "GTBank",
    "transaction_ref": "SQUAD-XXXX-XXXX"
  }
}
```

### What the payload fields mean (be ready to explain):

| Field | Purpose |
|-------|---------|
| `first_name` / `last_name` | Customer's legal name (parsed from `fullName`) |
| `mobile_num` | Customer's phone number |
| `dob` | Date of birth in `mm/dd/yyyy` format (Squad requirement) |
| `gender` | `"1"` = Male, `"2"` = Female (Squad's format) |
| `address` | Customer's address |
| `customer_identifier` | The Firebase UID — used to link the account to the user |
| `bvn` | Bank Verification Number (Nigeria's identity system) |
| `email` | Customer's email |
| `beneficiary_account` | The settlement account where funds ultimately land |

### Where this lives in your code:
- **Cloud Function:** `functions/src/secure-functions.ts` → `createVirtualAccount` (line ~1212)
- **Flutter call:** `lib/services/cloud_functions_service.dart` → `createVirtualAccount()`

---

## 2. "Simulate to the virtual account"

### What they mean
Squad's sandbox lets you **simulate a bank transfer** to the virtual account you just
created, so they can see the money "arrive" without needing a real bank transfer.

### How to demonstrate

#### Step 1: Note the virtual account number from Step 1
e.g. `0123456789`

#### Step 2: Simulate a payment via Squad's sandbox API
Squad provides a sandbox endpoint to simulate virtual account funding:

```bash
curl -X POST https://sandbox-api-d.squadco.com/virtual-account/fund \
  -H "Authorization: Bearer YOUR_SANDBOX_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "virtual_account_number": "0123456789",
    "amount": 5000
  }'
```

> **NOTE:** Ask the Squad team for the exact simulate-fund endpoint URL during the
> call — it may vary. Some versions use `/virtual-account/credit` or a dashboard button.

#### Step 3: Show the result in real time
After simulating the payment, show them **two things**:

**A. Firebase Functions Logs** — Open Firebase Console → Functions → Logs.
You should see:
```
Squad webhook received: virtual_account_payment
VA payment: account=0123456789, amount=500000, ref=SQUAD-XXXX
VA deposit credited: uid=abc123, amount=5000
```

**B. The app updates in real time** — Open the app → Wallet screen.
The naira balance should increase by ₦5,000 and a notification should appear:
> "Deposit Successful — Your bank transfer deposit of ₦5,000 has been credited."

### The full flow you're demonstrating:
```
User transfers money → Squad virtual account
        ↓
Squad sends webhook to your Cloud Function
        ↓
Cloud Function verifies signature (HMAC-SHA256)
        ↓
Cloud Function looks up virtual account by account number
        ↓
Cloud Function atomically credits wallet + creates transaction + sends notification
        ↓
User sees updated balance + notification in the app
```

---

## 3. "How you handle notification"

### What they mean
They want to see your **webhook handler** — the code that receives payment
notifications from Squad and processes them securely.

### How to demonstrate

#### Step 1: Show them the webhook URL
Tell them:
> "Our webhook URL is `https://squadwebhook-nx6tlgm5aa-uc.a.run.app`
> It's a Firebase Cloud Function deployed in us-central1."

#### Step 2: Show them the code
Open `functions/src/index.ts` and scroll to line 612 (`squadWebhook`).

Walk them through these key parts:

**A. Signature Verification (security)**
```typescript
// Squad signs webhooks with HMAC-SHA256 using the secret key.
const signature = req.headers["x-squad-signature"] as string | undefined;
if (!signature) {
  res.status(401).send({status: "error", message: "Missing signature"});
  return;
}

const rawBody = JSON.stringify(req.body);
const expectedSig = crypto
  .createHmac("sha256", squadSecretKey.value())
  .update(rawBody)
  .digest("hex");

if (signature !== expectedSig) {
  res.status(401).send({status: "error", message: "Invalid signature"});
  return;
}
```
**Explain:** "We verify every webhook's HMAC-SHA256 signature against our secret key.
If the signature doesn't match, we reject it with 401. This prevents spoofed
notifications."

**B. Event Handling**
```typescript
const event = body?.event;
const data = body?.data;

if (event === "charge_successful" && data) {
  // Save card token for future recurring payments
}

if (event === "virtual_account_payment" && data) {
  // Credit user wallet for virtual account deposits
}
```
**Explain:** "We handle two event types:
- `charge_successful` — saves the card token so users can pay again without re-entering card details
- `virtual_account_payment` — credits the user's wallet when a bank transfer deposit lands"

**C. Replay Attack Protection**
```typescript
const existingTx = await db.collection("transactions")
  .where("reference", "==", transactionRef)
  .limit(1)
  .get();
if (!existingTx.empty) {
  logger.info(`Duplicate webhook: ${transactionRef} already processed`);
  res.status(200).send({status: "already_processed"});
  return;
}
```
**Explain:** "We check if the transaction reference was already processed.
If Squad retries the webhook (which they do), we don't double-credit the user."

**D. Atomic Wallet Credit (Firestore Transaction)**
```typescript
await db.runTransaction(async (txn) => {
  const walletDoc = await txn.get(walletRef);
  const nairaBalance = walletDoc.data()?.nairaBalance || 0;

  // Create transaction record
  txn.set(txRef, {
    type: "deposit",
    status: "completed",
    amountNaira: amount / 100,
    reference: transactionRef,
    paymentMethod: "virtual_account",
    ...
  });

  // Credit wallet
  txn.set(walletRef, {
    nairaBalance: nairaBalance + amountNaira,
    ...
  }, {merge: true});

  // Create notification
  txn.set(notifRef, {
    type: "deposit",
    title: "Deposit Successful",
    body: `Your bank transfer deposit of ₦${amountNaira} has been credited.`,
    ...
  });
});
```
**Explain:** "We use a Firestore transaction to atomically:
1. Create a transaction record
2. Credit the user's wallet balance
3. Create a push notification

If any step fails, the entire operation rolls back — no partial credits."

**E. Response**
```typescript
res.status(200).send({status: "success"});
```
**Explain:** "We always return 200 OK quickly after processing, so Squad
doesn't retry unnecessarily."

#### Step 3: Show them the live logs
Open Firebase Console → Functions → Logs and filter for "Squad webhook".
If you've done Step 2 (simulate), they'll see the actual log entries from
the simulated payment — proof that the webhook is working end-to-end.

---

## Pre-Meeting Checklist

Before the call, make sure you have these ready:

- [ ] **Squad Sandbox Secret Key** — so you can run curl commands if needed
- [ ] **Firebase Console open** — Functions → Logs tab, filtered to "Squad"
- [ ] **App running** — on a phone or emulator, logged in with a test user
- [ ] **Test user has KYC data** — BVN, phone, DOB, gender, address filled in
  (otherwise virtual account creation will fail)
- [ ] **Webhook URL configured in Squad dashboard** — point it to:
  `https://squadwebhook-nx6tlgm5aa-uc.a.run.app`
- [ ] **This document open** — so you can reference the curl commands and explanations
- [ ] **The code open in your IDE** — `functions/src/index.ts` at line 612

---

## If They Ask: "What happens if the webhook fails?"

Your code handles this in three ways:

1. **Signature mismatch** → 401 response, no processing
2. **Duplicate webhook** → 200 with `already_processed`, no double-credit
3. **Internal error** → 500 response, Squad will retry the webhook automatically

Squad retries failed webhooks, so even if your function is temporarily down,
the deposit will still be credited when it comes back up and the retry arrives.

---

## If They Ask: "How do you match the payment to the user?"

Explain:
> "When we create the virtual account, we store the `customer_identifier`
> (which is the user's Firebase UID) in our database alongside the account number.
> When a webhook arrives, we look up the virtual account by account number,
> which gives us the UID. We then credit that user's wallet."

---

## If They Ask: "What about chargebacks or refunds?"

Be honest — say:
> "We currently handle deposits as final once the webhook confirms
> `virtual_account_payment`. For chargebacks, we would need to add a handler
> for the `charge_dispute` event, which we can implement if required."

---

## Summary — What to Say During the Meeting

> "Our integration has three parts:
>
> 1. **Account Creation** — We call Squad's `/virtual-account` endpoint with the
>    user's KYC data (BVN, name, DOB, etc.) and store the returned account number
>    in our database, linked to the user's ID.
>
> 2. **Payment Simulation** — When a user transfers money to their virtual account,
>    Squad sends a `virtual_account_payment` webhook to our Cloud Function.
>    We verify the HMAC signature, check for duplicates, then atomically credit
>    the user's wallet using a Firestore transaction.
>
> 3. **Notification Handling** — Our webhook at
>    `squadWebhook` handles two events: `charge_successful` (saves card tokens)
>    and `virtual_account_payment` (credits wallet). Every webhook is signature-
>    verified, deduplicated, and processed atomically. We return 200 OK
>    immediately after processing."
