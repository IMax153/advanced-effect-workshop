import type { Cause } from "effect"
import { Console, Deferred, Effect, Random } from "effect"

// Mikes Notes
// Maybe start off the exercise without intoDeferred and build without it

const maybeFail = Random.next.pipe(Effect.filterOrFail(
  (n) => n > 0.5,
  (n) => `Failed with ${n}`
))

const program = Effect.gen(function*(_) {
  const deferred = yield* _(Deferred.make<string | Cause.NoSuchElementException, number>())
  yield* _(
    maybeFail,
    // Effect.delay("500 millis"),
    // Effect.timeout("200 millis"),
    Effect.intoDeferred(deferred),
    Effect.fork
  )
  const result = yield* _(Deferred.await(deferred))
  yield* _(Console.log(result))
})

program.pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
