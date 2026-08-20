import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../utils/constants.dart';
import '../widgets/app_background.dart';

class HelpCenterScreen extends StatefulWidget {
  const HelpCenterScreen({super.key});

  @override
  State<HelpCenterScreen> createState() => _HelpCenterScreenState();
}

class _HelpCenterScreenState extends State<HelpCenterScreen> {
  final List<_FaqItem> _faqs = const [
    _FaqItem(
      question: 'How do I deposit funds?',
      answer: 'Go to the Dashboard and tap "Add Money". You can deposit via card payment or crypto transfer. Card deposits are usually credited within minutes.',
    ),
    _FaqItem(
      question: 'How long does a withdrawal take?',
      answer: 'Bank withdrawals are processed manually within 24 hours. You will receive a notification once your withdrawal is completed.',
    ),
    _FaqItem(
      question: 'How do I complete KYC verification?',
      answer: 'Go to Profile → KYC Verification. Provide your BVN, phone number, date of birth, gender, and address. Our team will review and verify your identity.',
    ),
    _FaqItem(
      question: 'Why is my crypto send request pending?',
      answer: 'Crypto sends are reviewed by our team for security before being broadcast on-chain. This process typically takes up to 24 hours.',
    ),
    _FaqItem(
      question: 'How do I add a bank account?',
      answer: 'Go to Profile → Payment Methods → Add Bank Account. Enter your bank name, account number, and account name.',
    ),
    _FaqItem(
      question: 'How does the referral program work?',
      answer: 'Share your referral code with friends. When they sign up and complete their first transaction, you earn a referral bonus.',
    ),
    _FaqItem(
      question: 'How do I sell a gift card?',
      answer: 'Tap "Sell Giftcards" from the Dashboard. Select the brand, enter card details and upload photos or the e-code. Our team will review and credit your wallet.',
    ),
    _FaqItem(
      question: 'What cryptocurrencies are supported?',
      answer: 'We currently support Bitcoin (BTC), Ethereum (ETH), Tether (USDT), Toncoin (TON), and TRON (TRX).',
    ),
    _FaqItem(
      question: 'How do I reset my transaction PIN?',
      answer: 'Go to Profile → Security Settings. Toggle the PIN option off and set it up again to create a new PIN.',
    ),
    _FaqItem(
      question: 'How do I contact support?',
      answer: 'Use the in-app chat on the Support tab, or email us at ${AppConstants.supportEmail}.',
    ),
  ];

  final Set<int> _expanded = {};

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const AppBackground(child: SizedBox.expand()),
          SafeArea(
            child: Column(
              children: [
                _buildHeader(context),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
                    children: [
                      Text(
                        'How can we help?',
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: Colors.white),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Find answers to common questions below.',
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF9CA3AF)),
                      ),
                      const SizedBox(height: 24),
                      ...List.generate(_faqs.length, (i) => _buildFaqTile(i)),
                      const SizedBox(height: 32),
                      _buildContactSection(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: const Center(
                child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 18),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Help Center',
            style: GoogleFonts.plusJakartaSans(
                fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
          ),
        ],
      ),
    );
  }

  Widget _buildFaqTile(int index) {
    final faq = _faqs[index];
    final isExpanded = _expanded.contains(index);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: isExpanded
                ? const Color(0xFF2563EB).withOpacity(0.3)
                : Colors.white.withOpacity(0.07)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => setState(() {
          if (isExpanded) _expanded.remove(index); else _expanded.add(index);
        }),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      faq.question,
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Colors.white),
                    ),
                  ),
                  Icon(
                    isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                    color: const Color(0xFF9CA3AF),
                    size: 20,
                  ),
                ],
              ),
              if (isExpanded) ...[
                const SizedBox(height: 12),
                Text(
                  faq.answer,
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF9CA3AF),
                      height: 1.6),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContactSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E3A8A).withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.2)),
      ),
      child: Column(
        children: [
          const Icon(Icons.support_agent_rounded, color: Color(0xFF60A5FA), size: 32),
          const SizedBox(height: 12),
          Text(
            'Still need help?',
            style: GoogleFonts.plusJakartaSans(
                fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
          ),
          const SizedBox(height: 6),
          Text(
            'Our support team is available to help you.',
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(
                fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF)),
          ),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: () async {
              final uri = Uri.parse('mailto:${AppConstants.supportEmail}');
              try {
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri);
                } else {
                  throw Exception('Could not launch');
                }
              } catch (_) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Support Email: ${AppConstants.supportEmail}',
                        style: GoogleFonts.plusJakartaSans()),
                    backgroundColor: const Color(0xFF2563EB),
                  ),
                );
              }
            },
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: Text(
                  'Email Support',
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FaqItem {
  const _FaqItem({required this.question, required this.answer});
  final String question;
  final String answer;
}
