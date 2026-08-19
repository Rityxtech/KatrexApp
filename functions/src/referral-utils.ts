/**
 * Utility for anti-fraud name matching.
 * Checks if two full names are likely the same person based on common name components.
 */
export function isPotentialSybilAttack(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;

  const normalize = (name: string) => 
    name.toLowerCase().trim().split(/\s+/).filter(part => part.length > 0);

  const parts1 = normalize(name1);
  const parts2 = normalize(name2);

  if (parts1.length === 0 || parts2.length === 0) return false;

  // 1. Exact match
  if (name1.toLowerCase().trim() === name2.toLowerCase().trim()) return true;

  // 2. Check for intersection of name parts
  const intersection = parts1.filter(part => parts2.includes(part));
  
  // If they share 2 or more name parts, it's highly likely the same person
  if (intersection.length >= 2) return true;

  // 3. Check for specific Last Name match + First/Middle match
  // Assuming last part is usually the surname
  const last1 = parts1[parts1.length - 1];
  const last2 = parts2[parts2.length - 1];
  
  if (last1 === last2) {
    // If last names match, check if any other part matches
    const other1 = parts1.slice(0, -1);
    const other2 = parts2.slice(0, -1);
    if (other1.some(part => other2.includes(part))) return true;
  }

  return false;
}
