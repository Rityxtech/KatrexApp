import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';

/// Service that calls the Support Cloud Functions.
///
/// All support actions (tickets & live chat) are routed through a single
/// `supportApi` Cloud Function. The client sends
/// `{ action: 'createTicket', ...payload }` and the server dispatches.
class SupportService {
  SupportService._();

  static final _api = FirebaseFunctions.instanceFor(region: 'us-central1').httpsCallable('supportApi');

  // ─── Tickets ──────────────────────────────────────────────────────

  /// Create a new support ticket. Returns {success, ticketId}.
  static Future<Map<String, dynamic>> createTicket({
    required String category,
    required String subject,
    required String description,
    String? attachmentUrl,
  }) async {
    final result = await _api.call({
      'action': 'createTicket',
      'category': category,
      'subject': subject,
      'description': description,
      if (attachmentUrl != null) 'attachmentUrl': attachmentUrl,
    });
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// User sends a follow-up message on their ticket.
  static Future<void> sendTicketMessage({
    required String ticketId,
    required String text,
    String? attachmentUrl,
  }) async {
    await _api.call({
      'action': 'sendTicketMessage',
      'ticketId': ticketId,
      'text': text,
      if (attachmentUrl != null) 'attachmentUrl': attachmentUrl,
    });
  }

  /// Mark a ticket as read (reset user's unread count).
  static Future<void> markTicketRead(String ticketId) async {
    await _api.call({
      'action': 'markTicketRead',
      'ticketId': ticketId,
    });
  }

  // ─── Live Chat ────────────────────────────────────────────────────
  // The user-facing live chat is now Gemini-backed (Katrex Assistant).
  // The human-agent handlers in support-functions.ts are still registered
  // for the admin dashboard, but the client no longer calls them.

  /// Start or resume an AI chat session. Returns {success, chatId}.
  static Future<Map<String, dynamic>> startAiChat() async {
    final result = await _api.call({'action': 'startAiChat'});
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// Send a message in the AI chat. Returns {success, reply} where
  /// `reply` is the assistant's response text (also persisted in
  /// Firestore and surfaced via the chat snapshot stream).
  static Future<Map<String, dynamic>> sendAiChatMessage({
    required String chatId,
    required String text,
  }) async {
    final result = await _api.call({
      'action': 'sendAiChatMessage',
      'chatId': chatId,
      'text': text,
    });
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// Close the AI chat and trigger admin-summary generation.
  static Future<void> closeAiChat(String chatId) async {
    await _api.call({
      'action': 'closeAiChat',
      'chatId': chatId,
    });
  }

  /// Mark an AI chat as read (resets the user's unread count).
  static Future<void> markAiChatRead(String chatId) async {
    await _api.call({
      'action': 'markAiChatRead',
      'chatId': chatId,
    });
  }

  /// Load existing AI chat messages (one-time read, no live listener).
  /// Returns a list of message maps ordered by createdAt ascending.
  static Future<List<Map<String, dynamic>>> loadAiChatMessages(String chatId) async {
    final snap = await FirebaseFirestore.instance
        .collection('ai_chat_messages')
        .where('chatId', isEqualTo: chatId)
        .orderBy('createdAt', descending: false)
        .limit(50)
        .get();
    return snap.docs.map((d) => d.data()).toList();
  }

  // The legacy human-agent live-chat methods below are intentionally kept
  // so the existing server-side handlers and admin dashboard keep
  // working. The Flutter chat screen now uses the AI* variants above.
  /// Start or resume a live chat session with a human agent.
  /// Returns {success, chatId}.
  static Future<Map<String, dynamic>> startLiveChat() async {
    final result = await _api.call({'action': 'startLiveChat'});
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// Send a message in the (legacy human-agent) live chat.
  static Future<void> sendChatMessage({
    required String chatId,
    required String text,
  }) async {
    await _api.call({
      'action': 'sendChatMessage',
      'chatId': chatId,
      'text': text,
    });
  }

  /// Close the legacy live chat session.
  static Future<void> closeLiveChat(String chatId) async {
    await _api.call({
      'action': 'closeLiveChat',
      'chatId': chatId,
    });
  }

  /// Mark a legacy chat as read (resets user's unread count).
  static Future<void> markChatRead(String chatId) async {
    await _api.call({
      'action': 'markChatRead',
      'chatId': chatId,
    });
  }
}
