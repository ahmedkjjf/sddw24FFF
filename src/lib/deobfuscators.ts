import pako from 'pako';
import { ObfuscatorType, DeobfuscationResult } from '../types';

/**
 * Zlib Decompression
 */
function decompressZlib(input: string): string {
  try {
    // Try to convert string to Uint8Array. 
    // If it looks like hex, hex-decode first. 
    // If it's a binary string, convert carefully.
    let uint8: Uint8Array;
    
    if (/^[0-9a-fA-F]+$/.test(input.replace(/\s/g, ''))) {
      const hex = input.replace(/\s/g, '');
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
      }
      uint8 = bytes;
    } else {
      const bytes = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i++) {
        bytes[i] = input.charCodeAt(i);
      }
      uint8 = bytes;
    }
    
    const decompressed = pako.inflate(uint8);
    return new TextDecoder().decode(decompressed);
  } catch (e) {
    throw new Error('فشل فك ضغط Zlib. تأكد من أن البيانات صحيحة.');
  }
}

/**
 * GSC Extraction (CoD Scripts)
 * Often contains a GSC header followed by Zlib data.
 */
function decompressGSC(input: string): string {
  try {
    // Look for Zlib header (0x78 0xDA or 0x78 0x9C or 0x78 0x01)
    // Sometimes it's raw binary, sometimes hex.
    let bytes: Uint8Array;
    
    if (/^[0-9a-fA-F\s]+$/.test(input.replace(/GSC[\s\S]*?\n/, ''))) {
      const hex = input.replace(/GSC[\s\S]*?\n/, '').replace(/\s/g, '');
      bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
      }
    } else {
      // Find start of Zlib block
      const zlibStart = input.indexOf('\x78\xDA');
      const start = zlibStart !== -1 ? zlibStart : input.indexOf('\x78\x9C');
      
      if (start === -1) {
        // Just try to inflate the whole thing if no header found
        const b = new Uint8Array(input.length);
        for (let i = 0; i < input.length; i++) b[i] = input.charCodeAt(i);
        bytes = b;
      } else {
        const sub = input.substring(start);
        bytes = new Uint8Array(sub.length);
        for (let i = 0; i < sub.length; i++) bytes[i] = sub.charCodeAt(i);
      }
    }

    const decompressed = pako.inflate(bytes);
    return new TextDecoder().decode(decompressed);
  } catch (e) {
    // If Zlib fails, it might be raw GSC. In that case, just return input or throw.
    return input; 
  }
}

/**
 * Base64 Decoding
 */
function decodeBase64(input: string): string {
  try {
    return atob(input.trim());
  } catch (e) {
    throw new Error('فشل فك تشفير Base64. تأكد من أن النص صحيح.');
  }
}

/**
 * Hex Decoding
 */
function decodeHex(input: string): string {
  try {
    const hex = input.replace(/\s/g, '').replace(/0x/g, '');
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  } catch (e) {
    throw new Error('فشل فك تشفير Hex. تأكد من أن القيمة المدخلة صحيحة.');
  }
}

/**
 * Simple Lua/JS Beautifier cleanup
 * Handles escaped chars like \61 or \x61
 */
