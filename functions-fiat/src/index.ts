import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as https from "https";
import {getFirestore} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";

initializeApp();

// ===========================================================================
// FIAT EXCHANGE RATES — fetch all currency rates every 1 minute and store
// in Firestore so all users read from a single source instead of each
// making their own API call.
// ===========================================================================

function fetchFiatRates(): Promise<Record<string, number> | null> {
  return new Promise((resolve) => {
    const req = https.request(
      "https://open.er-api.com/v6/latest/USD",
      {method: "GET"},
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            const d = JSON.parse(body);
            if (d?.result === "success" && d?.rates) {
              const rates: Record<string, number> = {};
              for (const [k, v] of Object.entries(d.rates)) {
                if (typeof v === "number") rates[k] = v;
              }
              resolve(rates);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

export const updateFiatRates = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "us-central1",
    memory: "128MiB",
    timeoutSeconds: 30,
  },
  async () => {
    const rates = await fetchFiatRates();
    if (!rates) {
      logger.warn("Fiat rates fetch failed — keeping existing rates");
      return;
    }

    const db = getFirestore();
    await db.collection("app_config").doc("fiat_rates").set({
      rates,
      base: "USD",
      updatedAt: new Date(),
    }, {merge: true});

    logger.info(`Fiat rates updated: ${Object.keys(rates).length} currencies`);
  }
);
