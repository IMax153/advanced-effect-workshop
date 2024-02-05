import * as ParcelWatcher from "@parcel/watcher"
import { Chunk, Console, Data, Effect, Queue, Runtime, Stream } from "effect"

export class FileWatcherError extends Data.TaggedError("FileWatcherError")<{
  readonly error: Error
}> {}

export type FileSystemEvent = Data.TaggedEnum<{
  readonly FileCreated: FileSystemEventInfo
  readonly FileUpdated: FileSystemEventInfo
  readonly FileDeleted: FileSystemEventInfo
}>

export const FileSystemEvent = Data.taggedEnum<FileSystemEvent>()

export interface FileSystemEventInfo {
  readonly path: string
}

export const watch = (
  directory: string,
  options?: ParcelWatcher.Options
): Stream.Stream<never, FileWatcherError, FileSystemEvent> =>
  Effect.gen(function*(_) {
    const runtime = yield* _(Effect.runtime<never>())
    const runFork = Runtime.runFork(runtime)

    const queue = yield* _(Effect.acquireRelease(
      Queue.unbounded<Effect.Effect<never, FileWatcherError, Chunk.Chunk<FileSystemEvent>>>(),
      (queue) => Queue.shutdown(queue)
    ))

    const handleSubscription = (
      error: Error | null,
      events: ReadonlyArray<ParcelWatcher.Event>
    ) => {
      if (error) {
        const failure = Effect.fail(new FileWatcherError({ error }))
        runFork(Queue.offer(queue, failure))
      } else {
        const normalizedEvents = Effect.succeed(normalizeEvents(events))
        runFork(Queue.offer(queue, normalizedEvents))
      }
    }

    yield* _(Effect.acquireRelease(
      Effect.promise(() => ParcelWatcher.subscribe(directory, handleSubscription, options)),
      (subscription) => Effect.promise(() => subscription.unsubscribe())
    ))

    return Stream.repeatEffectChunk(Effect.flatten(Queue.take(queue)))
  }).pipe(Stream.unwrapScoped)

const normalizeEvents = (
  events: ReadonlyArray<ParcelWatcher.Event>
): Chunk.Chunk<FileSystemEvent> =>
  Chunk.fromIterable(events).pipe(Chunk.map((event) => normalizeEvent(event)))

const normalizeEvent = (event: ParcelWatcher.Event) => {
  switch (event.type) {
    case "create": {
      return FileSystemEvent.FileCreated({ path: event.path })
    }
    case "update": {
      return FileSystemEvent.FileUpdated({ path: event.path })
    }
    case "delete": {
      return FileSystemEvent.FileDeleted({ path: event.path })
    }
  }
}

export const watchStream = (
  directory: string,
  options?: ParcelWatcher.Options
): Stream.Stream<never, FileWatcherError, FileSystemEvent> =>
  Stream.asyncScoped<never, FileWatcherError, FileSystemEvent>((emit) =>
    Effect.acquireRelease(
      Effect.promise(() =>
        ParcelWatcher.subscribe(directory, (error, events) => {
          if (error) {
            emit.fail(new FileWatcherError({ error }))
          } else {
            emit.chunk(normalizeEvents(events))
          }
        }, options)
      ),
      (subscription) => Effect.promise(() => subscription.unsubscribe())
    )
  )

watch("./src").pipe(
  Stream.tap((event) => Console.log(event)),
  Stream.runDrain,
  Effect.runFork
)
