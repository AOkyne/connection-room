import Link from "next/link";

const NAV_ITEMS = [
  { href: "/philosophy", label: "Philosophy" },
  { href: "/house-rules", label: "House Rules" },
  { href: "/faqs", label: "FAQs" },
  { href: "/brand-vision", label: "Brand Vision" },
];

interface ContentHeaderProps {
  active?: "philosophy" | "house-rules" | "faqs" | "brand-vision";
}

export function ContentHeader({ active }: ContentHeaderProps) {
  return (
    <header className="tcr-header">
      <div className="tcr-logo">
        <Link href="/app" className="tcr-back">
          &larr; Back
        </Link>
        <Link href="/app">
          <img
            src="/connection-room-logo.svg"
            alt="The Connection Room"
            className="tcr-logo__image"
          />
        </Link>
      </div>
      <nav className="tcr-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={active === item.href.slice(1) ? "is-active" : ""}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
