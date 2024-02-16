import type { Duration, Fiber, Scope } from "effect"
import { Effect, Option, Ref } from "effect"

export const make = (
  limit: number,
  window: Duration.DurationInput
): Effect.Effect<
  <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  never,
  Scope.Scope
> =>
  Effect.gen(function*(_) {
    const scope = yield* _(Effect.scope)
    const semaphore = yield* _(Effect.makeSemaphore(limit))
    const resetRef = yield* _(Ref.make(Option.none<Fiber.RuntimeFiber<void>>()))
    const maybeStartReset = Ref.update(
      resetRef,
      Option.orElseSome(() =>
        Effect.runFork(
          Effect.sleep(window).pipe(
            Effect.zipRight(Ref.set(resetRef, Option.none())),
            Effect.zipLeft(semaphore.releaseAll)
          ),
          { scope }
        )
      )
    )
    const take = Effect.zipRight(semaphore.take(1), maybeStartReset)
    return (effect) => Effect.zipRight(take, effect)
  })
