import Vue from 'vue'
import * as net from '@/scripts/net'
import { on } from '@/scripts/event'
import { showAjaxError } from '@/scripts/notify'

jest.mock('@/scripts/notify')

;(window as Window & { Request: any }).Request = class {
  headers: Map<string, string>

  constructor(public url: string, init: Request) {
    this.url = url
    Object.assign(this, init)
    this.headers = new Map(Object.entries(init.headers))
  }
}

test('the GET method', async () => {
  const json = jest.fn().mockResolvedValue({})
  window.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json,
    headers: new Map([['Content-Type', 'application/json']]),
  })

  const stub = jest.fn()
  on('beforeFetch', stub)

  await net.get('/abc', { a: 'b' })
  expect(stub).toBeCalledWith({
    method: 'GET',
    url: '/abc',
    data: { a: 'b' },
  })
  expect(window.fetch.mock.calls[0][0].url).toBe('/abc?a=b')
  expect(json).toBeCalled()

  await net.get('/abc')
  expect(window.fetch.mock.calls[1][0].url).toBe('/abc')
})

test('the POST method', async () => {
  window.fetch = jest.fn()
    .mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
      headers: new Map([['Content-Type', 'application/json']]),
    })

  const meta = document.createElement('meta')
  meta.name = 'csrf-token'
  meta.content = 'token'
  document.head.appendChild(meta)

  const stub = jest.fn()
  on('beforeFetch', stub)

  const formData = new FormData()
  await net.post('/abc', formData)
  expect(stub).toBeCalledWith({
    method: 'POST',
    url: '/abc',
    data: formData,
  })

  await net.post('/abc', { a: 'b' })
  expect(stub).toBeCalledWith({
    method: 'POST',
    url: '/abc',
    data: { a: 'b' },
  })
  // eslint-disable-next-line prefer-destructuring
  const request = window.fetch.mock.calls[1][0]
  expect(request.url).toBe('/abc')
  expect(request.method).toBe('POST')
  expect(request.body).toBe(JSON.stringify({ a: 'b' }))
  expect(request.headers.get('X-CSRF-TOKEN')).toBe('token')
  expect(request.headers.get('Content-Type')).toBe('application/json')

  await net.post('/abc')
  expect(window.fetch.mock.calls[2][0].body).toBe('{}')
})

test('low level fetch', async () => {
  const json = jest.fn().mockResolvedValue({})
  window.fetch = jest.fn()
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('404'),
      clone: () => ({}),
    })
    .mockResolvedValueOnce({
      ok: true,
      json,
      headers: new Map([['Content-Type', 'application/json']]),
    })
    .mockResolvedValueOnce({
      ok: true,
      headers: new Map(),
      text: () => Promise.resolve('text'),
    })

  const request: RequestInit = { headers: new Headers() }

  const stub = jest.fn()
  on('fetchError', stub)

  await net.walkFetch(request as Request)
  expect(showAjaxError.mock.calls[0][0]).toBeInstanceOf(Error)
  expect(showAjaxError.mock.calls[0][0]).toHaveProperty('message', 'network')
  expect(stub).toBeCalledWith(expect.any(Error))

  await net.walkFetch(request as Request)
  expect(showAjaxError.mock.calls[1][0]).toBeInstanceOf(Error)
  expect(stub.mock.calls[1][0]).toHaveProperty('message', '404')
  expect(stub.mock.calls[1][0]).toHaveProperty('response')

  await net.walkFetch(request as Request)
  expect(json).toBeCalled()

  expect(await net.walkFetch(request as Request)).toBe('text')
})

test('process Laravel validation errors', async () => {
  window.fetch = jest.fn().mockResolvedValue({
    status: 422,
    json() {
      return Promise.resolve({
        errors: { name: ['required'] },
      })
    },
  })

  const result: {
    errno: number,
    msg: string
  } = await net.walkFetch({ headers: new Headers() } as Request)
  expect(result.errno).toBe(1)
  expect(result.msg).toBe('required')
})

test('inject to Vue instance', () => {
  expect(typeof Vue.prototype.$http.get).toBe('function')
  expect(typeof Vue.prototype.$http.post).toBe('function')
})
