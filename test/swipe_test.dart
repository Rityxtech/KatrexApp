import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katrexapp/screens/trade_screen.dart';

void main() {
  testWidgets('Swipe to swap crash test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: SizedBox(width: 360, child: TradeScreen()),
      ),
    );

    // Find the slide thumb and scroll it into view
    final thumb = find.byKey(const Key('slideThumb'));
    expect(thumb, findsOneWidget);
    await tester.ensureVisible(thumb);
    await tester.pumpAndSettle();

    // Drag the thumb to the swap threshold
    await tester.drag(thumb, const Offset(300, 0), warnIfMissed: false);
    await tester.pumpAndSettle();
    
    expect(find.text('Swapped Successfully!'), findsOneWidget);
  });
}
