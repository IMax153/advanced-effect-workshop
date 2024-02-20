import { Console, Deferred, Effect, Fiber } from "effect"

const program = Effect.gen(function*(_) {
  // Create a deferred which can never fail and succeeds
  // with a string
  const deferred = yield* _(Deferred.make<string>())
  // Fork a fiber which will await the result of the deferred
  const fiber = yield* _(
    Effect.log("Waiting for deferred to complete..."),
    Effect.zipRight(Deferred.await(deferred)),
    Effect.zipLeft(Effect.log("Deferred complete!")),
    Effect.fork
  )
  // Succeed the deferred after 1 second
  yield* _(
    Effect.log("Succeeding the deferred!"),
    Effect.zipRight(Deferred.succeed(deferred, "Hello, World!")),
    Effect.delay("1 seconds"),
    Effect.fork
  )
  console.time("Fiber waiting")
  // Join the fiber to get its result
  const result = yield* _(Fiber.join(fiber))
  console.timeEnd("Fiber waiting")
  // Log the result to the console
  yield* _(Console.log(result))
})

Effect.runFork(program)
// After 1 second - "Hello, World!"
