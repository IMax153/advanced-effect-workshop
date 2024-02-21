import type { Duration, Scope } from "effect"
import { Context, Deferred, Effect, Layer, Queue } from "effect"

export interface RateLimiter {
  readonly take: Effect.Effect<void>
}

export declare namespace RateLimiter {
  export interface Factory {
    readonly make: (
      limit: number,
      window: Duration.DurationInput
    ) => Effect.Effect<RateLimiter, never, Scope.Scope>
  }
}

class Factory extends Context.Tag("RateLimiter.Factory")<Factory, RateLimiter.Factory>() {
  static readonly Live = Layer.sync(Factory, () => factory)
}

export const make = Effect.serviceFunctionEffect(Factory, (factory) => factory.make)

const factory = Factory.of({
  make: (limit, window) =>
    Effect.gen(function*(_) {
      const queue = yield* _(Effect.acquireRelease(
        Queue.unbounded<Deferred.Deferred<void>>(),
        (queue) => Queue.shutdown(queue)
      ))

      return {
        take: Deferred.make<void>().pipe(
          Effect.tap((deferred) => Queue.offer(queue, deferred)),
          Effect.flatMap((deferred) =>
            Deferred.await(deferred).pipe(
              Effect.onInterrupt(() => Deferred.interrupt(deferred))
            )
          )
        )
      }
    })
})
