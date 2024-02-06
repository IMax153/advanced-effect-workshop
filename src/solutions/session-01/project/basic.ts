import * as Schema from "@effect/schema/Schema"
import bodyParser from "body-parser"
import {
  Cause,
  Context,
  Effect,
  FiberSet,
  HashMap,
  Layer,
  Option,
  ReadonlyArray,
  Ref,
  Runtime
} from "effect"
import express from "express"

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

const UpdateTodoParams = Todo.struct.pipe(Schema.omit("id"), Schema.partial)
type UpdateTodoParams = Schema.Schema.To<typeof UpdateTodoParams>

// =============================================================================
// TodoRepository
// =============================================================================

const makeTodoRepository = Effect.gen(function*(_) {
  const nextIdRef = yield* _(Ref.make(0))
  const todosRef = yield* _(Ref.make(HashMap.empty<number, Todo>()))

  const getTodo = (id: number): Effect.Effect<never, never, Option.Option<Todo>> =>
    Ref.get(todosRef).pipe(Effect.map(HashMap.get(id)))

  const getTodos: Effect.Effect<never, never, ReadonlyArray<Todo>> = Ref.get(todosRef).pipe(
    Effect.map((map) => ReadonlyArray.fromIterable(HashMap.values(map)))
  )

  const createTodo = (params: CreateTodoParams): Effect.Effect<never, never, number> =>
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
  ): Effect.Effect<never, Cause.NoSuchElementException, Todo> =>
    Ref.get(todosRef).pipe(Effect.flatMap((map) => {
      const maybeTodo = HashMap.get(map, id)
      if (Option.isNone(maybeTodo)) {
        return Effect.fail(new Cause.NoSuchElementException())
      }
      const newTodo = new Todo({ ...maybeTodo.value, ...params })
      const updated = HashMap.set(map, id, newTodo)
      return Ref.set(todosRef, updated).pipe(Effect.as(newTodo))
    }))

  const deleteTodo = (id: number): Effect.Effect<never, never, boolean> =>
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

interface TodoRepository {
  readonly _: unique symbol
}

const TodoRepository = Context.Tag<
  TodoRepository,
  Effect.Effect.Success<typeof makeTodoRepository>
>()

const TodoRepositoryLive = Layer.effect(TodoRepository, makeTodoRepository)

// =============================================================================
// Express
// =============================================================================

const Express = Context.Tag<ReturnType<typeof express>>()

const ExpressLive = Layer.sync(Express, () => {
  const app = express()
  app.use(bodyParser.json())
  return app
})

// =============================================================================
// Routes
// =============================================================================

const GetTodoRouteLive = Layer.scopedDiscard(Effect.gen(function*(_) {
  const app = yield* _(Express)
  const runFork = yield* _(FiberSet.makeRuntime<TodoRepository>())
  app.get("/todos/:id", (req, res) => {
    const id = req.params.id
    const program = TodoRepository.pipe(
      Effect.flatMap((repo) => repo.getTodo(Number(id))),
      Effect.flatMap(Option.match({
        onNone: () => Effect.sync(() => res.status(404).json(`Todo ${id} not found`)),
        onSome: (todo) => Effect.sync(() => res.json(todo))
      }))
    )
    runFork(program)
  })
}))

const GetAllTodosRouteLive = Layer.scopedDiscard(Effect.gen(function*(_) {
  const app = yield* _(Express)
  const runFork = yield* _(FiberSet.makeRuntime<TodoRepository>())
  app.get("/todos", (_, res) => {
    const program = TodoRepository.pipe(
      Effect.flatMap((repo) => repo.getTodos),
      Effect.flatMap((todos) => Effect.sync(() => res.json(todos)))
    )
    runFork(program)
  })
}))

const CreateTodoRouteLive = Layer.scopedDiscard(Effect.gen(function*(_) {
  const app = yield* _(Express)
  const runFork = yield* _(FiberSet.makeRuntime<TodoRepository>())
  app.post("/todos", (req, res) => {
    const decodeBody = Schema.decodeUnknown(CreateTodoParams)
    const program = TodoRepository.pipe(
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
    runFork(program)
  })
}))

const UpdateTodoRouteLive = Layer.scopedDiscard(Effect.gen(function*(_) {
  const app = yield* _(Express)
  const runFork = yield* _(FiberSet.makeRuntime<TodoRepository>())
  app.put("/todos/:id", (req, res) => {
    const id = req.params.id
    const decodeBody = Schema.decodeUnknown(UpdateTodoParams)
    const program = TodoRepository.pipe(Effect.flatMap((repo) =>
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
    runFork(program)
  })
}))

const DeleteTodoRouteLive = Layer.scopedDiscard(Effect.gen(function*(_) {
  const app = yield* _(Express)
  const runFork = yield* _(FiberSet.makeRuntime<TodoRepository>())
  app.delete("/todo/:id", (req, res) => {
    const id = req.params.id
    const program = TodoRepository.pipe(
      Effect.flatMap((repo) => repo.deleteTodo(Number(id))),
      Effect.flatMap((deleted) => Effect.sync(() => res.json({ deleted })))
    )
    runFork(program)
  })
}))

// =============================================================================
// Server
// =============================================================================

const ServerLive = Layer.scopedDiscard(
  Effect.gen(function*(_) {
    const port = 3001
    const app = yield* _(Express)
    const runtime = yield* _(Effect.runtime<never>())
    const runFork = Runtime.runFork(runtime)
    yield* _(
      Effect.acquireRelease(
        Effect.sync(() =>
          app.listen(port, () => {
            runFork(Effect.log(`Server listening for requests on port: ${port}`))
          })
        ),
        (server) => Effect.sync(() => server.close())
      )
    )
  })
)

// =============================================================================
// Program
// =============================================================================

const MainLive = ServerLive.pipe(
  Layer.merge(GetTodoRouteLive),
  Layer.merge(GetAllTodosRouteLive),
  Layer.merge(CreateTodoRouteLive),
  Layer.merge(UpdateTodoRouteLive),
  Layer.merge(DeleteTodoRouteLive),
  Layer.provide(ExpressLive),
  Layer.provide(TodoRepositoryLive)
)

Effect.runFork(Layer.launch(MainLive))

// Some useful cURL commands for testing your server:
//
// Query a Todo by ID:
//   curl -X GET http://localhost:3001/todos/0
//
// Query all Todos:
//   curl -X GET http://localhost:3001/todos
//
// Create a Todo:
//   curl -X POST -H 'Content-Type: application/json' -d '{"title":"mytodo","completed":false}' http://localhost:3001/todos
//
// Update a Todo:
//   curl -X PUT -H 'Content-Type: application/json' -d '{"completed":true}' http://localhost:3001/todos/0
//
// Delete a Todo by ID:
//   curl -X DELETE http://localhost:3001/todos/0
