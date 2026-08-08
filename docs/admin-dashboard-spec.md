# KatrexApp Admin Dashboard — Full Feature Specification

## 1. Dashboard (Home)
- **Stats Cards:** Total users, transaction volume (NGN), crypto volume, airtime/data sales, giftcard volume, P2P volume, platform revenue
- **Live Activity Feed:** Real-time transactions across all services, filterable by type
- **Charts:** Revenue over time, user growth, transaction volume by category, crypto price trends
- **Alerts:** Pending withdrawals, unresolved tickets, open disputes, pending giftcard trades, pending P2P approvals, failed transactions
- **System Health:** API provider status (SMEPlug, SMEAPI, NowPayments, Korapay, Squad), Cloud Function status, Firestore usage

## 2. User Management
- **User List:** Search (name, email, username, phone, UID), filter (status, KYC tier, date), sort, pagination, bulk actions
- **User Detail:** Full profile, KYC status, referral info, security settings, wallet, saved cards, virtual accounts
- **Actions:** Block, restrict, delete, verify email/phone, change password, update wallet address, modify balances (naira + crypto with reason log), adjust KYC tier, view transactions, send email, send push notification, view referral tree, reset 2FA/PIN, view activity log
- **Add User:** Create account manually with initial KYC tier and balances
- **Export:** CSV user list, PDF individual user report

## 3. Transaction Management
- **All Transactions Table:** Columns (ID, user, type, status, amount, coin, reference, date, payment method), search, filter (type, status, date range, coin, amount), sort, pagination
- **Detail View:** Full transaction info, user info, payment method, recipient, card brand/network, timeline, related notifications
- **Actions:** Reverse/refund (with reason), update status manually, flag as suspicious, export CSV
- **Revenue Tracking:** Fees collected per transaction, breakdown by type, revenue charts

## 4. Crypto Management
- **Coin List:** Add/edit/remove/hide coins, reorder display, toggle visibility
- **Fee Settings:** Per-coin fees (percentage or fixed), separate buy/sell/swap/send fees, network fees, min/max amounts
- **Crypto Transactions:** Filter all crypto txs, view NowPayments deposits, view deposit addresses, manual confirmation
- **Live Market Data:** View shared data, manual refresh, set refresh interval, API key settings, manual price override
- **Buy/Sell Rates:** Set buy/sell rates per coin (NGN), spread/margin settings

## 5. Airtime & Data Management
- **Provider Settings:** View active VTU provider (SMEPlug/SMEAPI), switch provider, API keys
- **Real API Rates:** View live airtime rates per network (MTN, Airtel, Glo, 9Mobile), view live data plans & prices per network
- **Custom Pricing:** Set custom airtime rates (markup/discount), set custom data plan prices, override individual plan prices
- **Plan Management:** Hide/show plans, rename plans, reorder plans, set plan categories/filters
- **Network Management:** Toggle network visibility, set network display order
- **Purchase History:** All airtime/data purchases, filter by network/user/date/status, export CSV

## 6. Giftcard Management
- **Giftcard Brands:** Add/edit/remove brands (Apple, Steam, Amazon, etc.), set icon/image, set display order, toggle visibility
- **Rate Management:** Set rates per brand per region (USA, UK, EUR), per type (physical, e-code), per denomination range, bulk rate updates
- **Trade Orders:** View all submitted giftcard trades, see uploaded card images, update status (pending/approved/paid/rejected), filter by brand/status/date/user
- **Payout Settings:** Auto-payout vs manual payout, payout method (wallet credit, bank transfer)
- **Trade History:** Full history with filters, export CSV

## 7. P2P Trade Accounts (Marketplace)
- **Listing Approvals:** View submitted accounts, review details (platform, handle, followers, niche, price), approve/reject listing, remove active listing
- **Active Listings:** View all live listings, search/filter, remove any listing, edit listing details
- **P2P Trades:** View all trades (buyer, seller, item, status, escrow status), view trade timeline
- **Escrow Management:** View escrow-held funds, release funds manually, refund to buyer
- **Dispute Resolution:** View open disputes, view chat history between parties, send messages in dispute chat, auto-decide winner (release to seller / refund to buyer), add admin notes
- **Seller Management:** View seller ratings, flag/remove problematic sellers, view seller trade history

## 8. Wallet & Balance Management
- **User Wallets:** View all wallets, adjust balances with reason log, freeze wallet
- **Platform Wallet:** Main wallet, revenue wallet, reserve wallet
- **Withdrawal Approvals:** Pending withdrawals, approve/reject, batch approve, process via Korapay/manual
- **Deposit Monitoring:** All deposits (fiat/crypto), confirm pending, flag failed
- **Balance Audit Log:** All manual changes with admin name, reason, timestamp

## 9. Pricing & Rates Settings
- **Crypto Rates:** Buy/sell per coin, spread settings, live market toggle
- **Giftcard Rates:** Per brand/region/type/denomination
- **Airtime Rates:** Custom markup/discount per network
- **Data Plan Rates:** Custom price per plan
- **Fee Structure:** Transaction fees (percentage or fixed), withdrawal/deposit/swap fees, platform commission
- **Min/Max Limits:** Per transaction type

