# Dodo Checkout

A tiny embeddable checkout demo built with React and TypeScript. It has three pieces: a one-file TypeScript SDK, a sandboxed checkout app, and a demo store that consumes the SDK.

## Run locally

~~~sh
npm install
npm run dev
~~~

Open the Vite URL shown in the terminal. The demo store's **Continue to secure checkout** button opens the checkout in an iframe. Use any name, a valid email, a valid future expiry date, and any three-digit CVC.

Build the demo app and standalone SDK bundle:

~~~sh
npm run build
npm run preview
~~~

The app is written to **dist/**; the drop-in SDK file is **dist/sdk/dodo-checkout.js**. Host both at the same checkout origin. A third party site can load the SDK from that origin:

~~~html
<script src="https://checkout.example.com/sdk/dodo-checkout.js"></script>
<button id="buy">Buy Selvage</button>
<script>
  document.querySelector('#buy').addEventListener('click', () => {
    DodoCheckout.open({
      productId: 'prod_123',
      onSuccess: ({ sessionId }) => console.log('Paid', sessionId),
      onClose: ({ reason }) => console.log('Checkout closed', reason),
      onError: ({ code, message }) => console.error(code, message),
    });
  });
</script>
~~~

The SDK currently serves the checkout app from the root path of the SDK's origin. The demo uses the **prod_123** Signature Crossbody product; product IDs are supplied by the embedding site through the SDK API.

## How the pieces talk

- **src/sdk/dodo-checkout.ts** is the complete TypeScript SDK source. It creates one modal iframe at a time, locks host page scrolling, restores focus on close, handles Escape, and reports load timeouts.
- The iframe runs this app with a dodo-checkout=1 query parameter. The iframe has a sandbox without allow-same-origin, which gives it an opaque origin and prevents the host from reading its DOM.
- The SDK creates a per-open channel ID and checks both the iframe window and that ID on every message. Checkout messages are limited to ready, success with a session ID, close with a reason, and error with a code and message.
- Card number, CVC, expiry, and email remain in the checkout frame. The parent receives only the documented callback fields. Payment is simulated in the browser; there is no processor or server.
- The demo site's callback log shows each SDK callback as it fires. A second open() call focuses the existing iframe instead of creating another checkout.

## Test cards

| Card number | Result |
| --- | --- |
| 4242 4242 4242 4242 | Payment succeeds and returns a session ID |
| 4000 0000 0000 0002 | Payment is declined; checkout stays open for another card |
| 4000 0000 0000 0341 | First attempt reports a temporary failure; retry succeeds |

These are local fake-payment outcomes. Never enter real card information.

## Decisions

1. **Isolated iframe instead of rendering checkout in the merchant DOM.** It keeps card inputs out of the host document and gives the checkout independent styling. The sandbox uses an opaque origin; the SDK checks the frame window and a unique channel ID for messages.
2. **Keep payment errors recoverable in place.** A decline or simulated interruption leaves the checkout open, explains what happened, confirms no payment was completed, and lets the customer retry. The merchant still receives an error callback without receiving payment fields.

## What I would explore next

- Serve the checkout on a dedicated origin with a restrictive Content Security Policy and test real cross-site deployment behavior.
- Add automated browser coverage for keyboard/focus behavior, frame load failures, repeated opens, and all three test cards.
- Replace the fake card form with a payment provider's hosted fields/tokenization and server-verified payment sessions.
- Add a real product catalog and localized currency/tax calculation instead of the demo's fixed products and 9% tax.

## Deployment

The demo can be hosted as a static Vite site. Build with npm run build and deploy the full dist/ directory. The checkout's sandboxed module assets need Access-Control-Allow-Origin: * so the opaque-origin iframe can load them; Vite dev and preview already serve that header. A public live link still needs to be created by deploying these files to a hosting provider.
