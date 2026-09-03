import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';

const ChatContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * ChatProvider — lives at the App shell level, survives route changes.
 *
 * Responsibilities:
 * 1. Track which conversation is selected and whether a message is in-flight
 * 2. Fire-and-forget the POST /api/chat/ call so it completes even if
 *    FarmerAIAssistant unmounts
 * 3. Background poll the active conversation for new messages when the
 *    assistant page is not visible
 * 4. Expose an `unreadResponse` flag for the Navbar badge
 */
export const ChatProvider = ({ children }) => {
  // Persistent state that survives route changes
  const [pendingConversationId, setPendingConversationId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [unreadResponse, setUnreadResponse] = useState(false);
  const [lastSendError, setLastSendError] = useState(null);

  // Track whether the AI Assistant page is currently mounted/visible
  const [assistantMounted, setAssistantMounted] = useState(false);

  // Callback ref — the AI Assistant page registers a refresh callback
  // so we can tell it to reload messages when a response arrives while it's visible
  const onResponseReceivedRef = useRef(null);

  // Polling interval ref for cleanup
  const pollIntervalRef = useRef(null);

  // The last known message count for the active conversation (to detect new messages)
  const lastMessageCountRef = useRef(null);

  /**
   * sendMessage — fire-and-forget chat message sender.
   * The axios call continues even if the caller component unmounts.
   */
  const sendMessage = useCallback(async (conversationId, userText) => {
    setIsSending(true);
    setPendingConversationId(conversationId);
    setLastSendError(null);

    // Store pending state so we can detect it on remount
    try {
      sessionStorage.setItem('chat_pending', JSON.stringify({
        conversationId,
        userText,
        startedAt: Date.now(),
      }));
    } catch (e) { /* sessionStorage may be unavailable */ }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/chat/`,
        {
          conversation_id: conversationId,
          message: userText,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Clear pending state
      try { sessionStorage.removeItem('chat_pending'); } catch (e) {}

      const resultConvId = response.data.conversation_id || conversationId;

      // If the assistant page is currently mounted, tell it to refresh
      if (onResponseReceivedRef.current) {
        onResponseReceivedRef.current(resultConvId);
      } else {
        // Assistant page is not visible — mark as unread
        setUnreadResponse(true);
      }

      setIsSending(false);
      setPendingConversationId(null);
      return resultConvId;
    } catch (error) {
      console.error('ChatContext: Error sending message:', error);
      try { sessionStorage.removeItem('chat_pending'); } catch (e) {}
      setLastSendError(error.message || 'Failed to send message');
      setIsSending(false);
      setPendingConversationId(null);

      // Notify the assistant page if mounted
      if (onResponseReceivedRef.current) {
        onResponseReceivedRef.current(conversationId, error);
      }

      throw error;
    }
  }, []);

  /**
   * Register/unregister the assistant page's refresh callback.
   * Called by FarmerAIAssistant on mount/unmount.
   */
  const registerAssistant = useCallback((refreshCallback) => {
    onResponseReceivedRef.current = refreshCallback;
    setAssistantMounted(true);
    // If there was an unread response, clear it since the user is now looking
    setUnreadResponse(false);
  }, []);

  const unregisterAssistant = useCallback(() => {
    onResponseReceivedRef.current = null;
    setAssistantMounted(false);
  }, []);

  /**
   * Mark unread as seen — called when user navigates to the assistant page
   */
  const clearUnread = useCallback(() => {
    setUnreadResponse(false);
  }, []);

  /**
   * Background polling — when a message is in-flight and the assistant
   * page is NOT mounted, poll the conversation for completion.
   * Also detects stale pending state from browser refresh.
   */
  useEffect(() => {
    // Check for stale pending state from a previous page load
    if (!isSending) {
      try {
        const pending = sessionStorage.getItem('chat_pending');
        if (pending) {
          const { conversationId, startedAt } = JSON.parse(pending);
          // If it's been more than 2 minutes, assume it completed or failed
          if (Date.now() - startedAt > 120000) {
            sessionStorage.removeItem('chat_pending');
          } else {
            // There was a pending request from before refresh — mark as needing reconciliation
            setPendingConversationId(conversationId);
            setUnreadResponse(true);
            sessionStorage.removeItem('chat_pending');
          }
        }
      } catch (e) {}
    }
  }, []);

  // Poll when sending and assistant is not visible
  useEffect(() => {
    if (isSending && !assistantMounted && pendingConversationId) {
      // Start polling every 3 seconds
      pollIntervalRef.current = setInterval(async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token || !pendingConversationId) return;

          const res = await axios.get(
            `${API_BASE_URL}/chat/conversations/${pendingConversationId}/`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const msgCount = res.data?.message_count || 0;
          // If we have more messages than the last known count, the response arrived
          if (lastMessageCountRef.current !== null && msgCount > lastMessageCountRef.current) {
            setUnreadResponse(true);
            setIsSending(false);
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          lastMessageCountRef.current = msgCount;
        } catch (err) {
          // Ignore polling errors silently
        }
      }, 3000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [isSending, assistantMounted, pendingConversationId]);

  // Cleanup on unmount (app close)
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return (
    <ChatContext.Provider value={{
      sendMessage,
      isSending,
      pendingConversationId,
      unreadResponse,
      lastSendError,
      registerAssistant,
      unregisterAssistant,
      clearUnread,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