## 10. Support & Tickets
- **Ticket Queue:** Filter by status/priority/category/date, assign to admin
- **Ticket Detail:** Full conversation, user info, screenshots, history
- **Actions:** Reply, change status/priority, merge, close
- **Live Chat:** Real-time chat with users
- **Email Support:** View/reply to support@katrex.com emails
- **Canned Responses:** Templates for common issues
- **SLA Tracking:** Response/resolution time metrics

## 11. Referral & Commission Management
- **Program Settings:** Commission percentage per tier, min payout threshold, qualifying criteria
- **Referral Tree:** View referral chains, tree visualization
- **Commission Tracking:** Pending/approved/paid commissions, approve/reject, manual payout
- **Referral Stats:** Top referrers, total bonuses paid, conversion rate
- **Fraud Detection:** Flag suspicious patterns (self-referral, circular)

## 12. Notifications & Announcements
- **Push Notifications:** Send to all/specific users, schedule, templates
- **In-App Announcements:** Banner in user app, display duration, target segments
- **Notification History:** Sent notifications, delivery status, read receipts
- **Email Campaigns:** Bulk emails, templates, schedule, segment targeting
- **Auto-Notifications:** Configure per type (deposit, withdrawal, login, bonus, trade, security)

## 13. KYC & Verification
- **KYC Queue:** Pending submissions, review BVN/DOB/address/documents
- **Actions:** Approve, reject (with reason), request more docs, downgrade tier
- **BVN Verification:** View/verify BVN numbers, flag mismatches
- **Document Review:** View uploaded ID cards/utility bills, approve/reject
- **KYC Stats:** Verification rate, pending count, rejection rate, processing time

## 14. API & Integrations Settings
- **NowPayments:** API key, sub-partner ID, webhook URL, test/live toggle
- **Korapay:** Keys, webhook, virtual account settings
- **Squad:** Keys, webhook, checkout/card settings
- **SMEPlug/SMEAPI:** API keys, view live rates, test connection
- **Firebase:** Project settings, Cloud Function status, Firestore rules
- **Email/SMS:** SMTP, SMS gateway, template editor
- **Webhook Logs:** Incoming webhooks, status, payload, retry failed

## 15. Security & Access Control
- **Admin Users:** Add/remove admins, set roles (super admin, moderator, support, finance)
- **Role Permissions:** Granular per role (view, edit, delete, approve)
- **Admin Activity Log:** All admin actions logged
- **Login Security:** 2FA, IP whitelist, session timeout
- **Audit Trail:** Complete trail, exportable

## 16. Reports & Analytics
- **Revenue Reports:** Daily/weekly/monthly revenue, breakdown by service (crypto, airtime, data, giftcard, P2P)
- **User Reports:** Registration trends, active users, retention rate, churn rate
- **Transaction Reports:** Volume by type, success/failure rate, average transaction value
- **Crypto Reports:** Trading volume per coin, most traded coins, deposit/withdrawal volume
- **Giftcard Reports:** Trade volume per brand, most traded brands, approval rate
- **P2P Reports:** Listing approval rate, trade completion rate, dispute rate, average listing price
- **Support Reports:** Ticket volume, resolution time, satisfaction rate
- **Custom Reports:** Build custom reports with selected metrics and date ranges
- **Export:** All reports exportable as CSV/PDF

## 17. App Settings & Content
- **App Configuration:** App name, logo, support email, default currency, maintenance mode toggle
- **Feature Flags:** Enable/disable features per user segment (crypto trading, giftcard, P2P, airtime, data)
- **Maintenance Mode:** Toggle app-wide maintenance, display custom message to users
- **App Versioning:** Force update settings, version history, release notes
- **Terms & Policies:** Edit terms of service, privacy policy, FAQ content
- **Onboarding Content:** Edit onboarding slides, tutorial content
- **Branding:** Primary color, logo, splash screen image

---

## Appendix: Firestore Collections Used

| Collection | Purpose |
|---|---|
| `users` | User profiles, KYC, settings |
| `transactions` | All transaction records |
| `wallets` | User wallet balances (naira + crypto) |
| `notifications` | User notifications |
| `giftcard_trades` | Giftcard trade orders |
| `support_tickets` | Support ticket conversations |
| `referrals` | Referral relationships & commissions |
| `kyc_documents` | Uploaded KYC documents |
| `virtual_accounts` | Korapay virtual accounts |
| `crypto_deposits` | NowPayments crypto deposit tracking |
| `market_data` (new) | Shared live crypto prices & chart data |
| `admin_logs` (new) | Admin action audit trail |
| `app_settings` (new) | Global app configuration & feature flags |
| `p2p_listings` (new) | P2P marketplace listings |
| `p2p_trades` (new) | P2P trade transactions & escrow |
| `p2p_disputes` (new) | Escrow disputes & chat |

---

## Summary

**17 Pages total:**
1. Dashboard (Home)
2. User Management
3. Transaction Management
4. Crypto Management
5. Airtime & Data Management
6. Giftcard Management
7. P2P Trade Accounts (Marketplace)
8. Wallet & Balance Management
9. Pricing & Rates Settings
10. Support & Tickets
11. Referral & Commission Management
12. Notifications & Announcements
13. KYC & Verification
14. API & Integrations Settings
15. Security & Access Control
16. Reports & Analytics
17. App Settings & Content
