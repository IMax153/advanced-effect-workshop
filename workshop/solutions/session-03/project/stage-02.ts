import type { Duration, Request, Scope } from "effect"
import { Deferred, Effect, Queue, ReadonlyArray, Ref, RequestResolver } from "effect"

interface DataLoaderItem<A extends Request.Request<any, any>> {
  readonly request: A
  readonly deferred: Deferred.Deferred<
    Request.Request.Success<A>,
    Request.Request.Error<A>
  >
}

export const dataLoader = <A extends Request.Request<any, any>>(
  self: RequestResolver.RequestResolver<A, never>,
  options: {
    readonly window: Duration.DurationInput
    readonly maxBatchSize?: number
  }
): Effect.Effect<RequestResolver.RequestResolver<A, never>, never, Scope.Scope> =>
  Effect.gen(function*(_) {
    const queue = yield* _(
      Effect.acquireRelease(
        Queue.unbounded<DataLoaderItem<A>>(),
        Queue.shutdown
      )
    )
    const batch = yield* _(Ref.make(ReadonlyArray.empty<DataLoaderItem<A>>()))

    const takeOne = Effect.flatMap(
      Queue.take(queue),
      (item) => Ref.updateAndGet(batch, ReadonlyArray.append(item))
    )
    const takeRest = takeOne.pipe(
      Effect.repeat({
        until: (items) =>
          options.maxBatchSize !== undefined &&
          items.length >= options.maxBatchSize
      }),
      Effect.timeout(options.window),
      Effect.ignore,
      Effect.zipRight(Ref.getAndSet(batch, ReadonlyArray.empty()))
    )

    return RequestResolver.fromEffect((request: A) =>
      Effect.flatMap(
        Deferred.make<Request.Request.Success<A>, Request.Request.Error<A>>(),
        (deferred) =>
          Queue.offer(queue, { request, deferred }).pipe(
            Effect.zipRight(Deferred.await(deferred)),
            Effect.onInterrupt(() => Deferred.interrupt(deferred))
          )
      )
    )
  })
