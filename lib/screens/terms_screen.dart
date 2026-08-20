import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../utils/constants.dart';
import '../widgets/app_background.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

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
                Padding(
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
                        'Terms of Service',
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
                    children: [
                      Text(
                        'Terms of Service',
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Last updated: 2026',
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF)),
                      ),
                      const SizedBox(height: 24),
                      ..._sections.map((s) => _buildSection(s.$1, s.$2)),
                      const SizedBox(height: 32),
                      Text(
                        'For questions, contact us at ${AppConstants.supportEmail}',
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF)),
                      ),
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

  Widget _buildSection(String title, String body) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.plusJakartaSans(
                fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: const Color(0xFF9CA3AF),
                height: 1.7),
          ),
        ],
      ),
    );
  }

  static const _sections = [
    ('1. Acceptance of Terms',
     'By accessing or using ${AppConstants.appName}, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.'),
    ('2. Eligibility',
     'You must be at least 18 years old and a resident of Nigeria to use our services. By using ${AppConstants.appName}, you represent and warrant that you meet these requirements.'),
    ('3. Account Registration',
     'You must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.'),
    ('4. KYC Verification',
     'To access full platform features including withdrawals and higher transaction limits, you must complete identity verification (KYC). We reserve the right to request additional verification at any time.'),
    ('5. Prohibited Activities',
     'You may not use ${AppConstants.appName} for any unlawful purpose, including but not limited to money laundering, fraud, or financing of terrorism. We monitor transactions and may report suspicious activity to relevant authorities.'),
    ('6. Transactions',
     'All transactions are final and may not be reversed once submitted. We are not responsible for incorrect recipient addresses or account numbers entered by users. Withdrawal processing times vary and are subject to our review process.'),
    ('7. Fees',
     'We charge fees for certain transactions as disclosed at the time of the transaction. Fees are subject to change with notice provided through the app.'),
    ('8. Limitation of Liability',
     'To the maximum extent permitted by law, ${AppConstants.appName} and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.'),
    ('9. Termination',
     'We reserve the right to suspend or terminate your account at our discretion, particularly in cases of suspected fraud, violation of these terms, or risk to the platform or other users.'),
    ('10. Changes to Terms',
     'We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the new terms. We will notify you of significant changes through the app.'),
    ('11. Contact',
     'For questions about these Terms of Service, please contact us at ${AppConstants.supportEmail}.'),
  ];
}