function cleanupCode(input: string): string {
  // Convert \ decimal escapes like \65 -> 'A'
  let result = input.replace(/\\(\d{2,3})/g, (match, digit) => {
    const charCode = parseInt(digit, 10);
    return charCode < 256 ? String.fromCharCode(charCode) : match;
  });

  // Convert \x hex escapes like \x41 -> 'A'
  result = result.replace(/\\x([0-9A-Fa-f]{2})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // Convert \u unicode escapes like \u0041 -> 'A'
  result = result.replace(/\\u([0-9A-Fa-f]{4})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  return result;
}

export async function deobfuscate(type: ObfuscatorType, content: string): Promise<DeobfuscationResult> {
  const originalLength = content.length;
  
  try {
    let result = '';
    
    switch (type) {
      case 'Base64':
        result = decodeBase64(content);
        break;
      case 'Hex-Enc':
        result = decodeHex(content);
        break;
      case 'Zlib':
        result = decompressZlib(content);
        break;
      case 'GSC':
        result = decompressGSC(content);
        break;
      case 'Bytecode':
      case 'Asset':
        // For Bytecode and Asset, we pass the content directly to AI
        // as physical reconstruction requires the full context provided to Gemini.
        result = content;
        break;
      case 'Luraph':
      case 'MoonSec':
      case 'IronBrew':
      case 'Xenon':
      case 'PS-Obf':
      case 'Synapse':
      case 'Aclat':
      case 'Ganlv':
      case 'XOR':
        // For these, we apply general cleanup and beautification
        result = cleanupCode(content);
        break;
      default:
        result = content;
    }

    return {
      content: result,
      type,
      success: true,
      metadata: {
        type,
        originalLength,
        resultLength: result.length
      }
    };
  } catch (error: any) {
    return {
      content: '',
      type,
      success: false,
      message: error.message
    };
  }
}

export function detectObfuscator(content: string): ObfuscatorType | null {
  const low = content.toLowerCase();
  
  // Luraph Patterns
  if (low.includes('luraph') || low.includes('lph!') || content.includes('LPH_') || content.includes('Luraph_')) return 'Luraph';
  
  // MoonSec Patterns - often uses _MOONSEC_ or specific headers
  if (low.includes('moonsec') || low.includes('msec') || content.includes('_MOONSEC_')) return 'MoonSec';
  
  // IronBrew Patterns
  if (low.includes('ironbrew') || low.includes('brew') || content.includes('IB_')) return 'IronBrew';
  
  // Xenon Patterns
  if (low.includes('xenon') || content.includes('XENON_')) return 'Xenon';
  
  // PS-Obf Patterns
  if (low.includes('ps-obf') || content.includes('ps_obf')) return 'PS-Obf';
  
  // Synapse / Aclat Patterns
  if (low.includes('synapse') || content.includes('SYN_')) return 'Synapse';
  if (low.includes('aclat')) return 'Aclat';
  if (low.includes('ganlv') || low.includes('lua-simple-encrypt') || low.includes('bxor')) return 'Ganlv';
  if (low.includes('xor') || (low.includes('bit') && low.includes('bxor')) || (low.includes('string.byte') && low.includes('string.char') && low.includes('^'))) return 'XOR';

  // Check for common FiveM Lua obfuscation patterns (Large tables of numbers/strings)
  const luaTablePattern = /local\s+\w+\s*=\s*{\s*(\d+|0x[0-9a-fA-F]+)\s*(,\s*(\d+|0x[0-9a-fA-F]+))*\s*}/;
  if (luaTablePattern.test(content) && content.length > 500) {
    // If it's a huge table and doesn't match others, likely IronBrew or similar
    return 'IronBrew'; 
  }

  // Generic Lua VM patterns (often found in Luraph/MoonSec)
  if (content.includes('load(string.dump(function()')) return 'MoonSec';

  // Base64 check: must be long enough and match charset
  if (content.length > 20 && /^[A-Za-z0-9+/=]{20,}$/.test(content.trim().replace(/\s/g, ''))) {
    return 'Base64';
  }
  
  // Hex check
  const hexClean = content.replace(/0x/g, '').replace(/\s/g, '');
  if (hexClean.length > 20 && /^[0-9a-fA-F]{20,}$/.test(hexClean)) {
    return 'Hex-Enc';
  }

  return null;
}

export function extractTriggers(content: string): string[] {
  const triggers: Set<string> = new Set();
  
  // Look for TriggerServerEvent, TriggerClientEvent, etc.
  const triggerRegex = /Trigger(Server|Client)?Event(Internal)?\s*\(\s*['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = triggerRegex.exec(content)) !== null) {
    // If it's a specific trigger, add it with its prefix
    if (match[3]) {
      const type = match[1] || 'Server';
      triggers.add(`${type}: ${match[3]}`);
    }
  }
  
  // Also catch generic RegisterNetEvent hooks which often point to where data is coming in
  const eventHookRegex = /RegisterNetEvent\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = eventHookRegex.exec(content)) !== null) {
    if (match[1]) triggers.add(`Hook: ${match[1]}`);
  }
  
  return Array.from(triggers);
}
