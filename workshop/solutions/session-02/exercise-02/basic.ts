import { Deferred, Effect, Fiber, Queue, ReadonlyArray } from "effect"

const performWork = (value: number) =>
  Effect.log(`Consuming value: '${value}'`).pipe(
    Effect.delay("20 millis"),
    Effect.as(`Processed value: '${value}'`)
  )

const program = Effect.gen(function*(_) {
  const queue = yield* _(Queue.unbounded<[number, Deferred.Deferred<string>]>())

  const produceWork = (value: number): Effect.Effect<string> =>
    Deferred.make<string>().pipe(
      Effect.flatMap((deferred) =>
        Queue.offer(queue, [value, deferred]).pipe(
          Effect.zipRight(Deferred.await(deferred))
        )
      )
    )

  const consumeWork: Effect.Effect<void> = Queue.take(queue).pipe(
    Effect.flatMap(([value, deferred]) =>
      performWork(value).pipe(
        Effect.flatMap((result) => Deferred.succeed(deferred, result)),
        Effect.fork
      )
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
      )),
    Effect.annotateLogs("role", "producer")
  )

  yield* _(Fiber.join(fiber))
})

program.pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
