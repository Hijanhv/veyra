export const SONICSCAN_BASE = 'https://sonicscan.org'

export function sonicscanAddressUrl(address: string) {
  return `${SONICSCAN_BASE}/address/${address}`
}

export function sonicscanTxUrl(tx: string) {
  return `${SONICSCAN_BASE}/tx/${tx}`
}

