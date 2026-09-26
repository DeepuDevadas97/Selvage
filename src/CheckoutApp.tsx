import { useEffect, useRef, useState, type FormEvent } from "react";
import "./App.css";
import "./Product.css";
import Footer from "./components/Footer";
import Header from "./components/Header";
import OrderSummary from "./components/OrderSummary";
import ProductDetails from "./components/ProductDetails";
import { getProduct } from "./data/products";

type FormErrors = {
    email?: string;
    name?: string;
    number?: string;
    expiry?: string;
    cvc?: string;
};
type Status = "ready" | "processing" | "success" | "error";
type Stage = "product" | "payment";
type CheckoutProps = {
    productId: string;
    channelId: string;
    parentOrigin: string;
    size?: string;
    color?: string;
    quantity?: number;
};

const formatCard = (value: string) =>
    value
        .replace(/\D/g, "")
        .slice(0, 16)
        .replace(/(.{4})/g, "$1 ")
        .trim();

function CheckoutApp({
    productId,
    channelId,
    parentOrigin,
    size: initialSize,
    color: initialColor,
    quantity: initialQuantity = 1,
}: CheckoutProps) {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [number, setNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvc, setCvc] = useState("");
    const [errors, setErrors] = useState<FormErrors>({});
    const [status, setStatus] = useState<Status>("ready");
    const [stage, setStage] = useState<Stage>("payment");
    const [failureCode, setFailureCode] = useState("");
    const [showCvc, setShowCvc] = useState(false);
    const [selectedSize, setSelectedSize] = useState(initialSize ?? "Medium");
    const [selectedColor, setSelectedColor] = useState(initialColor ?? "Beige");
    const [quantity, setQuantity] = useState(
        Math.min(9, Math.max(1, initialQuantity)),
    );
    const [cartCount, setCartCount] = useState(0);
    const retryFailed = useRef(false);
    const product = getProduct(productId);

    const subtotal = (product?.amount ?? 0) * quantity;
    const tax = subtotal * 0.09;
    const total = subtotal + tax;
    const sendToHost = (message: Record<string, string>) => {
        if (!channelId || !parentOrigin) return;
        window.parent.postMessage(
            { source: "dodo-checkout", channelId, ...message },
            parentOrigin,
        );
    };
    useEffect(() => {
        sendToHost({ type: "ready" });
        if (!getProduct(productId))
            sendToHost({
                type: "error",
                code: "invalid_product",
                message: "This product is not available for checkout.",
            });
        const onHostMessage = (event: MessageEvent) => {
            if (event.source !== window.parent || event.origin !== parentOrigin)
                return;
            const message = event.data;
            if (
                message?.source === "dodo-host" &&
                message.channelId === channelId &&
                message.type === "request-close"
            ) {
                sendToHost({ type: "close", reason: "customer" });
            }
        };
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape")
                sendToHost({ type: "close", reason: "escape" });
            if (event.key === "Tab") {
                const focusable = Array.from(
                    document.querySelectorAll<HTMLElement>(
                        'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
                    ),
                );
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first?.focus();
                }
            }
        };
        window.addEventListener("message", onHostMessage);
        window.addEventListener("keydown", onEscape);
        document.getElementById("email")?.focus();
        return () => {
            window.removeEventListener("message", onHostMessage);
            window.removeEventListener("keydown", onEscape);
        };
    }, [channelId, parentOrigin, productId]);
    useEffect(() => {
        if (stage === "payment")
            requestAnimationFrame(() =>
                document.getElementById("email")?.focus(),
            );
    }, [stage]);
    const validate = () => {
        const next: FormErrors = {};
        if (!/^\S+@\S+\.\S+$/.test(email.trim()))
            next.email = "Enter a valid email address.";
        if (name.trim().length < 2) next.name = "Enter the name on your card.";
        if (number.replace(/\D/g, "").length !== 16)
            next.number = "Enter a 16-digit card number.";
        const match = expiry
            .replace(/\s/g, "")
            .match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
        if (!match) next.expiry = "Use MM / YY.";
        else {
            const month = Number(match[1]);
            const year = 2000 + Number(match[2]);
            const now = new Date();
            if (
                year < now.getFullYear() ||
                (year === now.getFullYear() && month < now.getMonth() + 1)
            )
                next.expiry = "This card has expired.";
        }
        if (!/^\d{3,4}$/.test(cvc)) next.cvc = "Enter a valid security code.";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const pay = (event: FormEvent) => {
        event.preventDefault();
        if (status === "processing") return;
        if (!validate()) return;
        setStatus("processing");
        window.setTimeout(() => {
            const digits = number.replace(/\D/g, "");
            if (digits === "4000000000000002") {
                setFailureCode("payment_declined");
                setStatus("error");
                sendToHost({
                    type: "error",
                    code: "payment_declined",
                    message: "The test card was declined. Try another card.",
                });
            } else if (digits === "4000000000000341" && !retryFailed.current) {
                retryFailed.current = true;
                setFailureCode("temporary_failure");
                setStatus("error");
                sendToHost({
                    type: "error",
                    code: "temporary_failure",
                    message:
                        "The payment could not be confirmed. Retry this test card to complete the payment.",
                });
            } else if (
                digits === "4242424242424242" ||
                (digits === "4000000000000341" && retryFailed.current)
            ) {
                setStatus("success");
                const sessionId =
                    globalThis.crypto?.randomUUID?.() ?? "sess_" + Date.now();
                sendToHost({ type: "success", sessionId });
            } else {
                setFailureCode("unsupported_test_card");
                setStatus("error");
                sendToHost({
                    type: "error",
                    code: "unsupported_test_card",
                    message: "Use one of the test cards listed below.",
                });
            }
        }, 1000);
    };

    const reset = () => {
        setStatus("ready");
        setErrors({});
        setFailureCode("");
    };
    if (!product)
        return (
            <main className="page-shell">
                <Header
                    onClose={() =>
                        sendToHost({ type: "close", reason: "customer" })
                    }
                />
                <section className="checkout-main checkout-unavailable">
                    <div className="error-mark">!</div>
                    <h1>Product unavailable</h1>
                    <p>
                        This product is not available for checkout. Return to
                        the store and try again.
                    </p>
                    <button
                        className="primary-button"
                        onClick={() =>
                            sendToHost({ type: "close", reason: "customer" })
                        }
                    >
                        Return to store
                    </button>
                </section>
                <Footer />
            </main>
        );

    if (stage === "product")
        return (
            <main className="page-shell product-checkout-shell">
                <Header
                    onClose={() =>
                        sendToHost({ type: "close", reason: "customer" })
                    }
                />
                <ProductDetails
                    product={product}
                    size={selectedSize}
                    color={selectedColor}
                    quantity={quantity}
                    cartCount={cartCount}
                    onSizeChange={setSelectedSize}
                    onColorChange={setSelectedColor}
                    onQuantityChange={setQuantity}
                    onAddToCart={() =>
                        setCartCount((count) => count + quantity)
                    }
                    onBuyNow={() => {
                        setStage("payment");
                        reset();
                    }}
                />
                <Footer />
            </main>
        );

    return (
        <main className="page-shell">
            <Header
                onClose={() =>
                    sendToHost({ type: "close", reason: "customer" })
                }
            />

            <div className="checkout-layout">
                <section
                    className="checkout-main"
                    aria-labelledby="checkout-title"
                >
                    <div className="breadcrumb">
                        <span>Store</span>
                        <span className="crumb-chevron">›</span>
                        <span>Product</span>
                        <span className="crumb-chevron">›</span>
                        <span className="current">Payment</span>
                    </div>
                    <div className="heading-row">
                        <div>
                            <h1 id="checkout-title">Checkout</h1>
                            <p className="subheading">
                                Complete your purchase securely.
                            </p>
                        </div>
                        <span className="step-badge">
                            <span>2</span> of 2
                        </span>
                    </div>

                    {status === "success" ? (
                        <section className="success-card" aria-live="polite">
                            <div className="success-icon">✓</div>
                            <p className="eyebrow">Demo payment complete</p>
                            <h2>You’re all set.</h2>
                            <p>
                                The test payment for <strong>{email}</strong>{" "}
                                succeeded. No real charge was made. Your{" "}
                                {product.name} is ready to preview.
                            </p>
                            <div className="success-details">
                                <span>
                                    Test amount · {quantity}{" "}
                                    {quantity === 1 ? "item" : "items"}
                                </span>
                                <strong>{"$" + total.toFixed(2)} USD</strong>
                            </div>
                            <button
                                className="primary-button"
                                onClick={() =>
                                    sendToHost({
                                        type: "close",
                                        reason: "completed",
                                    })
                                }
                            >
                                Return to store <span>→</span>
                            </button>
                        </section>
                    ) : (
                        <>
                            <section className="section-block">
                                <div className="section-heading">
                                    <span className="section-number">01</span>
                                    <h2>Contact information</h2>
                                </div>
                                <label className="field-label" htmlFor="email">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    className={errors.email ? "invalid" : ""}
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setErrors((v) => ({
                                            ...v,
                                            email: undefined,
                                        }));
                                    }}
                                    aria-invalid={!!errors.email}
                                    aria-describedby={
                                        errors.email ? "email-error" : undefined
                                    }
                                />
                                {errors.email && (
                                    <span
                                        id="email-error"
                                        className="field-error"
                                    >
                                        {errors.email}
                                    </span>
                                )}
                                <p className="field-hint">
                                    Your receipt and account details will be
                                    sent here.
                                </p>
                            </section>

                            <section className="section-block payment-block">
                                <div className="section-heading">
                                    <span className="section-number">02</span>
                                    <h2>Payment method</h2>
                                    <div
                                        className="card-brands"
                                        aria-label="Visa, Mastercard, and American Express accepted"
                                    >
                                        <span className="visa">VISA</span>
                                        <span className="mastercard">
                                            <i />
                                            <i />
                                        </span>
                                        <span className="amex">AMEX</span>
                                    </div>
                                </div>
                                <div className="payment-choice">
                                    <span className="radio-dot" />
                                    <span>Credit or debit card</span>
                                    <span className="card-glyph">▰</span>
                                </div>
                                <form onSubmit={pay} noValidate>
                                    <label
                                        className="field-label"
                                        htmlFor="card-number"
                                    >
                                        Card number
                                    </label>
                                    <div
                                        className={`input-with-icon ${errors.number ? "invalid" : ""}`}
                                    >
                                        <input
                                            id="card-number"
                                            inputMode="numeric"
                                            autoComplete="cc-number"
                                            placeholder="1234  5678  9012  3456"
                                            value={number}
                                            onChange={(e) => {
                                                setNumber(
                                                    formatCard(e.target.value),
                                                );
                                                setErrors((v) => ({
                                                    ...v,
                                                    number: undefined,
                                                }));
                                            }}
                                            aria-invalid={!!errors.number}
                                            aria-describedby={
                                                errors.number
                                                    ? "number-error"
                                                    : undefined
                                            }
                                        />
                                        <span className="card-field-icon">
                                            ▰
                                        </span>
                                    </div>
                                    {errors.number && (
                                        <span
                                            id="number-error"
                                            className="field-error"
                                        >
                                            {errors.number}
                                        </span>
                                    )}
                                    <label
                                        className="field-label name-label"
                                        htmlFor="card-name"
                                    >
                                        Name on card
                                    </label>
                                    <input
                                        id="card-name"
                                        autoComplete="cc-name"
                                        placeholder="Full name as it appears on card"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            setErrors((v) => ({
                                                ...v,
                                                name: undefined,
                                            }));
                                        }}
                                        aria-invalid={!!errors.name}
                                    />
                                    {errors.name && (
                                        <span className="field-error">
                                            {errors.name}
                                        </span>
                                    )}
                                    <div className="split-fields">
                                        <div>
                                            <label
                                                className="field-label"
                                                htmlFor="expiry"
                                            >
                                                Expiration date
                                            </label>
                                            <input
                                                id="expiry"
                                                inputMode="numeric"
                                                autoComplete="cc-exp"
                                                placeholder="MM / YY"
                                                value={expiry}
                                                onChange={(e) => {
                                                    const digits =
                                                        e.target.value
                                                            .replace(/\D/g, "")
                                                            .slice(0, 4);
                                                    setExpiry(
                                                        digits.length > 2
                                                            ? `${digits.slice(0, 2)} / ${digits.slice(2)}`
                                                            : digits,
                                                    );
                                                    setErrors((v) => ({
                                                        ...v,
                                                        expiry: undefined,
                                                    }));
                                                }}
                                                aria-invalid={!!errors.expiry}
                                            />
                                            {errors.expiry && (
                                                <span className="field-error">
                                                    {errors.expiry}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <label
                                                className="field-label"
                                                htmlFor="cvc"
                                            >
                                                Security code
                                            </label>
                                            <div
                                                className={`input-with-icon ${errors.cvc ? "invalid" : ""}`}
                                            >
                                                <input
                                                    id="cvc"
                                                    inputMode="numeric"
                                                    autoComplete="cc-csc"
                                                    type={
                                                        showCvc
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    placeholder="CVC"
                                                    value={cvc}
                                                    onChange={(e) => {
                                                        setCvc(
                                                            e.target.value
                                                                .replace(
                                                                    /\D/g,
                                                                    "",
                                                                )
                                                                .slice(0, 4),
                                                        );
                                                        setErrors((v) => ({
                                                            ...v,
                                                            cvc: undefined,
                                                        }));
                                                    }}
                                                    aria-invalid={!!errors.cvc}
                                                />
                                                <button
                                                    type="button"
                                                    className="cvc-help"
                                                    aria-label={
                                                        showCvc
                                                            ? "Hide security code"
                                                            : "Show security code"
                                                    }
                                                    onClick={() =>
                                                        setShowCvc(!showCvc)
                                                    }
                                                >
                                                    ?
                                                </button>
                                            </div>
                                            {errors.cvc && (
                                                <span className="field-error">
                                                    {errors.cvc}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {status === "error" && (
                                        <div
                                            className="payment-error"
                                            role="alert"
                                        >
                                            <span className="error-mark">
                                                !
                                            </span>
                                            <div>
                                                <strong>
                                                    {failureCode ===
                                                    "payment_declined"
                                                        ? "Your card was declined."
                                                        : failureCode ===
                                                            "temporary_failure"
                                                          ? "The connection interrupted your payment."
                                                          : "We couldn’t use that test card."}
                                                </strong>
                                                <p>
                                                    {failureCode ===
                                                    "temporary_failure"
                                                        ? "No payment was completed. Try again with the same card."
                                                        : "Your card wasn’t charged. Check the number or try another card."}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={reset}
                                                aria-label="Dismiss payment error"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        className="primary-button pay-button"
                                        type="submit"
                                        disabled={status === "processing"}
                                    >
                                        {status === "processing" ? (
                                            <>
                                                <span className="spinner" />{" "}
                                                Processing securely…
                                            </>
                                        ) : (
                                            <>
                                                Pay ${total.toFixed(2)}{" "}
                                                <span>→</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                                <p className="security-note">
                                    <span>◈</span> Card details stay here and
                                    are never shared with the store.
                                </p>
                            </section>
                            <div className="terms-note">
                                By completing your purchase, you agree to our{" "}
                                <a href="#terms">Terms of Service</a> and{" "}
                                <a href="#privacy">Privacy Policy</a>.
                            </div>
                        </>
                    )}
                </section>

                <OrderSummary
                    total={total}
                    product={product}
                    tax={tax}
                    quantity={quantity}
                    size={selectedSize}
                    color={selectedColor}
                />
            </div>
            <Footer />
        </main>
    );
}

export default CheckoutApp;
