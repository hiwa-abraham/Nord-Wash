import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, MessageCircle, MapPin } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    setCurrentConversationId(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (!open || !currentConversationId) return;

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
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, currentConversationId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const createOrGetConversation = async (): Promise<string | null> => {
    if (currentConversationId) return currentConversationId;
    if (!user) return null;

    const customerId = role === 'customer' ? user.id : otherUserId;
    const washerId = role === 'washer' ? user.id : otherUserId;

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('customer_id', customerId)
      .eq('washer_id', washerId)
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
    if (!newMessage.trim() || !user) return;

    setIsLoading(true);
    
    const convId = await createOrGetConversation();
    if (!convId) {
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    if (error) {
      console.error('Error sending message:', error);
      toast.error(t('chat.failedToSend'));
    } else {
      setNewMessage('');
    }
    setIsLoading(false);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            {t('chat.chatWith', { name: otherUserName })}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
              <p>{t('chat.noMessages')}</p>
              <p className="text-sm">{t('chat.startConversation')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                          {isOwn ? 'You' : otherUserName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
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

        <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t('chat.typeMessage')}
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
