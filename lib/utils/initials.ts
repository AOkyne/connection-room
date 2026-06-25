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
    '#d4a574', // Primary gold
    '#9d7f5c', // Dark gold
    '#8fa878', // Green
    '#b86a52', // Rust
    '#6b5f52', // Dark brown
    '#a0968a', // Taupe
  ];

  // Use string hash to consistently map names to colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  return colors[Math.abs(hash) % colors.length];
}
