import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as https from "https";
import {getFirestore} from "firebase-admin/firestore";

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  TON: "the-open-network",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  DOGE: "dogecoin",
  ADA: "cardano",
  MATIC: "matic-network",
};

let cachedNgnRate = 1450;

function fetchNgnRate(): Promise<number> {
  return new Promise((resolve) => {
    const req = https.request(
      "https://api.exchangerate-api.com/v4/latest/USD",
      {method: "GET"},
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            const d = JSON.parse(body);
            const r = d?.rates?.NGN;
            if (r && typeof r === "number") { cachedNgnRate = r; resolve(r); }
            else resolve(cachedNgnRate);
          } catch { resolve(cachedNgnRate); }
        });
      }
    );
    req.on("error", () => resolve(cachedNgnRate));
    req.setTimeout(5000, () => { req.destroy(); resolve(cachedNgnRate); });
    req.end();
  });
}

function fetchCoinData(coinId: string): Promise<any | null> {
  return new Promise((resolve) => {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&sparkline=true&price_change_percentage=1h,24h,7d`;
    const req = https.request(url, {method: "GET"}, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          const d = JSON.parse(body);
          resolve(d?.[0] ?? null);
        } catch { resolve(null); }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

export const updateMarketData = onSchedule(
  {
    schedule: "every 2 minutes",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async () => {
    const db = getFirestore();
    const ngnRate = await fetchNgnRate();
    logger.info(`NGN rate: ${ngnRate}`);

    const entries = Object.entries(COINGECKO_IDS);
    const results = await Promise.all(
      entries.map(async ([symbol, geckoId]) => {
        const coin = await fetchCoinData(geckoId);
        if (!coin) return null;
        return {symbol, geckoId, coin};
      })
    );

    const batch = db.batch();
    let count = 0;

    for (const r of results) {
      if (!r) continue;
      const {symbol, coin} = r;
      const ref = db.collection("market_data").doc(symbol.toLowerCase());
      batch.set(ref, {
        symbol,
        name: coin.name ?? symbol,
        priceUsd: coin.current_price ?? 0,
        priceNaira: (coin.current_price ?? 0) * ngnRate,
        change24h: coin.price_change_percentage_24h ?? 0,
        change1h: coin.price_change_percentage_1h_in_currency ?? 0,
        change7d: coin.price_change_percentage_7d_in_currency ?? 0,
        marketCap: coin.market_cap ?? 0,
        volume24h: coin.total_volume ?? 0,
        high24h: coin.high_24h ?? 0,
        low24h: coin.low_24h ?? 0,
        ath: coin.ath ?? 0,
        circulatingSupply: coin.circulating_supply ?? 0,
        sparkline: coin.sparkline_in_7d?.price ?? [],
        ngnRate,
        updatedAt: new Date(),
      }, {merge: true});
      count++;
    }

    // Store NGN rate globally
    batch.set(db.collection("market_data").doc("_ngn_rate"), {
      rate: ngnRate,
      updatedAt: new Date(),
    }, {merge: true});

    await batch.commit();
    logger.info(`Market data updated for ${count} coins`);
  }
);
