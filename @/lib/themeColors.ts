Make sure to export getScrollbarColor function or move it above the usage in layout.tsx. Alternatively, you may create a minimal stub like this:

export function getScrollbarColor(themeColor: string): string {
  return 'currentColor';
}