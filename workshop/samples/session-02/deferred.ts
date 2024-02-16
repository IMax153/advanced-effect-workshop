import { Console, Deferred, Effect, Fiber } from "effect"

const program = Effect.gen(function*(_) {
  // Create a deferred which can never fail and succeeds
  // with a string
  const deferred = yield* _(Deferred.make<string>())
  // Fork a fiber which will await the result of the deferred
  const fiber = yield* _(Effect.fork(Deferred.await(deferred)))
  // Succeed the deferred after 1 second
  yield* _(
    Deferred.succeed(deferred, "Hello, World!"),
    Effect.delay("1 seconds")
  )
  // Join the fiber to get its result
  const result = yield* _(Fiber.join(fiber))
  // Log the result to the console
  yield* _(Console.log(result))
})

Effect.runFork(program)
// After 1 second - "Hello, World!"
