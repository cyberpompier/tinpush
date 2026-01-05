// Manually declare types since vite/client might be missing in the environment
// /// <reference types="vite/client" />

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

declare module '*.bmp' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  [key: string]: string | boolean | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Augment the global ProcessEnv interface to include our environment variables.
// This avoids redeclaring 'process' which causes conflicts with @types/node.
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: string;
    readonly API_KEY?: string;
    readonly VAPID_PUBLIC_KEY?: string;
    readonly NEXT_PUBLIC_SUPABASE_URL?: string;
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    [key: string]: string | undefined;
  }
}
