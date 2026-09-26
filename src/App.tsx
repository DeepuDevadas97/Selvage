import { useEffect, useRef, useState } from "react";
import "./Demo.css";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { products } from "./data/products";
import type { CheckoutError, CheckoutOptions } from "./sdk/dodo-checkout";
import CheckoutApp from "./CheckoutApp";

type LogEntry = {
    id: number;
    time: string;
    kind: "system" | "success" | "error" | "close";
    title: string;
    detail?: string;
};

function App() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("dodo-checkout") === "1") {
        const parentOrigin = params.get("parentOrigin") ?? "";
        let safeOrigin = "";
        try {
            safeOrigin = new URL(parentOrigin).origin;
        } catch {
            /* invalid origin stays empty */
        }
        return (
            <CheckoutApp
                productId={params.get("productId") ?? ""}
                channelId={params.get("channelId") ?? ""}
                parentOrigin={safeOrigin}
                size={params.get("size") ?? undefined}
                color={params.get("color") ?? undefined}
                quantity={Number(params.get("quantity")) || 1}
            />
        );
    }
    return <DemoSite />;
}

function DemoSite() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const selectedProduct = "prod_123";
    const [size, setSize] = useState("Medium");
    const [color, setColor] = useState("Beige");
    const [quantity, setQuantity] = useState(1);
    const logId = useRef(0);
    const [sdkReady, setSdkReady] = useState(false);
    const [sdkError, setSdkError] = useState("");
    const addLog = (kind: LogEntry["kind"], title: string, detail?: string) => {
        const time = new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }).format(new Date());
        const id = ++logId.current;
        setLogs((entries) =>
            [{ id, time, kind, title, detail }, ...entries].slice(0, 8),
        );
    };
    useEffect(() => {
        import("./sdk/dodo-checkout")
            .then(() => setSdkReady(true))
            .catch(() =>
                setSdkError(
                    "Checkout could not be initialized. Reload the page to try again.",
                ),
            );
    }, []);

    useEffect(() => {
        const elements = Array.from(
            document.querySelectorAll<HTMLElement>("[data-scroll-reveal]"),
        );
        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        if (reducedMotion || !("IntersectionObserver" in window)) {
            elements.forEach((element) =>
                element.classList.add("scroll-reveal-visible"),
            );
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("scroll-reveal-visible");
                    observer.unobserve(entry.target);
                });
            },
            { threshold: 0.20, rootMargin: "0px 0px -32px 0px" },
        );

        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, []);

    const product = products[selectedProduct];
    const buy = () => {
        const options: CheckoutOptions = {
            productId: selectedProduct,
            size,
            color,
            quantity,
            onSuccess: ({ sessionId }) =>
                addLog("success", "onSuccess fired", "sessionId: " + sessionId),
            onClose: ({ reason }) =>
                addLog("close", "onClose fired", "reason: " + reason),
            onError: ({ code, message }: CheckoutError) =>
                addLog("error", "onError fired", code + ": " + message),
        };
        if (!sdkReady) return;
        window.DodoCheckout.open(options);
        addLog(
            "system",
            "DodoCheckout.open() called",
            "productId: " + selectedProduct,
        );
    };

    return (
        <div className="demo-shell min-h-screen flex flex-col justify-between">
            <main className="demo-main">
                <div className="demo-banner px-2 md:px-4 xl:px-6">
                    <Header />
                    <div className="demo-topline">
                        <span className="demo-pill">
                            <span /> LIVE DEMO
                        </span>
                    </div>
                    <section className="demo-hero" data-scroll-reveal>
                        <div className="demo-copy">
                            <p className="eyebrow">
                                Considered design, made to last
                            </p>
                            <h1>
                                Carry what matters.
                                <br />
                                Keep it <em>forever.</em>
                            </h1>
                            <p className="demo-lede">
                                Explore a leather essential, then check out
                                securely without leaving the store.
                            </p>
                            <div className="demo-proof">
                                <span className="proof-avatars">
                                    <i>N</i>
                                    <i>J</i>
                                    <i>M</i>
                                </span>
                                <span>Thoughtfully made for everyday</span>
                            </div>
                        </div>
                        <div className="demo-art" aria-hidden="true"></div>
                    </section>
                </div>

                <section className="demo-content">
                    <div className="demo-product-card" data-scroll-reveal>
                        <div className="demo-product-image">
                            <img
                                className="!object-bottom"
                                src={
                                    product.colors.find(
                                        (option) => option.name === color,
                                    )?.image ?? product.gallery[0].src
                                }
                                alt={color + " " + product.name}
                            />
                        </div>
                        <div className="demo-product-details flex flex-col justify-between">
                            <div>
                                <div className="product-overline">
                                    {product.category}
                                </div>
                                <h2>{product.name}</h2>
                                <p className="text-sm max-w-90 text-gray-600 mt-3">
                                    {product.description}
                                </p>
                                <div className="demo-product-price border-b border-b-gray-200 pb-3">
                                    <strong>
                                        {"$" + product.amount.toFixed(2)}
                                    </strong>
                                    <span className="demo-tax-note">
                                        Taxes at checkout
                                    </span>
                                </div>
                                <div className="demo-variant">
                                    <div className="demo-variant-heading">
                                        <span>
                                            Choose a size{" "}
                                            <strong>{size}</strong>
                                        </span>
                                    </div>
                                    <div
                                        className="demo-sizes"
                                        role="group"
                                        aria-label="Choose a size"
                                    >
                                        {product.sizes.map((value) => (
                                            <button
                                                type="button"
                                                key={value}
                                                className={
                                                    size === value
                                                        ? "selected"
                                                        : ""
                                                }
                                                aria-pressed={size === value}
                                                onClick={() => setSize(value)}
                                            >
                                                {value}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="demo-variant">
                                    <div className="demo-variant-heading">
                                        <span>
                                            Choose a color{" "}
                                            <strong>{color}</strong>
                                        </span>
                                    </div>
                                    <div
                                        className="demo-colors"
                                        role="group"
                                        aria-label="Choose a color"
                                    >
                                        {product.colors.map((value) => (
                                            <button
                                                type="button"
                                                key={value.name}
                                                className={
                                                    color === value.name
                                                        ? "selected"
                                                        : ""
                                                }
                                                aria-label={value.name}
                                                aria-pressed={
                                                    color === value.name
                                                }
                                                onClick={() =>
                                                    setColor(value.name)
                                                }
                                            >
                                                <span
                                                    style={{
                                                        backgroundColor:
                                                            value.value,
                                                    }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="demo-select-row demo-quantity border-t border-t-gray-200 pt-3">
                                    <label htmlFor="quantity">Quantity</label>
                                    <div>
                                        <button
                                            type="button"
                                            aria-label="Decrease quantity"
                                            disabled={quantity <= 1}
                                            onClick={() =>
                                                setQuantity((value) =>
                                                    Math.max(1, value - 1),
                                                )
                                            }
                                        >
                                            −
                                        </button>
                                        <output
                                            id="quantity"
                                            aria-live="polite"
                                        >
                                            {quantity}
                                        </output>
                                        <button
                                            type="button"
                                            aria-label="Increase quantity"
                                            disabled={quantity >= 9}
                                            onClick={() =>
                                                setQuantity((value) =>
                                                    Math.min(9, value + 1),
                                                )
                                            }
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <button
                                    type="button"
                                    className="demo-buy-button mt-5"
                                    onClick={buy}
                                    disabled={!sdkReady}
                                >
                                    {sdkReady
                                        ? "Buy now · " +
                                          "$" +
                                          (product.amount * quantity).toFixed(2)
                                        : "Loading secure checkout…"}{" "}
                                    <span>→</span>
                                </button>
                                <div className="demo-secure">
                                    <span>◈</span> Card details are isolated ·
                                    demo mode
                                </div>
                            </div>
                            {sdkError && (
                                <p role="alert" className="sdk-load-error">
                                    {sdkError}
                                </p>
                            )}
                        </div>
                    </div>

                    <aside className="demo-side" data-scroll-reveal>
                        <section
                            className="callback-panel"
                            aria-labelledby="callback-title"
                        >
                            <div className="callback-header">
                                <div>
                                    <p className="eyebrow">Developer console</p>
                                    <h2 id="callback-title !text-[16px]">
                                        Callback log
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLogs([])}
                                    disabled={logs.length === 0}
                                >
                                    Clear
                                </button>
                            </div>
                            <p className="callback-subtitle">
                                See what the host page receives. Card details
                                stay inside checkout.
                            </p>
                            <div
                                className="callback-list"
                                role="log"
                                aria-live="polite"
                                aria-relevant="additions text"
                            >
                                {logs.length === 0 ? (
                                    <div className="callback-empty">
                                        <span className="empty-icon">⌁</span>
                                        <strong>
                                            Waiting for your first checkout
                                        </strong>
                                        <small>Click “Buy now” to begin.</small>
                                    </div>
                                ) : (
                                    logs.map((entry) => (
                                        <article
                                            className={
                                                "callback-entry " + entry.kind
                                            }
                                            key={entry.id}
                                        >
                                            <div className="callback-entry-top">
                                                <span className="callback-dot" />
                                                <strong>{entry.title}</strong>
                                                <time>{entry.time}</time>
                                            </div>
                                            {entry.detail && (
                                                <code>{entry.detail}</code>
                                            )}
                                        </article>
                                    ))
                                )}
                            </div>
                            <div className="sdk-snippet">
                                <div>
                                    <span className="snippet-language">
                                        TYPESCRIPT
                                    </span>
                                    <span>YOUR STORE CALLS</span>
                                </div>
                                <pre>
                                    <code>
                                        {'DodoCheckout.open({\n  productId: "' +
                                            selectedProduct +
                                            '",\n  onSuccess: ({ sessionId }) => {},\n  onClose: ({ reason }) => {},\n  onError: ({ code, message }) => {},\n});'}
                                    </code>
                                </pre>
                            </div>
                        </section>
                        <section className="test-cards">
                            <p className="eyebrow">Try the test cards</p>
                            <div>
                                <span className="test-indicator good">✓</span>
                                <code>4242 4242 4242 4242</code>
                                <small>Success</small>
                            </div>
                            <div>
                                <span className="test-indicator bad">×</span>
                                <code>4000 0000 0000 0002</code>
                                <small>Declines</small>
                            </div>
                            <div>
                                <span className="test-indicator retry">↻</span>
                                <code>4000 0000 0000 0341</code>
                                <small>Retry once</small>
                            </div>
                            <p>
                                Use any future expiry date, any name, and any
                                3-digit CVC.
                            </p>
                        </section>
                    </aside>
                </section>
            </main>
            <Footer />
        </div>
    );
}

export default App;
