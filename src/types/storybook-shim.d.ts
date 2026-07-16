// Lightweight ambient shim so *.stories.tsx compile without installing
// the full Storybook toolchain. When Storybook is added (`npx storybook init`)
// this file can be removed and the official @storybook/react types will take over.
declare module "@storybook/react" {
  import type { ComponentType, ReactElement } from "react";

  export interface Meta<T = unknown> {
    title?: string;
    component?: ComponentType<any>;
    parameters?: Record<string, unknown>;
    argTypes?: Record<string, unknown>;
    args?: Partial<T extends ComponentType<infer P> ? P : any>;
    tags?: string[];
  }

  export interface StoryObj<T = unknown> {
    args?: Partial<T extends ComponentType<infer P> ? P : any>;
    render?: (args: any) => ReactElement;
    parameters?: Record<string, unknown>;
    name?: string;
  }
}
