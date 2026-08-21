import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/transaction_model.dart';
import '../providers/transaction_provider.dart';
import '../widgets/app_background.dart';
import '../widgets/header_profile_avatar.dart';
import '../widgets/notification_icon.dart';
import '../widgets/transaction_details_modal.dart';
import 'giftcard_trades_history_screen.dart';

class TransactionHistoryScreen extends StatefulWidget {
  final ValueChanged<int>? onTabSwitch;

  const TransactionHistoryScreen({super.key, this.onTabSwitch});

  @override
  State<TransactionHistoryScreen> createState() => _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  String _searchQuery = '';

  String _typeFilter = 'All Types';
  String _statusFilter = 'Any Status';
  String _dateFilter = 'All Time';
  DateTime? _customStartDate;
  DateTime? _customEndDate;

  final ScrollController _scrollController = ScrollController();
  final int _pageSize = 20;
  int _currentPage = 1;
  bool _isLoadingMore = false;
  bool _hasMore = true;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200 &&
        !_isLoadingMore &&
        _hasMore) {
      _loadMore();
    }
  }

  void _loadMore() {
    final provider = context.read<TransactionProvider>();
    final allTransactions = provider.transactions;
    if (allTransactions.length <= _currentPage * _pageSize) {
      _hasMore = false;
      if (mounted) setState(() {});
      return;
    }

    setState(() => _isLoadingMore = true);

    Future.delayed(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      _currentPage++;
      _isLoadingMore = false;
      setState(() {});
    });
  }

  List<TransactionModel> _getPaginatedTransactions(List<TransactionModel> all) {
    final count = _currentPage * _pageSize;
    return all.take(count).toList();
  }

  List<TransactionModel> _filterTransactions(List<TransactionModel> transactions) {
    var list = transactions;

    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((t) =>
          t.type.label.toLowerCase().contains(q) ||
          (t.description ?? '').toLowerCase().contains(q)).toList();
    }

    if (_typeFilter != 'All Types') {
      final typeMap = {
        'Deposits': TransactionType.deposit,
        'Withdrawals': TransactionType.withdrawal,
        'Gift Cards': TransactionType.giftcard,
        'Rewards': TransactionType.referralBonus,
      };
      final filterType = typeMap[_typeFilter];
      if (filterType != null) {
        list = list.where((t) => t.type == filterType).toList();
      }
    }

    if (_statusFilter != 'Any Status') {
      final statusMap = {
        'Completed': TransactionStatus.completed,
        'Processing': TransactionStatus.pending,
        'Failed': TransactionStatus.failed,
      };
      final filterStatus = statusMap[_statusFilter];
      if (filterStatus != null) {
        list = list.where((t) => t.status == filterStatus).toList();
      }
    }

    if (_dateFilter == 'Last 7 Days') {
      final cutoff = DateTime.now().subtract(const Duration(days: 7));
      list = list.where((t) => t.createdAt.isAfter(cutoff)).toList();
    } else if (_dateFilter == 'Last 30 Days') {
      final cutoff = DateTime.now().subtract(const Duration(days: 30));
      list = list.where((t) => t.createdAt.isAfter(cutoff)).toList();
    } else if (_dateFilter == 'Custom' && _customStartDate != null && _customEndDate != null) {
      final end = _customEndDate!.add(const Duration(days: 1));
      list = list.where((t) =>
          t.createdAt.isAfter(_customStartDate!.subtract(const Duration(days: 1))) &&
          t.createdAt.isBefore(end)).toList();
    }

    return list;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          widget.onTabSwitch?.call(0);
        }
      },
      child: Scaffold(
      backgroundColor: const Color(0xFF000000),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const AppBackground(child: SizedBox.expand()),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(),
                  const SizedBox(height: 16),
                  _buildSearchBar(),
                  const SizedBox(height: 16),
                  Expanded(
                    child: _buildTransactionsList(),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        GestureDetector(
          onTap: () => widget.onTabSwitch?.call(0),
          child: const HeaderProfileAvatar(),
        ),
        Text(
          'Transactions',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 17,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
        Row(
          children: [
            _buildIconButton(
              icon: Icons.card_giftcard_rounded,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const GiftcardTradesHistoryScreen()),
              ),
            ),
            const SizedBox(width: 8),
            const NotificationIcon(),
          ],
        ),
      ],
    );
  }

  Widget _buildIconButton({required IconData icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Icon(
          icon,
          color: Colors.white,
          size: 18,
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.search_rounded,
                  color: Color(0xFF9CA3AF),
                  size: 18,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    onChanged: (value) => setState(() => _searchQuery = value),
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Search deposits, transfers...',
                      hintStyle: GoogleFonts.plusJakartaSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF6B7280),
                      ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: () => _openFilterModal(),
          child: Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: const Icon(
              Icons.tune_rounded,
              color: Color(0xFFD1D5DB),
              size: 20,
            ),
          ),
        ),
      ],
    );
  }


  Widget _buildTransactionsList() {
    final allTransactions = context.watch<TransactionProvider>().transactions;
    final filtered = _filterTransactions(allTransactions);
    final transactions = _getPaginatedTransactions(filtered);
    if (filtered.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.receipt_long_rounded, size: 48, color: Colors.white.withOpacity(0.2)),
            const SizedBox(height: 12),
            Text(
              'No transactions found',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: Colors.white54,
              ),
            ),
          ],
        ),
      );
    }

    final grouped = <String, List<TransactionModel>>{};
    for (final t in transactions) {
      final dateLabel = _dateLabel(t.createdAt);
      grouped.putIfAbsent(dateLabel, () => []).add(t);
    }

    final groupKeys = grouped.keys.toList();
    final itemCount = groupKeys.length + (_hasMore || _isLoadingMore ? 1 : 0);

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.only(bottom: 100),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        if (index == groupKeys.length) {
          if (_isLoadingMore) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: SizedBox(
                  width: 20, height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white.withOpacity(0.4),
                  ),
                ),
              ),
            );
          }
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: Text(
                'No more transactions',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Colors.white.withOpacity(0.3),
                ),
              ),
            ),
          );
        }

        final date = groupKeys[index];
        return _buildDateGroup(date, grouped[date]!);
      },
    );
  }

  String _dateLabel(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    return DateFormat('MMM d, yyyy').format(dt);
  }

  Widget _buildDateGroup(String date, List<TransactionModel> items) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 6),
            child: Text(
              date,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
          ),
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.03),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Column(
                  children: List.generate(items.length * 2 - 1, (i) {
                    if (i.isOdd) {
                      return Divider(
                        height: 1,
                        color: Colors.white.withOpacity(0.05),
                        indent: 66,
                        endIndent: 16,
                      );
                    }
                    return _buildTransactionItem(items[i ~/ 2]);
                  }),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionItem(TransactionModel t) {
    final isFailed = t.status == TransactionStatus.failed;
    final isPositive = t.type == TransactionType.deposit ||
        t.type == TransactionType.receive ||
        t.type == TransactionType.sell ||
        t.type == TransactionType.referralBonus;
    final isOutgoing = t.type == TransactionType.withdrawal ||
        t.type == TransactionType.send ||
        t.type == TransactionType.buy ||
        t.type == TransactionType.airtime ||
        t.type == TransactionType.data;
    final icon = _iconForType(t.type);
    final iconColor = _colorForType(t.type);
    final arrow = isOutgoing ? Icons.arrow_upward : (isPositive ? Icons.arrow_downward : null);
    final arrowColor = isOutgoing ? const Color(0xFF9CA3AF) : iconColor;
    final status = _statusLabel(t.status);
    final amount = '${isPositive ? '+' : '-'}\u20A6${NumberFormat('#,##0').format(t.amountNaira)}';

    final isCancelled = t.status == TransactionStatus.cancelled;
    final isPending = t.status == TransactionStatus.pending;

    Color amountColor;
    if (isFailed) {
      amountColor = const Color(0xFFEF4444);
    } else if (isCancelled) {
      amountColor = const Color(0xFF6B7280);
    } else if (isPending) {
      amountColor = const Color(0xFFFB923C);
    } else if (isPositive) {
      amountColor = const Color(0xFF34D399);
    } else {
      amountColor = const Color(0xFFEF4444);
    }

    return GestureDetector(
      onTap: () => TransactionDetailsModal.show(context, t),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        color: Colors.transparent,
        child: Row(
          children: [
            SizedBox(
              width: 32,
              height: 32,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: iconColor.withOpacity(0.15),
                      border: Border.all(
                        color: iconColor.withOpacity(0.2),
                      ),
                    ),
                    child: Center(
                      child: Icon(icon, size: 12, color: iconColor),
                    ),
                  ),
                  if (arrow != null)
                    Positioned(
                      bottom: -2,
                      right: -2,
                      child: Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: arrowColor,
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFF16181D), width: 2),
                        ),
                        child: Icon(
                          arrow,
                          color: Colors.white,
                          size: 7,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t.type.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      decoration: isFailed ? TextDecoration.lineThrough : null,
                      decorationColor: Colors.white.withOpacity(0.3),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Container(
                        width: 5,
                        height: 5,
                        decoration: BoxDecoration(
                          color: _statusDotColor(status),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: _statusDotColor(status).withOpacity(0.8),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          status,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: _statusColor(status),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          '• ${DateFormat('h:mm a').format(t.createdAt)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF9CA3AF),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            SizedBox(
              width: 100,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    amount,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: amountColor,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    t.description ?? '',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: isFailed || isCancelled ? const Color(0xFF6B7280) : isPending ? const Color(0xFFFB923C) : const Color(0xFF9CA3AF),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _iconForType(TransactionType type) {
    switch (type) {
      case TransactionType.deposit: return Icons.account_balance_rounded;
      case TransactionType.withdrawal: return Icons.account_balance_rounded;
      case TransactionType.buy: return Icons.currency_bitcoin_rounded;
      case TransactionType.sell: return Icons.currency_bitcoin_rounded;
      case TransactionType.swap: return Icons.swap_horiz_rounded;
      case TransactionType.send: return Icons.arrow_upward_rounded;
      case TransactionType.receive: return Icons.arrow_downward_rounded;
      case TransactionType.airtime: return Icons.phone_rounded;
      case TransactionType.data: return Icons.wifi_rounded;
      case TransactionType.giftcard: return Icons.card_giftcard_rounded;
      case TransactionType.referralBonus: return Icons.person_add_rounded;
    }
  }

  Color _colorForType(TransactionType type) {
    switch (type) {
      case TransactionType.deposit: return const Color(0xFF34D399);
      case TransactionType.withdrawal: return const Color(0xFFEF4444);
      case TransactionType.buy: return const Color(0xFFF7931A);
      case TransactionType.sell: return const Color(0xFF3B82F6);
      case TransactionType.swap: return const Color(0xFFA855F7);
      case TransactionType.send: return const Color(0xFFEF4444);
      case TransactionType.receive: return const Color(0xFF34D399);
      case TransactionType.airtime: return const Color(0xFF10B981);
      case TransactionType.data: return const Color(0xFF10B981);
      case TransactionType.giftcard: return const Color(0xFF3B82F6);
      case TransactionType.referralBonus: return const Color(0xFFA855F7);
    }
  }

  String _statusLabel(TransactionStatus status) {
    switch (status) {
      case TransactionStatus.pending: return 'Pending';
      case TransactionStatus.processing: return 'Processing';
      case TransactionStatus.completed: return 'Completed';
      case TransactionStatus.failed: return 'Failed';
      case TransactionStatus.cancelled: return 'Cancelled';
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'Completed':
        return const Color(0xFF34D399);
      case 'Processing':
      case 'Pending':
        return const Color(0xFFFB923C);
      case 'Failed':
        return const Color(0xFFEF4444);
      case 'Cancelled':
        return const Color(0xFF6B7280);
      default:
        return Colors.white54;
    }
  }

  Color _statusDotColor(String status) {
    switch (status) {
      case 'Completed':
        return const Color(0xFF34D399);
      case 'Processing':
      case 'Pending':
        return const Color(0xFFFB923C);
      case 'Failed':
        return const Color(0xFFEF4444);
      case 'Cancelled':
        return const Color(0xFF6B7280);
      default:
        return Colors.white54;
    }
  }

  void _openFilterModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return _buildFilterSheetContent(setModalState);
          },
        );
      },
    );
  }

  Widget _buildFilterSheetContent(StateSetter setModalState) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0A0F1F).withOpacity(0.8),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(top: BorderSide(color: Colors.white.withOpacity(0.08))),
          ),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Filter Transactions',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => Navigator.pop(context),
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.05),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white.withOpacity(0.1)),
                              ),
                              child: const Icon(
                                Icons.close_rounded,
                                color: Colors.white,
                                size: 16,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      _buildFilterSection(
                        label: 'Transaction Type',
                        options: ['All Types', 'Deposits', 'Withdrawals', 'Gift Cards', 'Rewards'],
                        selected: _typeFilter,
                        onSelected: (v) {
                          setModalState(() => _typeFilter = v);
                          setState(() => _typeFilter = v);
                        },
                      ),
                      const SizedBox(height: 20),
                      _buildFilterSection(
                        label: 'Status',
                        options: ['Any Status', 'Completed', 'Pending', 'Failed'],
                        selected: _statusFilter,
                        onSelected: (v) {
                          setModalState(() => _statusFilter = v);
                          setState(() => _statusFilter = v);
                        },
                      ),
                      const SizedBox(height: 20),
                      _buildFilterSection(
                        label: 'Date Range',
                        options: ['All Time', 'Last 7 Days', 'Last 30 Days', 'Custom'],
                        selected: _dateFilter,
                        onSelected: (v) async {
                          if (v == 'Custom') {
                            final start = await showDatePicker(
                              context: context,
                              firstDate: DateTime(2020),
                              lastDate: DateTime.now(),
                              initialDate: _customStartDate ?? DateTime.now().subtract(const Duration(days: 30)),
                              helpText: 'Select Start Date',
                              builder: (context, child) {
                                return Theme(
                                  data: Theme.of(context).copyWith(
                                    colorScheme: const ColorScheme.dark(
                                      primary: Color(0xFF2563EB),
                                      onPrimary: Colors.white,
                                      surface: Color(0xFF0F1423),
                                      onSurface: Colors.white,
                                    ),
                                  ),
                                  child: child!,
                                );
                              },
                            );
                            if (start == null) return;
                            if (!context.mounted) return;
                            final end = await showDatePicker(
                              context: context,
                              firstDate: start,
                              lastDate: DateTime.now(),
                              initialDate: start.add(const Duration(days: 7)),
                              helpText: 'Select End Date',
                              builder: (context, child) {
                                return Theme(
                                  data: Theme.of(context).copyWith(
                                    colorScheme: const ColorScheme.dark(
                                      primary: Color(0xFF2563EB),
                                      onPrimary: Colors.white,
                                      surface: Color(0xFF0F1423),
                                      onSurface: Colors.white,
                                    ),
                                  ),
                                  child: child!,
                                );
                              },
                            );
                            if (end != null) {
                              _customStartDate = start;
                              _customEndDate = end;
                              setModalState(() => _dateFilter = 'Custom');
                              setState(() => _dateFilter = 'Custom');
                            }
                          } else {
                            setModalState(() => _dateFilter = v);
                            setState(() => _dateFilter = v);
                          }
                        },
                      ),
                      if (_dateFilter == 'Custom' && _customStartDate != null && _customEndDate != null) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF2563EB).withOpacity(0.08),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.2)),
                          ),
                          child: Row(children: [
                            const Icon(Icons.calendar_today_rounded, size: 12, color: Color(0xFF60A5FA)),
                            const SizedBox(width: 8),
                            Text(
                              '${DateFormat('MMM d, y').format(_customStartDate!)} — ${DateFormat('MMM d, y').format(_customEndDate!)}',
                              style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF60A5FA)),
                            ),
                          ]),
                        ),
                      ],
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                  decoration: BoxDecoration(
                    border: Border(top: BorderSide(color: Colors.white.withOpacity(0.05))),
                    color: Colors.black.withOpacity(0.2),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setModalState(() {
                              _typeFilter = 'All Types';
                              _statusFilter = 'Any Status';
                              _dateFilter = 'All Time';
                              _customStartDate = null;
                              _customEndDate = null;
                            });
                            setState(() {
                              _typeFilter = 'All Types';
                              _statusFilter = 'Any Status';
                              _dateFilter = 'All Time';
                              _customStartDate = null;
                              _customEndDate = null;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.white.withOpacity(0.1)),
                            ),
                            child: Center(
                              child: Text(
                                'Reset',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF2563EB)]),
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF2563EB).withOpacity(0.4),
                                  blurRadius: 15,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Center(
                              child: Text(
                                'Apply Filters',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterSection({
    required String label,
    required List<String> options,
    required String selected,
    required ValueChanged<String> onSelected,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 12,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF6B7280),
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: options.map((option) {
            final isActive = selected == option;
            return GestureDetector(
              onTap: () => onSelected(option),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isActive ? const Color(0xFF2563EB).withOpacity(0.15) : Colors.white.withOpacity(0.03),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isActive ? const Color(0xFF3B82F6).withOpacity(0.5) : Colors.white.withOpacity(0.08),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isActive) ...[
                      const Icon(Icons.check_rounded, color: Color(0xFF60A5FA), size: 12),
                      const SizedBox(width: 4),
                    ],
                    Text(
                      option,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: isActive ? const Color(0xFF60A5FA) : Colors.white60,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
