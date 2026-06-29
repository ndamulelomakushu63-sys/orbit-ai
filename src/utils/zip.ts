// Pure TypeScript ZIP compiler to package and export the Expo React Native project
// This operates completely on the client-side for immediate, fast, and offline-ready downloads.

function crc32(bytes: Uint8Array): number {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

interface ZipFile {
  name: string;
  content: string | Uint8Array;
}

export function generateZip(files: ZipFile[]): Uint8Array {
  const textEncoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralDirectoryHeaders: Uint8Array[] = [];
  let currentOffset = 0;

  const fileDataList = files.map(file => {
    const nameBytes = textEncoder.encode(file.name);
    const contentBytes = typeof file.content === 'string' ? textEncoder.encode(file.content) : file.content;
    const crc = crc32(contentBytes);
    return {
      name: file.name,
      nameBytes,
      contentBytes,
      crc,
      length: contentBytes.length
    };
  });

  // Write local headers and file data
  fileDataList.forEach(file => {
    const header = new Uint8Array(30 + file.nameBytes.length);
    const view = new DataView(header.buffer);

    // Signature 0x04034b50
    view.setUint32(0, 0x04034b50, true);
    // Version needed to extract: 10
    view.setUint16(4, 10, true);
    // General purpose bit flag: 0
    view.setUint16(6, 0, true);
    // Compression method: 0 (Store / Uncompressed)
    view.setUint16(8, 0, true);
    // Last mod file time / date: 0
    view.setUint32(10, 0, true);
    // CRC-32
    view.setUint32(14, file.crc, true);
    // Compressed size
    view.setUint32(18, file.length, true);
    // Uncompressed size
    view.setUint32(22, file.length, true);
    // File name length
    view.setUint16(26, file.nameBytes.length, true);
    // Extra field length: 0
    view.setUint16(28, 0, true);

    // Copy file name bytes
    header.set(file.nameBytes, 30);

    localHeaders.push(header);
    localHeaders.push(file.contentBytes);

    // Central directory file header
    const cdHeader = new Uint8Array(46 + file.nameBytes.length);
    const cdView = new DataView(cdHeader.buffer);

    // Signature 0x02014b50
    cdView.setUint32(0, 0x02014b50, true);
    // Version made by: 20
    cdView.setUint16(4, 20, true);
    // Version needed: 10
    cdView.setUint16(6, 10, true);
    // General purpose bit flag: 0
    cdView.setUint16(8, 0, true);
    // Compression method: 0
    cdView.setUint16(10, 0, true);
    // Last mod file time / date: 0
    cdView.setUint32(12, 0, true);
    // CRC-32
    cdView.setUint32(16, file.crc, true);
    // Compressed size
    cdView.setUint32(20, file.length, true);
    // Uncompressed size
    cdView.setUint32(24, file.length, true);
    // File name length
    cdView.setUint16(28, file.nameBytes.length, true);
    // Extra field length: 0
    cdView.setUint16(30, 0, true);
    // File comment length: 0
    cdView.setUint16(32, 0, true);
    // Disk number start: 0
    cdView.setUint16(34, 0, true);
    // Internal file attributes: 0
    cdView.setUint16(36, 0, true);
    // External file attributes: 0
    cdView.setUint32(38, 0, true);
    // Local header relative offset
    cdView.setUint32(42, currentOffset, true);

    // Copy file name bytes
    cdHeader.set(file.nameBytes, 46);
    centralDirectoryHeaders.push(cdHeader);

    // Increment offset
    currentOffset += 30 + file.nameBytes.length + file.length;
  });

  // Central directory size
  const centralDirectorySize = centralDirectoryHeaders.reduce((sum, h) => sum + h.length, 0);

  // End of Central Directory
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  // Signature 0x06054b50
  eocdView.setUint32(0, 0x06054b50, true);
  // Number of this disk: 0
  eocdView.setUint16(4, 0, true);
  // Disk where CD starts: 0
  eocdView.setUint16(6, 0, true);
  // Number of CD records on this disk
  eocdView.setUint16(8, files.length, true);
  // Total number of CD records
  eocdView.setUint16(10, files.length, true);
  // Size of Central Directory
  eocdView.setUint32(12, centralDirectorySize, true);
  // Offset of start of CD
  eocdView.setUint32(16, currentOffset, true);
  // Comment length: 0
  eocdView.setUint16(20, 0, true);

  // Total byte size
  const totalSize = currentOffset + centralDirectorySize + eocd.length;
  const zipData = new Uint8Array(totalSize);

  let writeOffset = 0;
  localHeaders.forEach(block => {
    zipData.set(block, writeOffset);
    writeOffset += block.length;
  });
  centralDirectoryHeaders.forEach(block => {
    zipData.set(block, writeOffset);
    writeOffset += block.length;
  });
  zipData.set(eocd, writeOffset);

  return zipData;
}

// 1x1 Transparent PNG pixel base64 to avoid app-asset rendering errors
const transparentPixelBase64 = "iVBOR0w0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export const loadBinaryPixel = (): Uint8Array => {
  try {
    const str = transparentPixelBase64.replace(/=+$/, "");
    const len = str.length;
    const bytes = new Uint8Array(Math.floor(len * 0.75));
    const b64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    
    let buffer = 0;
    let accum = 0;
    let p = 0;
    
    for (let i = 0; i < len; i++) {
      const idx = b64Chars.indexOf(str[i]);
      if (idx === -1) continue;
      
      buffer = (buffer << 6) | idx;
      accum += 6;
      
      if (accum >= 8) {
        accum -= 8;
        bytes[p++] = (buffer >> accum) & 0xff;
      }
    }
    
    const finalBytes = bytes.slice(0, p);
    if (finalBytes.length > 0 && finalBytes[0] === 137 && finalBytes[1] === 80 && finalBytes[2] === 78) {
      return finalBytes;
    }
    throw new Error("Invalid PNG header");
  } catch (err) {
    console.warn("Fallback to raw PNG byte pixel generation:", err);
    // Ultimate, guaranteed 1x1 transparent PNG (68 bytes) to bypass any decoding issue
    return new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 15, 122,
      119, 0, 0, 0, 13, 73, 68, 65, 84, 120, 1, 99, 96, 96, 96,
      0, 0, 0, 5, 0, 1, 10, 1, 4, 14, 0, 0, 0, 0, 73,
      69, 78, 68, 174, 62, 134, 128
    ]);
  }
};

