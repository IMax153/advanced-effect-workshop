import type * as ParcelWatcher from "@parcel/watcher"
import { Chunk, Console, Data, Effect, Stream } from "effect"

// Exercise Summary:
//
// The following exercise will explore how we can wrap the `@parcel/watcher`
// `subscribe` function using Effect. In the default implementation, we will
// utilize a `Queue` to manage file system events emitted by `@parcel/watcher`.
//
// As a bonus, you can attempt a second implementation of wrapping `subscribe`
// without using a `Queue` (hint: take a look at `Stream.asyncScoped`).

declare const watch: (
  directory: string,
  options?: ParcelWatcher.Options
) => Stream.Stream<FileSystemEvent, FileWatcherError>
// Complete the implementation of `watch`. Your implementation should:
//   - Properly manage the subscription resource returned from `ParcelWatcher.subscribe`
//   - Write file system events emitted by the subscription into a `Queue`
//   - Starve the queue using a `Stream`

watch("./src").pipe(
  Stream.tap((event) => Console.log(event)),
  Stream.runDrain,
  Effect.runFork
)

// Bonus Exercise:
//   - Implement the same functionality as above without using `Queue`
// declare const watchStream: (
//   directory: string,
//   options?: ParcelWatcher.Options
// ) => Stream.Stream<FileSystemEvent, FileWatcherError> =>

// =============================================================================
// File Watcher Models
// =============================================================================

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
