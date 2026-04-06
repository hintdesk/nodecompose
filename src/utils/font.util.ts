export interface FontConfig {
  FontFamily: string
  FontSize: number
}

export function getFontConfig(): FontConfig {
  const platform = navigator.userAgent.toLowerCase()

  if (platform.includes('mac')) {
    return {
      FontFamily: "Menlo, Monaco, 'Courier New', monospace",
      FontSize: 12,
    }
  }

  if (platform.includes('linux')) {
    return {
      FontFamily: "Droid Sans Mono, 'Courier New', monospace",
      FontSize: 14,
    }
  }

  return {
    FontFamily: "Consolas, 'Courier New', monospace",
    FontSize: 14,
  }
}