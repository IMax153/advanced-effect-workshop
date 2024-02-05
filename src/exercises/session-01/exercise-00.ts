import * as Schema from "@effect/schema/Schema"
import bodyParser from "body-parser"
import { Cause, Context, Effect, HashMap, Layer, Option, ReadonlyArray, Ref } from "effect"
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
  // Create the `GET /todos/:id` route
  //   - If the todo exists, return the todo as JSON
  //   - If the todo does not exist return a 404 status code with the message `"Todo ${id} not found"`
}))

const GetAllTodosRouteLive = Layer.scopedDiscard(Effect.gen(function*(_) {
  // Create the `GET /todos` route
  //   - Should return all todos from the `TodoRepository`
}))

const CreateTodoRouteLive = Layer.scopedDiscard(Effect.gen(function*(_) {
  // Create the `POST /todos` route
  //   - Should create a new todo and return the todo ID in the response
  //   - If the request JSON body is not valid return a 400 status code with the message `"Invalid todo"`
}))

const UpdateTodoRouteLive = Layer.scopedDiscard(Effect.gen(function*(_) {
  // Create the `PUT /todos/:id` route
  //   - Should update an existing todo and return the updated todo as JSON
  //   - If the request JSON body is not valid return a 400 status code with the message `"Invalid todo"`
  //   - If the todo does not exist return a 404 with the message `"Todo ${id} not found"`
}))

const DeleteTodoRouteLive = Layer.scopedDiscard(Effect.gen(function*(_) {
  // Create the `DELETE /todos` route
  //   - Should delete the todo by id and return a boolean indicating if a todo was deleted
}))

// =============================================================================
// Server
// =============================================================================

const ServerLive = Layer.scopedDiscard(
  Effect.gen(function*(_) {
    const port = 3001
    // Start an express server on the provided port (can modify the port if necessary on your machine)
    //  - Hint: you may want to consider utilizing `Runtime` given this is an execution boundary
    //  - Hint: starting / stopping the Express server is a resourceful operation
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
