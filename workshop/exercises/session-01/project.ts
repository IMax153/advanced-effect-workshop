import * as Schema from "@effect/schema/Schema"
import bodyParser from "body-parser"
import { Cause, Context, Effect, HashMap, Layer, Option, ReadonlyArray, Ref } from "effect"
import express from "express"

// In this session project, we will build a simple Express REST API server that
// performs CRUD operations against a `TodoRepository`. The implementations of
// the `Todo` models, the `TodoRepository`, and the `Express` service have already
// been provided for you.
//
// This project will be divided into three stages:
//
// Stage 1:
//
// In this stage, the goal will be to implement the listening functionality of
// the Express server. Your implementation should:
//
//   - Use the `Express` service to gain access to the Express application
//   - Properly manage the open / close lifecycle of the Express server
//   - Utilize `Effect.log` to log a message to the console after the server
//     has started listening for requests
//
// Hints:
//   - To be able to `Effect.log` inside the `listen` callback, it may be helpful
//     to use `Runtime`
//
// Stage 2:
//
// In this stage, the goal will be to implement a single `"GET /todos/:id"` route
// for our server. Your implementation should:
//
//   - Implement the layer which adds the specified route to the Express application
//   - If the `Todo` specified in the request is found, return the `Todo` as JSON
//   - If the `Todo` specified in the request is not found, return a `404` status
//     code along with the message `"Todo ${todoId} not found"`
//
// Hints:
//   - To be able to implement Effect logic inside an Express request handler, it
//     may be helpful to use `Runtime`
//
// Stage 3:
//
// In this stage, the goal will be to finish implementing the routes of your
// Express server. You can use whatever logic you think appropriate within each
// of the remaining routes! The only requirement of your implementation is:
//
//   - Each of the remaining routes of our Express server should be completed
//
// Bonus:
//   - Use a `FiberSet` instead of `Runtime` to run Effects within your Express
//     request handlers
//
// Some useful cURL commands for testing your server (modify the port as applicable):
//
// Query a Todo by ID:
//   curl -X GET http://localhost:8888/todos/0
//
// Query all Todos:
//   curl -X GET http://localhost:8888/todos
//
// Create a Todo:
//   curl -X POST -H 'Content-Type: application/json' -d '{"title":"mytodo","completed":false}' http://localhost:8888/todos
//
// Update a Todo:
//   curl -X PUT -H 'Content-Type: application/json' -d '{"completed":true}' http://localhost:8888/todos/0
//
// Delete a Todo by ID:
//   curl -X DELETE http://localhost:8888/todos/0

// =============================================================================
// Server
// =============================================================================

const ServerLive = Layer.scopedDiscard(
  Effect.gen(function*(_) {
    // =============================================================================
    // Stage 1
    // =============================================================================
    // Start an Express server on your local host machine
    //  - Hint: you may want to consider utilizing `Runtime` given this is an execution boundary
    //  - Hint: starting / stopping the Express server is a resourceful operation
    return yield* _(Effect.unit) // Delete me
  })
)

// =============================================================================
// Routes
// =============================================================================

const GetTodoRouteLive = Layer.scopedDiscard(Effect.gen(function*(_) {
  // =============================================================================
  // Stage 2
  // =============================================================================
  // Create the `GET /todos/:id` route
  //   - If the todo exists, return the todo as JSON
  //   - If the todo does not exist return a 404 status code with the message `"Todo ${id} not found"`
}))

// =============================================================================
// Stage 3
// =============================================================================
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

  const getTodo = (id: number): Effect.Effect<Option.Option<Todo>> =>
    Ref.get(todosRef).pipe(Effect.map(HashMap.get(id)))

  const getTodos: Effect.Effect<ReadonlyArray<Todo>> = Ref.get(todosRef).pipe(
    Effect.map((map) => ReadonlyArray.fromIterable(HashMap.values(map)))
  )

  const createTodo = (params: CreateTodoParams): Effect.Effect<number> =>
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
  ): Effect.Effect<Todo, Cause.NoSuchElementException> =>
    Ref.get(todosRef).pipe(Effect.flatMap((map) => {
      const maybeTodo = HashMap.get(map, id)
      if (Option.isNone(maybeTodo)) {
        return Effect.fail(new Cause.NoSuchElementException())
      }
      const newTodo = new Todo({ ...maybeTodo.value, ...params })
      const updated = HashMap.set(map, id, newTodo)
      return Ref.set(todosRef, updated).pipe(Effect.as(newTodo))
    }))

  const deleteTodo = (id: number): Effect.Effect<boolean> =>
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
// Express
// =============================================================================

class Express extends Context.Tag("Express")<Express, ReturnType<typeof express>>() {
  static readonly Live = Layer.sync(Express, () => {
    const app = express()
    app.use(bodyParser.json())
    return app
  })
}

// =============================================================================
// Program
// =============================================================================

const MainLive = ServerLive.pipe(
  Layer.merge(GetTodoRouteLive),
  Layer.merge(GetAllTodosRouteLive),
  Layer.merge(CreateTodoRouteLive),
  Layer.merge(UpdateTodoRouteLive),
  Layer.merge(DeleteTodoRouteLive),
  Layer.provide(Express.Live),
  Layer.provide(TodoRepository.Live)
)

Layer.launch(MainLive).pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
