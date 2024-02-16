import { Data, Effect } from "effect"
import * as fs from "node:fs"

// =============================================================================
// Single-Shot Callbacks
// =============================================================================

export class ReadFileError extends Data.TaggedError("ReadFileError")<{
  readonly error: Error
}> {}

export const readFile = (path: fs.PathOrFileDescriptor) =>
  Effect.async<Uint8Array, ReadFileError>((resume) => {
    fs.readFile(path, (error, data) => {
      if (error) {
        resume(Effect.fail(new ReadFileError({ error })))
      } else {
        resume(Effect.succeed(data))
      }
    })
  })
