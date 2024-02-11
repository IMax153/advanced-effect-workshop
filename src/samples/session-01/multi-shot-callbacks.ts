import { Stream } from "effect"
import type { EventEmitter } from "node:events"

// =============================================================================
// Multi-Shot Callbacks
// =============================================================================

export const captureEvents = (emitter: EventEmitter, eventName: string) =>
  Stream.async<never, never, unknown>((emit) => {
    emitter.on(eventName, (data) => {
      emit.single(data)
    })
  })
