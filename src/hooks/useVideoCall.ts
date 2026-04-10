import { useEffect, useRef, useState, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useVideoCall({ roomId, userId, token }: { roomId?: string; userId?: string; token?: string | null }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'
  >('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [inCallMessages, setInCallMessages] = useState<{ message: string; isOwn: boolean; timestamp: Date }[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remoteSocketIdRef = useRef<string | null>(null);

  // ---- Peer connection factory ----
  const createPeerConnection = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setIsConnected(true);
      setConnectionStatus('connected');
      if (!callTimerRef.current) {
        callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          roomId,
          candidate,
          targetSocketId: remoteSocketIdRef.current,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') setConnectionStatus('failed');
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [roomId]);

  // ---- Main init ----
  const initializeCall = useCallback(async () => {
    if (!roomId || !token) return;
    setConnectionStatus('connecting');

    try {
      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Dynamic import to avoid SSR issues
      const { io } = await import('socket.io-client');
      const socketUrl = (import.meta as any).env?.VITE_SOCKET_URL || 'http://localhost:5000';
      const sock = io(socketUrl, { auth: { token }, withCredentials: true });
      socketRef.current = sock;

      sock.on('connect', () => {
        sock.emit('join-room', { roomId, userId });
      });

      // Other user joined — we are the caller
      sock.on('user-joined', async ({ socketId }: { userId: string; socketId: string }) => {
        remoteSocketIdRef.current = socketId;
        const pc = createPeerConnection(stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sock.emit('offer', { roomId, offer, targetSocketId: socketId });
      });

      // We are receiver
      sock.on('offer', async ({ offer, fromSocketId }: { offer: RTCSessionDescriptionInit; fromSocketId: string }) => {
        remoteSocketIdRef.current = fromSocketId;
        const pc = createPeerConnection(stream);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sock.emit('answer', { roomId, answer, targetSocketId: fromSocketId });
      });

      sock.on('answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      sock.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        if (peerConnectionRef.current && candidate) {
          try { await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
          catch (e) { console.warn('ICE error', e); }
        }
      });

      sock.on('user-left', () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      });

      sock.on('call-chat-message', ({ message, timestamp }: { message: string; timestamp: Date }) => {
        setInCallMessages(prev => [...prev, { message, isOwn: false, timestamp: new Date(timestamp) }]);
      });

    } catch (err) {
      console.error('Call init failed:', err);
      setConnectionStatus('failed');
    }
  }, [roomId, userId, token, createPeerConnection]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(prev => !prev);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCameraOff(prev => !prev);
  }, []);

  const stopScreenShare = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const origVideoTrack = stream.getVideoTracks()[0];
    const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
    if (sender && origVideoTrack) await sender.replaceTrack(origVideoTrack);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    setIsScreenSharing(false);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack);
        if (localVideoRef.current) {
          const audio = localStreamRef.current?.getAudioTracks() || [];
          localVideoRef.current.srcObject = new MediaStream([screenTrack, ...audio]);
        }
        screenTrack.onended = stopScreenShare;
        setIsScreenSharing(true);
      } catch (e) { console.error('Screen share error', e); }
    } else {
      await stopScreenShare();
    }
  }, [isScreenSharing, stopScreenShare]);

  const sendCallMessage = useCallback((message: string) => {
    if (!socketRef.current || !message.trim()) return;
    socketRef.current.emit('call-chat-message', { roomId, message });
    setInCallMessages(prev => [...prev, { message, isOwn: true, timestamp: new Date() }]);
  }, [roomId]);

  const endCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    if (socketRef.current) { socketRef.current.emit('leave-room', { roomId }); socketRef.current.disconnect(); socketRef.current = null; }
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    localStreamRef.current = null;
    setIsConnected(false);
    setConnectionStatus('idle');
    setCallDuration(0);
  }, [roomId]);

  useEffect(() => () => { endCall(); }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return {
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
  };
}
