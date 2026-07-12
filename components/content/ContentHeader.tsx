import Link from "next/link";

const NAV_ITEMS = [
  { href: "/philosophy", label: "Philosophy" },
  { href: "/house-rules", label: "House Rules" },
  { href: "/faqs", label: "FAQs" },
];

interface ContentHeaderProps {
  active?: "philosophy" | "house-rules" | "faqs";
}

export function ContentHeader({ active }: ContentHeaderProps) {
  return (
    <header className="tcr-header">
      <Link href="/app" className="tcr-logo">
        <img
          src="/connection-room-logo.svg"
          alt="The Connection Room"
          className="tcr-logo__image"
        />
      </Link>
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
