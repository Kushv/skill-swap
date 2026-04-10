import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { initiateSocketConnection, disconnectSocket } from '../lib/socket';
import api from '../lib/api';
import { toast } from 'sonner';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  onboardingComplete?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data);
          socketRef.current = initiateSocketConnection(token);
          setupSocketListeners(socketRef.current);
        } catch (error) {
          console.error('Failed to authenticate on load');
          localStorage.removeItem('accessToken');
        }
      }
      setLoading(false);
    };

    initAuth();

    return () => {
      disconnectSocket();
    };
  }, []);

  const setupSocketListeners = (socket: any) => {
    if (!socket) return;

    socket.on('connection-request', (data: any) => {
      // Notify via toast
      toast(`${data.from?.name || 'Someone'} sent you a connection request`, {
        action: { label: 'View', onClick: () => { window.location.href = '/connections?tab=received'; } },
        duration: 6000,
      });
      // Dispatch a DOM event so AppLayout badge can react without prop drilling
      window.dispatchEvent(new CustomEvent('skillswap:connection-request', { detail: data }));
    });

    socket.on('request-accepted', (data: any) => {
      toast.success(data.message || 'Your connection request was accepted!', {
        action: { label: 'Message', onClick: () => { window.location.href = `/connections?tab=connected`; } },
        duration: 6000,
      });
    });

    socket.on('request-rejected', (_data: any) => {
      // Subtle — just decrement badge if shown elsewhere
      window.dispatchEvent(new CustomEvent('skillswap:request-resolved'));
    });
  };

  const login = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('accessToken', token);
    const sock = initiateSocketConnection(token);
    socketRef.current = sock;
    setupSocketListeners(sock);
  };

  const updateUser = (data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : prev);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      localStorage.removeItem('accessToken');
      disconnectSocket();
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
