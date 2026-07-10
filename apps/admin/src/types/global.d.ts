// react-router-dom v6 + @types/react@18.3 compatibility shim.
// @types/react@18.3 made ReactPortal.children required, which breaks RRD's
// component return types. Making it optional restores the pre-18.3 behaviour.
import 'react';

declare module 'react' {
  interface ReactPortal {
    children?: ReactNode;
  }
}
