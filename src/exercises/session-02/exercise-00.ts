import { Console, Deferred, Effect, Random } from "effect"

// Exercise Summary:
//
// The following exercise will explore how we can utilize a Deferred to
// propagate the result of an Effect between fibers. Your implementation
// should have the same semantics as the `Effect.intoDeferred` combinator, but
// it should NOT utilize said combinator.

const maybeFail = Random.next.pipe(Effect.filterOrFail(
  (n) => n > 0.5,
  (n) => `Failed with ${n}`
))

const program = Effect.gen(function*(_) {
  const deferred = yield* _(Deferred.make<number, string>())
  yield* _(
    maybeFail,
    // Implement the logic to propagate the full result of `maybeFail` back to
    // the parent fiber utilizing the Deferred without `Effect.intoDeferred`.
    Effect.fork
  )
  const result = yield* _(Deferred.await(deferred))
  yield* _(Console.log(result))
})

program.pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
