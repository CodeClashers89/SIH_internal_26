import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/ai_assistant_provider.dart';
import '../../providers/auth_provider.dart';

class FarmerAIScreen extends StatefulWidget {
  const FarmerAIScreen({super.key});

  @override
  State<FarmerAIScreen> createState() => _FarmerAIScreenState();
}

class _FarmerAIScreenState extends State<FarmerAIScreen> {
  final _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  void _handleSend([String? prefilled]) {
    final text = prefilled ?? _inputController.text.trim();
    if (text.isEmpty) return;

    _inputController.clear();
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final ai = Provider.of<AIAssistantProvider>(context, listen: false);

    ai.sendMessage(text, authToken: auth.token);

    Future.delayed(const Duration(milliseconds: 300), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final ai = Provider.of<AIAssistantProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.smart_toy, color: Color(0xFF16A34A)),
            SizedBox(width: 8),
            Text("Kisan AI Voice Assistant"),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ai.clearChat(),
            tooltip: "Reset Conversation",
          ),
        ],
      ),
      body: Column(
        children: [
          // Quick Prompts Header Horizontal Scroll
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
            color: Theme.of(context).cardTheme.color,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: AIAssistantProvider.farmerQuickPrompts.map((prompt) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ActionChip(
                      avatar: const Icon(Icons.lightbulb_outline, size: 16, color: Color(0xFF16A34A)),
                      label: Text(prompt, style: const TextStyle(fontSize: 12)),
                      onPressed: () => _handleSend(prompt),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          // Message Bubbles List
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: ai.messages.length,
              itemBuilder: (ctx, idx) {
                final msg = ai.messages[idx];
                final isUser = msg.sender == 'user';
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isUser
                          ? const Color(0xFF16A34A)
                          : Theme.of(context).cardTheme.color,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(16),
                        topRight: const Radius.circular(16),
                        bottomLeft: Radius.circular(isUser ? 16 : 4),
                        bottomRight: Radius.circular(isUser ? 4 : 16),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 6,
                        )
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              isUser ? Icons.person : Icons.smart_toy,
                              size: 16,
                              color: isUser ? Colors.white70 : const Color(0xFF16A34A),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              isUser ? "You" : "Kisan AI (Groq)",
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isUser ? Colors.white70 : const Color(0xFF16A34A),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          msg.text,
                          style: TextStyle(
                            fontSize: 14,
                            height: 1.4,
                            color: isUser ? Colors.white : null,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          if (ai.isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                  SizedBox(width: 8),
                  Text("Kisan AI is analyzing Mandi prices & agronomy data...", style: TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),

          // Voice Listening Bar indicator
          if (ai.isListeningVoice)
            Container(
              padding: const EdgeInsets.all(12),
              color: const Color(0xFFDCFCE7),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.mic, color: Color(0xFF16A34A)),
                  SizedBox(width: 8),
                  Text("Listening in Hindi/English... Speak now! 🎙️", style: TextStyle(color: Color(0xFF15803D), fontWeight: FontWeight.bold)),
                ],
              ),
            ),

          // Input Bar with Voice Mic Button
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).cardTheme.color,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 8,
                  offset: const Offset(0, -2),
                )
              ],
            ),
            child: Row(
              children: [
                IconButton.filledTonal(
                  icon: Icon(ai.isListeningVoice ? Icons.mic_off : Icons.mic, color: const Color(0xFF16A34A)),
                  onPressed: () => ai.toggleVoiceListening(),
                  tooltip: "Speak Command",
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _inputController,
                    onSubmitted: (_) => _handleSend(),
                    decoration: const InputDecoration(
                      hintText: "Ask about Mandi prices, crop diseases...",
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  icon: const Icon(Icons.send),
                  backgroundColor: const Color(0xFF16A34A),
                  onPressed: () => _handleSend(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
