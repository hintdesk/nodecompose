export const urlUtil = {
  async normalizeUrl(url: string): Promise<string> {
    return url.endsWith('/') ? url.slice(0, -1) : url
  }
}


