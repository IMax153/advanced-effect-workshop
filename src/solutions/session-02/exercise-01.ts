import { Effect, Queue, ReadonlyArray, Schedule } from "effect"

// The following exercise will explore how we can distribute work between
// multiple fibers using Queue.

// The below function simulates performing some non-trivial work
const doSomeWork = (value: number) =>
  Effect.log(`Consuming value '${value}'`).pipe(
    Effect.delay("20 millis")
  )

const program = Effect.gen(function*(_) {
  // The following will offer the numbers [0-100] to the Queue every second
  const queue = yield* _(Queue.unbounded<number>())
  yield* _(
    Queue.offerAll(queue, ReadonlyArray.range(0, 100)),
    Effect.schedule(Schedule.fixed("1 seconds")),
    Effect.fork
  )
  // Implementation #1 - Sequential
  yield* _(
    Queue.take(queue),
    Effect.flatMap((n) => doSomeWork(n)),
    Effect.forever,
    Effect.annotateLogs("concurrency", "none"),
    Effect.fork
  )
  // Implementation #2 - Unbounded Concurrency
  yield* _(
    Queue.take(queue),
    Effect.flatMap((n) => Effect.fork(doSomeWork(n))),
    Effect.forever,
    Effect.annotateLogs("concurrency", "unbounded"),
    Effect.fork
  )
  // Implementation #3 - Bounded Concurrency
  const concurrencyLimit = 4
  yield* _(
    Queue.take(queue),
    Effect.flatMap((n) => doSomeWork(n)),
    Effect.forever,
    Effect.replicateEffect(concurrencyLimit, {
      concurrency: "unbounded",
      discard: true
    }),
    Effect.annotateLogs("concurrency", "bounded"),
    Effect.fork
  )
})

program.pipe(
  Effect.awaitAllChildren,
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
