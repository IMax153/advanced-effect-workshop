import { Effect } from "effect"

// Exercise Summary:
//
// The following exercise will explore how we can utilize the `Effect.async*`
// family of constructors to import asynchronous callbacks into an Effect. You will
// need to implement a `sleep` function which suspends a fiber for the specified
// number of milliseconds before resuming execution.

export const MAX_SET_TIMEOUT_MILLIS = 2 ** 31 - 1

declare const sleep: (millis: number) => Effect.Effect<void>
// Implement the logic to suspend the fiber for the specified number of
// milliseconds before allowing execution to resume. Your implementation should:
//   - utilize `setTimeout` to implement the delay
//   - utilize the `Effect.async*` combinators to handle the `setTimeout` callback
// Bonus:
//   - for bonus points, your implementation should also properly handle if the
//     fiber that is sleeping is interrupted

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
