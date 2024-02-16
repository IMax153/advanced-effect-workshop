import { Console, Effect, FiberRef, HashSet, Layer, Logger, Schedule } from "effect"
import type { DurationInput } from "effect/Duration"

// Exercise Summary:
//
// The following exercise will explore how we can create custom `Logger`s with
// Effect. We are going to alter the behavior of logging in our application by
// creating a `BatchedLogger` which batches logs and emits them as a collection
// after a fixed window.
//
// Your task will be to complete the implementation of `makeBatchedLogger`. The
// only code provided to you is the addition of the custom logger to the logger
// set of the application.

const makeBatchedLogger = (config: {
  readonly window: DurationInput
}) =>
  Effect.gen(function*(_) {
    const logger: Logger.Logger<unknown, void> = {} as any // Remove me

    // Implementation

    yield* _(Effect.locallyScopedWith(FiberRef.currentLoggers, HashSet.add(logger)))
  })

const schedule = Schedule.fixed("500 millis").pipe(Schedule.compose(Schedule.recurs(10)))

const program = Effect.gen(function*(_) {
  yield* _(Console.log("Running logs!"))
  yield* _(Effect.logInfo("Info log"))
  yield* _(Effect.logWarning("Warning log"))
  yield* _(Effect.logError("Error log"))
}).pipe(Effect.schedule(schedule))

const BatchedLoggerLive = Layer.scopedDiscard(makeBatchedLogger({ window: "2 seconds" }))

const MainLive = Logger.remove(Logger.defaultLogger).pipe(
  Layer.merge(BatchedLoggerLive)
)

program.pipe(
  Effect.provide(MainLive),
  Effect.runFork
)
