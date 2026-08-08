import 'dart:math';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

class AnimatedBackground extends StatefulWidget {
  const AnimatedBackground({super.key});

  @override
  State<AnimatedBackground> createState() => _AnimatedBackgroundState();
}

class _AnimatedBackgroundState extends State<AnimatedBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final List<Node> _nodes = [];
  final List<TradeStream> _particles = [];
  Size _size = Size.zero;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _initNodes() {
    _nodes.clear();
    final count = min(35, ((_size.width * _size.height) / 20000).floor());
    for (int i = 0; i < count; i++) {
      _nodes.add(Node.random(_size));
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final newSize = Size(constraints.maxWidth, constraints.maxHeight);
        if (newSize != _size) {
          _size = newSize;
          _initNodes();
        }
        return AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return CustomPaint(
              size: _size,
              painter: _NetworkPainter(
                nodes: _nodes,
                particles: _particles,
                size: _size,
              ),
            );
          },
        );
      },
    );
  }
}

class NodeAsset {
  final String type;
  final String label;
  final Color color;
  const NodeAsset(this.type, this.label, this.color);
}

final _assets = [
  const NodeAsset('crypto', '₿', Color(0xFFF7931A)),
  const NodeAsset('crypto', 'Ξ', Color(0xFF627EEA)),
  const NodeAsset('crypto', '₮', Color(0xFF26A17B)),
  const NodeAsset('card', '', Color(0xFF09090B)),
  const NodeAsset('card', 'S', Color(0xFF171A21)),
  const NodeAsset('card', 'a', Color(0xFFFF9900)),
];

class Node {
  double x;
  double y;
  double vx;
  double vy;
  final NodeAsset asset;
  final double size;
  double glow = 0;

  Node.random(Size size)
      : x = Random().nextDouble() * size.width,
        y = Random().nextDouble() * size.height,
        vx = (Random().nextDouble() - 0.5) * 0.7,
        vy = (Random().nextDouble() - 0.5) * 0.7,
        asset = _assets[Random().nextInt(_assets.length)],
        size = Random().nextDouble() * 8 + 10;

  void update(Size bounds) {
    x += vx;
    y += vy;
    if (x < 0 || x > bounds.width) vx *= -1;
    if (y < 0 || y > bounds.height) vy *= -1;
    glow += 0.02;
  }
}

class TradeStream {
  final double startX;
  final double startY;
  final double targetX;
  final double targetY;
  double progress = 0;
  final double speed;
  final Color color;

  TradeStream(this.startX, this.startY, this.targetX, this.targetY)
      : speed = Random().nextDouble() * 0.015 + 0.005,
        color = Random().nextBool() ? const Color(0xFF2563EB) : const Color(0xFF10B981);

  bool update() {
    progress += speed;
    return progress > 1;
  }
}

class _NetworkPainter extends CustomPainter {
  final List<Node> nodes;
  final List<TradeStream> particles;
  final Size size;

  _NetworkPainter({required this.nodes, required this.particles, required this.size});

  @override
  void paint(Canvas canvas, Size canvasSize) {
    canvas.drawRect(
      Offset.zero & canvasSize,
      Paint()..color = const Color(0xFFF8FAFC),
    );

    final paint = Paint()..strokeWidth = 1;

    for (int i = 0; i < nodes.length; i++) {
      nodes[i].update(size);

      for (int j = i + 1; j < nodes.length; j++) {
        final dx = nodes[i].x - nodes[j].x;
        final dy = nodes[i].y - nodes[j].y;
        final dist = sqrt(dx * dx + dy * dy);

        if (dist < 140) {
          paint.color = const Color(0x332563EB).withOpacity(1 - (dist / 140));
          canvas.drawLine(
            Offset(nodes[i].x, nodes[i].y),
            Offset(nodes[j].x, nodes[j].y),
            paint,
          );

          if (Random().nextDouble() < 0.003) {
            particles.add(TradeStream(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y));
          }
        }
      }

      _drawNode(canvas, nodes[i]);
    }

    for (int i = particles.length - 1; i >= 0; i--) {
      if (particles[i].update()) {
        particles.removeAt(i);
        continue;
      }
      final p = particles[i];
      final currX = p.startX + (p.targetX - p.startX) * p.progress;
      final currY = p.startY + (p.targetY - p.startY) * p.progress;

      canvas.drawCircle(Offset(currX, currY), 2, Paint()..color = p.color);
      canvas.drawCircle(
        Offset(currX, currY),
        6,
        Paint()..color = p.color.withOpacity(0.25),
      );
    }
  }

  void _drawNode(Canvas canvas, Node node) {
    final glowAmt = sin(node.glow).abs();
    final glowPaint = Paint()
      ..color = node.asset.color.withOpacity(glowAmt * 0.18)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(Offset(node.x, node.y), node.size * 2, glowPaint);

    if (node.asset.type == 'crypto') {
      canvas.drawCircle(
        Offset(node.x, node.y),
        node.size,
        Paint()
          ..color = Colors.white.withOpacity(0.9)
          ..style = PaintingStyle.fill,
      );
      canvas.drawCircle(
        Offset(node.x, node.y),
        node.size,
        Paint()
          ..color = node.asset.color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1,
      );
      _drawText(canvas, node.asset.label, node.x, node.y, node.asset.color, node.size * 1.1, FontWeight.bold);
    } else {
      final rect = RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(node.x, node.y), width: node.size * 2, height: node.size * 1.2),
        const Radius.circular(3),
      );
      canvas.drawRRect(
        rect,
        Paint()
          ..color = Colors.white.withOpacity(0.9)
          ..style = PaintingStyle.fill,
      );
      canvas.drawRRect(
        rect,
        Paint()
          ..color = node.asset.color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1,
      );
      _drawText(canvas, node.asset.label, node.x, node.y + node.size * 0.25, node.asset.color, node.size * 0.8, FontWeight.bold);
    }
  }

  void _drawText(Canvas canvas, String text, double x, double y, Color color, double fontSize, FontWeight weight) {
    final builder = ui.ParagraphBuilder(
      ui.ParagraphStyle(textAlign: TextAlign.center, textDirection: TextDirection.ltr),
    )
      ..pushStyle(ui.TextStyle(
        color: color,
        fontSize: fontSize,
        fontWeight: weight,
        fontFamily: 'sans-serif',
      ))
      ..addText(text);
    final paragraph = builder.build();
    paragraph.layout(ui.ParagraphConstraints(width: fontSize * 4));
    canvas.drawParagraph(paragraph, Offset(x - paragraph.width / 2, y - paragraph.height / 2));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
