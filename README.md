# Dodo Checkout

Small embeddable checkout thing built for the Dodo Payments frontend assignment. Three parts — a TypeScript SDK (one file, no deps), a checkout app that runs inside an iframe, and a demo store page that pretends to be a real site using it.

## Running it

```sh
npm install
npm run dev
```

Vite will print a local URL, open that. Click "Continue to secure checkout" on the demo store and the checkout pops up in an iframe. You can type any name, any real-looking email, any future expiry date, and any 3 digit CVC — none of it goes anywhere.

To build for real:

```sh
npm run build
npm run preview
```

Output goes to `dist/`, and the actual SDK file a site would embed is at `dist/sdk/dodo-checkout.js`. Both the SDK and the checkout app need to be served from the same origin.

If some other site wanted to use this, it'd look like:

```html
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
```

Right now the SDK just points at the root path of wherever it's hosted to load the checkout — good enough for this demo, obviously wouldn't hardcode it like that for real. The demo uses `prod_123` (the Signature Crossbody bag), but the product ID always comes from whoever's calling `open()`.

## How the three pieces actually talk to each other

The SDK lives in `src/sdk/dodo-checkout.ts`. When you call `open()`, it builds one iframe, locks scrolling on the host page so the background doesn't scroll behind the modal, remembers what was focused before so it can give focus back after closing, and listens for Escape.

The checkout itself loads inside that iframe with a `dodo-checkout=1` param in the URL. I sandboxed the iframe without `allow-same-origin`, which means it gets an opaque origin — the host page literally cannot reach into its DOM even if it wanted to.

For messages between the two, each `open()` call generates its own channel id, and every incoming message gets checked against both that id and the iframe's actual window reference before it's trusted. The message types are kept small on purpose: `ready`, `success` (with a session id), `close` (with a reason), `error` (with a code + message). That's it.

Card number, CVC, expiry, email — none of that ever leaves the iframe. The parent page only ever sees what's in those four message types above. Also worth saying: there's no backend here, the "payment" is just simulated in-browser.

The demo page has a log panel that prints every callback as it fires, so you can actually see what the host page receives in real time instead of trusting me that it works. If you click Buy again while a checkout is already open, it just refocuses the existing one instead of stacking a second one.

## Test cards

| Card number | What happens |
|---|---|
| 4242 4242 4242 4242 | Goes through, returns a session id |
| 4000 0000 0000 0002 | Declines, checkout stays open so you can try another card |
| 4000 0000 0000 0341 | Fails the first time, works if you retry |

Obviously fake, don't type a real card in there.

## Two things I went back and forth on

**Iframe vs. just rendering the checkout inline in the host page's DOM.** Inline would've been less code and easier to style consistently, but it means card fields sit in the same JS context as whatever the host site is running — which felt wrong for something that's supposed to be a "secure checkout." Went with an iframe, opaque-origin sandboxed, so there's an actual boundary and not just a visual one.

**What to do when a payment fails.** My first instinct was to just fire `onError` and let the host page deal with it, but that felt like it was punting the whole problem onto someone else's page. Ended up keeping the failure inside the checkout instead — show what happened, make it clear nothing was charged, let them retry right there. The host still gets told via callback, just doesn't have to build its own retry UI for something my checkout should be handling anyway.

## If I had more time

- Actually serve the checkout on its own separate origin with a real CSP, and test it cross-site instead of same-origin like in this demo.
- Write proper tests for the annoying stuff — focus trapping, what happens if the iframe fails to load, spamming `open()`, all three card outcomes.
- Swap the fake card form for a real provider's hosted fields + server-side session verification, since right now there's zero actual security, it just looks like there is.
- Real product catalog instead of one hardcoded product, and proper currency/tax handling instead of a flat 9%.

## Deploying

It's a static Vite build so `npm run build` + drop `dist/` on any static host works. One thing to remember: the checkout's assets need `Access-Control-Allow-Origin: *` since the iframe has an opaque origin — Vite's dev/preview servers already send that header by default, just don't forget it if you move hosts. Still need to actually deploy this somewhere and grab a live link for submission.