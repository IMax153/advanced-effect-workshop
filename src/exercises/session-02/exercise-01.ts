import { Effect, Queue, ReadonlyArray, Schedule } from "effect"

const doSomeWork = (value: number) =>
  Effect.log(`Consuming value '${value}'`).pipe(
    Effect.delay("20 millis")
  )

const program = Effect.gen(function*(_) {
  const queue = yield* _(Queue.unbounded<number>())
  yield* _(
    Queue.offerAll(queue, ReadonlyArray.range(0, 100)),
    Effect.schedule(Schedule.fixed("1 seconds")),
    Effect.fork
  )
  // Create a fiber which processes work sequentially
  yield* _(
    Queue.take(queue),
    Effect.flatMap((n) => doSomeWork(n)),
    Effect.forever,
    Effect.annotateLogs("concurrency", "none"),
    Effect.fork
  )
  // Create a fiber which processes work with unbounded concurrency
  yield* _(
    Queue.take(queue),
    Effect.flatMap((n) => Effect.fork(doSomeWork(n))),
    Effect.forever,
    Effect.annotateLogs("concurrency", "unbounded"),
    Effect.fork
  )
  // Create a fiber which processes work with bounded concurrency
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
