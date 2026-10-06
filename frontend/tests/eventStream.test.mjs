import assert from 'node:assert/strict'
import test from 'node:test'
import { readEventStream } from '../src/api/eventStream.js'

function streamedResponse(text, chunkSize = 1) {
  const bytes = new TextEncoder().encode(text)
  let offset = 0
  return new Response(new ReadableStream({
    pull(controller) {
      if (offset === bytes.length) return controller.close()
      controller.enqueue(bytes.slice(offset, offset + chunkSize))
      offset = Math.min(offset + chunkSize, bytes.length)
    },
  }))
}

test('handles split UTF-8, CRLF, heartbeats, and multiple events', async () => {
  const response = streamedResponse(': ping\r\n\r\nevent: progress\r\ndata: {"text":"résumé"}\r\n\r\nevent: complete\r\ndata: {"report":"done"}\r\n\r\n')
  const events = []
  await readEventStream(response, (type, data) => events.push({ type, data }))
  assert.deepEqual(events, [
    { type: 'progress', data: { text: 'résumé' } },
    { type: 'complete', data: { report: 'done' } },
  ])
})

test('stops reading after a terminal event', async () => {
  const response = streamedResponse('event: complete\ndata: {}\n\nevent: progress\ndata: {}\n\n', 100)
  const events = []
  await readEventStream(response, (type) => { events.push(type); return false })
  assert.deepEqual(events, ['complete'])
})

test('handles a final event without a trailing separator', async () => {
  const events = []
  await readEventStream(streamedResponse('event: error\ndata: {"detail":"failed"}'), (type, data) => events.push([type, data]))
  assert.deepEqual(events, [['error', { detail: 'failed' }]])
})

test('rejects malformed stream data instead of silently hanging', async () => {
  await assert.rejects(readEventStream(streamedResponse('event: complete\ndata: broken\n\n'), () => {}), SyntaxError)
})
