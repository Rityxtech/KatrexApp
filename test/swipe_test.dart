import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Swipe to swap gesture test', (WidgetTester tester) async {
    bool triggered = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: GestureDetector(
              key: const Key('slideThumb'),
              onHorizontalDragEnd: (_) {
                triggered = true;
              },
              child: Container(
                width: 60,
                height: 60,
                color: Colors.blue,
              ),
            ),
          ),
        ),
      ),
    );

    final thumb = find.byKey(const Key('slideThumb'));
    expect(thumb, findsOneWidget);

    await tester.drag(thumb, const Offset(300, 0));
    await tester.pumpAndSettle();

    expect(triggered, isTrue);
  });
}
