import { Deferred, Effect, Fiber, Queue, ReadonlyArray } from "effect"

const performWork = (value: number) =>
  Effect.log(`Consuming value: '${value}'`).pipe(
    Effect.delay("20 millis"),
    Effect.as(`Processed value: '${value}'`),
    Effect.onInterrupt(() => Effect.log("Work was interrupted!"))
  )

const program = Effect.gen(function*(_) {
  const queue = yield* _(Queue.unbounded<[number, Deferred.Deferred<string>]>())

  const produceWork = (value: number): Effect.Effect<string> =>
    Deferred.make<string>().pipe(
      Effect.flatMap((deferred) =>
        Queue.offer(queue, [value, deferred]).pipe(
          Effect.zipRight(Deferred.await(deferred)),
          Effect.onInterrupt(() =>
            Effect.log("Production of work was interrupted!").pipe(
              Effect.zipRight(Deferred.interrupt(deferred))
            )
          )
        )
      )
    )

  const consumeWork: Effect.Effect<void> = Queue.take(queue).pipe(
    Effect.flatMap(([value, deferred]) =>
      Effect.if(Deferred.isDone(deferred), {
        onTrue: Effect.unit,
        onFalse: performWork(value).pipe(
          Effect.zipLeft(Effect.sleep("1 seconds")),
          Effect.exit,
          Effect.flatMap((result) => Deferred.complete(deferred, result)),
          Effect.race(Deferred.await(deferred)),
          Effect.fork
        )
      })
    ),
    Effect.forever
  )

  const fiber = yield* _(
    consumeWork,
    Effect.annotateLogs("role", "consumer"),
    Effect.fork
  )

  yield* _(
    Effect.forEach(ReadonlyArray.range(0, 10), (value) =>
      produceWork(value).pipe(
        Effect.flatMap((result) => Effect.log(result))
      ), { concurrency: "unbounded" }),
    Effect.zipRight(produceWork(11).pipe(Effect.timeout("10 millis"))),
    Effect.annotateLogs("role", "producer")
  )

  yield* _(Fiber.join(fiber))
})

program.pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
