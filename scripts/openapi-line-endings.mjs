export const canonicalizeLf = (buf) =>
  Buffer.from(buf.toString('utf8').replaceAll('\r\n', '\n'), 'utf8');
