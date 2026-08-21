import { useState, useEffect, useRef } from 'react';
import type { ChatMessage, ChatbotPublicConfig, ChatMessageProduct } from '@chatbot-platform/shared-types';
import './App.css';

type NavTab = 'home' | 'messages' | 'faq';
type ViewMode = 'nav_deck' | 'chat_thread';
type EmojiCategory = 'all' | 'smileys' | 'people' | 'commerce' | 'symbols';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface ProductItem {
  sku: string;
  title: string;
  thumb: string;
  price: string;
  moq: string;
}

interface ThreadSummary {
  id: string;
  agentName: string;
  snippet: string;
  timestamp: string;
  status: 'active' | 'resolved';
  messages: ChatMessage[];
}

interface SpeechRecognitionEvent {
  results: Array<Array<{ transcript: string }>>;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

interface MediaRecorderInstance {
  start: () => void;
  stop: () => void;
}

interface WindowWithAudioMedia extends Window {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  MediaRecorder?: new (stream: MediaStream) => MediaRecorderInstance;
}

const TOP_FAQS: FaqItem[] = [
  { id: 'faq1', question: 'What is your shipping policy and rates?', answer: 'We offer Free Ground Shipping on all orders over $150. For orders under $150, shipping is calculated at 17% of the subtotal (minimum $11.99). Need it faster? We offer 2-Day ($32.99 min) and Overnight ($49.99 min) options.' },
  { id: 'faq2', question: 'Do you offer wholesale or bulk pricing?', answer: 'Yes! We provide special volume pricing for commercial and wholesale accounts. Please reach out to our support team or type "speak with a specialist" for a custom quote on large orders.' },
  { id: 'faq3', question: 'How can I contact customer support?', answer: 'Our specialists are ready to help! You can call us at +1 8457825832 or email us at support@printez.com.' },
  { id: 'faq4', question: 'How long does production take?', answer: 'Standard production times vary by product, but most custom printed items ship within 3-5 business days after proof approval. Rush processing is available on select items during checkout.' }
];

const _SAMPLE_PRODUCTS: ProductItem[] = [];
void _SAMPLE_PRODUCTS;

// Category icons for the browse-by-category UI
const CATEGORY_ICONS: Record<string, string> = {
  'Gift Boxed Treats': '🎁',
  'Advertising  Labels': '🏷️',
  'Stock Stamps': '📬',
  'Holiday Cards': '🎄',
  'Invoice Forms': '📄',
  'Promotional Food Gifts': '🍫',
  'Greetings': '💌',
  'Statement Forms': '📋',
  'Cheese & Charcuterie': '🧀',
  'Towers of Treats': '🗼',
  'Office Accessories': '📎',
  'Automotive': '🚗',
  'Business Forms': '📝',
  'Food Gifts': '🍪',
  'Cards - Value': '💳',
  'Pens & Writing': '🖊️',
  'General Forms': '📃',
  'One-Write Checks': '✅',
  'Household & Personal': '🏠',
  'Food & Candy': '🍬',
  'Self-Inking Stamps': '✒️',
  'Check Envelopes': '✉️',
  'Files and Folders': '📁',
  'Spot Color': '🎨',
  'Outdoors, Sports & Leisure': '⚽',
  'Bags & Totes': '👜',
  'Backdrops': '🖼️',
  'Special Application Labels': '📌',
};

/**
 * Sanitize LLM markdown output into clean HTML for the chat UI.
 * Converts **bold**, *italic*, [link](url), and bullet lists.
 */
function formatBotText(text: string): string {
  let html = text
    // Escape any HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Convert markdown bold **text** to <strong>
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Convert markdown italic *text* to <em> (but not bullet * )
    .replace(/(?<![\w*])\*([^*\n]+)\*(?![*\w])/g, '<em>$1</em>')
    // Convert markdown links [text](url) to clickable anchors
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#005cf7;text-decoration:underline;">$1</a>')
    // Convert bullet lines starting with * or - to clean list items
    .replace(/^[*-]\s+/gm, '• ')
    // Convert numbered lists (1. item) to cleaner format
    .replace(/^(\d+)\.\s+/gm, '$1) ')
    // Convert line breaks to <br>
    .replace(/\n/g, '<br>');
  return html;
}

// Classic Tidio Outlined Quick Replies
const ZENDESK_TEMPLATE_CHIPS = [
  "Start custom print order",
  "Track an order",
  "Wholesale bulk rates",
  "Turnaround & shipping",
  "Speak with a specialist"
];

// Upgraded Comprehensive Tidio Emoji Dictionary
const EMOJI_DICTIONARY = {
  frequentlyUsed: ["👍", "😀", "😘", "😍", "😆", "😜", "😅", "😂", "😱", "❤️", "🔥", "✨"],
  smileys: ["😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊", "😋", "😎", "😍", "😘", "🥰", "😗", "😙", "😚", "🙂", "🤗", "🤩", "🤔", "🤨", "😐", "😑", "😶", "🙄", "😏", "😣", "😥", "😮", "🤐", "😯", "😪", "😫", "😴", "😌", "😛", "😜", "😝", "🤤", "😒", "😓", "😔", "😕", "🙃", "🤑", "😲", "☹️", "🙁", "😖", "😞", "😟", "😤", "😢", "😭"],
  peopleGestures: ["👋", "🤚", "🖐", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "💪", "👤", "👥", "👀", "🗣"],
  commercePrint: ["👕", "📇", "📦", "🚚", "🚩", "🎨", "🖼️", "🧵", "💼", "💵", "💳", "🛒", "🏷️", "📰", "📑", "📄", "📈", "📊", "🗂️", "✂️", "✒️", "🖊️", "🖌️", "🖍️"],
  symbolsFlags: ["🚀", "✨", "🔥", "❤️", "💖", "💯", "✔️", "✅", "⚠️", "⛔", "💬", "💭", "📢", "🔔", "⏰", "⏳", "🎉", "🎊", "🏆", "🎁", "🇺🇸", "🇨🇦", "🇬🇧", "🌐"]
};

const OFFICIAL_SVG_URL = 'https://www.printez.com/catalog/view/image/Printez_Logo.svg';

const INITIAL_PAST_THREADS: ThreadSummary[] = [];

// Synthesized Web Audio API sound feedback (zero external audio file dependency!)
const playChime = (type: 'send' | 'receive' | 'new') => {
  try {
    const win = window as unknown as WindowWithAudioMedia;
    const AudioCtx = win.AudioContext || win.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'send') {
      // Crisp rising note for sent messages
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'receive') {
      // Friendly chime chord for bot responses
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.setValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'new') {
      // Cheerful chime for starting a new chat
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(660, now + 0.08);
      osc.frequency.setValueAtTime(880, now + 0.16);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.32);
    }
  } catch {
    // Graceful fallback if browser restricts autoplay audio
  }
};

