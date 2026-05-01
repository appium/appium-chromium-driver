/**
 * Determine if the given browser name corresponds to Microsoft Edge.
 * 'MicrosoftEdge' is old format. Newer MSEdge accepts 'msedge' only as the browser name.
 * @param browserName The name of the browser.
 * @returns True if the browser is Microsoft Edge, false otherwise.
 */
export function isMsEdge(browserName?: string): boolean {
  return /^(MicrosoftEdge|msedge)$/i.test(browserName ?? '');
}
