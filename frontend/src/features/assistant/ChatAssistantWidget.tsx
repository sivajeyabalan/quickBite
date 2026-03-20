import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSelector } from 'react-redux';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import api from '../../api/axios';
import Spinner from '../../components/ui/Spinner';
import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantRole,
  AssistantSuggestion,
} from '../../types';
import type { RootState } from '../../app/store';

type ChatMessage = {
  id: string;
  role: AssistantRole;
  content: string;
  menuSuggestions?: AssistantSuggestion[];
  quickReplies?: string[];
  isError?: boolean;
};

const STORAGE_PREFIX = 'qb_chat_v1_';
const MAX_STORED_MESSAGES = 20;
const MAX_HISTORY_MESSAGES = 20;
const DEFAULT_QUICK_REPLIES = [
  'What are your popular items?',
  'How does pickup work?',
  'Can I get delivery right now?',
];

function buildWelcomeMessage(): ChatMessage {
  return {
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    content: 'Hi! I can help with QuickBite services and suggest menu items. I can guide your order flow, but I do not place orders directly.',
    quickReplies: DEFAULT_QUICK_REPLIES,
  };
}

function toStorageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function normalizeStoredMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((message) => typeof message === 'object' && message !== null)
    .map((message) => {
      const item = message as Record<string, unknown>;
      const role = item.role === 'assistant' ? 'assistant' : 'user';
      const content = typeof item.content === 'string' ? item.content : '';
      const id = typeof item.id === 'string' ? item.id : `${role}-${Date.now()}`;
      const menuSuggestions = Array.isArray(item.menuSuggestions)
        ? (item.menuSuggestions as AssistantSuggestion[])
        : undefined;
      const quickReplies = Array.isArray(item.quickReplies)
        ? (item.quickReplies as string[])
        : undefined;

      return {
        id,
        role,
        content,
        menuSuggestions,
        quickReplies,
      } satisfies ChatMessage;
    })
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_STORED_MESSAGES);
}

interface Props {
  onApplySearch: (itemName: string) => void;
  onViewMenu: () => void;
}

export default function ChatAssistantWidget({ onApplySearch, onViewMenu }: Props) {
  const user = useSelector((state: RootState) => state.auth.user);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const storageKey = useMemo(
    () => (user?.id ? toStorageKey(user.id) : null),
    [user?.id],
  );

  useEffect(() => {
    if (!storageKey) return;

    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setMessages([buildWelcomeMessage()]);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeStoredMessages(parsed);
      setMessages(normalized.length > 0 ? normalized : [buildWelcomeMessage()]);
    } catch {
      setMessages([buildWelcomeMessage()]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || messages.length === 0) return;
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
  }, [storageKey, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!user?.id) return null;

  const buildHistory = (sourceMessages: ChatMessage[]) =>
    sourceMessages
      .filter((message) => (message.role === 'user' || message.role === 'assistant') && !message.isError)
      .slice(-MAX_HISTORY_MESSAGES)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

  const appendAssistantMessage = (payload: {
    content: string;
    menuSuggestions?: AssistantSuggestion[];
    quickReplies?: string[];
    isError?: boolean;
  }) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant' as const,
        content: payload.content,
        menuSuggestions: payload.menuSuggestions,
        quickReplies: payload.quickReplies,
        isError: payload.isError,
      },
    ].slice(-MAX_STORED_MESSAGES));
  };

  const sendMessage = async (rawMessage: string, options?: { appendUser: boolean }) => {
    const message = rawMessage.trim();
    if (!message || isLoading) return;

    const appendUser = options?.appendUser ?? true;
    let nextMessages = messages;

    if (appendUser) {
      nextMessages = [
        ...messages,
        {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: 'user',
          content: message,
        },
      ];
      setMessages(nextMessages.slice(-MAX_STORED_MESSAGES));
    }

    setInput('');
    setIsLoading(true);
    setLastFailedMessage(null);

    try {
      const payload: AssistantChatRequest = {
        message,
        history: buildHistory(nextMessages),
        pageContext: 'menu',
      };
      const response = await api.post('/assistant/chat', payload);
      const data: AssistantChatResponse = response.data.data ?? response.data;

      appendAssistantMessage({
        content: data.reply,
        menuSuggestions: data.menuSuggestions,
        quickReplies: data.quickReplies,
      });
    } catch (error: any) {
      const responseMessage = error?.response?.data?.message;
      const messageText = Array.isArray(responseMessage) ? responseMessage[0] : responseMessage;
      appendAssistantMessage({
        content: typeof messageText === 'string'
          ? messageText
          : 'Assistant is temporarily unavailable. Please try again.',
        isError: true,
      });
      setLastFailedMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(input, { appendUser: true });
  };

  const clearChat = () => {
    const welcome = buildWelcomeMessage();
    setMessages([welcome]);
    setLastFailedMessage(null);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify([welcome]));
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-[45] w-20 h-20 rounded-full shadow-xl transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-400 overflow-hidden bg-white"
          aria-label="Open assistant chat"
        >
          <DotLottieReact
            src="https://lottie.host/72509e1d-9144-4cd5-91fe-00877804a1b4/UZONtufRXl.lottie"
            loop
            autoplay
          />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-5 right-5 z-[45] w-[22rem] max-w-[calc(100vw-1.5rem)] h-[32rem] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-ui text-sm font-semibold text-gray-800">QuickBite Assistant</p>
              <p className="text-[11px] text-gray-400">Service help + menu suggestions</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="text-[11px] text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                aria-label="Close assistant"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'ml-auto bg-orange-500 text-white'
                    : message.isError
                      ? 'mr-auto bg-red-50 text-red-700 border border-red-200'
                      : 'mr-auto bg-white text-gray-700 border border-gray-100'
                }`}
              >
                <p>{message.content}</p>

                {message.menuSuggestions && message.menuSuggestions.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {message.menuSuggestions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onApplySearch(item.name)}
                        className="w-full text-left rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 hover:bg-orange-100 transition"
                      >
                        <p className="text-xs font-semibold text-orange-700">{item.name}</p>
                        <p className="text-[11px] text-orange-600">
                          ${item.price} · {item.category}
                        </p>
                      </button>
                    ))}
                    <button
                      onClick={onViewMenu}
                      className="text-[11px] text-orange-600 hover:text-orange-700 underline"
                    >
                      View menu section
                    </button>
                  </div>
                )}

                {message.quickReplies && message.quickReplies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.quickReplies.map((quickReply) => (
                      <button
                        key={`${message.id}-${quickReply}`}
                        onClick={() => {
                          void sendMessage(quickReply, { appendUser: true });
                        }}
                        className="text-[11px] rounded-full border border-gray-200 px-2 py-1 bg-gray-100 hover:bg-gray-200 transition"
                      >
                        {quickReply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="mr-auto bg-white border border-gray-100 rounded-xl px-3 py-2">
                <Spinner size="sm" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-3 py-3 border-t border-gray-100 bg-white">
            {lastFailedMessage && (
              <button
                onClick={() => {
                  void sendMessage(lastFailedMessage, { appendUser: false });
                }}
                disabled={isLoading}
                className="text-[11px] text-red-600 hover:text-red-700 mb-2 disabled:opacity-50"
              >
                Retry last message
              </button>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about menu, delivery, pickup..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={isLoading || input.trim().length === 0}
                className="px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
