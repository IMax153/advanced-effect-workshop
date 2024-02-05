import { Stream } from "effect"
import type { EventEmitter } from "node:events"

// =============================================================================
// Multi-Shot Callbacks
// =============================================================================

declare const emitter: EventEmitter

Stream.async<never, never, unknown>((emit) => {
  emitter.on("my-event", (data) => {
    emit.single(data)
  })
})
