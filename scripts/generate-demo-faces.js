#!/usr/bin/env node

/**
 * Generate realistic demo member face images
 * Creates diverse, representative avatars for the Community Room demo
 */

const fs = require("fs");
const path = require("path");

// Create demo members directory if it doesn't exist
const demoDir = path.join(__dirname, "../public/demo-members");
if (!fs.existsSync(demoDir)) {
  fs.mkdirSync(demoDir, { recursive: true });
}

// Diverse demo member profiles with face descriptions
const demoMembers = [
  {
    id: "marcus-h",
    name: "Marcus",
    lastName: "Harrison",
    skinTone: "#d4a574",
    hairColor: "#2a2a2a",
    eyeColor: "#4a5f3f",
    style: "warm",
  },
  {
    id: "daniel-r",
    name: "Daniel",
    lastName: "Rodriguez",
    skinTone: "#c9956d",
    hairColor: "#1a1a1a",
    eyeColor: "#6b4423",
    style: "friendly",
  },
  {
    id: "james-t",
    name: "James",
    lastName: "Thompson",
    skinTone: "#e8b4a0",
    hairColor: "#3a2a1a",
    eyeColor: "#5a6b7a",
    style: "thoughtful",
  },
  {
    id: "alex-m",
    name: "Alex",
    lastName: "Martinez",
    skinTone: "#d9a584",
    hairColor: "#2a1a1a",
    eyeColor: "#4a4a4a",
    style: "approachable",
  },
  {
    id: "chris-w",
    name: "Chris",
    lastName: "Williams",
    skinTone: "#f5d5c0",
    hairColor: "#8a7a6a",
    eyeColor: "#6b8a9a",
    style: "open",
  },
  {
    id: "jordan-k",
    name: "Jordan",
    lastName: "Kim",
    skinTone: "#e8c4a0",
    hairColor: "#1a1a1a",
    eyeColor: "#3a3a3a",
    style: "gentle",
  },
  {
    id: "david-l",
    name: "David",
    lastName: "Lee",
    skinTone: "#d4a878",
    hairColor: "#0a0a0a",
    eyeColor: "#5a4a3a",
    style: "warm",
  },
  {
    id: "ryan-p",
    name: "Ryan",
    lastName: "Parker",
    skinTone: "#f0d5c8",
    hairColor: "#6a5a4a",
    eyeColor: "#8a7a6a",
    style: "bright",
  },
  {
    id: "sammy-c",
    name: "Sammy",
    lastName: "Chen",
    skinTone: "#e0c4a8",
    hairColor: "#1a1a1a",
    eyeColor: "#4a3a2a",
    style: "thoughtful",
  },
  {
    id: "noah-g",
    name: "Noah",
    lastName: "Garcia",
    skinTone: "#d4a574",
    hairColor: "#2a2a2a",
    eyeColor: "#6b5a4a",
    style: "gentle",
  },
  {
    id: "ethan-b",
    name: "Ethan",
    lastName: "Brown",
    skinTone: "#e8b4a0",
    hairColor: "#4a3a2a",
    eyeColor: "#7a6a5a",
    style: "warm",
  },
  {
    id: "liam-s",
    name: "Liam",
    lastName: "Santos",
    skinTone: "#c9956d",
    hairColor: "#1a1a1a",
    eyeColor: "#5a5a5a",
    style: "open",
  },
  {
    id: "mason-h",
    name: "Mason",
    lastName: "Hamilton",
    skinTone: "#e0c4a8",
    hairColor: "#3a2a1a",
    eyeColor: "#6b5a4a",
    style: "approachable",
  },
  {
    id: "lucas-j",
    name: "Lucas",
    lastName: "Johnson",
    skinTone: "#f5d5c0",
    hairColor: "#7a6a5a",
    eyeColor: "#8a7a6a",
    style: "bright",
  },
  {
    id: "oliver-f",
    name: "Oliver",
    lastName: "Foster",
    skinTone: "#d4a878",
    hairColor: "#2a2a2a",
    eyeColor: "#4a5a6a",
    style: "thoughtful",
  },
  {
    id: "aiden-n",
    name: "Aiden",
    lastName: "Nelson",
    skinTone: "#e8c4a0",
    hairColor: "#1a1a1a",
    eyeColor: "#5a4a3a",
    style: "gentle",
  },
  {
    id: "isaac-b",
    name: "Isaac",
    lastName: "Bryant",
    skinTone: "#f0d5c8",
    hairColor: "#5a4a3a",
    eyeColor: "#7a6a5a",
    style: "warm",
  },
  {
    id: "michael-p",
    name: "Michael",
    lastName: "Price",
    skinTone: "#d9a584",
    hairColor: "#2a2a2a",
    eyeColor: "#6b5a4a",
    style: "open",
  },
  {
    id: "william-r",
    name: "William",
    lastName: "Ross",
    skinTone: "#e0c4a8",
    hairColor: "#3a2a1a",
    eyeColor: "#5a5a5a",
    style: "approachable",
  },
  {
    id: "benjamin-m",
    name: "Benjamin",
    lastName: "Mitchell",
    skinTone: "#c9956d",
    hairColor: "#1a1a1a",
    eyeColor: "#4a4a4a",
    style: "thoughtful",
  },
  {
    id: "jacob-d",
    name: "Jacob",
    lastName: "Davidson",
    skinTone: "#e8b4a0",
    hairColor: "#2a2a2a",
    eyeColor: "#6b5a4a",
    style: "gentle",
  },
  {
    id: "henry-c",
    name: "Henry",
    lastName: "Cooper",
    skinTone: "#f5d5c0",
    hairColor: "#7a6a5a",
    eyeColor: "#8a7a6a",
    style: "bright",
  },
  {
    id: "tyler-w",
    name: "Tyler",
    lastName: "Wilson",
    skinTone: "#d4a574",
    hairColor: "#2a2a2a",
    eyeColor: "#5a6a7a",
    style: "warm",
  },
  {
    id: "gabriel-h",
    name: "Gabriel",
    lastName: "Harrison",
    skinTone: "#e8c4a0",
    hairColor: "#1a1a1a",
    eyeColor: "#4a3a2a",
    style: "open",
  },
];

