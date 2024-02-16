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
    Effect.matchEffect({
      onFailure: (error) => Deferred.fail(deferred, error),
      onSuccess: (value) => Deferred.succeed(deferred, value)
    }),
    //
    // Alternatively, you could use the exit value of `maybeFail`:
    // Effect.exit,
    // Effect.flatMap((exit) => Deferred.complete(deferred, exit)),
    //
    // Simulating interruption:
    // Effect.delay("1 seconds"),
    // Effect.raceFirst(Effect.interrupt),
    //
    Effect.onInterrupt(() =>
      Effect.log("Interrupted!").pipe(
        Effect.zipRight(Deferred.interrupt(deferred))
      )
    ),
    Effect.fork
  )
  const result = yield* _(Deferred.await(deferred))
  yield* _(Console.log(result))
})

program.pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
