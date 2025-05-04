// Este arquivo contém polyfills necessários para bibliotecas Node.js no navegador

// Polyfill para o objeto global
if (typeof window !== 'undefined') {
  (window as any).global = window;
}

// Polyfill para process.nextTick
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = { 
    nextTick: (fn: Function) => setTimeout(fn, 0),
    env: {}
  };
}

// Polyfill para o objeto Buffer
if (typeof window !== 'undefined' && !(window as any).Buffer) {
  (window as any).Buffer = {
    isBuffer: () => false
  };
}

export default {};