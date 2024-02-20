import { Effect, Runtime } from "effect"
import * as express from "express"

// =============================================================================
// Multi-Shot Callbacks
// =============================================================================

export const startServer = (port: number) =>
  Effect.gen(function*(_) {
    const app = yield* _(Effect.sync(() => express()))
    const runtime = yield* _(Effect.runtime<never>())
    const runFork = Runtime.runFork(runtime)
    app.listen(port, () => {
      runFork(Effect.log(`Server listening on port ${port}`))
    })
  })