export const generatePngAsset = (width: number, height: number, type: 'icon' | 'splash' | 'favicon' | 'adaptive'): Uint8Array => {
  if (typeof document === 'undefined') {
    return loadBinaryPixel();
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return loadBinaryPixel();
    }

    if (type === 'icon') {
      // Elegant futuristic Orbit gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#020617'); // slate 950
      grad.addColorStop(0.5, '#0f172a'); // slate 900
      grad.addColorStop(1, '#1e1b4b'); // indigo 950
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw planetary orbits
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'; // sky 400
      ctx.lineWidth = width * 0.015;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width * 0.35, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(129, 140, 248, 0.3)'; // indigo 400
      ctx.lineWidth = width * 0.01;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width * 0.22, 0, Math.PI * 2);
      ctx.stroke();

      // Glowing core (Orbit AI sphere)
      const coreGrad = ctx.createRadialGradient(width/2, height/2, 2, width/2, height/2, width * 0.12);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.2, '#38bdf8');
      coreGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width * 0.12, 0, Math.PI * 2);
      ctx.fill();

      // Inner text identifier
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(width * 0.08)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('O', width / 2, height / 2);
      
    } else if (type === 'adaptive') {
      // Foreground image with transparency or solid, let's keep it beautifully styled
      ctx.fillStyle = '#0f172a'; // slate 900
      ctx.fillRect(0, 0, width, height);

      // Simple premium core representation
      ctx.strokeStyle = '#38bdf8'; // sky 400
      ctx.lineWidth = width * 0.02;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width * 0.3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#818cf8'; // indigo 400
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width * 0.1, 0, Math.PI * 2);
      ctx.fill();
      
    } else if (type === 'splash') {
      // Splash background
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Stylized orb
      const orbGrad = ctx.createRadialGradient(width/2, height * 0.45, 10, width/2, height * 0.45, width * 0.25);
      orbGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      orbGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.6)');
      orbGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.45, width * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Centered Title Text
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(width * 0.075)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ORBIT AI', width / 2, height * 0.55);

      // Centered Subtitle Text
      ctx.fillStyle = '#94a3b8'; // Slate 400
      ctx.font = `${Math.floor(width * 0.035)}px sans-serif`;
      ctx.fillText('Cloud Workspace Copilot', width / 2, height * 0.59);
      
    } else {
      // Favicon (48x48)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    const dataUrl = canvas.toDataURL('image/png');
    const base64Str = dataUrl.split(',')[1];
    
    // Custom robust base64 decoding to avoid atob issues or external dependencies
    const b64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const str = base64Str.replace(/=+$/, "");
    const len = str.length;
    const bytes = new Uint8Array(Math.floor(len * 0.75));
    let buffer = 0;
    let accum = 0;
    let p = 0;
    
    for (let i = 0; i < len; i++) {
      const idx = b64Chars.indexOf(str[i]);
      if (idx === -1) continue;
      buffer = (buffer << 6) | idx;
      accum += 6;
      if (accum >= 8) {
        accum -= 8;
        bytes[p++] = (buffer >> accum) & 0xff;
      }
    }
    
    return bytes.slice(0, p);
  } catch (err) {
    console.warn("Failed to generate canvas PNG, falling back:", err);
    return loadBinaryPixel();
  }
};
