export type ApiCallResult = {
  status: number
  ok: boolean
  body: any
}

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${__APP_CONFIG__.backendUrl}${normalized}`
}

async function parseBody(response: Response): Promise<any> {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text) as any
  } catch {
    return text
  }
}

async function sendRequest(
  url: string,
  method: string,
  api_key?: string,
  body?: unknown,
): Promise<{ status: number; ok: boolean; body: unknown }> {
  const headers = new Headers({ Accept: 'application/json' })
  if (api_key) {
    headers.set('x-api-key', `${api_key}`)
  }
  const init: RequestInit = { method, headers }
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    init.body = JSON.stringify(body)
  }

  const response = await fetch(url, init)
  return {
    status: response.status,
    ok: response.ok,
    body: await parseBody(response),
  }
}

export async function callApi(
  path: string,
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | "PATCH",
  body?: unknown,
  api_key?: string,
): Promise<ApiCallResult> {
  const request_method = method ?? 'GET'
  const url = resolveUrl(path)

  return await sendRequest(url, request_method, api_key, body)
}