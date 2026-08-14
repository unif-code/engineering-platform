export const canonicalizeLf = (buf) => {
  let firstCrLf = -1;
  for (let index = 0; index < buf.length - 1; index += 1) {
    if (buf[index] === 0x0d && buf[index + 1] === 0x0a) {
      firstCrLf = index;
      break;
    }
  }
  if (firstCrLf === -1) return buf;

  const normalized = Buffer.allocUnsafe(buf.length);
  normalized.set(buf.subarray(0, firstCrLf));
  let writeIndex = firstCrLf;
  for (let readIndex = firstCrLf; readIndex < buf.length; readIndex += 1) {
    if (buf[readIndex] === 0x0d && buf[readIndex + 1] === 0x0a) {
      normalized[writeIndex] = 0x0a;
      writeIndex += 1;
      readIndex += 1;
    } else {
      normalized[writeIndex] = buf[readIndex];
      writeIndex += 1;
    }
  }
  return normalized.subarray(0, writeIndex);
};
