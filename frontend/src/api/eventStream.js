// Consume an authenticated fetch response using the server's SSE event format.
export async function readEventStream(response, onEvent) {
  if (!response.body) throw new Error('The server did not return a stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  function dispatch(block) {
    let type = 'message';
    const data = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) type = line.slice(6).trim();
      if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    if (!data.length) return true; // Ignore heartbeat comments.
    return onEvent(type, JSON.parse(data.join('\n'))) !== false;
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop();
      for (const block of blocks) {
        if (!dispatch(block)) return;
      }
      if (done) {
        if (buffer.trim()) dispatch(buffer);
        return;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
