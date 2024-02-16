import * as Schema from "@effect/schema/Schema"
import bodyParser from "body-parser"
import {
  Cause,
  Context,
  Data,
  Effect,
  Fiber,
  HashMap,
  Layer,
  MutableRef,
  Option,
  ReadonlyArray,
  Ref,
  Runtime,
  Supervisor
} from "effect"
import express from "express"
import type * as NodeHttp from "node:http"
import type * as NodeNet from "node:net"

// =============================================================================
// Express Integration
// =============================================================================

class Express extends Context.Tag("Express")<
  Express,
  Effect.Effect.Success<ReturnType<typeof makeExpress>>
>() {
  static Live(
    hostname: string,
    port: number
  ): Layer.Layer<Express, never, never>
  static Live<R>(
    hostname: string,
    port: number,
    exitHandler: (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => (cause: Cause.Cause<never>) => Effect.Effect<void, never, R>
  ): Layer.Layer<Express, never, R>
  static Live<R>(
    hostname: string,
    port: number,
    exitHandler?: (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => (cause: Cause.Cause<never>) => Effect.Effect<void, never, R>
  ): Layer.Layer<Express, never, R> {
    return Layer.scoped(Express, makeExpress(hostname, port, exitHandler ?? defaultExitHandler))
  }
}

export type ExitHandler<R> = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => (cause: Cause.Cause<never>) => Effect.Effect<void, never, R>

export class ServerError extends Data.TaggedError("ServerError")<{
  readonly method: ServerMethod
  readonly error: Error
}> {}

export type ServerMethod =
  | "close"
  | "listen"

export const makeExpress = <R>(
  hostname: string,
  port: number,
  exitHandler: ExitHandler<R>
) =>
  Effect.gen(function*(_) {
    // Create a ref to track whether or not the server is open to connections
    const open = yield* _(Effect.acquireRelease(
      Effect.succeed(MutableRef.make(true)),
      (ref) => Effect.succeed(MutableRef.set(ref, false))
    ))

    // Create the Express Application
    const app = yield* _(Effect.sync(() => express()))

    // Create the Express Server
    const connections = new Set<NodeNet.Socket>()
    const openServer = Effect.async<NodeHttp.Server>((resume) => {
      const onError = (error: Error) => {
        resume(Effect.die(new ServerError({ method: "listen", error })))
      }
      const server = app.listen(port, hostname, () => {
        resume(Effect.sync(() => {
          server.removeListener("error", onError)
          return server
        }))
      })
      server.addListener("error", onError)
      server.on("connection", (connection) => {
        connections.add(connection)
        connection.on("close", () => {
          connections.delete(connection)
        })
      })
    })
    const closeServer = (server: NodeHttp.Server) =>
      Effect.async<void>((resume) => {
        connections.forEach((connection) => {
          connection.end()
          connection.destroy()
        })
        server.close((error) => {
          if (error) {
            resume(Effect.die(new ServerError({ method: "close", error })))
          } else {
            resume(Effect.unit)
          }
        })
      })
    const server = yield* _(Effect.acquireRelease(
      openServer,
      (server) => closeServer(server)
    ))

    // Create a supervisor to properly track and propagate interruption
    const supervisor = yield* _(Effect.acquireRelease(
      Supervisor.track,
      (supervisor) => supervisor.value.pipe(Effect.flatMap(Fiber.interruptAll))
    ))

    // Allow for providing route handlers to a custom Express runtime
    const runtime = <
      Handlers extends ReadonlyArray.NonEmptyReadonlyArray<
        EffectRequestHandler<any, any, any, any, any, any>
      >
    >(handlers: Handlers) =>
      Effect.runtime<Effect.Effect.Context<ReturnType<Handlers[number]>>>().pipe(
        Effect.map((runtime) =>
          ReadonlyArray.map(handlers, (handler): express.RequestHandler => (req, res, next) =>
            Runtime.runFork(runtime)(
              Effect.onError(
                MutableRef.get(open) ? handler(req, res, next) : Effect.interrupt,
                exitHandler(req, res, next)
              )
            ))
        ),
        Effect.supervised(supervisor)
      )

    return {
      app,
      server,
      runtime
    }
  })

export const withExpressApp = <A, E, R>(f: (app: express.Express) => Effect.Effect<A, E, R>) =>
  Express.pipe(Effect.flatMap(({ app }) => f(app)))

export const withExpressServer = <A, E, R>(
  f: (server: NodeHttp.Server) => Effect.Effect<A, E, R>
) => Express.pipe(Effect.flatMap(({ server }) => f(server)))

export const withExpressRuntime = Effect.serviceFunctionEffect(Express, ({ runtime }) => runtime)

export const defaultExitHandler =
  (_: express.Request, res: express.Response, _next: express.NextFunction) =>
  (cause: Cause.Cause<never>): Effect.Effect<void> =>
    Cause.isDie(cause)
      ? Effect.logError(cause)
      : Effect.sync(() => res.status(500).end())

export const methods = [
  "all",
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
  "checkout",
  "connect",
  "copy",
  "lock",
  "merge",
  "mkactivity",
  "mkcol",
  "move",
  "m-search",
  "notify",
  "propfind",
  "proppatch",
  "purge",
  "report",
  "search",
  "subscribe",
  "trace",
  "unlock",
  "unsubscribe"
] as const

export type Methods = typeof methods[number]

export type PathParams = string | RegExp | Array<string | RegExp>

export interface ParamsDictionary {
  [key: string]: string
}

export interface ParsedQs {
  [key: string]: undefined | string | Array<string> | ParsedQs | Array<ParsedQs>
}

export interface EffectRequestHandler<
  R,
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>
> {
  (
    req: express.Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: express.Response<ResBody, Locals>,
    next: express.NextFunction
  ): Effect.Effect<void, never, R>
}

const match = (method: Methods) =>
<
  Handlers extends ReadonlyArray.NonEmptyReadonlyArray<
    EffectRequestHandler<any, any, any, any, any, any>
  >
>(path: PathParams, ...handlers: Handlers): Effect.Effect<
  void,
  never,
  | Express
  | Effect.Effect.Context<ReturnType<Handlers[number]>>
> =>
  withExpressRuntime(handlers).pipe(
    Effect.flatMap((handlers) =>
      withExpressApp((app) =>
        Effect.sync(() => {
          app[method](path, ...handlers)
        })
      )
    )
  )

export const all = match("all")
export const get = match("get")
export const post = match("post")
export const put = match("put")
const delete_ = match("delete")
export { delete_ as delete }
export const patch = match("patch")
export const options = match("options")
export const head = match("head")
export const checkout = match("checkout")
export const connect = match("connect")
export const copy = match("copy")
export const lock = match("lock")
export const merge = match("merge")
export const mkactivity = match("mkactivity")
export const mkcol = match("mkcol")
export const move = match("move")
export const mSearch = match("m-search")
export const notify = match("notify")
export const propfind = match("propfind")
export const proppatch = match("proppatch")
export const purge = match("purge")
export const report = match("report")
export const search = match("search")
export const subscribe = match("subscribe")
export const trace = match("trace")
export const unlock = match("unlock")
export const unsubscribe = match("unsubscribe")

export function use<
  Handlers extends ReadonlyArray.NonEmptyReadonlyArray<
    EffectRequestHandler<any, any, any, any, any, any>
  >
>(
  ...handlers: Handlers
): Effect.Effect<
  void,
  never,
  | Express
  | Effect.Effect.Context<ReturnType<Handlers[number]>>
>
export function use<
  Handlers extends ReadonlyArray.NonEmptyReadonlyArray<
    EffectRequestHandler<any, any, any, any, any, any>
  >
>(
  path: PathParams,
  ...handlers: Handlers
): Effect.Effect<
  void,
  never,
  | Express
  | Effect.Effect.Context<ReturnType<Handlers[number]>>
>
export function use(...args: Array<any>): Effect.Effect<void, never, Express> {
  return withExpressApp((app) => {
    if (typeof args[0] === "function") {
      return withExpressRuntime(
        args as unknown as ReadonlyArray.NonEmptyReadonlyArray<
          EffectRequestHandler<any, any, any, any, any, any>
        >
      ).pipe(Effect.flatMap((handlers) => Effect.sync(() => app.use(...handlers))))
    } else {
      return withExpressRuntime(
        args.slice(1) as unknown as ReadonlyArray.NonEmptyReadonlyArray<
          EffectRequestHandler<any, any, any, any, any, any>
        >
      ).pipe(Effect.flatMap((handlers) => Effect.sync(() => app.use(args[0], ...handlers))))
    }
  })
}

// =============================================================================
// Todo
// =============================================================================

class Todo extends Schema.Class<Todo>()({
  id: Schema.number,
  title: Schema.string,
  completed: Schema.boolean
}) {}

const CreateTodoParams = Todo.struct.pipe(Schema.omit("id"))
type CreateTodoParams = Schema.Schema.To<typeof CreateTodoParams>

const UpdateTodoParams = Schema.partial(Todo.struct, { exact: true }).pipe(Schema.omit("id"))
type UpdateTodoParams = Schema.Schema.To<typeof UpdateTodoParams>

// =============================================================================
// TodoRepository
// =============================================================================

const makeTodoRepository = Effect.gen(function*(_) {
  const nextIdRef = yield* _(Ref.make(0))
  const todosRef = yield* _(Ref.make(HashMap.empty<number, Todo>()))

  const getTodo = (id: number): Effect.Effect<Option.Option<Todo>, never, never> =>
    Ref.get(todosRef).pipe(Effect.map(HashMap.get(id)))

  const getTodos: Effect.Effect<ReadonlyArray<Todo>, never, never> = Ref.get(todosRef).pipe(
    Effect.map((map) => ReadonlyArray.fromIterable(HashMap.values(map)))
  )

  const createTodo = (params: CreateTodoParams): Effect.Effect<number, never, never> =>
    Ref.getAndUpdate(nextIdRef, (n) => n + 1).pipe(
      Effect.flatMap((id) =>
        Ref.modify(todosRef, (map) => {
          const newTodo = new Todo({ ...params, id })
          const updated = HashMap.set(map, newTodo.id, newTodo)
          return [newTodo.id, updated]
        })
      )
    )

  const updateTodo = (
    id: number,
    params: UpdateTodoParams
  ): Effect.Effect<Todo, Cause.NoSuchElementException, never> =>
    Ref.get(todosRef).pipe(Effect.flatMap((map) => {
      const maybeTodo = HashMap.get(map, id)
      if (Option.isNone(maybeTodo)) {
        return Effect.fail(new Cause.NoSuchElementException())
      }
      const newTodo = new Todo({ ...maybeTodo.value, ...params })
      const updated = HashMap.set(map, id, newTodo)
      return Ref.set(todosRef, updated).pipe(Effect.as(newTodo))
    }))

  const deleteTodo = (id: number): Effect.Effect<boolean, never, never> =>
    Ref.get(todosRef).pipe(Effect.flatMap((map) =>
      HashMap.has(map, id)
        ? Ref.set(todosRef, HashMap.remove(map, id)).pipe(Effect.as(true))
        : Effect.succeed(false)
    ))

  return {
    getTodo,
    getTodos,
    createTodo,
    updateTodo,
    deleteTodo
  } as const
})

class TodoRepository extends Context.Tag("TodoRepository")<
  TodoRepository,
  Effect.Effect.Success<typeof makeTodoRepository>
>() {
  static readonly Live = Layer.effect(TodoRepository, makeTodoRepository)
}

// =============================================================================
// Application
// =============================================================================

const server = Effect.all([
  use((req, res, next) => Effect.sync(() => bodyParser.json()(req, res, next))),
  // GET /todos/id
  get("/todos/:id", (req, res) => {
    const id = req.params.id
    return TodoRepository.pipe(
      Effect.flatMap((repo) => repo.getTodo(Number(id))),
      Effect.flatMap(Option.match({
        onNone: () => Effect.sync(() => res.status(404).json(`Todo ${id} not found`)),
        onSome: (todo) => Effect.sync(() => res.json(todo))
      }))
    )
  }),
  // GET /todos
  get("/todos", (_, res) =>
    TodoRepository.pipe(
      Effect.flatMap((repo) => repo.getTodos),
      Effect.flatMap((todos) => Effect.sync(() => res.json(todos)))
    )),
  // POST /todos
  post("/todos", (req, res) => {
    const decodeBody = Schema.decodeUnknown(CreateTodoParams)
    return TodoRepository.pipe(
      Effect.flatMap((repo) =>
        decodeBody(req.body).pipe(Effect.matchEffect({
          onFailure: () => Effect.sync(() => res.status(400).json("Invalid Todo")),
          onSuccess: (todo) =>
            repo.createTodo(todo).pipe(
              Effect.flatMap((id) => Effect.sync(() => res.json(id)))
            )
        }))
      )
    )
  }),
  // PUT /todos/:id
  put("/todos/:id", (req, res) => {
    const id = req.params.id
    const decodeBody = Schema.decodeUnknown(UpdateTodoParams)
    return TodoRepository.pipe(Effect.flatMap((repo) =>
      decodeBody(req.body).pipe(
        Effect.matchEffect({
          onFailure: () => Effect.sync(() => res.status(400).json("Invalid todo")),
          onSuccess: (todo) =>
            repo.updateTodo(Number(id), todo).pipe(
              Effect.matchEffect({
                onFailure: () => Effect.sync(() => res.status(404).json(`Todo ${id} not found`)),
                onSuccess: (todo) => Effect.sync(() => res.json(todo))
              })
            )
        })
      )
    ))
  }),
  // DELETE /todos/:id
  delete_("/todos/:id", (req, res) => {
    const id = req.params.id
    return TodoRepository.pipe(
      Effect.flatMap((repo) => repo.deleteTodo(Number(id))),
      Effect.flatMap((deleted) => Effect.sync(() => res.json({ deleted })))
    )
  })
])

const MainLive = Express.Live("127.0.0.1", 8888).pipe(
  Layer.merge(TodoRepository.Live)
)

server.pipe(
  Effect.zipRight(Effect.never),
  Effect.provide(MainLive),
  Effect.runFork
)
