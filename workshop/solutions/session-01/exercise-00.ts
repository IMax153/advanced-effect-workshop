import { Effect } from "effect"

export const MAX_SET_TIMEOUT_MILLIS = 2 ** 31 - 1

const sleep = (millis: number): Effect.Effect<void> =>
  Effect.async<void>((resume) => {
    const timeoutId = setTimeout(() => {
      resume(Effect.unit)
    }, Math.min(millis, MAX_SET_TIMEOUT_MILLIS))
    return Effect.sync(() => {
      clearTimeout(timeoutId)
    })
  })

const program = Effect.gen(function*(_) {
  const millis = 1_000
  yield* _(Effect.log(`Sleeping for ${millis} milliseconds...`))
  yield* _(sleep(millis))
  yield* _(Effect.log("Resuming execution!"))
})

program.pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
