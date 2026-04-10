import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff,
  MessageSquare, Phone, Clock, PenLine, Send, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";
import { useVideoCall } from "@/hooks/useVideoCall";
import WhiteboardPanel from "@/components/video/WhiteboardPanel";

export default function SessionRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [callStarted, setCallStarted] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const accessToken = localStorage.getItem("accessToken");

  const {
    localVideoRef,
    remoteVideoRef,
    socketRef,
    isConnected,
    isMuted,
    isCameraOff,
    isScreenSharing,
    connectionStatus,
    callDuration,
    inCallMessages,
    initializeCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    sendCallMessage,
    endCall,
    formatDuration,
  } = useVideoCall({
    roomId: sessionDetails?.meetingRoomId,
    userId: (user as any)?._id,
    token: accessToken,
  });

  // Fetch session on mount
  useEffect(() => {
    if (!sessionId) return;
    api.get(`/sessions/${sessionId}`)
      .then(res => setSessionDetails(res.data.data))
      .catch(() => toast.error("Could not load session details"));
  }, [sessionId]);

  const handleStartCall = async () => {
    if (!sessionDetails?.meetingRoomId) {
      toast.error("Session has no meeting room assigned. The session may not be confirmed yet.");
      return;
    }
    setCallStarted(true);
    await initializeCall();
  };

  const handleEndCall = async () => {
    endCall();
    try {
      await api.post(`/sessions/${sessionId}/complete`);
      toast.success("Session completed! XP awarded.");
    } catch {
      // session may already be completed
    }
    navigate(`/review/${sessionId}`);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendCallMessage(chatInput);
    setChatInput("");
  };

  const partner = sessionDetails?.participants?.find((p: any) => p._id !== (user as any)?._id);

  // Status banner
  const statusBanner = () => {
    if (connectionStatus === "connecting") return "Connecting to peer...";
    if (connectionStatus === "failed") return "Connection failed — check your network and reload.";
    if (connectionStatus === "disconnected") return "Other participant left the call.";
    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/90 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          {callStarted && (
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`} />
          )}
          <span className="text-sm font-medium">{sessionDetails?.skillFocus || "Session Room"}</span>
          {partner && <span className="text-xs text-muted-foreground">with {partner.name}</span>}
        </div>
        {callStarted && isConnected && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatDuration(callDuration)}</span>
          </div>
        )}
      </div>

      {/* Status banner */}
      {callStarted && statusBanner() && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-xs text-center py-2 px-4">
          {statusBanner()}
        </div>
      )}

      {/* Main video area */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden relative">

        {/* Whiteboard overlay */}
        <AnimatePresence>
          {showWhiteboard && sessionDetails?.meetingRoomId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 m-4 rounded-2xl overflow-hidden"
            >
              <WhiteboardPanel socket={socketRef.current} roomId={sessionDetails.meetingRoomId} />
              <button
                onClick={() => setShowWhiteboard(false)}
                className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video column */}
        <div className="flex-1 flex flex-col gap-4 relative">
          {!callStarted ? (
            /* Pre-call lobby */
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="glass-card p-8 text-center max-w-md w-full">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-3xl font-bold mx-auto mb-4">
                  {partner?.name?.charAt(0) || "?"}
                </div>
                <h2 className="font-display font-bold text-xl mb-1">{partner?.name || "Your Partner"}</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  {sessionDetails
                    ? `${sessionDetails.skillFocus} · ${sessionDetails.duration}min session`
                    : "Loading session details..."}
                </p>
                {sessionDetails?.meetingRoomId ? (
                  <Button onClick={handleStartCall} className="btn-glow w-full text-base py-6">
                    <Video className="w-5 h-5 mr-2" /> Start Session
                  </Button>
                ) : (
                  <p className="text-sm text-yellow-400 bg-yellow-400/10 rounded-lg p-3">
                    This session has not been confirmed yet. Once both parties confirm, a meeting room will be created.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Active call */
            <>
              {/* Remote video */}
              <div className="flex-1 rounded-2xl bg-secondary/50 border border-border overflow-hidden relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isConnected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-3xl font-bold mb-4">
                      {partner?.name?.charAt(0) || "?"}
                    </div>
                    <p className="font-display font-bold">{partner?.name || "Waiting for partner..."}</p>
                    <p className="text-xs text-muted-foreground mt-2 animate-pulse">Waiting for connection...</p>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-background/70 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                  {partner?.name || "Partner"}
                </div>
              </div>

              {/* Self view PiP */}
              <div className="absolute bottom-[90px] right-7 h-36 w-48 rounded-xl border-2 border-primary/30 overflow-hidden shadow-2xl z-10 bg-black hover:scale-105 transition-transform">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${isCameraOff ? "hidden" : ""}`}
                />
                {isCameraOff && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-secondary">
                    <VideoOff className="w-7 h-7 text-muted-foreground mb-1" />
                    <p className="text-[10px] text-muted-foreground">Camera Off</p>
                  </div>
                )}
                <div className="absolute bottom-1 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                  You {isMuted && <MicOff className="w-2.5 h-2.5 text-red-400" />}
                </div>
              </div>
            </>
          )}
        </div>

        {/* In-call Chat sidebar */}
        <AnimatePresence>
          {showChat && callStarted && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="glass-card flex flex-col overflow-hidden h-full rounded-2xl shrink-0"
              style={{ minWidth: 0 }}
            >
              <div className="p-3 border-b border-border flex items-center justify-between">
                <span className="font-semibold text-sm">In-Call Chat</span>
                <button onClick={() => setShowChat(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {inCallMessages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-4">No messages yet</p>
                )}
                {inCallMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.isOwn ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${m.isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"}`}>
                      <p>{m.message}</p>
                      <p className={`text-[10px] mt-0.5 ${m.isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSendChat()}
                  placeholder="Message..."
                  className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleSendChat}
                  className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control bar */}
      {callStarted && (
        <div className="flex items-center justify-center gap-3 p-4 border-t border-border bg-background shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
            className={`rounded-full w-12 h-12 transition-colors ${isMuted ? "bg-destructive/10 border-destructive text-destructive" : "bg-secondary border-border"}`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleCamera}
            title={isCameraOff ? "Turn on camera" : "Turn off camera"}
            className={`rounded-full w-12 h-12 transition-colors ${isCameraOff ? "bg-destructive/10 border-destructive text-destructive" : "bg-secondary border-border"}`}
          >
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleScreenShare}
            title={isScreenSharing ? "Stop sharing" : "Share screen"}
            className={`rounded-full w-12 h-12 transition-colors ${isScreenSharing ? "bg-primary/20 border-primary text-primary" : "bg-secondary border-border"}`}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowWhiteboard(w => !w)}
            title="Whiteboard"
            className={`rounded-full w-12 h-12 transition-colors ${showWhiteboard ? "bg-primary/20 border-primary text-primary" : "bg-secondary border-border"}`}
          >
            <PenLine className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowChat(c => !c)}
            title="In-call chat"
            className={`rounded-full w-12 h-12 transition-colors ${showChat ? "bg-primary/20 border-primary text-primary" : "bg-secondary border-border"}`}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            onClick={handleEndCall}
            title="End call"
            className="rounded-full w-14 h-14 bg-destructive hover:bg-destructive/90 shadow-lg ml-2"
          >
            <Phone className="w-6 h-6 rotate-[135deg]" />
          </Button>
        </div>
      )}

      {/* Before call — simple back button */}
      {!callStarted && (
        <div className="flex justify-center p-4 border-t border-border shrink-0">
          <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Schedule
          </button>
        </div>
      )}
    </div>
  );
}
