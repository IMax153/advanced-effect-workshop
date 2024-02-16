import { Console, Effect, FiberRef, HashSet, Layer, Logger, Schedule } from "effect"
import type { DurationInput } from "effect/Duration"

const makeBatchedLogger = (config: {
  readonly window: DurationInput
}) =>
  Effect.gen(function*(_) {
    const logBuffer: Array<string> = []
    const resetBuffer = Effect.sync(() => {
      logBuffer.length = 0
    })
    const outputBuffer = Effect.suspend(() => Console.log(logBuffer.join("\n"))).pipe(
      Effect.zipRight(resetBuffer)
    )

    const schedule = Schedule.fixed(config.window).pipe(
      Schedule.compose(Schedule.repeatForever)
    )
    yield* _(
      outputBuffer,
      Effect.schedule(schedule),
      Effect.ensuring(outputBuffer),
      Effect.fork,
      Effect.interruptible
    )

    const logger = Logger.stringLogger.pipe(Logger.map((message) => {
      logBuffer.push(message)
    }))

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
