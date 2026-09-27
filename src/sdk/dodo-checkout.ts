export type CheckoutCloseReason = "customer" | "escape";
export type CheckoutError = { code: string; message: string };
export type CheckoutOptions = {
    productId: string;
    size?: string;
    color?: string;
    quantity?: number;
    onSuccess: (result: { sessionId: string }) => void;
    onClose?: (result: { reason: CheckoutCloseReason }) => void;
    onError?: (error: CheckoutError) => void;
};
export type CheckoutHandle = { close: () => void };

type CheckoutMessage = {
    source: "dodo-checkout";
    channelId: string;
    type: "ready" | "success" | "close" | "error";
    sessionId?: string;
    reason?: CheckoutCloseReason | "completed";
    code?: string;
    message?: string;
};

declare global {
    interface Window {
        DodoCheckout: { open: (options: CheckoutOptions) => CheckoutHandle };
    }
}

let active:
    | {
          overlay: HTMLDivElement;
          frame: HTMLIFrameElement;
          options: CheckoutOptions;
          channelId: string;
          onMessage: (event: MessageEvent) => void;
          onKeyDown: (event: KeyboardEvent) => void;
          previousOverflow: string;
          readyTimer: number;
          previousFocus: HTMLElement | null;
          succeeded: boolean;
      }
    | undefined;

function randomId() {
    return (
        globalThis.crypto?.randomUUID?.() ??
        "dodo_" + Date.now() + "_" + Math.random().toString(36).slice(2)
    );
}

const sdkScript = document.currentScript as HTMLScriptElement | null;
const sdkOrigin = sdkScript?.src
    ? new URL(sdkScript.src, window.location.href).origin
    : window.location.origin;

function scriptUrl() {
    return new URL("/", sdkOrigin);
}

function closeActive(reason: CheckoutCloseReason | "completed", notify = true) {
    if (!active) return;
    const current = active;
    active = undefined;
    window.removeEventListener("message", current.onMessage);
    window.removeEventListener("keydown", current.onKeyDown);
    window.clearTimeout(current.readyTimer);
    current.overlay.remove();
    document.documentElement.style.overflow = current.previousOverflow;
    current.previousFocus?.focus();
    if (notify && !current.succeeded && reason !== "completed")
        current.options.onClose?.({ reason });
}

