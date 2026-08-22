import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../models/transaction_model.dart';

/// Reusable bottom-sheet modal that shows full details for a [TransactionModel].
///
/// Call [TransactionDetailsModal.show] from any screen to display the details
/// for a given transaction.
class TransactionDetailsModal {
  TransactionDetailsModal._();

  static void show(BuildContext context, TransactionModel tx) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _TransactionDetailsSheet(tx: tx),
    );
  }
}

class _TransactionDetailsSheet extends StatelessWidget {
  final TransactionModel tx;
  const _TransactionDetailsSheet({required this.tx});

  @override
  Widget build(BuildContext context) {
    final isPositive = tx.type == TransactionType.deposit ||
        tx.type == TransactionType.receive ||
        tx.type == TransactionType.sell ||
        tx.type == TransactionType.giftcard ||
        tx.type == TransactionType.referralBonus;

    final isOutgoing = tx.type == TransactionType.withdrawal ||
        tx.type == TransactionType.send ||
        tx.type == TransactionType.buy ||
        tx.type == TransactionType.airtime ||
        tx.type == TransactionType.data;

    final iconData = isOutgoing
        ? Icons.arrow_upward_rounded
        : (isPositive ? Icons.arrow_downward_rounded : Icons.swap_horiz_rounded);
    final color = isPositive ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final amountPrefix = isPositive ? '+' : '-';

    final fmt = NumberFormat('#,##0.00');
    final dateFmt = DateFormat('EEE, MMM d, yyyy');
    final timeFmt = DateFormat('h:mm a');
    final maxHeight = MediaQuery.sizeOf(context).height * 0.88;

    return Container(
      constraints: BoxConstraints(maxHeight: maxHeight),
      decoration: const BoxDecoration(
        color: Color(0xFF0A0F1F),
        borderRadius: BorderRadius.only(topLeft: Radius.circular(28), topRight: Radius.circular(28)),
        border: Border(top: BorderSide(color: Color(0x1AFFFFFF), width: 1)),
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag handle
              Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(4))),
              const SizedBox(height: 16),

              // Icon + type
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(shape: BoxShape.circle, color: color.withOpacity(0.15), border: Border.all(color: color.withOpacity(0.3))),
                child: Center(child: Icon(iconData, color: color, size: 22)),
              ),
              const SizedBox(height: 10),
              Text(tx.type.label, style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
              const SizedBox(height: 14),

              // Amount
              Text(
                '$amountPrefix\u20A6${fmt.format(tx.amountNaira)}',
                style: GoogleFonts.plusJakartaSans(fontSize: 30, fontWeight: FontWeight.w900, color: color, letterSpacing: -1),
              ),
              const SizedBox(height: 4),
              if (tx.amountCoin != null && tx.coinSymbol != null)
                Text(
                  '$amountPrefix${tx.amountCoin} ${tx.coinSymbol}',
                  style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)),
                ),
              const SizedBox(height: 14),

              // Status badge
              _StatusBadge(status: tx.status),
              if (tx.adminNote != null && tx.adminNote!.isNotEmpty) ...[
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: (tx.status == TransactionStatus.failed || tx.status == TransactionStatus.cancelled)
                        ? const Color(0xFFEF4444).withOpacity(0.12)
                        : const Color(0xFF2563EB).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: (tx.status == TransactionStatus.failed || tx.status == TransactionStatus.cancelled)
                          ? const Color(0xFFEF4444).withOpacity(0.3)
                          : const Color(0xFF2563EB).withOpacity(0.3),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            (tx.status == TransactionStatus.failed || tx.status == TransactionStatus.cancelled)
                                ? Icons.error_outline_rounded
                                : Icons.notes_rounded,
                            size: 16,
                            color: (tx.status == TransactionStatus.failed || tx.status == TransactionStatus.cancelled)
                                ? const Color(0xFFEF4444)
                                : const Color(0xFF60A5FA),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            (tx.status == TransactionStatus.failed || tx.status == TransactionStatus.cancelled)
                                ? 'Decline Reason'
                                : 'Admin Note',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: (tx.status == TransactionStatus.failed || tx.status == TransactionStatus.cancelled)
                                  ? const Color(0xFFEF4444)
                                  : const Color(0xFF60A5FA),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        tx.adminNote!,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),

              // Details list
              Container(
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(0.08))),
                child: Column(
                  children: [
                    _DetailRow(label: 'Date', value: dateFmt.format(tx.createdAt)),
                    _Divider(),
                    _DetailRow(label: 'Time', value: timeFmt.format(tx.createdAt)),
                    if (tx.reference != null && tx.reference!.isNotEmpty) ...[
                      _Divider(),
                      _DetailRow(label: 'Reference', value: tx.reference!, mono: true),
                    ],
                    if (tx.description != null && tx.description!.isNotEmpty) ...[
                      _Divider(),
                      _DetailRow(label: 'Description', value: tx.description!),
                    ],
                    if (tx.adminNote != null && tx.adminNote!.isNotEmpty) ...[
                      _Divider(),
                      _DetailRow(
                        label: (tx.status == TransactionStatus.failed || tx.status == TransactionStatus.cancelled)
                            ? 'Reason'
                            : 'Admin Note',
                        value: tx.adminNote!,
                        valueColor: (tx.status == TransactionStatus.failed || tx.status == TransactionStatus.cancelled)
                            ? const Color(0xFFEF4444)
                            : const Color(0xFF60A5FA),
                      ),
                    ],
                    if (tx.cardBrand != null && tx.cardBrand!.isNotEmpty) ...[
                      _Divider(),
                      _DetailRow(label: 'Card Brand', value: tx.cardBrand!),
                    ],
                    if (tx.networkProvider != null && tx.networkProvider!.isNotEmpty) ...[
                      _Divider(),
                      _DetailRow(label: 'Network', value: tx.networkProvider!),
                    ],
                    if (tx.recipient != null && tx.recipient!.isNotEmpty) ...[
                      _Divider(),
                      _DetailRow(label: 'Recipient', value: tx.recipient!, mono: true),
                    ],
                    if (tx.paymentMethod != null && tx.paymentMethod!.isNotEmpty) ...[
                      _Divider(),
                      _DetailRow(label: 'Payment Method', value: tx.paymentMethod!),
                    ],
                    if (tx.coinSymbol != null && tx.coinSymbol!.isNotEmpty) ...[
                      _Divider(),
                      _DetailRow(label: 'Coin', value: tx.coinSymbol!),
                    ],
                    if (tx.feeAmount != null) ...[
                      _Divider(),
                      _DetailRow(
                        label: 'Fee',
                        value: '${tx.feeAmount} ${tx.feeSymbol ?? tx.coinSymbol ?? ''}'.trim(),
                      ),
                    ],
                    if (tx.completedAt != null) ...[
                      _Divider(),
                      _DetailRow(label: 'Completed', value: timeFmt.format(tx.completedAt!)),
                    ],
                    _Divider(),
                    _DetailRow(label: 'Transaction ID', value: tx.id, mono: true),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Close button
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Center(child: Text('Close', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white))),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final TransactionStatus status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    IconData icon;
    switch (status) {
      case TransactionStatus.completed:
        color = const Color(0xFF10B981);
        label = 'Completed';
        icon = Icons.check_circle_rounded;
        break;
      case TransactionStatus.pending:
        color = const Color(0xFFF59E0B);
        label = 'Pending';
        icon = Icons.pending_rounded;
        break;
      case TransactionStatus.processing:
        color = const Color(0xFF3B82F6);
        label = 'Processing';
        icon = Icons.schedule_rounded;
        break;
      case TransactionStatus.failed:
        color = const Color(0xFFEF4444);
        label = 'Failed';
        icon = Icons.cancel_rounded;
        break;
      case TransactionStatus.cancelled:
        color = const Color(0xFF9CA3AF);
        label = 'Cancelled';
        icon = Icons.block_rounded;
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withOpacity(0.3))),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 6),
        Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: color)),
      ]),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final bool mono;
  final Color? valueColor;
  final int maxLines;
  const _DetailRow({
    required this.label,
    required this.value,
    this.mono = false,
    this.valueColor,
    this.maxLines = 4,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              maxLines: maxLines,
              overflow: TextOverflow.ellipsis,
              style: mono
                  ? TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: valueColor ?? Colors.white, fontFamily: 'monospace')
                  : GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: valueColor ?? Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Divider(height: 1, color: Colors.white.withOpacity(0.05), indent: 14, endIndent: 14);
  }
}
