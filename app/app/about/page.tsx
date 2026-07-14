import { Card } from "@/components/Card";

const LINKS = [
  {
    href: "/philosophy",
    label: "Philosophy",
    description: "Why this space exists, and what we believe about men, touch, and connection.",
  },
  {
    href: "/house-rules",
    label: "House Rules",
    description: "How we hold this space together, and what we ask of each other.",
  },
  {
    href: "/brand-vision",
    label: "Brand Vision",
    description: "The vision behind The Connection Room brand.",
  },
  {
    href: "https://www.trevorjamesla.com/terms-of-service",
    label: "Terms of Service",
    description: "The legal terms that govern using The Connection Room.",
  },
  {
    href: "https://www.trevorjamesla.com/privacy-policy",
    label: "Privacy Policy",
    description: "How your information is collected, used, and protected.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-[#1a0f0a]">About</h1>
        <p className="text-[#a0704a] mt-1">
          The philosophy, rules, and legal terms behind The Connection Room.
        </p>
      </div>

      <div className="space-y-3">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-[#1a0f0a]">{link.label}</h2>
                  <p className="text-sm text-[#a0704a] mt-1">{link.description}</p>
                </div>
                <span className="text-[#d4a348] text-xl flex-shrink-0">&rarr;</span>
              </div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
