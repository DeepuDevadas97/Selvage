import type { Product } from "../data/products";

type OrderSummaryProps = {
    total: number;
    tax: number;
    product: Product;
    quantity: number;
    size: string;
    color: string;
};

export default function OrderSummary({
    total,
    tax,
    product,
    quantity,
    size,
    color,
}: OrderSummaryProps) {
    const productImage =
        product.colors.find((option) => option.name === color)?.image ??
        product.gallery[0].src;

    return (
        <aside className="order-panel" aria-label="Order summary">
            <div className="order-heading">
                <h2>Order summary</h2>
                <span className="demo-order-label">DEMO ORDER</span>
            </div>
            <div className="product-row">
                <div className="product-art">
                    <img src={productImage} alt={color + " " + product.name} />
                </div>
                <div className="product-info">
                    <strong>{product.name}</strong>
                    <span>
                        {color} · {size}
                    </span>
                    <span className="product-renew">Quantity: {quantity}</span>
                </div>
                <strong className="product-price">
                    ${(product.amount * quantity).toFixed(2)}
                </strong>
            </div>
            <div className="order-divider" />
            <div className="price-row">
                <span>Subtotal</span>
                <span>${(product.amount * quantity).toFixed(2)}</span>
            </div>
            <div className="price-row">
                <span>
                    Tax <span className="tax-region">(9%)</span>
                </span>
                <span>${tax.toFixed(2)}</span>
            </div>
            <div className="order-divider compact" />
            <div className="price-row total-row">
                <strong>Total due today</strong>
                <strong>
                    ${total.toFixed(2)} <small>USD</small>
                </strong>
            </div>
            <div className="renewal-note">
                <span className="renewal-icon">↻</span>
                <p>
                    <strong>Demo payment only.</strong>
                    <br />
                    No real charge or subscription will be created.
                </p>
            </div>
            <div className="trust-row">
                <span className="trust-check">✓</span>
                <span>30-day money-back guarantee</span>
            </div>
            <div className="trust-row">
                <span className="trust-check">✓</span>
                <span>Instant access after checkout</span>
            </div>
            <div className="support-note">
                Need a hand?{" "}
                <a href="mailto:support@selvage.example">Contact support</a>
            </div>
        </aside>
    );
}
