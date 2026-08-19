/**
 * Submit a giftcard trade for review. Server-validated against the rate
 * book, rate-limited, e-code deduped, and fully transactional.
 * (Restored from the last deployed build after a refactor mishap.)
 */
async function handleSubmitGiftcardTrade(request) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    const data = request.data as Record<string, unknown>;
    const tradeId = requiredString(data.tradeId, "tradeId", 128);
    if (!/^[A-Za-z0-9_-]{10,128}$/.test(tradeId)) {
      throw new HttpsError("invalid-argument", "tradeId is invalid.");
    }
    const brandId = requiredString(data.brandId, "brandId");
    const rateId = requiredString(data.rateId, "rateId");
    const cardType = requiredString(data.cardType, "cardType", 20).toLowerCase();
    const currency = requiredString(data.currency, "currency", 10).toUpperCase();
    const cardValue = finiteNumber(data.cardValue, "cardValue", 1, 1000000);
    const ecode = optionalString(data.ecode, "ecode", 500);
    const comment = optionalString(data.comment, "comment", 1000);
    if (!['physical', 'ecode'].includes(cardType) || !['USD', 'GBP', 'EUR'].includes(currency)) {
      throw new HttpsError("invalid-argument", "Unsupported card type or currency.");
    }

    const storagePaths = Array.isArray(data.storagePaths) ? data.storagePaths : [];
    const cardImageUrls = Array.isArray(data.cardImageUrls) ? data.cardImageUrls : [];
    if (storagePaths.length > 5 || cardImageUrls.length !== storagePaths.length) {
      throw new HttpsError("invalid-argument", "Card images are invalid.");
    }
    if (cardType === 'physical' && storagePaths.length === 0) {
      throw new HttpsError("invalid-argument", "At least one card image is required.");
    }
    if (cardType === 'ecode' && !ecode) {
      throw new HttpsError("invalid-argument", "The e-code is required.");
    }

    // Verify images exist in R2 and are valid images.
    if (cardType === "physical" && storagePaths.length > 0) {
      await verifyR2Images(uid, tradeId, storagePaths);
    }

    const tradeRef = db.collection("giftcard_trades").doc(tradeId);
    const rateRef = db.collection("giftcard_rates").doc(rateId);
    const brandRef = db.collection("giftcard_brands").doc(brandId);
    const userRef = db.collection("users").doc(uid);
    const limitRef = db.collection("rate_limits").doc(`giftcard_${uid}`);
    const codeHash = ecode
      ? createHash("sha256").update(ecode.toUpperCase().replace(/\s+/g, "")).digest("hex")
      : null;
    const codeClaimRef = codeHash ? db.collection("giftcard_code_claims").doc(codeHash) : null;

    return db.runTransaction(async (txn) => {
      const refs = [tradeRef, rateRef, brandRef, userRef, limitRef];
      const [tradeSnap, rateSnap, brandSnap, userSnap, limitSnap] = await Promise.all(
        refs.map((ref) => txn.get(ref)),
      );
      const claimSnap = codeClaimRef ? await txn.get(codeClaimRef) : null;

      if (tradeSnap.exists) {
        if (tradeSnap.data()?.uid === uid) {
          return {
            tradeId,
            payoutAmount: tradeSnap.data()?.payoutAmount ?? 0,
            rateApplied: tradeSnap.data()?.rateApplied ?? 0,
          };
        }
        throw new HttpsError("already-exists", "Trade ID already exists.");
      }
      if (!rateSnap.exists || !brandSnap.exists) {
        throw new HttpsError("failed-precondition", "This gift card is not currently available.");
      }
      if (!userSnap.exists || userSnap.data()?.isActive === false) {
        throw new HttpsError("failed-precondition", "Your account cannot submit trades.");
      }
      if (claimSnap?.exists) {
        throw new HttpsError("already-exists", "This e-code has already been submitted.");
      }

      const rate = rateSnap.data()!;
      const brand = brandSnap.data()!;
      const minValue = Number(rate.minValue ?? 0);
      const maxValue = rate.maxValue === null || rate.maxValue === undefined
        ? null
        : Number(rate.maxValue);
      if (brand.isActive !== true || rate.isActive !== true ||
          rate.brandId !== brandId || rate.cardType !== cardType || rate.currency !== currency ||
          cardValue < minValue || (maxValue !== null && cardValue > maxValue)) {
        throw new HttpsError("failed-precondition", "The selected rate is no longer available.");
      }

      const now = Date.now();
      const limits = limitSnap.data() ?? {};
      const hourStartedAt = limits.hourStartedAt?.toMillis?.() ?? 0;
      const dayStartedAt = limits.dayStartedAt?.toMillis?.() ?? 0;
      const hourCount = now - hourStartedAt < 60 * 60 * 1000 ? Number(limits.hourCount ?? 0) : 0;
      const dayCount = now - dayStartedAt < 24 * 60 * 60 * 1000 ? Number(limits.dayCount ?? 0) : 0;
      if (hourCount >= 5 || dayCount >= 20) {
        throw new HttpsError("resource-exhausted", "Too many gift card submissions. Try again later.");
      }

      const rateApplied = finiteNumber(Number(rate.ratePerUnit), "ratePerUnit", 0.01);
      const payoutAmount = Math.round(cardValue * rateApplied * 100) / 100;
      const createdAt = FieldValue.serverTimestamp();
      const user = userSnap.data()!;

      txn.set(tradeRef, {
        id: tradeId,
        uid,
        userName: user.fullName ?? user.username ?? "User",
        userEmail: user.email ?? request.auth?.token.email ?? null,
        brandId,
        brandName: brand.name,
        rateId,
        rateVersion: Number(rate.version ?? 1),
        cardType,
        currency,
        cardValue,
        rateApplied,
        payoutAmount,
        storagePaths,
        cardImageUrls,
        ecode,
        ecodeHash: codeHash,
        comment,
        status: "pending",
        adminId: null,
        adminComment: null,
        rejectionReason: null,
        reviewedAt: null,
        transactionId: null,
        createdAt,
        updatedAt: createdAt,
      });

      txn.set(limitRef, {
        uid,
        hourCount: hourCount + 1,
        hourStartedAt: hourCount === 0 ? createdAt : limits.hourStartedAt,
        dayCount: dayCount + 1,
        dayStartedAt: dayCount === 0 ? createdAt : limits.dayStartedAt,
        updatedAt: createdAt,
      }, {merge: true});
      if (codeClaimRef) txn.set(codeClaimRef, {uid, tradeId, createdAt});

      const auditRef = db.collection("audit_logs").doc();
      txn.set(auditRef, {
        id: auditRef.id,
        actorId: uid,
        actorType: "user",
        action: "giftcard_trade_submitted",
        resourceType: "giftcard_trade",
        resourceId: tradeId,
        summary: {brandId, cardType, currency, cardValue, payoutAmount},
        createdAt,
      });

      return {tradeId, payoutAmount, rateApplied};
    });
}

