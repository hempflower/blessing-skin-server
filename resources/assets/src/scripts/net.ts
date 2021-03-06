import Vue from 'vue'
import { emit } from './event'
import { queryStringify } from './utils'
import { showAjaxError } from './notify'

class HTTPError extends Error {
  response: Response

  constructor(message: string, response: Response) {
    super(message)
    this.response = response
  }
}

const empty = Object.create(null)
export const init: RequestInit = {
  credentials: 'same-origin',
  headers: new Headers({
    Accept: 'application/json',
  }),
}

function retrieveToken() {
  const csrfField: HTMLMetaElement | null = document.querySelector('meta[name="csrf-token"]')
  return (csrfField && csrfField.content) || ''
}

export async function walkFetch(request: Request): Promise<any> {
  request.headers.set('X-CSRF-TOKEN', retrieveToken())

  try {
    const response = await fetch(request)
    if (response.ok) {
      return response.headers.get('Content-Type') === 'application/json'
        ? response.json()
        : response.text()
    }

    // Process validation errors from Laravel.
    if (response.status === 422) {
      const { errors }: {
        message: string,
        errors: { [field: string]: string[] }
      } = await response.json()
      return {
        errno: 1,
        msg: Object.keys(errors).map(field => errors[field][0])[0],
      }
    }

    const res = response.clone()
    throw new HTTPError(await response.text(), res)
  } catch (error) {
    emit('fetchError', error)
    showAjaxError(error)
  }
}

export function get(url: string, params = empty): Promise<any> {
  emit('beforeFetch', {
    method: 'GET',
    url,
    data: params,
  })

  const qs = queryStringify(params)

  return walkFetch(new Request(`${blessing.base_url}${url}${qs && `?${qs}`}`, init))
}

export function post(url: string, data = empty): Promise<any> {
  emit('beforeFetch', {
    method: 'POST',
    url,
    data,
  })

  const isFormData = data instanceof FormData

  const request = new Request(`${blessing.base_url}${url}`, {
    body: isFormData ? data : JSON.stringify(data),
    method: 'POST',
    ...init,
  })
  !isFormData && request.headers.set('Content-Type', 'application/json')

  return walkFetch(request)
}

Vue.use(_Vue => {
  Object.defineProperty(_Vue.prototype, '$http', {
    get: () => ({ get, post }),
  })
})

blessing.fetch = { get, post }
