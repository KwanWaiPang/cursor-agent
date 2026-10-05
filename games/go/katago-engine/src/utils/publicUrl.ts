/** WASM files are copied to katago/tfjs/, one level above the built worker. */
export function publicUrl(_path: string): string {
  return new URL("../tfjs/", import.meta.url).href;
}
