
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Collaborator, ChatMessage, CircuitData } from '../types';

// Mock colors for demo users
const CURSOR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'
];

const getRandomColor = () => CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];

/**
 * Custom hook to manage collaboration state and socket connection.
 * Includes a "Mock Mode" for demonstration without a real backend.
 */
export const useCollaboration = (circuitId: string, username: string, isMockMode = true) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // --- Real Socket Logic ---
  useEffect(() => {
    if (isMockMode) return;

    const s = io(process.env.CLIENT_URL || 'http://localhost:3000', {
      auth: { token: 'dummy-jwt-token-for-demo' }, // In real app, get from auth context
    });

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('join-circuit', circuitId);
    });

    s.on('active-users', (users: any[]) => {
      const collabMap = new Map<string, Collaborator>();
      users.forEach(u => {
        if (u.username !== username) {
          collabMap.set(u.userId, { ...u, color: getRandomColor(), x: 0, y: 0 });
        }
      });
      setCollaborators(collabMap);
    });

    s.on('user-joined', (user: any) => {
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        userId: 'system',
        username: 'System',
        text: `${user.username} joined the session.`,
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
      
      setCollaborators(prev => {
        const newMap = new Map(prev);
        newMap.set(user.userId, { ...(user as any), color: getRandomColor(), x: 0, y: 0 });
        return newMap;
      });
    });

    s.on('user-left', (user: any) => {
      setCollaborators(prev => {
        const newMap = new Map(prev);
        newMap.delete(user.userId);
        return newMap;
      });
    });

    s.on('cursor-position', (data: any) => {
      setCollaborators(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.userId);
        if (existing) {
          newMap.set(data.userId, { ...(existing as Collaborator), x: data.x, y: data.y });
        }
        return newMap;
      });
    });

    s.on('new-message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [circuitId, username, isMockMode]);

  // --- Mock Mode Logic (Simulating other users) ---
  useEffect(() => {
    if (!isMockMode) return;

    setIsConnected(true);
    
    // Simulate a user joining after 2 seconds
    setTimeout(() => {
      const mockUser = { id: 'm1', username: 'Sarah_Engineer', color: '#22d3ee', x: 100, y: 100 };
      setCollaborators(prev => new Map(prev).set(mockUser.id, mockUser));
      setMessages(prev => [...prev, {
        id: 'm1-join', userId: 'system', username: 'System', text: 'Sarah_Engineer joined.', timestamp: new Date().toISOString(), isSystem: true
      }]);
    }, 2000);

     // Simulate another user joining
     setTimeout(() => {
        const mockUser2 = { id: 'm2', username: 'Mike_Dev', color: '#a855f7', x: 500, y: 300 };
        setCollaborators(prev => new Map(prev).set(mockUser2.id, mockUser2));
        setMessages(prev => [...prev, {
            id: 'm2-join', userId: 'system', username: 'System', text: 'Mike_Dev joined.', timestamp: new Date().toISOString(), isSystem: true
        }]);
      }, 5000);

    // Simulate random cursor movements
    const interval = setInterval(() => {
      setCollaborators(prev => {
        const newMap = new Map(prev);
        newMap.forEach((user: Collaborator, id: string) => {
           // Simple random walk
           const dx = (Math.random() - 0.5) * 40;
           const dy = (Math.random() - 0.5) * 40;
           const newX = Math.max(0, Math.min(800, user.x + dx));
           const newY = Math.max(0, Math.min(600, user.y + dy));
           newMap.set(id, { ...user, x: newX, y: newY });
        });
        return newMap;
      });
    }, 100);

    // Simulate chat
    setTimeout(() => {
        setMessages(prev => [...prev, {
            id: 'msg-1', userId: 'm1', username: 'Sarah_Engineer', text: 'Hey! I like the layout of the power supply.', timestamp: new Date().toISOString()
        }]);
    }, 6000);

    return () => clearInterval(interval);
  }, [isMockMode]);

  // --- Actions ---

  const sendCursorMove = useCallback((x: number, y: number) => {
    if (socket) {
      socket.emit('cursor-move', { circuitId, x, y });
    }
    // In mock mode, we don't need to do anything, local cursor is handled by UI
  }, [socket, circuitId]);

  const sendMessage = useCallback((text: string) => {
    const msg = {
        id: `msg-${Date.now()}`,
        userId: 'current-user',
        username: username,
        text,
        timestamp: new Date().toISOString()
    };

    // Optimistic update
    setMessages(prev => [...prev, msg]);

    if (socket) {
      socket.emit('send-message', { circuitId, message: text });
    } else if (isMockMode) {
        // Mock auto-reply
        if (Math.random() > 0.5) {
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: `reply-${Date.now()}`, userId: 'm1', username: 'Sarah_Engineer', text: 'Agreed!', timestamp: new Date().toISOString()
                }]);
            }, 1000);
        }
    }
  }, [socket, circuitId, username, isMockMode]);

  return {
    isConnected,
    collaborators,
    messages,
    sendCursorMove,
    sendMessage
  };
};
