import { Console, Data, Effect } from "effect"

// Exercise Summary:
//
// In long-lived applications, we often want to cache the results of certain
// computations for a period of time. The following exercise will explore how we
// can utilize Effect's `Cache` module to cache any effectful computation.
//
// Your goal will be to add the requisite code to the program below to ensure
// that the following requirements are met:
//
//   - The results of the `executeJob` should be cached so that subsequent calls
//     with the same `Job` will immediately return the previously computed value
//   - We can cache the results of 100 jobs
//   - A `Job` should be allowed to re-run once per day

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
  // ===========================================================================
  // Your code here
  // ===========================================================================
  yield* _(Effect.log("Starting job execution..."))
  const first = yield* _(
    Effect.forEach(jobs, (job) => executeJob(job), { concurrency: "unbounded" })
  )
  yield* _(Effect.log("Job execution complete"))
  yield* _(Console.log(first))

  yield* _(Effect.log("Starting job execution..."))
  const second = yield* _(
    Effect.forEach(jobs, (job) => executeJob(job), { concurrency: "unbounded" })
  )
  yield* _(Effect.log("Job execution complete"))
  yield* _(Console.log(second))
})

program.pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
