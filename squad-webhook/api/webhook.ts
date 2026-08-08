import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    const event = body?.event;
    const data = body?.data;

    console.log(`Squad webhook received: ${event}`);

    if (event === 'charge_successful' && data) {
      const tokenId = data.token_id as string | undefined;
      const email = data.email as string | undefined;
      const customerName = data.customer_name as string | undefined;
      const cardLast4 = data.card_last4 as string | undefined;
      const cardBrand = data.card_brand as string | undefined;
      const transactionRef = data.transaction_ref as string | undefined;

      if (tokenId && email) {
        const db = getFirestore();
        const usersRef = db.collection('users');
        const userQuery = await usersRef
          .where('email', '==', email)
          .limit(1)
          .get();

        if (!userQuery.empty) {
          const userDoc = userQuery.docs[0];
          const uid = userDoc.id;
          const userData = userDoc.data();
          const savedCards = userData.savedCards || [];

          const cardEntry = {
            tokenId,
            last4: cardLast4 || '',
            brand: cardBrand || '',
            email,
            customerName: customerName || '',
            transactionRef: transactionRef || '',
            savedAt: new Date().toISOString(),
          };

          savedCards.push(cardEntry);

          await userDoc.ref.update({
            savedCards,
            updatedAt: new Date(),
          });

          console.log(`Card token saved for user ${uid}`);
        } else {
          console.warn(`No user found for email ${email}`);
        }
      }
    }

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Squad webhook error:', error);
    return res.status(500).json({ status: 'error' });
  }
}
