export const getMeshStyle = (themeColor: string) => {
  const gradient = COLOR_MAP[themeColor];
  if (!gradient) {
    throw new Error('Invalid theme color: ${themeColor}');
  }
  // ... rest of the function
}