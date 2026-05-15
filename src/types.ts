export type ObfuscatorType = 
  | 'Luraph' 
  | 'MoonSec' 
  | 'Xenon' 
  | 'IronBrew' 
  | 'PS-Obf' 
  | 'Synapse'
  | 'Aclat'
  | 'Ganlv'
  | 'XOR'
  | 'Base64' 
  | 'Hex-Enc'
  | 'Zlib'
  | 'GSC'
  | 'Bytecode'
  | 'Asset'
  | 'Protector'
  | 'VM-Obf'
  | 'K-Deobf'
  | 'Minified';

export interface DeobfuscationResult {
  content: string;
  type: ObfuscatorType;
  success: boolean;
  message?: string;
  metadata?: {
    type: string;
    originalLength: number;
    resultLength: number;
  };
}