// Generate SVG avatar for each member
function generateFaceAvatar(member) {
  const svg = `<svg width="400" height="500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
    <!-- Background -->
    <rect width="400" height="500" fill="#f0e8e0"/>

    <!-- Head -->
    <ellipse cx="200" cy="200" rx="90" ry="110" fill="${member.skinTone}"/>

    <!-- Hair -->
    <path d="M 110 150 Q 110 80 200 60 Q 290 80 290 150" fill="${member.hairColor}"/>

    <!-- Left ear -->
    <ellipse cx="110" cy="190" rx="25" ry="35" fill="${member.skinTone}"/>
    <ellipse cx="115" cy="195" rx="12" ry="20" fill="${member.skinTone}" opacity="0.7"/>

    <!-- Right ear -->
    <ellipse cx="290" cy="190" rx="25" ry="35" fill="${member.skinTone}"/>
    <ellipse cx="285" cy="195" rx="12" ry="20" fill="${member.skinTone}" opacity="0.7"/>

    <!-- Eyes -->
    <ellipse cx="160" cy="180" rx="18" ry="22" fill="white"/>
    <ellipse cx="240" cy="180" rx="18" ry="22" fill="white"/>
    <circle cx="160" cy="185" r="12" fill="${member.eyeColor}"/>
    <circle cx="240" cy="185" r="12" fill="${member.eyeColor}"/>
    <circle cx="163" cy="182" r="5" fill="white" opacity="0.8"/>
    <circle cx="243" cy="182" r="5" fill="white" opacity="0.8"/>

    <!-- Eyebrows -->
    <path d="M 140 150 Q 160 140 180 150" stroke="${member.hairColor}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M 220 150 Q 240 140 260 150" stroke="${member.hairColor}" stroke-width="5" fill="none" stroke-linecap="round"/>

    <!-- Nose -->
    <line x1="200" y1="180" x2="200" y2="230" stroke="${member.skinTone}" stroke-width="3" opacity="0.3"/>
    <path d="M 195 230 L 200 235 L 205 230" fill="${member.skinTone}" opacity="0.3"/>

    <!-- Mouth -->
    <path d="M 160 270 Q 200 310 240 270" stroke="#a0625a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 160 270 Q 200 305 240 270" fill="#d4856a" opacity="0.3"/>

    <!-- Facial shadow (cheekbones) -->
    <ellipse cx="130" cy="220" rx="20" ry="30" fill="#000" opacity="0.05"/>
    <ellipse cx="270" cy="220" rx="20" ry="30" fill="#000" opacity="0.05"/>

    <!-- Neck -->
    <rect x="180" y="300" width="40" height="60" fill="${member.skinTone}"/>

    <!-- Shoulders (simple representation) -->
    <ellipse cx="200" cy="380" rx="120" ry="80" fill="${member.skinTone}"/>

    <!-- Shirt/clothing -->
    <path d="M 80 360 L 120 380 L 280 380 L 320 360 Z" fill="#4a5f6a"/>
  </svg>`;

  return svg;
}

// Generate all face images
console.log(`Generating ${demoMembers.length} demo member face images...`);

demoMembers.forEach((member) => {
  const svg = generateFaceAvatar(member);
  const filename = `${member.id}.svg`;
  const filepath = path.join(demoDir, filename);

  fs.writeFileSync(filepath, svg);
  console.log(`✓ Generated ${filename}`);
});

console.log(`\nSuccessfully created ${demoMembers.length} demo member faces in ${demoDir}`);
console.log("\nDemo members:");
demoMembers.forEach((m) => {
  console.log(`  - ${m.name} ${m.lastName} (${m.id}.svg)`);
});
