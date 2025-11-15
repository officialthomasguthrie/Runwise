declare module "ogl" {
  export class Renderer {
    gl: WebGLRenderingContext;
    dpr: number;
    constructor(options?: Record<string, unknown>);
    getContext(): WebGLRenderingContext;
    render(params?: Record<string, unknown>): void;
    setSize(width: number, height: number): void;
  }

  export class Program {
    constructor(gl: WebGLRenderingContext, options?: Record<string, unknown>);
  }

  export class Triangle {
    constructor(gl: WebGLRenderingContext, options?: Record<string, unknown>);
  }

  export class Mesh {
    constructor(gl: WebGLRenderingContext, options?: Record<string, unknown>);
    setParent(node: unknown): void;
  }
}

