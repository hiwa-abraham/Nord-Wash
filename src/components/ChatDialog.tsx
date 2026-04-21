import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, MessageCircle, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import RouteMapDialog from '@/components/map/RouteMapDialog';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  otherUserName: string;
  otherUserId: string;
  orderId?: string;
}

export default function ChatDialog({
  open,
  onOpenChange,
  conversationId,
  otherUserName,
  otherUserId,
  orderId,
}: ChatDialogProps) {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Sync prop -> state
  useEffect(() => {
    setCurrentConversationId(conversationId);
  }, [conversationId]);

  // When dialog opens without a known conversation, try to find an existing one
  // so prior history loads immediately instead of only after sending.
  useEffect(() => {
    if (!open || currentConversationId || !user) return;

    let cancelled = false;
    const lookup = async () => {
      const customerId = role === 'customer' ? user.id : otherUserId;
      const washerId = role === 'washer' ? user.id : otherUserId;

      let query = supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', customerId)
        .eq('washer_id', washerId);

      // If we know the order, scope to it; otherwise grab the most recent.
      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (!cancelled && data?.id) {
        setCurrentConversationId(data.id);
      }
    };

    lookup();
    return () => {
      cancelled = true;
    };
  }, [open, currentConversationId, user, role, otherUserId, orderId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setNewMessage('');
    }
  }, [open]);

  // Mark unread incoming messages as read
  const markAsRead = useCallback(
    async (msgs: Message[]) => {
      if (!user) return;
      const unreadIds = msgs
        .filter((m) => m.sender_id !== user.id && !m.read_at)
        .map((m) => m.id);
      if (unreadIds.length === 0) return;
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);
    },
    [user]
  );

  // Load messages + subscribe to realtime
  useEffect(() => {
    if (!open || !currentConversationId) return;

    let cancelled = false;
    setIsLoadingMessages(true);

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', currentConversationId)
        .order('created_at', { ascending: true });

      if (cancelled) return;
      setIsLoadingMessages(false);

      if (error) {
        console.error('Error fetching messages:', error);
        toast.error(t('chat.failedToLoad', { defaultValue: 'Failed to load messages' }));
        return;
      }
      const list = (data || []) as Message[];
      setMessages(list);
      markAsRead(list);
    };

    fetchMessages();

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
          const incoming = payload.new as Message;
          setMessages((prev) => {
            // Dedupe: ignore if we already have it (e.g. own message added optimistically by id, or duplicate event)
            if (prev.some((m) => m.id === incoming.id)) return prev;
            // Replace any optimistic placeholder with the same content from same sender within 5s
            const optimisticIdx = prev.findIndex(
              (m) =>
                m.id.startsWith('temp-') &&
                m.sender_id === incoming.sender_id &&
                m.content === incoming.content
            );
            if (optimisticIdx !== -1) {
              const next = [...prev];
              next[optimisticIdx] = incoming;
              return next;
            }
            return [...prev, incoming];
          });
          if (user && incoming.sender_id !== user.id) {
            markAsRead([incoming]);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [open, currentConversationId, user, markAsRead, t]);

  // Auto-scroll to bottom on new messages — use a sentinel div so it works with
  // shadcn's ScrollArea (where scroll happens on an inner viewport).
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [messages, open]);

  const createOrGetConversation = async (): Promise<string | null> => {
    if (currentConversationId) return currentConversationId;
    if (!user) return null;

    const customerId = role === 'customer' ? user.id : otherUserId;
    const washerId = role === 'washer' ? user.id : otherUserId;

    let lookupQuery = supabase
      .from('conversations')
      .select('id')
      .eq('customer_id', customerId)
      .eq('washer_id', washerId);
    if (orderId) lookupQuery = lookupQuery.eq('order_id', orderId);

    const { data: existing } = await lookupQuery
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      setCurrentConversationId(existing.id);
      return existing.id;
    }

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
      toast.error(t('chat.failedToStart'));
      return null;
    }

    setCurrentConversationId(newConv.id);
    return newConv.id;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || !user || isSending) return;

    setIsSending(true);

    const convId = await createOrGetConversation();
    if (!convId) {
      setIsSending(false);
      return;
    }

    // Optimistic message — replaced when realtime echoes it back, or on next fetch.
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: convId,
      sender_id: user.id,
      content: trimmed,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage('');

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        sender_id: user.id,
        content: trimmed,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error sending message:', error);
      toast.error(t('chat.failedToSend'));
      // Roll back optimistic message + restore input
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(trimmed);
    } else if (inserted) {
      // Replace optimistic with real (in case realtime is delayed/missed)
      setMessages((prev) => {
        if (prev.some((m) => m.id === inserted.id)) {
          return prev.filter((m) => m.id !== tempId);
        }
        return prev.map((m) => (m.id === tempId ? (inserted as Message) : m));
      });
    }

    setIsSending(false);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              {t('chat.chatWith', { name: otherUserName })}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMap(true)}
              title={t('map.viewRoute')}
            >
              <MapPin className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </DialogHeader>

        <RouteMapDialog
          open={showMap}
          onOpenChange={setShowMap}
          originLabel={t('map.you')}
          destinationLabel={otherUserName}
        />

        <ScrollArea className="flex-1 p-4">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
              <p>{t('chat.noMessages')}</p>
              <p className="text-sm">{t('chat.startConversation')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                const isPending = message.id.startsWith('temp-');
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="w-8 h-8">
                        <AvatarFallback
                          className={
                            isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                          }
                        >
                          {isOwn ? 'You' : otherUserName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-tr-sm'
                              : 'bg-muted rounded-tl-sm'
                          } ${isPending ? 'opacity-60' : ''}`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                        <p
                          className={`text-xs text-muted-foreground mt-1 ${
                            isOwn ? 'text-right' : ''
                          }`}
                        >
                          {isPending ? t('chat.sending', { defaultValue: 'Sending…' }) : formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t('chat.typeMessage')}
            disabled={isSending}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
