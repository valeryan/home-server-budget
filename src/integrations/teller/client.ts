/**
 * Shared Teller API client using mTLS (required for all environments including development).
 * Certs are loaded from /certs/ at the project root (volume-mounted in Docker).
 */

import fs from 'fs'
import https from 'https'
import path from 'path'

let _agent: https.Agent | null = null

export function getTellerAgent(): https.Agent {
  if (!_agent) {
    const certsDir = path.join(process.cwd(), 'certs')
    _agent = new https.Agent({
      cert: fs.readFileSync(path.join(certsDir, 'certificate.pem')),
      key: fs.readFileSync(path.join(certsDir, 'private_key.pem')),
    })
  }
  return _agent
}

export function tellerGet<T = unknown>(url: string, accessToken: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      agent: getTellerAgent(),
      headers: {
        Authorization: `Basic ${Buffer.from(`${accessToken}:`).toString('base64')}`,
        Accept: 'application/json',
      },
    }
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString()
        if ((res.statusCode ?? 0) >= 400) {
          reject(new Error(`Teller API error ${res.statusCode}: ${body}`))
        } else {
          try {
            resolve(JSON.parse(body) as T)
          } catch {
            reject(new Error(`Invalid JSON from Teller: ${body}`))
          }
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

export interface TellerBalances {
  account_id: string
  ledger: string | null
  available: string | null
}

export async function fetchTellerBalances(
  accessToken: string,
  tellerAccountId: string,
): Promise<TellerBalances> {
  return tellerGet<TellerBalances>(
    `https://api.teller.io/accounts/${tellerAccountId}/balances`,
    accessToken,
  )
}
