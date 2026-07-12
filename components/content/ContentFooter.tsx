import Link from "next/link";

interface ContentFooterProps {
  hide?: "philosophy" | "house-rules" | "faqs";
}

export function ContentFooter({ hide }: ContentFooterProps) {
  const links = [
    { href: "/app", label: "Back to Dashboard" },
    { href: "/philosophy", label: "Philosophy" },
    { href: "/house-rules", label: "House Rules" },
    { href: "/faqs", label: "FAQs" },
  ].filter((l) => l.href.slice(1) !== hide);

  return (
    <footer className="tcr-footer">
      <div className="wrap">
        {links.map((link, i) => (
          <span key={link.href}>
            {i > 0 && <>&nbsp;&middot;&nbsp;</>}
            <Link href={link.href}>{link.label}</Link>
          </span>
        ))}
      </div>
    </footer>
  );
}
