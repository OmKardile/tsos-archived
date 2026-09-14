declare module 'express' {
  import { IncomingMessage, ServerResponse } from 'http';
  import { Server as HttpServer } from 'http';
  import { Server as HttpsServer } from 'https';
  import { ParsedUrlQuery } from 'querystring';

  export interface Request extends IncomingMessage {
    params: Record<string, string>;
    query: ParsedUrlQuery;
    body: any;
    app: any;
    protocol: string;
    get(name: string): string | undefined;
    path: string;
    hostname: string;
    ip: string;
    ips: string[];
    secure: boolean;
    xhr: boolean;
    cookies: Record<string, string>;
    signedCookies: Record<string, string>;
    stale: boolean;
    fresh: boolean;
    id: string;
  }

  export interface Response extends ServerResponse {
    status(code: number): Response;
    json(body: any): Response;
    send(body: any): Response;
    redirect(url: string): void;
    redirect(status: number, url: string): void;
    render(view: string, locals?: any): void;
    sendFile(path: string): void;
    set(header: string, value: string): void;
    header(name: string, value: string): Response;
    type(type: string): Response;
    download(path: string, filename?: string): void;
    cookie(name: string, val: string, options?: any): Response;
    clearCookie(name: string, options?: any): Response;
    format(obj: any): Response;
    attachment(filename?: string): Response;
    append(field: string, value: string | string[]): Response;
    locals: Record<string, any>;
  }

  export interface NextFunction {
    (err?: any): void;
  }

  export interface Handler {
    (req: Request, res: Response, next: NextFunction): void;
  }

  export interface ErrorRequestHandler {
    (err: any, req: Request, res: Response, next: NextFunction): void;
  }

  export interface Router {
    get(path: string, ...handlers: Handler[]): Router;
    post(path: string, ...handlers: Handler[]): Router;
    put(path: string, ...handlers: Handler[]): Router;
    patch(path: string, ...handlers: Handler[]): Router;
    delete(path: string, ...handlers: Handler[]): Router;
    use(...handlers: Handler[]): Router;
    use(path: string, ...handlers: Handler[]): Router;
    route(path: string): any;
  }

  export interface Application {
    get(setting: string): any;
    set(setting: string, val: any): Application;
    engine(ext: string, fn: Function): Application;
    render(view: string, locals?: any, callback?: Function): void;
    use(...handlers: any[]): Application;
    use(path: string, ...handlers: any[]): Application;
    get(path: string, ...handlers: Handler[]): Application;
    post(path: string, ...handlers: Handler[]): Application;
    put(path: string, ...handlers: Handler[]): Application;
    patch(path: string, ...handlers: Handler[]): Application;
    delete(path: string, ...handlers: Handler[]): Application;
    listen(port: number, callback?: Function): HttpServer;
    route(path: string): any;
    Router(): Router;
    locals: Record<string, any>;
    mountpath: string;
    on(event: string, listener: Function): Application;
    emit(event: string, ...args: any[]): boolean;
  }

  export function express(): Application;
  export function Router(): Router;

  export default express;
}

declare module 'cors' {
  import { Request, Response, NextFunction } from 'express';

  interface CorsOptions {
    origin?: string | string[] | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
  }

  function cors(options?: CorsOptions): (req: Request, res: Response, next: NextFunction) => void;
  export default cors;
}
