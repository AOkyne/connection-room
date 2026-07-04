"use client";

import { useState, useEffect, useRef } from "react";
import { getConnectionMessages, sendMessage, getLocalMessages, saveLocalMessage, type Message } from "@/lib/data/messages";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

interface ConnectionChatProps {
  connectionId: string;
  partnerId: string;
  partnerName: string;
  userId: string;
  userName: string;
}

export function ConnectionChat({
  connectionId,
  partnerId,
  partnerName,
  userId,
  userName,
}: ConnectionChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [notified, setNotified] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [connectionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Timer effect
  useEffect(() => {
    if (!timerActive) return;

    const interval = setInterval(() => {
      setTimeElapsed((prev) => {
        const newTime = prev + 1;
        // Notify at 20 minutes (1200 seconds)
        if (newTime === 1200 && !notified) {
          setNotified(true);
          // Could show a toast or notification here
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, notified]);

  async function loadMessages() {
    try {
      const msgs = await getConnectionMessages(connectionId);
      setMessages(msgs);
    } catch (err) {
      console.warn("Could not load from Supabase, using local messages");
      setMessages(getLocalMessages(connectionId));
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim()) return;

    setSending(true);
    try {
      const result = await sendMessage(connectionId, userId, userName, inputText.trim());
      if (result) {
        setMessages([...messages, result]);
        setInputText("");
      } else {
        // Fallback to localStorage if Supabase fails
        const localMsg = saveLocalMessage(connectionId, userId, userName, inputText.trim());
        setMessages([...messages, localMsg]);
        setInputText("");
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const isAtTimerLimit = timeElapsed >= 1200;

  return (
    <Card className="space-y-4 max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="border-b border-[#e8ddd2] pb-3">
        <h3 className="font-semibold text-[#1a0f0a]">Chat with {partnerName}</h3>
      </div>

      {/* Timer Section */}
      <div className="flex items-center justify-between bg-[#f3ede5] p-3 rounded-lg">
        <div>
          <p className="text-xs text-[#c97a2a] font-medium">20-Minute Connection Timer</p>
          <p className="text-lg font-mono text-[#1a0f0a]">{formatTime(timeElapsed)}</p>
          {isAtTimerLimit && (
            <p className="text-xs text-[#c97a2a] font-semibold mt-1">✓ 20 minutes reached</p>
          )}
        </div>
        <Button
          variant={timerActive ? "secondary" : "outline"}
          size="sm"
          onClick={() => setTimerActive(!timerActive)}
        >
          {timerActive ? "Stop Timer" : "Start Timer"}
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px]">
        {messages.length === 0 ? (
          <p className="text-center text-[#a0704a] text-sm py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.fromUserId === userId ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg ${
                  msg.fromUserId === userId
                    ? "bg-[#d4a348] text-white"
                    : "bg-[#e8ddd2] text-[#1a0f0a]"
                }`}
              >
                <p className="text-xs font-medium mb-1 opacity-80">{msg.fromUserName}</p>
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {msg.createdAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="border-t border-[#e8ddd2] pt-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm text-[#1a0f0a]"
            disabled={sending}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={sending || !inputText.trim()}
          >
            {sending ? "..." : "Send"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
