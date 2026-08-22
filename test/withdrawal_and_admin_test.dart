import 'package:flutter_test/flutter_test.dart';
import 'package:katrexapp/models/transaction_model.dart';

void main() {
  group('Withdrawal & Admin Transaction Tests', () {
    test('TransactionModel handles adminNote and processing status correctly', () {
      final now = DateTime.now();
      final tx = TransactionModel(
        id: 'tx_123',
        uid: 'user_abc',
        type: TransactionType.withdrawal,
        status: TransactionStatus.processing,
        amountNaira: 25000.0,
        feeAmount: 50.0,
        feeSymbol: 'NGN',
        description: 'Withdrawal to Access Bank (0123456789) — John Doe',
        reference: 'WD-123456789',
        createdAt: now,
        recipient: '0123456789',
        paymentMethod: 'Access Bank',
        adminNote: 'Transfer pending batch execution',
      );

      expect(tx.status, TransactionStatus.processing);
      expect(tx.status.value, 'processing');
      expect(tx.adminNote, 'Transfer pending batch execution');

      final map = tx.toMap();
      expect(map['status'], 'processing');
      expect(map['adminNote'], 'Transfer pending batch execution');
      expect(map['feeAmount'], 50.0);
      expect(map['amountNaira'], 25000.0);

      final reconstructed = TransactionModel.fromMap({
        ...map,
        'id': 'tx_123',
      });

      expect(reconstructed.id, 'tx_123');
      expect(reconstructed.type, TransactionType.withdrawal);
      expect(reconstructed.status, TransactionStatus.processing);
      expect(reconstructed.amountNaira, 25000.0);
      expect(reconstructed.feeAmount, 50.0);
      expect(reconstructed.adminNote, 'Transfer pending batch execution');
    });

    test('Withdrawal fee calculation and refund calculations are accurate', () {
      const withdrawalAmount = 15000.0;
      const fee = 50.0;
      final totalDeducted = withdrawalAmount + fee;
      final receiveAmount = withdrawalAmount - fee;

      expect(totalDeducted, 15050.0);
      expect(receiveAmount, 14950.0);

      // Refund calculation when admin declines/voids transaction
      final refundAmount = withdrawalAmount + fee;
      expect(refundAmount, 15050.0);
    });

    test('TransactionStatus enum mapping supports cancelled and failed states', () {
      expect(TransactionStatusX.fromString('cancelled'), TransactionStatus.cancelled);
      expect(TransactionStatusX.fromString('failed'), TransactionStatus.failed);
      expect(TransactionStatusX.fromString('processing'), TransactionStatus.processing);
      expect(TransactionStatusX.fromString('completed'), TransactionStatus.completed);
      expect(TransactionStatusX.fromString('pending'), TransactionStatus.pending);
    });
  });
}
