# Client Installation Guide

To integrate the PrintEZ AI Chatbot into your e-commerce storefront, simply embed the following lightweight JavaScript snippet into the `<head>` or before the closing `</body>` tag of your website.

## Step 1: Add the Widget Script

Copy and paste the snippet below:

```html
<script 
  src="https://api.printez-bot.com/widget.js" 
  data-chatbot-key="pub_test"
  defer
></script>
```

### Configuration Attributes

- `src`: The URL pointing to the widget loader script on our servers.
- `data-chatbot-key`: Your unique public chatbot key. (Replace `pub_test` with your actual key from the Admin Dashboard).
- `defer`: Ensures the widget script loads asynchronously without blocking your page rendering.

## Step 2: Configure Allowed Domains

For security, the widget will **only** initialize if embedded on an authorized domain.

1. Log in to the PrintEZ Staff Admin Dashboard.
2. Navigate to your Chatbot settings.
3. Add your store's domain (e.g., `https://mystore.com`) to the **Allowed Domains** whitelist.

## Troubleshooting

- **Widget not showing up?** Ensure your website domain is whitelisted in the dashboard. Check your browser console for CORS or origin restriction errors.
- **Answers seem incorrect?** Check the "Unanswered Questions" queue in the dashboard and train the AI using the FAQ Review workflow.
- **Bundle Size Notes:** Our widget relies on Preact and dynamically lazy-loads assets, keeping the initial payload strictly under 20KB to preserve your site's Lighthouse scores.
