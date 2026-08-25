"use client";

import { useState, useEffect, useRef } from "react";
import { getConnectionMessages, sendMessage, type Message } from "@/lib/data/messages";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { ConversationStarterPicker } from "./ConversationStarterPicker";
import { trackConnectionEvent } from "@/lib/analytics/connectionEvents";

interface DirectConversationProps {
  connectionId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto?: string;
  userId: string;
  userName: string;
  // "connect first" pending requests aren't active yet -- the composer is
  // disabled and a note explains why, rather than letting someone type
  // into a conversation that isn't accepted.
  pending?: boolean;
}

const POLL_INTERVAL_MS = 4000;

// The simplified conversation view for connection_type = 'direct' rows --
// built by trimming ConnectionChat.tsx down, not rewriting messaging from
// scratch: same getConnectionMessages()/sendMessage() calls, same message
// shape. No timer, no status badge, no round machinery -- ordinary
// back-and-forth, exactly what the simplified Connections flow calls for.
export function DirectConversation({
  connectionId,
  partnerId,
  partnerName,
  partnerPhoto,
  userId,
  userName,
  pending,
}: DirectConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showStarter, setShowStarter] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId]);

  useEffect(() => {
    const isNewMessage = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (!isNewMessage) return;

    const container = messagesContainerRef.current;
    const wasNearBottom = !container || container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (wasNearBottom) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    const msgs = await getConnectionMessages(connectionId);
    setMessages(msgs);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || pending) return;

    // Exactly one prior message means this send is a reply to the very
    // first message in the thread -- the funnel milestone worth tracking,
    // not every ordinary back-and-forth message after that.
    const isFirstReply = messages.length === 1 && messages[0].fromUserId !== userId;

    setSending(true);
    const result = await sendMessage(connectionId, userId, userName, inputText.trim());
    setSending(false);
    if (result) {
      setMessages((prev) => [...prev, result]);
      setInputText("");
      if (isFirstReply) {
        trackConnectionEvent({ eventType: "first_reply_received", relatedUserId: partnerId, connectionId });
      }
    }
  }

  return (
    <Card className="space-y-3 flex flex-col h-[70vh] max-h-[700px]">
      <div className="flex items-center gap-3 border-b border-[#e8ddd2] pb-3">
        <Avatar name={partnerName} photo={partnerPhoto} size="md" />
        <h3 className="font-semibold text-[#1a0f0a]">{partnerName}</h3>
      </div>

      {pending ? (
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <p className="text-sm text-[#a0704a]">
            Your message is waiting for {partnerName} to accept before it's delivered.
          </p>
        </div>
      ) : (
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
          {messages.length === 0 ? (
            <p className="text-center text-[#a0704a] text-sm py-8">No messages yet. Say hello!</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.fromUserId === userId ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    msg.fromUserId === userId ? "bg-[#d4a348] text-white" : "bg-[#e8ddd2] text-[#1a0f0a]"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {msg.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {!pending && (
        <div className="border-t border-[#e8ddd2] pt-3 space-y-2">
          {showStarter ? (
            <ConversationStarterPicker
              onInsert={(prompt) => {
                setInputText(prompt);
                setShowStarter(false);
              }}
              onClose={() => setShowStarter(false)}
            />
          ) : (
            <button
              onClick={() => {
                trackConnectionEvent({ eventType: "conversation_starter_requested", relatedUserId: partnerId, connectionId });
                setShowStarter(true);
              }}
              className="text-xs text-[#c97a2a] hover:underline"
            >
              💬 Conversation Starter
            </button>
          )}
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm text-[#1a0f0a]"
              disabled={sending}
            />
            <Button type="submit" variant="primary" size="sm" disabled={sending || !inputText.trim()}>
              {sending ? "..." : "Send"}
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}
