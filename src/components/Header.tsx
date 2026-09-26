type HeaderProps = { onClose?: () => void };

export default function Header({ onClose }: HeaderProps) {
    return (
        <header className="topbar">
            <a className="brand" href="#home" aria-label="Selvage home">
                <span className="brand-mark">Se</span>
                <span>Selvage</span>
            </a>
            <div className="header-actions">
                {onClose && (
                    <button
                        type="button"
                        className="close-checkout"
                        onClick={onClose}
                        aria-label="Close checkout"
                    >
                        ×
                    </button>
                )}
                <div className="secure-label">
                    <span className="lock-icon">◈</span> Secure checkout{" "}
                    <span className="secure-divider" /> Powered by{" "}
                    <strong>dodo</strong>
                </div>
            </div>
        </header>
    );
}
