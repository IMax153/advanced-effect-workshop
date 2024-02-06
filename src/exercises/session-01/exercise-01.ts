import { Console, Data, Effect, Random, Schedule, Stream } from "effect"
import { EventEmitter } from "node:events"

// Exercise Summary:
//
// The following exercise will explore how we can utilize the `Stream.async*`
// family of constructors to import asynchronous callbacks into a Stream. You will
// need to implement a `captureEvents` function which takes an `EventEmitter`
// and captures both the errors and values emitted by the `EventEmitter`'s
// `"emission"` event.

// =============================================================================
// Event Emitter
// =============================================================================

class Event extends Data.TaggedClass("Event")<{
  readonly value: number
}> {}

class EmissionError extends Data.TaggedError("EmissionError")<{
  readonly message: string
}> {}

const emitEvents = (emitter: EventEmitter, eventName: string, eventCount: number) =>
  Random.next.pipe(
    Effect.flatMap((value) =>
      Effect.sync(() => {
        if (value < 0.1) {
          const error = new EmissionError({
            message: `Received invalid value: ${value}`
          })
          emitter.emit(eventName, error)
        } else {
          emitter.emit(eventName, null, new Event({ value }))
        }
      })
    ),
    Effect.schedule(
      Schedule.recurs(eventCount).pipe(
        Schedule.intersect(Schedule.exponential("10 millis"))
      )
    )
  )

const captureEvents = (
  emitter: EventEmitter,
  eventName: string
): Stream.Stream<never, EmissionError, Event> =>
  // Complete the implementation of the `captureEvents` method. Your implementation should:
  //   - Handle pushing successful `Event` emissions to the stream
  //   - Failing the stream if an `EmissionError` is emitted

const program = Effect.gen(function*(_) {
  const emitter = yield* _(Effect.sync(() => new EventEmitter()))

  yield* _(Effect.fork(emitEvents(emitter, "emission", 20)))

  yield* _(
    captureEvents(emitter, "emission"),
    Stream.tap((event) => Console.log(event)),
    Stream.tapError((error) => Console.log(error)),
    Stream.runDrain
  )
})

program.pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