function open(options: CheckoutOptions): CheckoutHandle {
    if (active) {
        active.frame.focus();
        return { close: () => closeActive("customer") };
    }
    if (!options.productId?.trim()) {
        options.onError?.({
            code: "invalid_product",
            message: "A productId is required to open checkout.",
        });
        return { close: () => undefined };
    }

    const sdkUrl = scriptUrl();
    const checkoutOrigin = sdkUrl.origin;
    const checkoutUrl = new URL("/", checkoutOrigin);
    checkoutUrl.searchParams.set("dodo-checkout", "1");
    checkoutUrl.searchParams.set("productId", options.productId);
    if (options.size) checkoutUrl.searchParams.set("size", options.size);
    if (options.color) checkoutUrl.searchParams.set("color", options.color);
    if (options.quantity)
        checkoutUrl.searchParams.set("quantity", String(options.quantity));
    checkoutUrl.searchParams.set("parentOrigin", window.location.origin);
    const channelId = randomId();
    checkoutUrl.searchParams.set("channelId", channelId);

    const overlay = document.createElement("div");
    overlay.className = "dodo-checkout-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Secure checkout");
    overlay.setAttribute("aria-busy", "true");
    overlay.tabIndex = -1;
    Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "2147483000",
        display: "grid",
        placeItems: "center",
        padding: "20px",
        background: "rgba(16, 26, 21, .58)",
        backdropFilter: "blur(4px)",
        animation: "dodo-fade-in 160ms ease-out",
    });

    const frame = document.createElement("iframe");
    frame.title = "Dodo secure checkout";
    frame.src = checkoutUrl.toString();
    frame.setAttribute("sandbox", "allow-scripts allow-forms allow-modals");
    frame.setAttribute("allow", "payment");
    frame.referrerPolicy = "strict-origin";
    Object.assign(frame.style, {
        width: "min(100%, 1020px)",
        height: "min(660px, 90dvh)",
        border: "0",
        borderRadius: "12px",
        background: "#f7f8f6",
        boxShadow: "0 24px 90px rgba(0,0,0,.24)",
        visibility: "hidden",
    });
    const loading = document.createElement("div");
    loading.setAttribute("role", "status");
    loading.setAttribute("aria-label", "Opening secure checkout");
    Object.assign(loading.style, {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "68px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "7px",
        borderRadius: "24px",
        background: "#fff",
        boxShadow: "0 8px 28px rgba(0,0,0,.18)",
    });
    for (let index = 0; index < 3; index += 1) {
        const dot = document.createElement("span");
        dot.setAttribute("aria-hidden", "true");
        Object.assign(dot.style, {
            width: "12px",
            height: "12px",
            flex: "none",
            borderRadius: "50%",
            background: "#173d32",
            animation: `dodo-pulse 900ms ease-in-out ${index * 140}ms infinite`,
        });
        loading.append(dot);
    }
    overlay.append(loading);
    overlay.append(frame);

    const onMessage = (event: MessageEvent) => {
        if (event.source !== frame.contentWindow) return;
        if (event.origin !== checkoutOrigin && event.origin !== "null") return;
        const message = event.data as Partial<CheckoutMessage> | null;
        if (
            !message ||
            message.source !== "dodo-checkout" ||
            message.channelId !== channelId
        )
            return;
        if (active?.succeeded && message.type !== "close") return;
        if (message.type === "ready") {
            if (active?.channelId === channelId) {
                window.clearTimeout(active.readyTimer);
                frame.style.visibility = "visible";
                loading.remove();
                overlay.setAttribute("aria-busy", "false");
            }
        } else if (message.type === "success" && message.sessionId) {
            if (active?.channelId !== channelId) return;
            active.succeeded = true;
            options.onSuccess({ sessionId: message.sessionId });
        } else if (message.type === "close") {
            closeActive(
                message.reason === "escape"
                    ? "escape"
                    : message.reason === "completed"
                      ? "completed"
                      : "customer",
                message.reason !== "completed",
            );
        } else if (message.type === "error") {
            options.onError?.({
                code: message.code ?? "checkout_error",
                message: message.message ?? "Checkout encountered an error.",
            });
        }
    };
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            event.preventDefault();
            frame.contentWindow?.postMessage(
                { source: "dodo-host", channelId, type: "request-close" },
                "*",
            );
        }
    };
    const onLoadError = () => {
        options.onError?.({
            code: "checkout_unavailable",
            message:
                "Checkout could not be loaded. Check your connection and try again.",
        });
        closeActive("customer", false);
    };
    frame.addEventListener("error", onLoadError, { once: true });
    const readyTimer = window.setTimeout(() => {
        if (active?.channelId !== channelId) return;
        options.onError?.({
            code: "checkout_timeout",
            message:
                "Checkout took too long to load. Check your connection and try again.",
        });
        closeActive("customer", false);
    }, 12000);
    active = {
        overlay,
        frame,
        options,
        channelId,
        onMessage,
        onKeyDown,
        previousOverflow: document.documentElement.style.overflow,
        readyTimer,
        previousFocus:
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null,
        succeeded: false,
    };
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKeyDown);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay)
            frame.contentWindow?.postMessage(
                { source: "dodo-host", channelId, type: "request-close" },
                "*",
            );
    });
    overlay.addEventListener("keydown", (event) => {
        if (event.key === "Tab") {
            event.preventDefault();
            frame.focus();
        }
    });
    document.body.append(overlay);
    frame.focus();
    return { close: () => closeActive("customer") };
}

const sdkStyles = document.createElement("style");
sdkStyles.textContent =
    "@keyframes dodo-fade-in{from{opacity:0}to{opacity:1}}@keyframes dodo-pulse{0%,60%,100%{transform:scale(.72);opacity:.45}30%{transform:scale(1);opacity:1}}@media(max-width:600px){.dodo-checkout-overlay{padding:0!important;overflow:hidden!important}.dodo-checkout-overlay iframe{width:100vw!important;max-width:100vw!important;height:100dvh!important;max-height:100dvh!important;border-radius:0!important}}";
document.head.append(sdkStyles);

window.DodoCheckout = { open };
