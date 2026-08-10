/**
 * AI Chatbot Platform — Production Widget Loader
 *
 * Lightweight, zero-dependency JavaScript snippet intended for host websites
 * (e.g., OpenCart, Shopify, WooCommerce, PrintEZ, or custom HTML).
 *
 * Capabilities:
 * - Reads data-chatbot-key, data-widget-url, and optional styling attributes.
 * - Utilizes Shadow DOM isolation to prevent host website CSS conflicts or bleed.
 * - Renders a vibrant floating launcher button with micro-animations & status badge.
 * - Instantiates a secure, responsive iframe hosting the visitor chat application.
 * - Communicates bidirectionally via window.postMessage for open/close/resize events.
 *
 * Size: Well under 20KB gzipped (Vanilla JS/TS).
 */

(function () {
  const currentScript = document.currentScript || document.querySelector('script[data-chatbot-key]');
  if (!currentScript) {
    console.error('[ChatbotPlatform] Loader script not found or missing data-chatbot-key.');
    return;
  }

  const chatbotKey = currentScript.getAttribute('data-chatbot-key')?.trim() || '';
  const widgetUrl = currentScript.getAttribute('data-widget-url')?.trim() || 'http://localhost:5174';
  const apiUrl = currentScript.getAttribute('data-api-url')?.trim() || 'http://localhost:3000';
  const position = currentScript.getAttribute('data-position')?.trim() || 'bottom-right';
  const primaryColor = currentScript.getAttribute('data-primary-color')?.trim() || '#4F46E5'; // Sleek indigo default
  const accentColor = currentScript.getAttribute('data-accent-color')?.trim() || '#10B981'; // Emerald online dot

  if (!chatbotKey) {
    console.error('[ChatbotPlatform] Required attribute data-chatbot-key is empty.');
    return;
  }

  // Ensure single initialization
  const win = window as unknown as { __AI_CHATBOT_INITIALIZED__?: boolean };
  if (win.__AI_CHATBOT_INITIALIZED__) {
    console.warn('[ChatbotPlatform] Chatbot widget already initialized on this page.');
    return;
  }
  win.__AI_CHATBOT_INITIALIZED__ = true;

  // Build secure iframe source URL with public key and origin context
  const targetIframeUrl = `${widgetUrl.replace(/\/$/, '')}/?key=${encodeURIComponent(chatbotKey)}&api=${encodeURIComponent(apiUrl)}&origin=${encodeURIComponent(window.location.origin)}`;

  // Create isolated root container at highest possible Z-index
  const hostContainer = document.createElement('div');
  hostContainer.id = `ai-chatbot-platform-host-${chatbotKey.slice(0, 8)}`;
  hostContainer.style.setProperty('position', 'fixed', 'important');
  hostContainer.style.setProperty('z-index', '2147483647', 'important'); // Max 32-bit signed int
  hostContainer.style.setProperty('bottom', '20px', 'important');
  if (position === 'bottom-left') {
    hostContainer.style.setProperty('left', '20px', 'important');
  } else {
    hostContainer.style.setProperty('right', '20px', 'important');
  }
  document.body.appendChild(hostContainer);

  // Attach Shadow DOM for encapsulation
  const shadow = hostContainer.attachShadow ? hostContainer.attachShadow({ mode: 'open' }) : hostContainer;

  // Inject Styles into Shadow DOM
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    .launcher-btn {
      width: 60px;
      height: 60px;
      border-radius: 30px;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: absolute;
      bottom: 0;
      ${position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
      outline: none;
      overflow: visible;
    }

    .launcher-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.4);
    }

    .launcher-btn:active {
      transform: scale(0.95);
    }

    .launcher-icon, .close-icon {
      width: 30px;
      height: 30px;
      fill: none;
      stroke: #ffffff;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.3s ease, opacity 0.3s ease;
      position: absolute;
    }

    .close-icon {
      opacity: 0;
      transform: rotate(-90deg) scale(0.5);
    }

    .is-open .launcher-icon {
      opacity: 0;
      transform: rotate(90deg) scale(0.5);
    }

    .is-open .close-icon {
      opacity: 1;
      transform: rotate(0deg) scale(1);
    }

    .status-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 14px;
      height: 14px;
      background-color: ${accentColor};
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 8px ${accentColor};
      animation: pulse-glow 2s infinite ease-in-out;
    }

    .is-open .status-badge {
      display: none;
    }

    @keyframes pulse-glow {
      0%, 100% { transform: scale(1); box-shadow: 0 0 6px ${accentColor}; }
      50% { transform: scale(1.15); box-shadow: 0 0 12px ${accentColor}; }
    }

    .iframe-wrapper {
      position: absolute;
      bottom: 76px;
      ${position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
      width: 400px;
      height: 680px;
      max-height: calc(100vh - 100px);
      max-width: calc(100vw - 40px);
      background: #1e1e24;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
      opacity: 0;
      pointer-events: none;
      transform-origin: bottom ${position === 'bottom-left' ? 'left' : 'right'};
      transform: translateY(20px) scale(0.92);
      transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
      display: flex;
      flex-direction: column;
    }

    .iframe-wrapper.is-open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    .chat-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
    }

    @media (max-width: 480px) {
      .iframe-wrapper {
        position: fixed !important;
        bottom: 0 !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        border-radius: 0 !important;
      }
    }
  `;
  shadow.appendChild(styleEl);

  // Build UI Container
  const wrapper = document.createElement('div');
  wrapper.className = 'iframe-wrapper';
  
  const iframe = document.createElement('iframe');
  iframe.className = 'chat-iframe';
  iframe.setAttribute('src', targetIframeUrl);
  iframe.setAttribute('title', 'AI Website Assistant');
  iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
  wrapper.appendChild(iframe);
  shadow.appendChild(wrapper);

  // Build FAB Launcher Button
  const button = document.createElement('button');
  button.className = 'launcher-btn';
  button.setAttribute('aria-label', 'Open AI Assistant Chat');
  button.innerHTML = `
    <span class="status-badge"></span>
    <svg class="launcher-icon" viewBox="0 0 24 24">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
    <svg class="close-icon" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  shadow.appendChild(button);

  let isOpen = false;

  function setOpenState(open: boolean) {
    isOpen = open;
    if (isOpen) {
      wrapper.classList.add('is-open');
      button.classList.add('is-open');
      button.setAttribute('aria-label', 'Close AI Assistant Chat');
      // Notify iframe that it opened
      iframe.contentWindow?.postMessage({ type: 'WIDGET_OPEN' }, '*');
    } else {
      wrapper.classList.remove('is-open');
      button.classList.remove('is-open');
      button.setAttribute('aria-label', 'Open AI Assistant Chat');
      iframe.contentWindow?.postMessage({ type: 'WIDGET_CLOSE' }, '*');
    }
  }

  button.addEventListener('click', () => setOpenState(!isOpen));

  // Listen for postMessage events from hosted widget iframe
  window.addEventListener('message', (event) => {
    // Basic verification that event is from our iframe
    if (event.source !== iframe.contentWindow) return;

    const { type, payload } = event.data || {};
    if (type === 'WIDGET_CLOSE') {
      setOpenState(false);
    } else if (type === 'WIDGET_READY') {
      console.info('[ChatbotPlatform] Widget iframe reported ready status.', payload || '');
    }
  });

  console.info(`[ChatbotPlatform] AI Assistant widget initialized securely for key: ${chatbotKey.slice(0, 8)}...`);
})();
