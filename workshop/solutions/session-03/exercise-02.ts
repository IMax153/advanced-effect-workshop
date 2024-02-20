import { Cache, Console, Data, Effect } from "effect"

export class Job extends Data.Class<{
  readonly id: number
  readonly text: string
}> {}

export const executeJob = (job: Job): Effect.Effect<void> =>
  Effect.log(`Running job ${job.id}...`).pipe(
    Effect.zipRight(Effect.sleep(`${job.text.length} seconds`)),
    Effect.as(job.text.length)
  )

const program = Effect.gen(function*(_) {
  const jobs = [
    new Job({ id: 1, text: "I" }),
    new Job({ id: 2, text: "love" }),
    new Job({ id: 3, text: "Effect" }),
    new Job({ id: 4, text: "!" })
  ]
  const cache = yield* _(Cache.make({
    capacity: 100,
    timeToLive: "1 days",
    lookup: executeJob
  }))
  // ===========================================================================
  // Your code here
  // ===========================================================================
  yield* _(Effect.log("Starting job execution..."))
  const first = yield* _(
    Effect.forEach(jobs, (job) => cache.get(job), { concurrency: "unbounded" })
  )
  yield* _(Effect.log("Job execution complete"))
  yield* _(Console.log(first))

  yield* _(Effect.log("Starting job execution..."))
  const second = yield* _(
    Effect.forEach(jobs, (job) => cache.get(job), { concurrency: "unbounded" })
  )
  yield* _(Effect.log("Job execution complete"))
  yield* _(Console.log(second))
})

program.pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
