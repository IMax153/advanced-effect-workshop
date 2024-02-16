import type { Deferred, Duration, Request, Scope } from "effect"
import { Effect, Queue, ReadonlyArray, Ref, RequestResolver } from "effect"

// In this session project, we will build a method which will take in an
// existing `RequestResolver` and return a higher-order `RequestResolver`. The
// returned `RequestResolver` will implement a variant of the data-loader
// pattern.
//
// The `RateLimiter` and `RateLimiter.Factory` service interfaces, as well as the
// corresponding `Context` definitions are provided for you. Your job will be to
// implement the `RateLimiter.make` constructor.
//
// This project will be divided into three stages:
//
// Stage 1:
//
// In this stage, the goal will be to implement the "inner" `RequestResolver`,
// which will offer `DataLoaderItem`s to the inner queue. Your implementation
// should:
//
//   - Create and offer a `DataLoaderItem` to the inner queue
//   - Wait for the result of the `DataLoaderItem` request
//
// Hints:
//   - Remember what we learned about propagating interruption with `Deferred`
//
// Stage 2:
//
// In this stage, the goal will be to implement the item batching functionality
// of the data loader. The data loader should take as many elements as possible
// from the inner queue and add them to the batch while it has not reached the
// maximum batch size or the end of the batch window. Your implementation should:
//
//   - Add as many items from the queue to the batch
//   - Stop adding items if the max batch size is reached
//   - Stop adding items if the window duration elapses
//
// Hints:
//   - It may be useful to implement:
//       - One method which takes a single item from the queue and adds it to
//         the batch
//       - Another method which repeats the first method until the max batch size or window duration is reached
//
// Stage 3:
//
// In this stage, the goal will be to implement the data loader's worker, which
// does the work of continuously pulling items off the inner queue, runs the
// request, and reports the result. Your implementation should:
//
//   - Continuously pull items off the inner queue
//   - Run the request contained within the item and report the result
//
// Hints:
//   - You should ensure batching is enabled
//   - You should ensure request caching is disabled
//   - You should consider how interruption may be propagated

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

    // =======================================================================
    // Stage 2 - Implement Item Batching
    // =======================================================================

    // =======================================================================
    // Stage 3 - Implement the Worker
    // =======================================================================

    return RequestResolver.fromEffect<never, A>(
      (request): Effect.Effect<Request.Request.Success<A>, Request.Request.Error<A>> => {
        // =======================================================================
        // Stage 1 - Implement the Inner RequestResolver
        // =======================================================================
      }
    )
  })
