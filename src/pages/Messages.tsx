import { useState, useEffect, useRef, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { Search, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "react-router-dom";

export default function Messages() {
  const { user } = useAuth();
  const location = useLocation();
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load connected matches
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await api.get('/matches/my-matches');
        const activeMatches = (res.data.data || []).filter((m: any) => m.status === 'connected');
        setMatches(activeMatches);

        const params = new URLSearchParams(location.search);
        const urlMatchId = params.get('matchId');
        if (urlMatchId) {
          const target = activeMatches.find((m: any) => m._id === urlMatchId);
          setSelectedMatch(target || (activeMatches.length > 0 ? activeMatches[0] : null));
        } else if (activeMatches.length > 0) {
          setSelectedMatch(activeMatches[0]);
        }
      } catch (err) {
        console.error("Failed to fetch matches for chat", err);
      }
    };
    if (user) fetchMatches();
  }, [user, location.search]);

  // Poll socket until it's ready — handles the page-refresh race condition
  // where getSocket() returns null because AuthContext hasn't re-connected yet
  useEffect(() => {
    const check = () => {
      const sock = getSocket();
      if (sock?.connected) {
        setSocketReady(true);
      } else if (sock) {
        // Socket exists but not yet connected — listen for connect event
        const onConnect = () => setSocketReady(true);
        sock.once('connect', onConnect);
        return () => sock.off('connect', onConnect);
      } else {
        // No socket yet — retry in 300ms
        const t = setTimeout(check, 300);
        return () => clearTimeout(t);
      }
    };

    const cleanup = check();
    return () => { if (typeof cleanup === 'function') cleanup(); };
  }, []);

  // Attach socket listeners when BOTH selectedMatch and socket are ready
  useEffect(() => {
    if (!selectedMatch || !socketReady) return;

    const matchId = selectedMatch._id;
    const socket = getSocket();
    if (!socket) return;

    console.log('[Chat] Joining match room:', matchId);
    socket.emit('join-match', { matchId });

    // Load history
    api.get(`/messages/${matchId}`)
      .then(res => {
        // Backend returns newest-first; reverse to show oldest at top
        setMessages([...(res.data.data || [])].reverse());
      })
      .catch(err => console.error("Failed to fetch messages", err));

    const handleReceiveMsg = (msg: any) => {
      const msgMatchId = msg.matchId?._id || msg.matchId;
      if (msgMatchId?.toString() === matchId.toString()) {
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some((m: any) => m._id?.toString() === msg._id?.toString())) return prev;
          return [...prev, msg];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    };

    const handleTyping = ({ userId }: any) => {
      if (userId?.toString() !== (user as any)?._id?.toString()) {
        setOtherTyping(true);
      }
    };

    const handleStopTyping = () => setOtherTyping(false);

    const handleSocketError = ({ message }: any) => {
      console.error('[Chat] Socket error:', message);
    };

    socket.on('receive-message', handleReceiveMsg);
    socket.on('user-typing', handleTyping);
    socket.on('user-stop-typing', handleStopTyping);
    socket.on('error', handleSocketError);

    return () => {
      socket.emit('leave-match', { matchId });
      socket.off('receive-message', handleReceiveMsg);
      socket.off('user-typing', handleTyping);
      socket.off('user-stop-typing', handleStopTyping);
      socket.off('error', handleSocketError);
    };
  }, [selectedMatch, socketReady, user]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  const handleSend = useCallback(() => {
    if (!newMessage.trim() || !selectedMatch) return;
    const socket = getSocket();
    if (!socket?.connected) {
      console.error('[Chat] Socket not connected, cannot send');
      return;
    }

    console.log('[Chat] Emitting send-message:', { matchId: selectedMatch._id, content: newMessage.trim() });
    socket.emit('send-message', {
      matchId: selectedMatch._id,
      content: newMessage.trim(),
      type: 'text',
    });
    setNewMessage("");
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    socket.emit('stop-typing', { matchId: selectedMatch._id });
  }, [newMessage, selectedMatch]);

  const handleTypingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    const socket = getSocket();
    if (!socket?.connected || !selectedMatch) return;
    socket.emit('typing', { matchId: selectedMatch._id });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('stop-typing', { matchId: selectedMatch._id });
    }, 1200);
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isMe = (msg: any) => {
    const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
    const myId = (user as any)?._id?.toString();
    return senderId === myId;
  };

  const getOtherUser = (match: any) => {
    const myId = (user as any)?._id?.toString();
    return match.users?.find((u: any) => u._id?.toString() !== myId) || {};
  };

  return (
    <AppLayout>
      <div className="container px-4 py-8 pb-24 md:pb-8 max-w-6xl">
        <h1 className="font-display text-3xl font-bold mb-6">Messages</h1>
        <div className="glass-card flex h-[calc(100vh-220px)] overflow-hidden">

          {/* Sidebar */}
          <div className="w-72 border-r border-border flex flex-col hidden md:flex shrink-0">
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-9 bg-secondary border-border text-sm" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {matches.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No active connections yet. Go to <span className="text-primary">Discover</span> to connect with people!
                </p>
              ) : matches.map((m) => {
                const partner = getOtherUser(m);
                return (
                  <button
                    key={m._id}
                    onClick={() => setSelectedMatch(m)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                      selectedMatch?._id === m._id ? "bg-primary/10" : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                      {partner.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block">{partner.name || 'Unknown'}</span>
                      <p className="text-xs text-muted-foreground truncate">{partner.mentorLevel || 'Member'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat window */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedMatch ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center gap-3 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {getOtherUser(selectedMatch).name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{getOtherUser(selectedMatch).name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${socketReady ? 'bg-green-500' : 'bg-yellow-400 animate-pulse'}`} />
                      {socketReady ? `Connected · ${getOtherUser(selectedMatch).mentorLevel || 'Member'}` : 'Connecting…'}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                  {messages.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground pt-8">
                      Say hello to {getOtherUser(selectedMatch).name}! 👋
                    </p>
                  )}
                  {messages.map((m: any) => {
                    const mine = isMe(m);
                    return (
                      <motion.div
                        key={m._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${
                            mine
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-secondary text-foreground rounded-bl-sm"
                          }`}
                        >
                          <p>{m.content}</p>
                          <p className={`text-[10px] mt-0.5 ${mine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatTime(m.createdAt)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Typing indicator */}
                  {otherTyping && (
                    <div className="flex justify-start">
                      <div className="bg-secondary px-3 py-2 rounded-xl rounded-bl-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border flex gap-2 shrink-0">
                  <Input
                    placeholder={socketReady ? "Type a message… (Enter to send)" : "Connecting…"}
                    className="bg-secondary border-border"
                    value={newMessage}
                    onChange={handleTypingInput}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    disabled={!socketReady}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending || !socketReady}
                    className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0 disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a conversation to start chatting
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