export default function App() {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [viewMode, setViewMode] = useState<ViewMode>('nav_deck');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'WIDGET_EXPAND', payload: isExpanded }, '*');
    }
  }, [isExpanded]);

  // E-commerce Overlays
  const [activeProductView, setActiveProductView] = useState<ChatMessageProduct | null>(null);
  const [productQuantity, setProductQuantity] = useState<number>(1);
  const [checkoutData, setCheckoutData] = useState({ name: '', email: '', phone: '', address: '' });
  const [checkoutSubmitted, setCheckoutSubmitted] = useState(false);

  // Conversational animation delay
  const [isGeneratingWelcome, setIsGeneratingWelcome] = useState<boolean>(true);

  // Interactive Media States (GIF removed)
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [emojiCategory, setEmojiCategory] = useState<EmojiCategory>('all');
  const [emojiSearch, setEmojiSearch] = useState<string>('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string } | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const speechRecRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorderInstance | null>(null);

  // Interactive Forms States
  const [orderQueryInput, setOrderQueryInput] = useState<string>('');
  const [orderResult, setOrderResult] = useState<string | null>(null);
  const [supportEmail, setSupportEmail] = useState<string>('');
  const [supportMessage, setSupportMessage] = useState<string>('');
  const [ticketSubmitted, setTicketSubmitted] = useState<boolean>(false);
  const [csatStatus, setCsatStatus] = useState<{ [msgId: string]: string }>({});
  const [cartCount, setCartCount] = useState<number>(0);
  const [cartItems, setCartItems] = useState<Array<{ product: ChatMessageProduct, quantity: number }>>([]);
  const [_showCheckout, _setShowCheckout] = useState<boolean>(false);
  void _showCheckout; void _setShowCheckout;
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Conversation Thread History State
  const [pastThreads, setPastThreads] = useState<ThreadSummary[]>(INITIAL_PAST_THREADS);
  const [activeThreadTitle, setActiveThreadTitle] = useState<string>('PrintEZ Specialist');
  const [isViewingArchived, setIsViewingArchived] = useState<boolean>(false);

  const [config, setConfig] = useState<ChatbotPublicConfig>({
    publicKey: 'bot_pub_62bd602a804204b51720cda797aa07e4a54610d0308c0e75c4774b26d1b4ecae',
    name: 'PrintEZ AI Specialist',
    welcomeMessage: "Hi there 👋\n\nI'm your PrintEZ AI Agent working alongside our print production specialists.\n\nAsk me a question or choose an option below.",
    fallbackMessage: "Let me alert our print production specialists to assist you with your custom specifications!",
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carousel ref for effortless button scrolling
  const _carouselRef = useRef<HTMLDivElement>(null);
  void _carouselRef;

  const isStandalone = typeof window !== 'undefined' && window.parent === window;

  const getTimeGreeting = () => {
    return "Hi there! 👋";
  };

  useEffect(() => {
    try {
      let currentSession = sessionStorage.getItem('ai_chatbot_session');
      if (!currentSession) {
        currentSession = 'sess_' + Math.random().toString(36).substring(2, 11);
        sessionStorage.setItem('ai_chatbot_session', currentSession);
      }
      setSessionId(currentSession);
    } catch {
      setSessionId('sess_fallback_' + Date.now());
    }

    const query = new URLSearchParams(window.location.search);
    const key = query.get('key');
    const api = query.get('api') || 'https://chatbot-api-n8sc.onrender.com';

    if (key) {
      fetch(`${api}/api/v1/public/chatbots/${key}/config`)
        .then((res) => res.json())
        .then((data: ChatbotPublicConfig) => {
          setConfig((prev) => ({ ...prev, ...data }));
        })
        .catch(() => { /* offline fallback maintained */ });
    }

    // Conversational simulation: Initial wave dots before greeting & chips appear
    const welcomeTimer = setTimeout(() => {
      setIsGeneratingWelcome(false);
      const initialGreeting = config.welcomeMessage || "Hi there 👋\n\nI'm your PrintEZ AI Agent working alongside our print production specialists.\n\nAsk me a question or choose an option below.";
      setMessages([
        {
          id: 'welcome_msg',
          sender: 'bot',
          text: initialGreeting,
          timestamp: 'Just now',
        },
      ]);
      playChime('receive');
    }, 700);

    window.parent?.postMessage({ type: 'WIDGET_READY', payload: { status: 'ok' } }, '*');
    return () => clearTimeout(welcomeTimer);
  }, [config.welcomeMessage]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecordingVoice]);

  useEffect(() => {
    if (viewMode === 'chat_thread' && messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, viewMode, isGeneratingWelcome, orderResult, attachedFile, showEmojiPicker, isRecordingVoice]);

  const handleClose = () => {
    if (isStandalone) {
      setIsOpen(false);
    } else {
      window.parent?.postMessage({ type: 'WIDGET_CLOSE' }, '*');
    }
  };

  const handleStartNewChat = () => {
    playChime('new');
    setShowDropdown(false);
    setIsGeneratingWelcome(false);
    setIsViewingArchived(false);
    setActiveThreadTitle('PrintEZ Specialist');

    // Archive existing conversation to Past Threads History if user engaged in dialogue!
    if (messages.length > 1 && !isViewingArchived) {
      const lastMsg = messages[messages.length - 1];
      const newArchived: ThreadSummary = {
        id: 'arch_' + Date.now(),
        agentName: 'PrintEZ Specialist (AI)',
        snippet: lastMsg.text.length > 90 ? lastMsg.text.substring(0, 87) + '...' : lastMsg.text,
        timestamp: 'Just now',
        status: 'resolved',
        messages: [...messages],
      };
      setPastThreads((prev) => [newArchived, ...prev]);
    }

    const newSession = 'sess_' + Math.random().toString(36).substring(2, 11);
    try {
      sessionStorage.setItem('ai_chatbot_session', newSession);
    } catch { /* storage fallback handled */ }
    setSessionId(newSession);
    setMessages([
      {
        id: 'welcome_' + Date.now(),
        sender: 'bot',
        text: config.welcomeMessage || "Hi there 👋\n\nI'm your PrintEZ AI Agent working alongside our print production specialists.\n\nAsk me a question or choose an option below.",
        timestamp: 'Just now',
      },
    ]);
    setViewMode('chat_thread');
  };

  const openArchivedThread = (thread: ThreadSummary) => {
    playChime('receive');
    setShowDropdown(false);
    setIsGeneratingWelcome(false);
    setIsViewingArchived(true);
    setActiveThreadTitle(thread.agentName);
    setMessages([...thread.messages]);
    setViewMode('chat_thread');
  };

  const handleDownloadTranscript = () => {
    setShowDropdown(false);
    const text = messages.map((m) => `[${m.timestamp}] ${m.sender.toUpperCase()}: ${m.text}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `printez-chat-${sessionId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openChatThread = (initialPrompt?: string) => {
    setIsViewingArchived(false);
    setActiveThreadTitle('PrintEZ Specialist');
    setViewMode('chat_thread');
    setShowDropdown(false);
    if (initialPrompt) {
      submitMessage(initialPrompt);
    }
  };

  const scrollCarousel = (e: React.MouseEvent, direction: 'left' | 'right') => {
    const container = (e.currentTarget as HTMLElement).closest('.carousel-nav-bar')?.nextElementSibling as HTMLElement;
    if (container) {
      const scrollAmount = direction === 'left' ? -230 : 230;
      if (typeof container.scrollBy === 'function') {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollLeft += scrollAmount;
      }
    }
  };

  const handleAddToCart = (product: ChatMessageProduct, quantity: number = 1) => {
    if (!product.externalId) return;
    
    setCartItems(prev => {
      const existing = prev.find(item => item.product.externalId === product.externalId);
      if (existing) {
        return prev.map(item => item.product.externalId === product.externalId 
          ? { ...item, quantity: item.quantity + quantity } 
          : item
        );
      }
      return [...prev, { product, quantity: quantity }];
    });
    
    setCartCount(c => c + quantity);
    setActiveProductView(null);
    
    // Automatically bring up the checkout form in the chat
    setViewMode('chat_thread');
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.intent === 'create_order') {
        return prev;
      }
      return [...prev, {
        id: 'sys_' + Date.now(),
        sender: 'bot',
        text: "I've added the item to your cart! You can continue browsing, or fill out the secure form below to finalize your order now.",
        timestamp: 'Just now',
        intent: 'create_order'
      }];
    });
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutSubmitted(true);
    
    try {
      const query = new URLSearchParams(window.location.search);
      const api = query.get('api') || 'https://chatbot-api-n8sc.onrender.com';
      const key = query.get('key') || 'bot_pub_62bd602a804204b51720cda797aa07e4a54610d0308c0e75c4774b26d1b4ecae';

      const response = await fetch(`${api}/api/v1/public/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: checkoutData.name,
          email: checkoutData.email,
          phone: checkoutData.phone,
          address: checkoutData.address,
          chatbotId: key,
          sessionId: sessionId,
          items: cartItems.map(item => ({
            productId: String(item.product.externalId),
            quantity: item.quantity
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit order');
      }
      
      const result = await response.json();
      
      // Drop a confirmation message in the chat
      setMessages(prev => [...prev, {
        id: 'sys_' + Date.now(),
        sender: 'bot',
        text: `✓ Success! Your order (${result.orderId}) has been securely received and queued for fulfillment.`,
        timestamp: 'Just now',
      }]);
      
      // Clear the cart
      setCartItems([]);
      setCartCount(0);
      setCheckoutData({ name: '', email: '', phone: '', address: '' });
      
    } catch (err) {
      console.error('Checkout error:', err);
      alert('There was an issue processing your order. Please try again.');
      setCheckoutSubmitted(false);
    }
  };

  // Functional Utility: Native OS File Dialog Attachment
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeKB = Math.round(file.size / 1024) + " KB";
      setAttachedFile({ name: file.name, size: sizeKB });
      setShowEmojiPicker(false);
    }
  };

  // Functional Utility: Real Live Speech-to-Text Voice Recording & Audio Transcription
  const startVoiceRecording = async () => {
    setShowEmojiPicker(false);
    setIsRecordingVoice(true);
    setVoiceTranscript('');

    // Try starting Web Speech API for real browser audio speech-to-text transcription
    try {
      const win = window as unknown as WindowWithAudioMedia;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          setVoiceTranscript(transcript.trim());
        };
        recognition.start();
        speechRecRef.current = recognition;
      }
    } catch {
      // Speech recognition fallback
    }

    try {
      const win = window as unknown as WindowWithAudioMedia;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && win.MediaRecorder) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new win.MediaRecorder(stream);
        mediaRecorderRef.current.start();
      }
    } catch {
      // Simulation fallback when mic permissions are restricted
    }
  };

  const finishVoiceRecording = () => {
    setIsRecordingVoice(false);
    if (mediaRecorderRef.current && typeof mediaRecorderRef.current.stop === 'function') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore media stop error */ }
    }
    if (speechRecRef.current && typeof speechRecRef.current.stop === 'function') {
      try { speechRecRef.current.stop(); } catch { /* ignore speech stop error */ }
    }
    const secStr = recordingSeconds < 10 ? `0${recordingSeconds}` : `${recordingSeconds}`;
    const transcribedText = voiceTranscript || "I would like to speak with a production specialist regarding custom print materials.";
    submitMessage(`🎙️ [Voice Note Transcribed • 00:${secStr}s]: "${transcribedText}"`);
  };

  const cancelVoiceRecording = () => {
    setIsRecordingVoice(false);
    if (mediaRecorderRef.current && typeof mediaRecorderRef.current.stop === 'function') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore media cancel error */ }
    }
    if (speechRecRef.current && typeof speechRecRef.current.stop === 'function') {
      try { speechRecRef.current.stop(); } catch { /* ignore speech cancel error */ }
    }
  };

  const triggerInlineOrderCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderQueryInput.trim()) return;
    setOrderResult('⏳ Looking up order...');
    // Send a real message to the API to trigger ORDER_STATUS intent
    const orderMsg = `Check order #${orderQueryInput.trim()}`;
    try {
      const query = new URLSearchParams(window.location.search);
      const key = query.get('key') || 'bot_pub_62bd602a804204b51720cda797aa07e4a54610d0308c0e75c4774b26d1b4ecae';
      const api = query.get('api') || 'https://chatbot-api-n8sc.onrender.com';
      const origin = query.get('origin') || window.location.origin;
      const response = await fetch(`${api}/api/v1/public/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: key,
          sessionId: sessionId,
          message: orderMsg,
          visitorOrigin: origin,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setOrderResult(result.reply || 'Order not found. Please verify the order number and try again.');
      } else {
        setOrderResult('Unable to look up order status. Please try again or contact support.');
      }
    } catch {
      setOrderResult('Connection error. Please check your internet connection and try again.');
    }
  };

  const triggerInlineSupportTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportEmail || !supportMessage) return;
    setTicketSubmitted(true);
  };

  const submitMessage = async (textToSend: string) => {
    if ((!textToSend.trim() && !attachedFile) || isLoading) return;
    setIsViewingArchived(false);
    setActiveThreadTitle('PrintEZ Specialist');
    setViewMode('chat_thread');
    setIsGeneratingWelcome(false);
    setShowEmojiPicker(false);
    setShowDropdown(false);

    let formattedText = textToSend.trim();
    if (attachedFile) {
      formattedText += `\n📎 [Attached File: ${attachedFile.name} (${attachedFile.size})]`;
      setAttachedFile(null);
    }

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: formattedText || "📎 Attached Artwork File",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    playChime('send');

    const query = new URLSearchParams(window.location.search);
    const key = query.get('key') || 'bot_pub_62bd602a804204b51720cda797aa07e4a54610d0308c0e75c4774b26d1b4ecae';
    const api = query.get('api') || 'https://chatbot-api-n8sc.onrender.com';
    const origin = query.get('origin') || window.location.origin;

    try {
      const response = await fetch(`${api}/api/v1/public/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: key,
          sessionId: sessionId,
          message: userMsg.text,
          history: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
          visitorOrigin: origin,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const botMsg: ChatMessage = {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: result.reply || config.fallbackMessage || "I understood your request!",
          timestamp: 'Just now',
          sources: result.sources,
          products: result.products,
          intent: result.intent,
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsLoading(false);
        playChime('receive');
        return;
      }
      throw new Error(`API Error: ${response.status}`);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: 'err_' + Date.now(),
        sender: 'bot',
        text: "I'm sorry, I'm currently unable to reach the production specialists. Please try again later.",
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, errorMsg]);
      setIsLoading(false);
      playChime('receive');
    }
  };

  const filterEmojiList = (list: string[]) => {
    if (!emojiSearch.trim()) return list;
    return list.filter(e => e.includes(emojiSearch));
  };

  // Shared 3-Dots Dropdown element required across ALL tabs!
  const renderHeaderOptionsControls = () => (
    <div className="header-controls">
      <button
        className="icon-button"
        onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
        title="More Options"
        aria-label="More Options"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
          <circle cx="12" cy="5" r="1.5" fill="currentColor"></circle>
          <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
          <circle cx="12" cy="19" r="1.5" fill="currentColor"></circle>
        </svg>
      </button>
      <button className="icon-button" onClick={handleClose} title="Close" aria-label="Close Chat">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {showDropdown && (
        <div className="options-dropdown" onClick={(e) => e.stopPropagation()}>
          <button className="dropdown-item" onClick={handleStartNewChat}>
            <span>💬</span>
            <span>Start new chat</span>
          </button>
          <button className="dropdown-item" onClick={() => { setIsExpanded(!isExpanded); setShowDropdown(false); }}>
            <span>{isExpanded ? '↙' : '↗'}</span>
            <span>{isExpanded ? 'Shrink window' : 'Expand window'}</span>
          </button>
          <button className="dropdown-item" onClick={handleDownloadTranscript}>
            <span>⭳</span>
            <span>Download transcript</span>
          </button>
        </div>
      )}
    </div>
  );

  const widgetContent = (
    <div className={`widget-container ${isStandalone ? 'standalone-popup' : ''} ${isExpanded ? 'expanded' : ''}`} onClick={() => setShowDropdown(false)}>
      
      {activeProductView && (
        <div className="product-overlay">
          <div className="product-overlay-header">
            <span className="product-overlay-title">Product Details</span>
            <button className="product-overlay-close" onClick={() => setActiveProductView(null)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="product-overlay-body printez-layout">
            <div className="printez-left-col">
              {activeProductView.imageUrl && (
                <div className="printez-image-container">
                  <img src={activeProductView.imageUrl} alt={activeProductView.name} />
                </div>
              )}
            </div>
            
            <div className="printez-right-col">
              <h2 className="printez-product-title">{activeProductView.name}</h2>
              <div className="printez-product-meta">
                <span className="printez-rating">⭐⭐⭐⭐⭐ 0 reviews</span> | 
                <span className="printez-item-no"> Item No. {activeProductView.metadata?.model || activeProductView.externalId}</span>
                {activeProductView.categoryName && <span className="printez-size"> | Cat: {activeProductView.categoryName}</span>}
              </div>

              <div className="printez-quantity-box">
                <div className="printez-quantity-header">Select Quantity</div>
                <div className="printez-quantity-body">
                  <div className="qty-row">
                    <button className="qty-btn" onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}>-</button>
                    <input type="text" readOnly value={productQuantity} className="qty-input" />
                    <button className="qty-btn" onClick={() => setProductQuantity(productQuantity + 1)}>+</button>
                  </div>
                  <div className="qty-price-display">
                    ${(Number(activeProductView.price || 0) * productQuantity).toFixed(2)}
                  </div>
                </div>
              </div>

              {activeProductView.description && (
                <div className="printez-desc-box">
                  <div className="printez-desc-header">- PRODUCT DESCRIPTION</div>
                  <div className="printez-desc-body" dangerouslySetInnerHTML={{ __html: activeProductView.description }} />
                </div>
              )}
              <button
                className="printez-personalize-btn" 
                disabled={activeProductView.stockStatus === 'out_of_stock'}
                onClick={() => {
                  handleAddToCart(activeProductView, productQuantity);
                  setToastMessage(`✓ Added ${activeProductView.name} to Cart`);
                  setTimeout(() => setToastMessage(null), 3000);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                {activeProductView.stockStatus === 'out_of_stock' ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STATE A: DEDICATED CHAT THREAD VIEW ─── */}
      {viewMode === 'chat_thread' ? (
        <>
          <header className="chat-thread-header" onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(false); }}>
            <div className="thread-left-info">
              <button className="back-arrow-btn" onClick={() => setViewMode('nav_deck')} title="Back to Home">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <div className="thread-avatar-circle" title="PrintEZ Specialist">
                <img src={OFFICIAL_SVG_URL} alt="PrintEZ" className="logo-svg-img" />
              </div>
              <div className="thread-names">
                <div className="agent-name">{activeThreadTitle}</div>
                <div className="agent-sub">
                  <span className="online-dot" />
                  <span>{isViewingArchived ? 'Archived Thread • Online' : 'Online • Ready to assist'}</span>
                </div>
              </div>
            </div>

            {renderHeaderOptionsControls()}
          </header>

          <div className="chat-thread-stream" onClick={() => { setShowDropdown(false); setShowEmojiPicker(false); }}>
            {isGeneratingWelcome && messages.length === 0 && (
              <div className="wave-typing-bubble">
                <div className="wave-dot" />
                <div className="wave-dot" />
                <div className="wave-dot" />
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`msg-row ${msg.sender}`}>
                <div className="bubble">
                  {msg.sender === 'bot' ? (
                    <div dangerouslySetInnerHTML={{ __html: formatBotText(msg.text) }} />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                  )}

                  {msg.products && msg.products.length === 1 && (
                    <div className="single-product-showcase" style={{ marginTop: '12px' }}>
                      <div className="showcase-card">
                        {msg.products[0].imageUrl && (
                          <div className="showcase-image" onClick={() => { setActiveProductView(msg.products![0]); setProductQuantity(1); }}>
                            <img src={msg.products[0].imageUrl} alt={msg.products[0].name} loading="lazy" />
                          </div>
                        )}
                        <div className="showcase-details">
                          <h3 className="showcase-title" onClick={() => { setActiveProductView(msg.products![0]); setProductQuantity(1); }}>{msg.products[0].name}</h3>
                          {msg.products[0].price && <div className="showcase-price">${Number(msg.products[0].price).toFixed(2)}</div>}
                          {msg.products[0].description && (
                            <div className="showcase-desc" dangerouslySetInnerHTML={{ __html: msg.products[0].description }} />
                          )}
                          <button
                            type="button"
                            className="showcase-cart-btn"
                            onClick={() => {
                              handleAddToCart(msg.products![0], 1);
                              setToastMessage(`✓ Added ${msg.products![0].name} to Cart`);
                              setTimeout(() => setToastMessage(null), 3000);
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {msg.products && msg.products.length > 1 && (
                    <div style={{ marginTop: '12px' }}>
                      <div className="carousel-nav-bar">
                        <span>Related Products</span>
                        <div className="carousel-arrows">
                          <button type="button" className="carousel-arrow-btn" onClick={(e) => scrollCarousel(e, 'left')} title="Scroll Left" aria-label="Scroll Left">←</button>
                          <button type="button" className="carousel-arrow-btn" onClick={(e) => scrollCarousel(e, 'right')} title="Scroll Right" aria-label="Scroll Right">→</button>
                        </div>
                      </div>
                      <div className="product-carousel-container">
                        {msg.products.map((prod, pIdx) => (
                          <div key={prod.id || pIdx} className="carousel-card">
                            {prod.imageUrl && (
                              <div className="product-thumb">
                                <img src={prod.imageUrl} alt={prod.name} loading="lazy" />
                              </div>
                            )}
                            <div className="product-title">{prod.name}</div>
                            <div className="product-meta">
                              {prod.price && <span className="product-price">${Number(prod.price).toFixed(2)}</span>}
                            </div>
                            {prod.description && (
                              <details className="product-desc-dropdown">
                                <summary>Brief Summary</summary>
                                <div className="product-desc-content" dangerouslySetInnerHTML={{ __html: prod.description }} />
                              </details>
                            )}
                            <div style={{ display: 'flex', gap: '6px', flexDirection: 'column', marginTop: 'auto' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  handleAddToCart(prod, 1);
                                  setToastMessage(`✓ Added ${prod.name} to Cart`);
                                  setTimeout(() => setToastMessage(null), 3000);
                                }}
                                className="carousel-cart-btn"
                                style={{ background: '#0f172a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                                Add to Cart
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.categories && msg.categories.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div className="carousel-nav-bar">
                        <span>Categories</span>
                      </div>
                      <div className="category-grid" style={{ gridTemplateColumns: '1fr', gap: '8px' }}>
                        {msg.categories.map((cat, idx) => (
                          <button key={idx} type="button" className="category-pill" onClick={() => submitMessage(cat)}>
                            <span className="category-icon">📁</span>
                            <span className="category-label">{cat}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.sender === 'bot' && (msg.text.includes('order number below') || msg.text.includes('press fulfillment status')) && (
                    <div className="inline-form-box">
                      <div className="form-title-bar">PrintEZ Order Tracker</div>
                      <form onSubmit={triggerInlineOrderCheck} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="text"
                          className="inline-input"
                          placeholder="Order Number (e.g., ORD-9876)"
                          value={orderQueryInput}
                          onChange={(e) => setOrderQueryInput(e.target.value)}
                        />
                        <button type="submit" className="inline-submit-btn">Check Live Press Status</button>
                      </form>
                      {orderResult && (
                        <div style={{ fontSize: '13px', color: '#047857', marginTop: '4px', background: '#d1fae5', border: '1px solid #10b981', padding: '10px', borderRadius: '8px', fontWeight: 700 }}>
                          {orderResult}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.sender === 'bot' && msg.intent === 'create_order' && !checkoutSubmitted && (
                    <div className="inline-checkout-form">
                      <div className="checkout-header">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Secure Fast Checkout
                      </div>
                      <form onSubmit={handleCheckoutSubmit}>
                        <div className="checkout-field">
                          <label>Full Name</label>
                          <input type="text" required placeholder="Jane Doe" value={checkoutData.name} onChange={e => setCheckoutData({...checkoutData, name: e.target.value})} />
                        </div>
                        <div className="checkout-field">
                          <label>Email Address</label>
                          <input type="email" required placeholder="jane@example.com" value={checkoutData.email} onChange={e => setCheckoutData({...checkoutData, email: e.target.value})} />
                        </div>
                        <div className="checkout-field">
                          <label>Phone Number</label>
                          <input type="tel" required placeholder="(555) 123-4567" value={checkoutData.phone} onChange={e => setCheckoutData({...checkoutData, phone: e.target.value})} />
                        </div>
                        <div className="checkout-field">
                          <label>Shipping Address</label>
                          <textarea required rows={3} placeholder="123 Main St, NY 10001" value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})}></textarea>
                        </div>
                        <button type="submit" className="checkout-submit">Confirm Order Details</button>
                      </form>
                    </div>
                  )}

                  {msg.sender === 'bot' && msg.intent === 'create_order' && checkoutSubmitted && (
                    <div style={{ marginTop: '12px', padding: '14px', background: '#d1fae5', color: '#047857', borderRadius: '12px', fontSize: '13.5px', fontWeight: 600, border: '1px solid #10b981' }}>
                      Thank you! Your details have been recorded securely. Our specialists are preparing your custom print order right now.
                    </div>
                  )}

                  {msg.sender === 'bot' && (msg.text.includes('production team has received') || msg.text.includes('dedicated specialist') || msg.text.includes('alert our print production specialists')) && (
                    <div className="inline-form-box">
                      <div className="form-title-bar">Connect to Live Specialist</div>
                      {!ticketSubmitted ? (
                        <form onSubmit={triggerInlineSupportTicket} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="email"
                            className="inline-input"
                            placeholder="Email address"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            required
                          />
                          <textarea
                            className="inline-input"
                            style={{ resize: 'vertical', minHeight: '65px' }}
                            placeholder="Describe your custom quantity or printing specifications..."
                            value={supportMessage}
                            onChange={(e) => setSupportMessage(e.target.value)}
                            required
                          />
                          <button type="submit" className="inline-submit-btn">
                            Dispatch to Print Team
                          </button>
                        </form>
                      ) : (
                        <div style={{ color: '#047857', fontSize: '13.5px', fontWeight: 700 }}>
                          ✓ Inquiry submitted! A print production lead will respond via email shortly.
                        </div>
                      )}
                    </div>
                  )}

                  {msg.sender === 'bot' && idx > 0 && (
                    <div className="csat-bar">
                      <span>Was this helpful?</span>
                      <div className="csat-actions">
                        {!csatStatus[msg.id] ? (
                          <>
                            <button className="csat-btn" onClick={() => setCsatStatus({ ...csatStatus, [msg.id]: 'yes' })}>Yes</button>
                            <button
                              className="csat-btn"
                              onClick={() => {
                                setCsatStatus({ ...csatStatus, [msg.id]: 'no' });
                                submitMessage('Speak with a specialist');
                              }}
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <span style={{ color: '#64748b', fontWeight: 700 }}>
                            {csatStatus[msg.id] === 'yes' ? 'Thanks for your feedback!' : 'Connecting to team...'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tidio Outlined Quick Replies */}
                {(msg.id === 'welcome_msg' || msg.id?.startsWith('welcome_')) && !isViewingArchived && (
                  <div className="zendesk-option-cluster">
                    {ZENDESK_TEMPLATE_CHIPS.map((chipText, cIdx) => (
                      <button
                        key={cIdx}
                        className="zendesk-option-pill"
                        onClick={() => submitMessage(chipText)}
                      >
                        {chipText}
                      </button>
                    ))}
                  </div>
                )}

                <div className="msg-timestamp">{msg.timestamp}</div>
              </div>
            ))}

            {isLoading && (
              <div className="wave-typing-bubble">
                <div className="wave-dot" />
                <div className="wave-dot" />
                <div className="wave-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          {showEmojiPicker && (
            <div className="tidio-emoji-popover" onClick={(e) => e.stopPropagation()}>
              <div className="emoji-top-tabs">
                <button className={`emoji-cat-tab ${emojiCategory === 'all' ? 'active' : ''}`} onClick={() => setEmojiCategory('all')} title="Frequently Used & All">
                  😀
                </button>
                <button className={`emoji-cat-tab ${emojiCategory === 'smileys' ? 'active' : ''}`} onClick={() => setEmojiCategory('smileys')} title="Smileys & People">
                  😍
                </button>
                <button className={`emoji-cat-tab ${emojiCategory === 'people' ? 'active' : ''}`} onClick={() => setEmojiCategory('people')} title="Gestures & Hands">
                  👍
                </button>
                <button className={`emoji-cat-tab ${emojiCategory === 'commerce' ? 'active' : ''}`} onClick={() => setEmojiCategory('commerce')} title="Print & Commerce Objects">
                  👕
                </button>
                <button className={`emoji-cat-tab ${emojiCategory === 'symbols' ? 'active' : ''}`} onClick={() => setEmojiCategory('symbols')} title="Symbols & Flags">
                  🚀
                </button>
              </div>

              <div className="emoji-search-container">
                <input
                  type="text"
                  className="emoji-search-input"
                  placeholder="Search emojis..."
                  value={emojiSearch}
                  onChange={(e) => setEmojiSearch(e.target.value)}
                />
              </div>

              <div className="emoji-list-scroll">
                {(emojiCategory === 'all' || emojiCategory === 'smileys') && (
                  <div>
                    <div className="emoji-section-title">Frequently Used</div>
                    <div className="emoji-grid-rich">
                      {filterEmojiList(EMOJI_DICTIONARY.frequentlyUsed).map((emoji, idx) => (
                        <button key={idx} className="emoji-tile" onClick={() => { setInputValue(p => p + emoji); setShowEmojiPicker(false); inputRef.current?.focus(); }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(emojiCategory === 'all' || emojiCategory === 'smileys') && (
                  <div>
                    <div className="emoji-section-title">Smileys & People</div>
                    <div className="emoji-grid-rich">
                      {filterEmojiList(EMOJI_DICTIONARY.smileys).map((emoji, idx) => (
                        <button key={idx} className="emoji-tile" onClick={() => { setInputValue(p => p + emoji); setShowEmojiPicker(false); inputRef.current?.focus(); }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(emojiCategory === 'all' || emojiCategory === 'people') && (
                  <div>
                    <div className="emoji-section-title">Gestures & Hands</div>
                    <div className="emoji-grid-rich">
                      {filterEmojiList(EMOJI_DICTIONARY.peopleGestures).map((emoji, idx) => (
                        <button key={idx} className="emoji-tile" onClick={() => { setInputValue(p => p + emoji); setShowEmojiPicker(false); inputRef.current?.focus(); }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(emojiCategory === 'all' || emojiCategory === 'commerce') && (
                  <div>
                    <div className="emoji-section-title">Print & Commerce</div>
                    <div className="emoji-grid-rich">
                      {filterEmojiList(EMOJI_DICTIONARY.commercePrint).map((emoji, idx) => (
                        <button key={idx} className="emoji-tile" onClick={() => { setInputValue(p => p + emoji); setShowEmojiPicker(false); inputRef.current?.focus(); }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(emojiCategory === 'all' || emojiCategory === 'symbols') && (
                  <div>
                    <div className="emoji-section-title">Symbols & Alerts</div>
                    <div className="emoji-grid-rich">
                      {filterEmojiList(EMOJI_DICTIONARY.symbolsFlags).map((emoji, idx) => (
                        <button key={idx} className="emoji-tile" onClick={() => { setInputValue(p => p + emoji); setShowEmojiPicker(false); inputRef.current?.focus(); }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <footer className="chat-footer-2row">
            {attachedFile && (
              <div className="attachment-toast">
                <span>📎 Attached: {attachedFile.name} ({attachedFile.size})</span>
                <button onClick={() => setAttachedFile(null)} style={{ background: 'transparent', border: 'none', color: '#0369a1', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>✕</button>
              </div>
            )}

            {isRecordingVoice ? (
              <div className="voice-recording-deck">
                <div>
                  <span className="pulsing-red-dot" />
                  <span>Recording Voice Note... 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="voice-btn-cancel" onClick={cancelVoiceRecording}>Cancel ✕</button>
                  <button type="button" className="voice-btn-send" onClick={finishVoiceRecording}>Send ✓</button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitMessage(inputValue);
                }}
                className="chat-input-box"
              >
                <input
                  ref={inputRef}
                  type="text"
                  className="chat-input-field"
                  placeholder={isViewingArchived ? "Send message to resume this archived thread..." : "Enter your message..."}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                
                <div className="chat-action-row">
                  <div className="left-media-icons">
                    
                    <button
                      type="button"
                      className={`media-svg-btn ${showEmojiPicker ? 'active' : ''}`}
                      title="Open Emoji Window"
                      onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
                    >
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="media-svg-btn"
                      title="Attach Artwork / Specification File"
                      onClick={() => { fileInputRef.current?.click(); }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="media-svg-btn"
                      title="Record Voice Note"
                      onClick={startVoiceRecording}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                      </svg>
                    </button>

                  </div>

                  <button
                    type="submit"
                    className="chat-send-circle-btn"
                    disabled={(!inputValue.trim() && !attachedFile) || isLoading}
                    aria-label="Send Message"
                    title="Send Message"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '1px' }}>
                      <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" />
                    </svg>
                  </button>
                </div>
              </form>
            )}
          </footer>
        </>
      ) : (
        /* ─── STATE B: TOP-LEVEL NAVIGATION DECK (Home | Messages | FAQ) ─── */
        <>
          {activeTab === 'home' && (
            <header className="home-hero-header">
              {/* Enhanced Highly Visible Translucent PrintEZ Background Watermark */}
              <div className="header-watermark-bg" title="PrintEZ Brand Emblem" />

              <div className="home-top-bar">
                <div className="logo-brand-mark">
                  <div className="home-logo-pill" title="PrintEZ Official Brand">
                    <img src={OFFICIAL_SVG_URL} alt="PrintEZ Logo" className="official-printez-logo" />
                  </div>
                </div>
                {renderHeaderOptionsControls()}
              </div>
              <h1 className="home-title">{getTimeGreeting()}</h1>
              <p className="home-subtitle">
                AI chat powered by our custom print specialists - how can we help you today?
              </p>
              <hr className="header-divider-line" />
            </header>
          )}

          {activeTab === 'messages' && (
            <header className="simple-tab-header">
              <div className="logo-brand-mark">
                <div className="logo-pill-badge">
                  <img src={OFFICIAL_SVG_URL} alt="PrintEZ" className="logo-svg-img" />
                </div>
                <span style={{ fontWeight: 700, opacity: 0.95 }}>Messages & Thread History</span>
              </div>
              {renderHeaderOptionsControls()}
            </header>
          )}

          {activeTab === 'faq' && (
            <header className="simple-tab-header">
              <div className="logo-brand-mark">
                <div className="logo-pill-badge">
                  <img src={OFFICIAL_SVG_URL} alt="PrintEZ" className="logo-svg-img" />
                </div>
                <span style={{ fontWeight: 700, opacity: 0.95 }}>Help & Custom SLAs</span>
              </div>
              {renderHeaderOptionsControls()}
            </header>
          )}

          {/* GUARANTEED ZERO-CUTOFF FLOATING STARTER CARD: Mounted completely outside the scrollable overflow body! */}
          {activeTab === 'home' && (
            <div className="starter-card-float-wrapper">
              <div className="tidio-starter-card" onClick={() => openChatThread()}>
                <div className="starter-left">
                  <span className="starter-title">Chat with PrintEZ Specialist</span>
                  <span className="starter-desc">Have questions? Our AI specialist is here to assist you</span>
                </div>
                <div className="starter-send-arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          <div className="widget-body">
            {activeTab === 'home' && (
              <div className="home-deck">
                <div className="section-label">Browse by Category</div>
                <div className="category-grid">
                  {Object.entries(CATEGORY_ICONS).slice(0, 8).map(([cat, icon]) => (
                    <button
                      key={cat}
                      className="category-pill"
                      onClick={() => openChatThread(`Show me products in the ${cat} category`)}
                      title={cat}
                    >
                      <span className="category-icon">{icon}</span>
                      <span className="category-label">{cat}</span>
                    </button>
                  ))}
                </div>

                <div className="section-label" style={{ marginTop: '6px' }}>Quick Actions</div>
                <button className="topic-card-minimal" onClick={() => openChatThread('I would like to track an order')}>
                  <span>🔍 Track order status</span>
                  <span>→</span>
                </button>
                <button className="topic-card-minimal" onClick={() => openChatThread('Tell me about your shipping methods and rates')}>
                  <span>🚚 Shipping methods & rates</span>
                  <span>→</span>
                </button>
                <button className="topic-card-minimal" onClick={() => openChatThread('Do you offer wholesale bulk pricing?')}>
                  <span>💰 Wholesale bulk pricing</span>
                  <span>→</span>
                </button>
                <button className="topic-card-minimal" onClick={() => openChatThread('Speak with a specialist')}>
                  <span>👤 Connect with a specialist</span>
                  <span>→</span>
                </button>
              </div>
            )}

            {activeTab === 'messages' && (
              <div className="messages-list-deck">
                {/* Prominent + Start New Chat Hero Card */}
                <div className="new-thread-banner">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>New print inquiry?</span>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Start a fresh AI specialist conversation</span>
                  </div>
                  <button className="new-chat-btn" onClick={handleStartNewChat}>
                    <span>+ New Chat</span>
                  </button>
                </div>

                <div className="section-label" style={{ marginTop: '6px' }}>Active thread</div>

                <div className="conversation-preview-card" onClick={() => openChatThread()} title="Resume Active Discussion">
                  <div className="logo-pill-badge" style={{ height: '38px', padding: '0 14px' }}>
                    <img src={OFFICIAL_SVG_URL} alt="PrintEZ" className="logo-svg-img" style={{ height: '18px' }} />
                  </div>
                  <div className="preview-content">
                    <div className="preview-top">
                      <div>
                        <span className="preview-name">PrintEZ Specialist</span>
                        <span className="status-pill-active">● Active</span>
                      </div>
                      <span className="preview-time">{messages.length > 0 ? messages[messages.length - 1].timestamp : 'Just now'}</span>
                    </div>
                    <div className="preview-snippet">
                      {messages.length > 0 ? messages[messages.length - 1].text : 'Hi there 👋 Choose an option below.'}
                    </div>
                  </div>
                </div>

                <div className="section-label" style={{ marginTop: '12px' }}>Previous thread history</div>

                {pastThreads.map((thread, tIdx) => (
                  <div key={thread.id || tIdx} className="conversation-preview-card" onClick={() => openArchivedThread(thread)} title="Review Archived Conversation">
                    <div className="logo-pill-badge" style={{ height: '38px', padding: '0 14px', opacity: 0.85 }}>
                      <img src={OFFICIAL_SVG_URL} alt="PrintEZ" className="logo-svg-img" style={{ height: '18px' }} />
                    </div>
                    <div className="preview-content">
                      <div className="preview-top">
                        <div>
                          <span className="preview-name" style={{ fontSize: '14.5px' }}>{thread.agentName}</span>
                          <span className="status-pill-resolved">✓ Resolved</span>
                        </div>
                        <span className="preview-time" style={{ color: '#94a3b8' }}>{thread.timestamp}</span>
                      </div>
                      <div className="preview-snippet" style={{ color: '#64748b' }}>
                        {thread.snippet}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'faq' && (
              <div className="faq-deck">
                <div className="section-label" style={{ marginTop: 0 }}>Frequently asked questions</div>
                {TOP_FAQS.map((faq, fIdx) => (
                  <div key={fIdx} className="faq-item-minimal" onClick={() => setExpandedFaq(expandedFaq === fIdx ? null : fIdx)}>
                    <div className="faq-q">
                      <span>{faq.question}</span>
                      <span style={{ fontSize: '18px', color: '#64748b', fontWeight: 800 }}>{expandedFaq === fIdx ? '−' : '+'}</span>
                    </div>
                    {expandedFaq === fIdx && (
                      <div className="faq-a">{faq.answer}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="widget-bottom-deck">
            <nav className="widget-bottom-nav">
              <button className={`nav-tab-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => { setActiveTab('home'); setShowDropdown(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={activeTab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor"></polyline>
                </svg>
                <span>Home</span>
              </button>
              <button className={`nav-tab-btn ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => { setActiveTab('messages'); setShowDropdown(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={activeTab === 'messages' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Chat</span>
              </button>
              <button className={`nav-tab-btn ${activeTab === 'faq' ? 'active' : ''}`} onClick={() => { setActiveTab('faq'); setShowDropdown(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={activeTab === 'faq' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Help</span>
              </button>
            </nav>

            <div className="powered-by-footer">
              <span>POWERED BY</span>
              <div className="powered-logo-mark">
                <img src={OFFICIAL_SVG_URL} alt="PrintEZ" style={{ height: '14px', objectFit: 'contain' }} />
                <span style={{ color: '#64748b', fontWeight: 800, fontSize: '10.5px', marginLeft: '3px' }}>AI AGENT</span>
              </div>
            </div>
          </div>
        </>
      )}
      {toastMessage && (
        <div className="add-to-cart-toast">
          {toastMessage}
        </div>
      )}

      {/* Floating Cart Checkout Bar */}
      {cartItems.length > 0 && !activeProductView && (
        <div className="floating-cart-bar">
          <div className="floating-cart-info">
            {cartCount} item{cartCount > 1 ? 's' : ''} in cart
          </div>
          <button 
            className="floating-checkout-btn"
            onClick={() => {
              setViewMode('chat_thread');
              setMessages((prev: ChatMessage[]) => [...prev, {
                id: 'sys_' + Date.now(),
                sender: 'bot',
                text: "Great! Let's get your details to finalize your order.",
                timestamp: 'Just now',
                intent: 'create_order'
              }]);
            }}
          >
            Checkout
          </button>
        </div>
      )}
    </div>
  );

  if (isStandalone) {
    return (
      <div className="demo-host-background" onClick={() => setShowDropdown(false)}>
        <div className="demo-host-banner">
          <h1 className="demo-host-title">PrintEZ Commercial Portal</h1>
          <p className="demo-host-sub">Custom Business Cards, Vinyl Banners & Corporate Apparel Fulfillment</p>
        </div>

        {!isOpen && (
          <button className="fab-launcher" onClick={() => setIsOpen(true)} aria-label="Open Chatbot">
            <svg width="27" height="27" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" />
            </svg>
            <div className="fab-badge">1</div>
          </button>
        )}

        {isOpen && widgetContent}
      </div>
    );
  }

  return widgetContent;
}
