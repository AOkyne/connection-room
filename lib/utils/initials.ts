// Generate initials from a name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Generate a consistent color from a name
export function getInitialColor(name: string): string {
  const colors = [
    '#d4a348', // Primary gold
    '#8b6f47', // Dark gold
    '#c97a2a', // Green
    '#a84a2a', // Rust
    '#1a0f0a', // Dark brown
    '#a0704a', // Taupe
  ];

  // Use string hash to consistently map names to colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  return colors[Math.abs(hash) % colors.length];
}
