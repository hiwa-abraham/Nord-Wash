/**
 * ChatDialog.tsx - In-App Messaging Component
 * 
 * This component provides real-time chat functionality between customers and washers.
 * It is the ONLY way users can communicate - phone numbers and emails are hidden.
 * 
 * Key Features:
 * - Real-time message delivery via Supabase Realtime
 * - Automatic conversation creation if none exists
 * - Message history persistence
 * - Privacy-first design (no contact info exposed)
 * 
 * Database Tables Used:
 * - conversations: Links customer and washer with optional order reference
 * - messages: Stores individual messages with sender and timestamp
 * 
 * Usage:
 * ```tsx
 * <ChatDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   conversationId={existingConvId}  // null for new conversation
 *   otherUserName="John"
 *   otherUserId="uuid-here"
 *   orderId="optional-order-uuid"
 * />
 * ```
 */

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Message type matching the messages table schema.
 * Used for displaying chat messages.
 */
interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

/**
 * Props for the ChatDialog component.
 */
interface ChatDialogProps {
  open: boolean;                          // Dialog visibility state
  onOpenChange: (open: boolean) => void;  // Callback to toggle dialog
  conversationId: string | null;          // Existing conversation ID or null
  otherUserName: string;                  // Display name of chat partner
  otherUserId: string;                    // User ID of chat partner
  orderId?: string;                       // Optional order to link conversation to
}

export default function ChatDialog({
  open,
  onOpenChange,
  conversationId,
  otherUserName,
  otherUserId,
  orderId,
}: ChatDialogProps) {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Sync external conversationId prop with internal state
  useEffect(() => {
    setCurrentConversationId(conversationId);
  }, [conversationId]);

  /**
   * Fetch existing messages and set up real-time subscription.
   * This runs when the dialog opens and a conversation exists.
   */
  useEffect(() => {
    if (!open || !currentConversationId) return;

    // Fetch existing messages for this conversation
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', currentConversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }
      setMessages(data || []);
    };

    fetchMessages();

    // Set up real-time subscription for new messages
    // This enables instant message delivery without polling
    const channel = supabase
      .channel(`messages-${currentConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentConversationId}`,
        },
        (payload) => {
          // Add new message to state immediately
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or when conversation changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, currentConversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * Creates a new conversation or returns the existing one.
   * Conversations are unique per customer-washer pair.
   * 
   * @returns The conversation ID or null if creation fails
   */
  const createOrGetConversation = async (): Promise<string | null> => {
    // Return existing conversation if we have one
    if (currentConversationId) return currentConversationId;
    if (!user) return null;

    // Determine customer and washer IDs based on current user's role
    const customerId = role === 'customer' ? user.id : otherUserId;
    const washerId = role === 'washer' ? user.id : otherUserId;

    // Try to find existing conversation between these users
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .eq('customer_id', customerId)
      .eq('washer_id', washerId)
      .maybeSingle();

    if (existing) {
      setCurrentConversationId(existing.id);
      return existing.id;
    }

    // Create new conversation if none exists
    // RLS ensures only participants can create conversations
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        customer_id: customerId,
        washer_id: washerId,
        order_id: orderId || null,
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
      toast.error('Failed to start conversation');
      return null;
    }

    setCurrentConversationId(newConv.id);
    return newConv.id;
  };

  /**
   * Handles sending a new message.
   * Creates conversation first if needed, then inserts the message.
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setIsLoading(true);
    
    // Ensure conversation exists before sending
    const convId = await createOrGetConversation();
    if (!convId) {
      setIsLoading(false);
      return;
    }

    // Insert message - RLS ensures sender_id matches auth.uid()
    const { error } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } else {
      setNewMessage('');
    }
    setIsLoading(false);
  };

  /**
   * Formats a timestamp for display (e.g., "2:30 PM")
   */
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[600px] flex flex-col p-0">
        {/* Chat header with partner's name */}
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Chat with {otherUserName}
          </DialogTitle>
        </DialogHeader>

        {/* Message list with scroll area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            // Empty state when no messages exist
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            // Message list
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar */}
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                          {isOwn ? 'You' : otherUserName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Message bubble */}
                      <div>
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-tr-sm'
                              : 'bg-muted rounded-tl-sm'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        {/* Timestamp */}
                        <p className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-right' : ''}`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Message input form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
