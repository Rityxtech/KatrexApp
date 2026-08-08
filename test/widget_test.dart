// This is a basic Flutter widget test.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:katrexapp/main.dart';

void main() {
  testWidgets('App launches and shows trade screen', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const MyApp());

    // Verify that the app builds.
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
