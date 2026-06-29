"use client";

import { Card } from "@/components/Card";

interface ConnectionInvitationProps {
  variant?: "reflection" | "prompt";
}

export function ConnectionInvitation({ variant = "reflection" }: ConnectionInvitationProps) {
  const prompts = {
    reflection: {
      text: "After you reflect, consider witnessing one other member.",
      ctas: [
        { label: "Reflect privately", href: "#" },
        { label: "Share in community", href: "/app/spaces/commons" },
        { label: "Witness another member", href: "/app/spaces/commons" },
      ],
    },
    prompt: {
      text: "Want to make this relational? Share your response, then leave one thoughtful comment for someone else.",
      ctas: [
        { label: "Respond to prompt", href: "#" },
        { label: "Find someone to witness", href: "/app/spaces/commons" },
      ],
    },
  };

  const content = prompts[variant];

  return (
    <Card className="bg-[#f3ede5] border-l-4 border-[#d4a348]">
      <div className="space-y-3">
        <p className="text-sm text-[#1a0f0a]">{content.text}</p>
        <div className="flex flex-wrap gap-2">
          {content.ctas.map((cta) => (
            <a
              key={cta.label}
              href={cta.href}
              className="inline-block px-3 py-2 bg-white text-[#d4a348] rounded-lg text-xs font-medium border border-[#d4a348] hover:bg-[#d4a348] hover:text-white transition-colors"
            >
              {cta.label}
            </a>
          ))}
        </div>
      </div>
    </Card>
  );
}
