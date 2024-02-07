import type { Duration, Scope } from "effect"
import { Context, Effect, Layer } from "effect"

// In this session project, we will build a simple `RateLimiter` factory service.
// The `RateLimiter` and `RateLimiter.Factory` service interfaces, as well as the
// corresponding `Context` definitions are provided for you. Your job will be to
// implement the `RateLimiter.make` constructor.
//
// This project will be divided into three stages:
//
// Stage 1:
//
// In this stage, the goal will be to implement the `take` method on `RateLimiter`.
// which functionally "takes" from the `RateLimiter` until `RateLimiter`'s `limit`
// is reached. Your implementation should:
//
//   - Functionally "take" from the `RateLimiter`'s available request limit
//   - Allow the request to proceed if the limit is not reached
//   - Wait for the reset window to pass if the request limit is reached
//
// Hints:
//   - It may be useful to model the internal collection of "takers" as a `Queue`
//     of `Deferred`
//
// Stage 2:
//
// In this stage, the goal will be to implement the reset functionality of the
// `RateLimiter`. The `RateLimiter` should be reset after the window duration
// has passed. Your implementation should:
//
//   - Track the current count of takers against the `RateLimiter`'s limit
//   - Reset the `RateLimiter` after the window duration has passed
//
// Hints:
//   - It may be useful to model the current count of takers with a `Ref`
//   - It may be useful to setup the reset as a `Fiber` which resets the counter after a delay
//   - It may be useful to store the running `Fiber` in a `Ref`
//
// Stage 3:
//
// In this stage, the goal will be to implement the `RateLimiter`'s worker, which
// does the work of continuously checking the current count of takers against the
// `RateLimiter`'s limit, controlling which requests are able to execute, and
// executing the reset when necessary. Your implementation should:
//
//   - Continuously poll the count of takers `RateLimiter` to determine if the
//     `RateLimiter` needs to be reset
//   - Reset the `RateLimiter`, if required, once the window has passed
//   - Allow requests to execute if the limit has not been reached
//   - Prevent requests from executing unless if the limit has been reached
//
// Hints:
//   - The `RateLimiter`'s worker should be forked into a background process

export interface RateLimiter {
  readonly take: Effect.Effect<never, never, void>
}

export declare namespace RateLimiter {
  export interface Factory {
    readonly make: (
      limit: number,
      window: Duration.DurationInput
    ) => Effect.Effect<Scope.Scope, never, RateLimiter>
  }
}

export const Factory = Context.Tag<RateLimiter.Factory>()

export const FactoryLive = Layer.sync(Factory, () => factory)

export const make = Effect.serviceFunctionEffect(Factory, (factory) => factory.make)

const factory = Factory.of({
  make: (limit, window) =>
    Effect.gen(function*(_) {
      // =======================================================================
      // Stage 2 - Implement the reset functionality of the `RateLimiter`
      // =======================================================================

      // =======================================================================
      // Stage 3 - Implement the `RateLimiter` worker background process
      // =======================================================================

      return {
        // =======================================================================
        // Stage 1 - Implement the `RateLimiter.take` method
        // =======================================================================
        take:
      }
    })
})
