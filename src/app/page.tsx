"use client"

import Deferred from "@/assets/deferred.png"
import EffectRuntime from "@/assets/effect_runtime.png"
import MaxwellBrown from "@/assets/maxwell_brown.jpeg"
import MichaelArnaldi from "@/assets/michael_arnaldi.png"
import Queue from "@/assets/queue.png"
import ScopeExtend from "@/assets/scope_extend.png"
import ScopeFork from "@/assets/scope_fork.png"
import TimSmart from "@/assets/tim_smart.jpg"
import TraceSpan from "@/assets/trace_span.png"
import TraceWaterfall from "@/assets/trace_waterfall.png"
import CodeSample from "@/components/CodeSample"
import InlineCode from "@/components/InlineCode"
import SessionSchedule from "@/components/SessionSchedule"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import React from "react"

const Presentation = dynamic(() => import("@/components/Presentation"), { ssr: false })

const Slides: React.FC = () => {
  const codeExercises = {
    sessionOne: {
      exerciseZero: `
declare const sleep: (millis: number) => Effect<void>
      `,
      exerciseOne: `
declare const captureEvents: (
  emitter: EventEmitter,
  eventName: string
) => Stream<Event, EmissionError>
      `
    },
    sessionTwo: {
      exerciseZero: `
const maybeFail = Random.next.pipe(Effect.filterOrFail(
  (n) => n > 0.5,
  (n) => \`Failed with \${n}\`
))
      `,
      exerciseOne: `
export const doSomeWork = (value: number) =>
  Effect.log(\`Consuming value '\${value}'\`).pipe(
    Effect.delay("20 millis")
  )
      `
    },
    sessionThree: {
      exerciseZero: `
const GetPokemonByIdResolver = RequestResolver.makeBatched((
  requests: ReadonlyArray<GetPokemonById>
) => { /* Implementation */ })
      `,
      exerciseOne: `
import { Data, Effect } from "effect"

class Job extends Data.Class<{
  readonly id: number
  readonly text: string
}> {}

const executeJob = (job: Job): Effect.Effect<void> =>
  Effect.log(\`Running job \${job.id}...\`).pipe(
    Effect.zipRight(Effect.sleep(\`\${job.text.length} seconds\`)),
    Effect.as(job.text.length)
  )
      `
    },
    sessionFour: {
      exerciseZero: `
const makeBatchedLogger = (config: {
  readonly window: DurationInput
}) =>
  Effect.gen(function*(_) {
    const logger: Logger<unknown, void> =
      // Implementation
    yield* _(Effect.locallyScopedWith(
      FiberRef.currentLoggers,
      HashSet.add(logger)
    ))
  })
      `,
      exerciseOne: `
declare const makeMetricLogger: (
  counter: Metric.Counter<number>,
  logLevelLabel: string
) => Logger<unknown, void>
    `,
      exerciseTwoPartOne: `
declare const trackSuccessfulRequests: (
  method: string,
  route: string
) => <A, E, R>(
  self: Effect<A, E, R>
) => Effect<A, E, R>
    `,
      exerciseTwoPartTwo: `
declare const trackMethodFrequency: (
  method: string,
  route: string
) => <A, E, R>(
  self: Effect<A, E, R>
) => Effect<A, E, R>
    `
    }
  } as const

  const codeExamples = {
    sessionOne: {
      promise: `
import { Effect } from "effect"

Effect.promise((signal) => fetch("https://my-api.org", {
  signal
}))
      `,
      tryPromise: `
import { Data, Effect } from "effect"

class FetchError extends Data.TaggedError("FetchError")<{
  readony error: unknown
}> {}

Effect.tryPromise({
  try: (signal) => fetch("https://my-api.org", { signal }),
  catch: (error) => new FetchError({ error })
})
      `,
      effectAsync: `
import { Data, Effect } from "effect"
import * as fs from "node:fs"

export const readFile = (path: fs.PathOrFileDescriptor) =>
  Effect.async<Uint8Array, string>((resume) => {
    fs.readFile(path, (error, data) => {
      if (error) {
        const message = \`Failed to read file at path \${path}\`
        resume(Effect.fail(message))
      } else {
        resume(Effect.succeed(data))
      }
    })
  })
      `,
      streamAsync: `
import { Stream } from "effect"
import type { EventEmitter } from "node:events"

export const captureEvents = (
  emitter: EventEmitter,
  eventName: string
) =>
  Stream.async<unknown>((emit) => {
    emitter.on(eventName, (data) => {
      emit.single(data)
    })
  })
        `
    },
    sessionTwo: {
      deferred: `
import { Console, Deferred, Effect, Fiber } from "effect"

const program = Effect.gen(function*(_) {
  const deferred = yield* _(Deferred.make<string>())

  const fiber = yield* _(Effect.fork(Deferred.await(deferred)))

  yield* _(
    Deferred.succeed(deferred, "Hello, World!"),
    Effect.delay("1 seconds"),
    Effect.fork
  )

  const result = yield* _(Fiber.join(fiber))

  yield* _(Console.log(result))
})

// After 1 second - "Hello, World!"
Effect.runFork(program)
      `
    },
    sessionThree: {
      request: `
interface Request<out A, out E = never> {}
      `,
      requestWithInterface: `
import { Data, Request } from "effect"

class Todo extends Data.TaggedClass("Todo")<{
  readonly id: number
  readonly text: string
}> {}

class TodoError extends Data.TaggedError("TodoError")<{
  readonly message: string
}> {}

interface GetTodoById
  extends Request.Request<Todo, TodoError> {
  readonly _tag: "GetTodoById"
  readonly id: number
}

const GetTodoById = Request.tagged<GetTodoById>("GetTodoById")
      `,
      requestWithClass: `
import { Data, Request } from "effect"

class Todo extends Data.TaggedClass("Todo")<{
  readonly id: number
  readonly text: string
}> {}

class TodoError extends Data.TaggedError("TodoError")<{
  readonly message: string
}> {}

class GetTodoById extends Request.TaggedClass("GetTodoById")<
  TodoError,
  Todo,
  { readonly id: number }
> {}
      `,
      requestResolverUnbatched: `
import { RequestResolver } from "effect"
import { GetTodoById, Todo, TodoError } from "./Todo"

declare const getById: (id: number) => Effect.Effect<Todo, TodoError>

const GetTodoByIdResolver = RequestResolver.fromEffect(
  (request: GetTodoById) => getTodoById(request.id)
)
      `,
      requestResolverBatched: `
import { RequestResolver } from "effect"
import { GetTodoById, Todo, TodoError } from "./Todo"

declare const getByIds: (ids: ReadonlyArray<number>) => Effect.Effect<
  ReadonlyArray<Todo>,
  TodoError
>

const GetTodoByIdResolver = RequestResolver.makeBatched(
  (requests: ReadonlyArray<GetTodoById>) => {
    const ids = ReadonlyArray.map(requests, (request) => request.id)
    const todos = yield* _(getByIds(ids))
    yield* _(Effect.forEach(requests, (request) => {
      const todo = todos.find((todo) => todo.id === request.id)!
      return Request.succeed(request, todo)
    }, { discard: true }))
  }
)
      `,
      requestCache: `
import { Effect } from "effect"
import { GetTodoById, GetTodoByIdResolver, Todo, TodoError } from "./Todo"

const program = Effect.gen(function*(_) {
  const cache = yield* _(Request.makeCache({
    capacity: 100,
    timeToLive: "1 days"
  }))

  const getTodoById = (id: number) => Effect.request(
    new GetTodoById({ id }),
    GetTodoByIdResolver
  ).pipe(
    Effect.withRequestCache(cache)
    Effect.withRequestCaching(true)
  )
})
      `,
      cache: `
import { Cache, Effect } from "effect"

declare const intensiveWork: (key: string) => Effect.Effect<string>

Cache.make({
  capacity: 100,
  timeToLive: "1 days",
  lookup: intensiveWork
})
      `
    },
    sessionFour: {
      logger: `
export interface Logger<Message, Output> {
  log(options: {
    readonly fiberId: FiberId
    readonly logLevel: LogLevel
    readonly message: Message
    readonly cause: Cause<unknown>
    readonly context: FiberRefs
    readonly spans: List<LogSpan.LogSpan>
    readonly annotations: HashMap<string, unknown>
    readonly date: Date
  }): Output
}
      `,
      metric: `
interface Metric<Type, In, Out> {}
      `,
      counter: `
import { Metric } from "effect"

const numberCounter = Metric.counter("request_count", {
  description: "A counter for tracking requests"
})

const bigintCounter = Metric.counter("error_count", {
  description: "A counter for tracking errors",
  bigint: true
})

const incrementalCounter = Metric.counter("count", {
  description: "a counter that only increases its value",
  incremental: true
})
      `,
      gauge: `
import { Metric } from "effect"

const numberGauge = Metric.gauge("memory_usage", {
  description: "A gauge for memory usage"
})

const bigintGauge = Metric.gauge("cpu_load", {
  description: "A gauge for CPU load",
  bigint: true
})
      `,
      histogram: `
import { Metric, MetricBoundaries } from "effect"

const latencyHistogram = Metric.histogram(
  "request_latency",
  MetricBoundaries.linear({ start: 75, width: 25, count: 15 })
)

const timer = Metric.timerWithBoundaries(
  "timer",
  [50, 75, 100, 150, 200, 250, 300, 350, 400]
)
      `,
      summary: `
const responseTimeSummary = Metric.summary({
  name: "response_time",
  maxAge: "1 days",
  maxSize: 100,
  error: 0.03,
  quantiles: [0.1, 0.5, 0.9]
})
      `,
      frequency: `
const methodFrequency = Metric.frequency("http_method")
      `,
      tracing: `
const program = Effect.log("Some event occurred!").pipe(
  Effect.delay("100 millis"),
  Effect.zipLeft(Effect.annotateCurrentSpan("key", "value")),
  Effect.withSpan("myspan")
)
      `
    }
  } as const

  return (
    <Presentation>
      <section>
        <h1>Advanced Effect Workshop</h1>
        <p>Maxwell Brown</p>
      </section>

      <section>
        <h3 className="text-left">About Me</h3>
        <div className="grid grid-cols-2 gap-4 place-items-center">
          <ul className="space-y-4">
            <li>Based in the U.S.A</li>
            <li className="fragment">Senior DevOps Engineer</li>
            <li className="fragment">Effect Core Contributor</li>
            <li className="fragment">Author of Effect CLI</li>
            <li className="fragment">Fun Fact</li>
          </ul>
          <Image
            src={MaxwellBrown}
            alt="A picture of Maxwell Brown, the facilitator for the Advanced Effect Workshop at Effect Days Vienna 2024"
            width={400}
            height={400}
          />
        </div>
      </section>

      <section>
        <h3>Other Workshop Facilitators</h3>
        <div className="flex flex-row items-start justify-center gap-8">
          <div className="flex flex-col items-center">
            <Image
              src={MichaelArnaldi}
              alt="A picture of Michael Arnaldi, another workshop facilitator for the Advanced Effect Workshop at Effect Days Vienna 2024"
              width={400}
              height={400}
              className="fragment align-middle"
            />
            <p className="prose prose-2xl prose-invert">Michael Arnaldi</p>
          </div>
          <div className="flex flex-col items-center">
            <Image
              src={TimSmart}
              alt="A picture of Tim Smart, another workshop facilitator for the Advanced Effect Workshop at Effect Days Vienna 2024"
              width={400}
              height={400}
              className="fragment"
            />
            <p className="prose prose-2xl prose-invert">Tim Smart</p>
          </div>
        </div>
      </section>

      <section>
        <h3>Workshop Goals and Objectives</h3>
        <div className="text-left mx-20">
          <p>
            What we <span className="font-bold underline underline-offset-2">WILL</span> be doing:
          </p>
          <ul className="prose-2xl">
            <li className="mx-4">Exploring advanced concepts within Effect</li>
            <li className="mx-4">Learning reusable design patterns</li>
            <li className="mx-4">Participating in hands-on coding exercises</li>
            <li className="mx-4">Enjoying ourselves while working together!</li>
          </ul>
          <p className="mt-4">
            What we <span className="font-bold underline underline-offset-2">WILL NOT</span>{" "}
            be doing:
          </p>
          <ul className="prose-2xl">
            <li className="mx-4">Building a full-blown, real-world application from scratch</li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Workshop Code</h3>
        <div className="text-left mx-20">
          <p className="font-bold italic">Exercises & Sample Code</p>
          <p className="prose-xl !my-2">
            <Link href="https://github.com/IMax153/advanced-effect-workshop">
              https://github.com/IMax153/advanced-effect-workshop
            </Link>
          </p>
          <ul className="prose-2xl">
            <li>Clone and setup the project locally (optionally via Nix & Direnv)</li>
            <li>Open the project in Gitpod (recommended)</li>
            <li>Open the project in Stackblitz</li>
          </ul>
          <p className="font-bold italic">Example Application</p>
          <p className="prose-xl !my-2">
            <Link href="https://github.com/IMax153/advanced-effect-workshop">
              https://github.com/IMax153/effect-openai
            </Link>
          </p>
          <ul className="prose-2xl">
            <li>
              Contains a sample CLI application which incorporates many of the concepts we will
              review today
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h2>Workshop Schedule</h2>
      </section>

      <section>
        <h3>Session One</h3>
        <SessionSchedule
          title="Advanced Patterns for Service Construction and Resource Management"
          from="9:30 AM"
          to="11:00 AM"
          objectives={[
            <>Learn patterns for integrating with external libraries</>,
            <>
              Utilize a custom <InlineCode>Runtime</InlineCode> for executing Effects
            </>,
            <>
              Use <InlineCode>FiberSet</InlineCode> / <InlineCode>FiberMap</InlineCode>{" "}
              to group fibers
            </>
          ]}
          project="Build an Express server with Effect"
        />
      </section>

      <section>
        <h3>Session Two</h3>
        <SessionSchedule
          title="Exploring Fiber Synchronization and Coordination"
          from="11:15 AM"
          to="12:30 PM"
          objectives={[
            <>
              Basic fiber synchronization with <InlineCode>Deferred</InlineCode>
            </>,
            <>
              Communicate between fibers with <InlineCode>Queue</InlineCode>
            </>,
            <>
              Use <InlineCode>Deferred</InlineCode> and <InlineCode>Queue</InlineCode>{" "}
              to coordinate work between fibers
            </>,
            <>
              Share a <InlineCode>Scope</InlineCode> between running fibers
            </>
          ]}
          project="Build a RateLimiter"
        />
      </section>

      <section>
        <h3>Session Three</h3>
        <SessionSchedule
          title="Leveraging Batching and Caching with Requests"
          from="14:00 PM"
          to="15:30 PM"
          objectives={[
            <>
              Explore advanced usage patterns of Effect&apos;s built-in{" "}
              <InlineCode>Request</InlineCode>
            </>,
            <>Understanding Effect&apos;s built-in batching &amp; caching APIs</>,
            <>
              Optimize performance by <InlineCode>Cache</InlineCode>-ing computations
            </>,
            <>
              Create a custom <InlineCode>RequestResolver</InlineCode>
            </>
          ]}
          project="Build a RequestResolver implementing the data-loader pattern"
        />
      </section>

      <section>
        <h3>Session Four</h3>
        <SessionSchedule
          title="Deep Dive into Observability and Monitoring"
          from="15:45 PM"
          to="17:00 PM"
          objectives={[
            <>
              Create a custom <InlineCode>Logger</InlineCode> for your Effect application
            </>,
            <>Explore Effect&apos;s Metric API</>,
            <>Trace application execution with Effect</>,
            <>Integrate with external monitoring tools</>
          ]}
          project="Demo integrating Effect with observability & monitoring tools"
        />
      </section>

      <section>
        <h2>Advanced Patterns for Service Construction and Resource Management</h2>
      </section>

      <section>
        <h3>Integrating with External APIs</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-3xl">
            <span className="font-semibold">Option 1</span>: The One-Off Approach
          </p>
          <ul className="prose-2xl">
            <li className="mx-4">i.e. writing one-off wrappers for client methods</li>
          </ul>
          <p className="text-3xl">
            <span className="font-semibold">Option 2</span>: The Flexible Approach
          </p>
          <ul className="prose-2xl">
            <li className="mx-4">i.e. create an Effect-based wrapper for accessing the client</li>
          </ul>
          <p className="text-3xl">
            <span className="font-semibold">Option 3</span>: The All-In-On-Effect Approach
          </p>
          <ul className="prose-2xl">
            <li className="mx-4">i.e. wrap every client method into Effect</li>
          </ul>
        </div>
      </section>

      <section>
        <h2>But how do we actually wrap external APIs with Effect?</h2>
      </section>

      <section>
        <h3>Promise-Based APIs</h3>
        <CodeSample className="my-16" lineNumbers="">{codeExamples.sessionOne.promise}</CodeSample>
      </section>

      <section>
        <h3>Promise-Based APIs</h3>
        <CodeSample lineNumbers="|3-5|8|9">{codeExamples.sessionOne.tryPromise}</CodeSample>
      </section>

      <section>
        <h3>Callback-Based APIs</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-3xl">Questions to ask yourself:</p>
          <ul className="prose-2xl">
            <li className="mx-4">Is the callback-based API single-shot?</li>
            <li className="mx-4">Is the callback-based API multi-shot?</li>
            <li className="mx-4">Is the callback-based API an execution boundary?</li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Single-Shot Callbacks</h3>
        <CodeSample lineNumbers="|5|6|7-9|10-12">{codeExamples.sessionOne.effectAsync}</CodeSample>
      </section>

      <section>
        <h3>Effect.async Methods</h3>
        <table className="table-auto !mb-8">
          <tr>
            <th className="prose-2xl">Method</th>
            <th className="prose-2xl">Description</th>
          </tr>
          <tr>
            <td className="prose-lg">
              <InlineCode>Effect.async</InlineCode>
            </td>
            <td className="prose-lg">
              Useful when you need to import an asynchronous callback into an Effect
            </td>
          </tr>
          <tr>
            <td className="prose-lg">
              <InlineCode>Effect.asyncEffect</InlineCode>
            </td>
            <td className="prose-lg">
              Useful for when importing the callback requires an effectful operation
            </td>
          </tr>
        </table>
        <p className="text-3xl">Both methods can optionally return a cleanup Effect.</p>
        <p className="text-3xl">The cleanup will be run when the fiber is interrupted.</p>
      </section>

      <section>
        <h3>Quick Coding Exercise</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            The goal of this exercise is explore how we can utilize the{" "}
            <InlineCode>Effect.async</InlineCode>{" "}
            family of constructors to import asynchronous callbacks into an Effect.
          </p>
          <p className="text-2xl">
            The requirements of the exercise are to implement a sleep method which:
          </p>
          <ul className="text-2xl !ml-12">
            <li>Takes a number of milliseconds as an argument</li>
            <li>Suspend the current fiber for the specified number of milliseconds</li>
          </ul>
          <CodeSample>{codeExercises.sessionOne.exerciseZero}</CodeSample>
        </div>
      </section>

      <section>
        <h3>Multi-Shot Callbacks</h3>
        <CodeSample lineNumbers="|8|9-11|10">{codeExamples.sessionOne.streamAsync}</CodeSample>
      </section>

      <section>
        <h3>Stream.async Methods</h3>
        <table className="table-auto !mb-8">
          <tr>
            <th className="prose-2xl">Method</th>
            <th className="prose-2xl">Description</th>
          </tr>
          <tr>
            <td className="prose-lg">
              <InlineCode>Stream.async</InlineCode>
            </td>
            <td className="prose-lg">
              Useful when you need to import an asynchronous callback into a Stream
            </td>
          </tr>
          <tr>
            <td className="prose-lg">
              <InlineCode>Stream.asyncEffect</InlineCode>
            </td>
            <td className="prose-lg">
              Useful for when importing the callback requires an effectful operation
            </td>
          </tr>
          <tr>
            <td className="prose-lg">
              <InlineCode>Stream.asyncScoped</InlineCode>
            </td>
            <td className="prose-lg">
              Useful for when importing the callback requires an scoped resource
            </td>
          </tr>
        </table>
      </section>

      <section>
        <h3>Quick Coding Exercise</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            The goal of this exercise is explore how we can utilize the{" "}
            <InlineCode>Stream.async</InlineCode>{" "}
            family of constructors to import asynchronous callbacks into an Stream.
          </p>
          <p className="text-2xl">
            The requirements of the exercise are to implement a{" "}
            <InlineCode>captureEvents</InlineCode> method which:
          </p>
          <ul className="text-2xl !ml-12">
            <li>
              Takes an <InlineCode>EventEmitter</InlineCode> and an{" "}
              <InlineCode>eventName</InlineCode> as arguments
            </li>
            <li>Handles pushing successful event emissions into a stream</li>
            <li>Fails the stream if an emission error is emitted</li>
          </ul>
          <CodeSample lineNumbers="">{codeExercises.sessionOne.exerciseOne}</CodeSample>
        </div>
      </section>

      <section>
        <h3>Execution Boundaries</h3>
        <div className="mt-12 flex justify-center">
          <Image
            src={EffectRuntime}
            alt="A diagram of the Effect Runtime, which displays a Runtime as being composed of a Context, FiberRefs, and RuntimeFlags"
            className="!my-20"
          />
        </div>
      </section>

      <section>
        <h3>Scope</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            Foundation of safe and composable resource management with Effect
          </p>
          <p className="text-2xl">Can conceptualize a Scope as a “lifetime” where we can:</p>
          <ul className="text-2xl !ml-12">
            <li>
              Add “finalizers” to the <InlineCode>Scope</InlineCode>
            </li>
            <li>
              Close the <InlineCode>Scope</InlineCode>
            </li>
          </ul>
          <p className="text-2xl">
            Less common but powerful <InlineCode>Scope</InlineCode> operators:
          </p>
          <ul className="text-2xl !ml-12">
            <li>
              <InlineCode>Scope.extend</InlineCode>
            </li>
            <li>
              <InlineCode>Scope.fork</InlineCode>
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Extending a Scope</h3>
        <div className="mt-12 flex justify-center">
          <Image
            src={ScopeExtend}
            alt="A diagram which demonstrates how a Scope can be extended to other Effect workflows"
          />
        </div>
      </section>

      <section>
        <h3>Forking a Scope</h3>
        <div className="mt-12 flex justify-center">
          <Image
            src={ScopeFork}
            alt="A diagram which demonstrates how a Scope can be forked to create child scopes"
            height={800}
            width={800}
          />
        </div>
      </section>

      <section>
        <h2>Session Project</h2>
      </section>

      <section>
        <h3>Build an Express server with Effect</h3>
        <div className="text-left">
          <p className="text-2xl">
            Build a simple Express REST API that performs CRUD operations against a{" "}
            <InlineCode>TodoRepository</InlineCode>. The implementations for the{" "}
            <InlineCode>Todo</InlineCode> models, the{" "}
            <InlineCode>TodoRepository</InlineCode>, and the Express service have already been
            provided for you.
          </p>
          <p className="text-2xl">This project will be divided into three stages.</p>
        </div>
      </section>

      <section>
        <h3>Stage 1: Build the Express Server</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            In this stage, the goal will be to implement the listening functionality of the Express
            server. Your implementation should:
          </p>
          <ul className="text-2xl !ml-12">
            <li>Use the Express service to gain access to the Express application</li>
            <li>Properly manage the open / close lifecycle of the Express server</li>
            <li>
              Utilize <InlineCode>Effect.log</InlineCode>{" "}
              to log a message to the console after the server has started listening
            </li>
          </ul>
          <p className="text-2xl">
            <span className="font-bold underline">Hints</span>:
          </p>
          <ul className="text-2xl !ml-12">
            <li>
              To be able to <InlineCode>Effect.log</InlineCode>{" "}
              inside the listen callback, it may be helpful to use <InlineCode>Runtime</InlineCode>
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Stage 2: Create a Route</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            In this stage, the goal will be to implement a single{" "}
            <InlineCode>GET /todos/:id</InlineCode>{" "}
            route for our server. Your implementation should:
          </p>
          <ul className="text-2xl !ml-12">
            <li>
              Implement the <InlineCode>Layer</InlineCode>{" "}
              which adds the specified route to the Express application
            </li>
            <li>
              If the <InlineCode>Todo</InlineCode> specified in the request is found, return the
              {" "}
              <InlineCode>Todo</InlineCode> as JSON
            </li>
            <li>
              If the <InlineCode>Todo</InlineCode> specified in the request is not found, return a
              {" "}
              <InlineCode>404</InlineCode> status code along with the message{" "}
              <InlineCode>Todo $&#123;todoId&#125; not found</InlineCode>
            </li>
          </ul>
          <p className="text-2xl">
            <span className="font-bold underline">Hints</span>:
          </p>
          <ul className="text-2xl !ml-12">
            <li>
              To be able to implement Effect workflows inside a route handler, it may be helpful to
              use <InlineCode>Runtime</InlineCode>
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Stage 3: Complete all Routes</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            In this stage, the goal will be to finish implementing the routes of your Express
            server. You can use whatever logic you think appropriate within each of the remaining
            routes! The only requirement of your implementation is:
          </p>
          <ul className="text-2xl !ml-12">
            <li>Each of the remaining routes of our Express server should be completed</li>
          </ul>
          <p className="text-2xl">
            <span className="font-bold underline">Bonus</span>:
          </p>
          <ul className="text-2xl !ml-12">
            <li>
              Use a <InlineCode>FiberSet</InlineCode> instead of <InlineCode>Runtime</InlineCode>
              {" "}
              within the request handlers
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h2>Exploring Fiber Synchronization and Coordination</h2>
      </section>

      <section>
        <h3>Deferred</h3>
        <div className="text-left mx-16 mt-10">
          <ul className="text-2xl !ml-12 space-y-8">
            <li>Purely functional synchronization primitive</li>
            <li>Represents a single value that may or may not yet be available</li>
            <li>Semantics</li>
            <ul className="text-xl space-y-4">
              <li>Always starts empty</li>
              <li>Can be completed exactly once at some point in the future</li>
              <li>Unalterable after completion</li>
            </ul>
            <li>
              Useful for forcing a <InlineCode>Fiber</InlineCode> to wait for something to happen
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Deferred Example</h3>
        <div className="flex justify-center">
          <CodeSample className="text-sm" lineNumbers="|4|6|8-12|14|16|20">
            {codeExamples.sessionTwo.deferred}
          </CodeSample>
        </div>
      </section>

      <section>
        <h3>Deferred Example</h3>
        <div className="flex justify-center">
          <Image
            src={Deferred}
            alt="A diagram which demonstrates how a Deferred can be used to force a Fiber to wait for some condition to occur"
          />
        </div>
      </section>

      <section>
        <h3>Quick Coding Exercise</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            The goal of this exercise is to explore how we can utilize a{" "}
            <InlineCode>Deferred</InlineCode> to propagate the result of an Effect between fibers.
          </p>
          <p className="text-2xl">The requirements of the exercise are as follows:</p>
          <ul className="text-2xl !ml-12">
            <li>
              Propagate the full result of <InlineCode>maybeFail</InlineCode>{" "}
              from the child fiber back to the parent
            </li>
            <li>
              Should <span className="font-bold">NOT</span> utilize{" "}
              <InlineCode>Effect.intoDeferred</InlineCode>
            </li>
          </ul>
          <CodeSample>{codeExercises.sessionTwo.exerciseZero}</CodeSample>
        </div>
      </section>

      <section>
        <h3>Queue</h3>
        <div className="text-left mx-16 mt-10">
          <ul className="text-2xl !ml-12 space-y-8">
            <li>Lightweight, in-memory, fully asynchronous queuing of elements</li>
            <li>Capable of transparent back-pressure</li>
            <li>
              Builds upon <InlineCode>Deferred</InlineCode>
            </li>
            <li>Provides two fundamental operations:</li>
            <ul className="text-xl space-y-4">
              <li>
                <InlineCode>Queue.offer</InlineCode>
              </li>
              <li>
                <InlineCode>Queue.take</InlineCode>
              </li>
            </ul>
          </ul>
        </div>
      </section>

      <section>
        <h3>Queue Types</h3>
        <div className="flex justify-center">
          <Image
            src={Queue}
            alt="A diagram which displays the four types of Queue constructors - unbounded, bounded, sliding, and dropping"
            height={800}
            width={800}
          />
        </div>
      </section>

      <section>
        <h3>Coding Exercise</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            The goal of this exercise is to explore how we can distribute work between multiple
            fibers using{" "}
            <InlineCode>Queue</InlineCode>. We will create three separate implementations of a
            “worker” that take a value from a <InlineCode>Queue</InlineCode>{" "}
            and perform some work on the value.
          </p>
          <p className="text-2xl">The requirements of the exercise are as follows:</p>
          <ul className="text-2xl !ml-12">
            <li>One worker should take and process work sequentially</li>
            <li>One worker should take and process work with unbounded concurrency</li>
            <li>One worker should take and process work with bounded concurrency</li>
          </ul>
          <CodeSample>{codeExercises.sessionTwo.exerciseOne}</CodeSample>
        </div>
      </section>

      <section>
        <h3>Queue &amp; Deferred</h3>
        <div className="text-left mx-16 mt-10">
          <ul className="text-2xl !ml-12 space-y-8">
            <li>
              Distributing work to separate fibers with a <InlineCode>Queue</InlineCode>{" "}
              can be problematic
            </li>
            <ul className="text-xl space-y-4">
              <li>What if we want access to the result to perform some further work?</li>
            </ul>
            <li>
              Can be solved by including a <InlineCode>Deferred</InlineCode> alongside each{" "}
              <InlineCode>Queue</InlineCode> element
            </li>
            <ul className="text-xl space-y-4">
              <li>
                <InlineCode>Queue.take</InlineCode> where you want to perform the work
              </li>
              <li>
                <InlineCode>Deferred.complete</InlineCode> with the result
              </li>
              <li>
                <InlineCode>Deferred.await</InlineCode> where you need the result
              </li>
            </ul>
            <li>Extremely common pattern used throughout the Effect ecosystem</li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Coding Exercise</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            The goal of this exercise is to explore how we can distribute work between multiple
            fibers using <InlineCode>Queue</InlineCode>{" "}
            and retrieve the result access to the results of said work with{" "}
            <InlineCode>Deferred</InlineCode>. Our sample program will setup a classic producer /
            consumer relationship between fibers.
          </p>
          <p className="text-2xl">The requirements of the exercise are as follows:</p>
          <ul className="text-2xl !ml-12">
            <li>
              Implement <InlineCode>produceWork</InlineCode>
            </li>
            <ul className="text-xl">
              <li>
                Offer entries of work into the <InlineCode>Queue</InlineCode>
              </li>
              <li>Wait for the result of the work to be available</li>
            </ul>
            <li>
              Implement <InlineCode>consumeWork</InlineCode>
            </li>
            <ul className="text-xl">
              <li>
                Take work from the <InlineCode>Queue</InlineCode>
              </li>
              <li>
                Utilize <InlineCode>performWork</InlineCode> to perform work on the taken value
              </li>
              <li>
                Propagate the result of <InlineCode>performWork</InlineCode> back to the producer
              </li>
              <li>Work should be consumed continuously and with unbounded concurrency</li>
            </ul>
          </ul>
        </div>
      </section>

      <section>
        <h2>Session Project</h2>
      </section>

      <section>
        <h3>Build a RateLimiter</h3>
        <div className="text-left">
          <p className="text-2xl">
            In this session project, we will build a simple <InlineCode>RateLimiter</InlineCode>
            {" "}
            service, which we will model as a factory of <InlineCode>RateLimiter</InlineCode>s.
          </p>
          <p className="text-2xl">
            The <InlineCode>RateLimiter</InlineCode> and{" "}
            <InlineCode>RateLimiter.Factory</InlineCode>{" "}
            service interfaces, as well as the corresponding <InlineCode>Context</InlineCode>{" "}
            definitions are provided for you.
          </p>
          <p className="text-2xl">
            Your job will be to implement the <InlineCode>RateLimiter.make</InlineCode> constructor.
          </p>
          <p className="text-2xl">This project will be divided into three stages.</p>
        </div>
      </section>

      <section>
        <h3>Stage 1: Implement the Take</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            In this stage, the goal will be to implement the “take” method on{" "}
            <InlineCode>RateLimiter</InlineCode> which functionally &quot;takes&quot; from the{" "}
            <InlineCode>RateLimiter</InlineCode> until the{" "}
            <InlineCode>RateLimiter</InlineCode>s limit is reached. Your implementation should:
          </p>
          <ul className="text-2xl !ml-12">
            <li>
              Functionally &quot;takes&quot; from the{" "}
              <InlineCode>RateLimiter</InlineCode>s available request limit
            </li>
            <li>Allow the request to proceed if the limit is not reached</li>
            <li>Wait for the reset window to pass if the request limit is reached</li>
          </ul>
          <p className="text-2xl">
            <span className="font-bold underline">Hints</span>:
          </p>
          <ul className="text-2xl !ml-12">
            <li>
              It may be useful to model the collection of &quot;takers&quot; as a{" "}
              <InlineCode>Queue</InlineCode> of <InlineCode>Deferred</InlineCode>
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Stage 2: Implement the Reset</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            In this stage, the goal will be to implement the reset functionality of the{" "}
            <InlineCode>RateLimiter</InlineCode>. The <InlineCode>RateLimiter</InlineCode>{" "}
            should be reset after the window duration has passed. Your implementation should:
          </p>
          <ul className="text-2xl !ml-12">
            <li>Track the current count of takers against the limit</li>
            <li>Reset after the window duration has passed</li>
          </ul>
          <p className="text-2xl">
            <span className="font-bold underline">Hints</span>:
          </p>
          <ul className="text-2xl !ml-12">
            <li>
              It may be useful to model the current count of takers with a{" "}
              <InlineCode>Ref</InlineCode>
            </li>
            <li>
              Could setup the reset as a <InlineCode>Fiber</InlineCode>{" "}
              which resets the counter after a delay
            </li>
            <li>
              Consider storing the running <InlineCode>Fiber</InlineCode> in a{" "}
              <InlineCode>Ref</InlineCode>
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Stage 3: Implement the Worker</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            In this stage, the goal will be to implement the{" "}
            <InlineCode>RateLimiter</InlineCode>s worker, which does the work of continuously
            checking the current count of takers against the{" "}
            <InlineCode>RateLimiter</InlineCode>s limit, controlling which requests are able to
            execute, and executing the reset when necessary. Your implementation should:
          </p>
          <ul className="text-2xl !ml-12">
            <li>
              Continuously poll the count of takers to determine if the{" "}
              <InlineCode>RateLimiter</InlineCode> needs to be reset
            </li>
            <li>
              Reset the{" "}
              <InlineCode>RateLimiter</InlineCode>, if required, once the window has passed
            </li>
            <li>Allow requests to execute if the limit has not been reached</li>
            <li>Prevent requests from executing unless if the limit has been reached</li>
          </ul>
          <p className="text-2xl">
            <span className="font-bold underline">Hints</span>:
          </p>
          <ul className="text-2xl !ml-12">
            <li>The worker should be forked into a background fiber</li>
          </ul>
        </div>
      </section>

      <section>
        <h2>Leveraging Batching and Caching with Requests</h2>
      </section>

      <section>
        <h3>Request</h3>
        <div className="flex justify-center">
          <CodeSample>
            {codeExamples.sessionThree.request}
          </CodeSample>
        </div>
        <div className="text-4xl">
          <p>
            <InlineCode>Request&lt;A, E&gt;</InlineCode>{" "}
            represents a request to a data source which:
          </p>
          <ul>
            <li>
              May return a value of type <InlineCode>A</InlineCode>
            </li>
            <li>
              May fail with an error of type <InlineCode>E</InlineCode>
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Request</h3>
        <div className="flex justify-center text-3xl">
          <CodeSample lineNumbers="|3-6|8-10|12|13|14-15|18">
            {codeExamples.sessionThree.requestWithInterface}
          </CodeSample>
        </div>
      </section>

      <section>
        <h3>Request</h3>
        <div className="flex justify-center text-3xl">
          <CodeSample lineNumbers="|12-16">
            {codeExamples.sessionThree.requestWithClass}
          </CodeSample>
        </div>
      </section>

      <section>
        <h3>Resolving a Request</h3>
        <div className="flex justify-center text-4xl">
          <CodeSample lineNumbers="|4|6|7">
            {codeExamples.sessionThree.requestResolverUnbatched}
          </CodeSample>
        </div>
      </section>

      <section>
        <h3>Batching Requests</h3>
        <div className="flex justify-center text-4xl">
          <CodeSample lineNumbers="|4-6|9|10|11-16">
            {codeExamples.sessionThree.requestResolverBatched}
          </CodeSample>
        </div>
      </section>

      <section>
        <h3>Coding Exercise</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            The goal of this exercise is to implement a batched{" "}
            <InlineCode>RequestResolver</InlineCode> for fetching Pokemon by their{" "}
            <InlineCode>id</InlineCode> attribute.
          </p>
          <p className="text-2xl">
            The requirements of the exercise are to complete the following:
          </p>
          <CodeSample className="text-lg">{codeExercises.sessionThree.exerciseZero}</CodeSample>
          <p className="text-2xl">
            <span className="font-bold underline">Hint</span>:
          </p>
          <ul className="text-2xl !ml-12">
            <li>
              You should complete each <InlineCode>Request</InlineCode> manually
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Request Caching</h3>
        <div className="flex justify-center text-4xl">
          <CodeSample lineNumbers="|5-8|10-13|14|15">
            {codeExamples.sessionThree.requestCache}
          </CodeSample>
        </div>
      </section>

      <section>
        <h3>Coding Exercise</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            The goal of this exercise is to implement a request cache for our Pokemon API example.
          </p>
          <p className="text-2xl">
            The requirements of the exercise are to complete the following:
          </p>
          <ul className="text-2xl !ml-12">
            <li>Create a request cache with:</li>
            <ul>
              <li>
                A <InlineCode>capacity</InlineCode> of <InlineCode>250</InlineCode>
              </li>
              <li>
                A <InlineCode>timeToLive</InlineCode> of <InlineCode>10 days</InlineCode>
              </li>
            </ul>
            <li>
              Use the request cache in <InlineCode>PokemonRepo.getById</InlineCode>{" "}
              to cache requests
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Cache</h3>
        <div className="flex justify-center">
          <CodeSample lineNumbers="|6|7|8|3">
            {codeExamples.sessionThree.cache}
          </CodeSample>
        </div>
      </section>

      <section>
        <h3>Coding Exercise</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            The goal of this exercise is to implement a <InlineCode>Cache</InlineCode> which:
          </p>
          <ul className="text-xl !ml-12">
            <li>
              Caches the result of <InlineCode>executeJob</InlineCode>{" "}
              so that subsequent calls with the same <InlineCode>Job</InlineCode>{" "}
              will immediately return the previously computed value
            </li>
            <li>
              Up to <InlineCode>100</InlineCode> jobs can be cached at a time
            </li>
            <li>
              <InlineCode>Job</InlineCode>s can be run once per day
            </li>
          </ul>
          <CodeSample className="text-base">{codeExercises.sessionThree.exerciseOne}</CodeSample>
        </div>
      </section>

      <section>
        <h2>Session Project</h2>
      </section>

      <section>
        <h3>Build a DataLoader</h3>
        <div>
          <p className="text-2xl">
            In this session project, we will build a method which will take in an existing{" "}
            <InlineCode>RequestResolver</InlineCode> and return a higher-order{" "}
            <InlineCode>RequestResolver</InlineCode>.
          </p>
          <p className="text-2xl">
            The returned <InlineCode>RequestResolver</InlineCode>{" "}
            will implement a variant of the data-loader pattern.
          </p>
          <p className="text-2xl">This project will be divided into three stages.</p>
        </div>
      </section>

      <section>
        <h3>Stage 1: Implement the Inner Resolver</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            In this stage, the goal will be to implement the &quot;inner&quot;{" "}
            <InlineCode>RequestResolver</InlineCode> which will offer{" "}
            <InlineCode>DataLoaderItem</InlineCode>s to the inner queue. Your implementation should:
          </p>
          <ul className="text-2xl !ml-12">
            <li>
              Create and offer a <InlineCode>DataLoaderItem</InlineCode> to the inner queue
            </li>
            <li>
              Wait for the result of the <InlineCode>DataLoaderItem</InlineCode> request
            </li>
          </ul>
          <p className="text-2xl">
            <span className="font-bold underline">Hints</span>:
          </p>
          <ul className="text-2xl !ml-12">
            <li>
              Remember what we learned about propagating interruption with{" "}
              <InlineCode>Deferred</InlineCode>
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Stage 2: Implement Item Batching</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            In this stage, the goal will be to implement the item batching functionality of the data
            loader. The data loader should take as many elements as possible from the queue and add
            them to the batch. Your implementation should:
          </p>
          <ul className="text-2xl !ml-12">
            <li>Add as many items from the queue to the batch</li>
            <li>Stop adding items if the max batch size is reached</li>
            <li>Stop adding items if the window duration elapses</li>
          </ul>
          <p className="text-2xl">
            <span className="font-bold underline">Hints</span>:
          </p>
          <ul className="text-2xl !ml-12">
            <li>It may be useful to implement:</li>
            <ul>
              <li>One method which takes a single item from the queue and adds it to the batch</li>
              <li>
                Another method which repeats the first method until the max batch size or window
                duration is reached
              </li>
            </ul>
          </ul>
        </div>
      </section>

      <section>
        <h3>Stage 3: Implement the Worker</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            In this stage, the goal will be to implement the data loader&apos;s worker, which does
            the work of continuously pulling items off the inner queue, runs the request in the
            item, and reports the result. Your implementation should:
          </p>
          <ul className="text-2xl !ml-12">
            <li>Continuously pull items off the inner queuea</li>
            <li>Run the request contained within the item and report the result</li>
          </ul>
          <p className="text-2xl">
            <span className="font-bold underline">Hints</span>:
          </p>
          <ul className="text-2xl !ml-12">
            <li>You should ensure batching is enabled</li>
            <li>You should ensure request caching is disabled</li>
            <li>You should consider how interruption may be propagated</li>
          </ul>
        </div>
      </section>

      <section>
        <h2>Deep Dive into Observability and Monitoring</h2>
      </section>

      <section>
        <h3>Logger</h3>
        <div className="flex justify-center">
          <CodeSample lineNumbers="|1|3|4|5|6|7|8|9|10">
            {codeExamples.sessionFour.logger}
          </CodeSample>
        </div>
      </section>

      <section>
        <h3>Coding Exercise</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            The goal of this exercise is to implement a custom <InlineCode>Logger</InlineCode>{" "}
            which batches received logs and emits them on a fixed schedule.
          </p>
          <p className="text-2xl">The requirements of the exercise are as follows:</p>
          <ul className="text-2xl !ml-12">
            <li>Collect all logs that are output in the provided window</li>
            <li>Emit all logs after the widow has elapsed</li>
          </ul>
          <CodeSample className="text-lg">{codeExercises.sessionFour.exerciseZero}</CodeSample>
        </div>
      </section>

      <section>
        <h3>Coding Exercise</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            The goal of this exercise is to implement a custom <InlineCode>Logger</InlineCode>{" "}
            which takes a <InlineCode>Counter</InlineCode> and a label for the{" "}
            <InlineCode>LogLevel</InlineCode> and updates the <InlineCode>Counter</InlineCode>{" "}
            by one when any <InlineCode>Effect.log*</InlineCode> is called.
          </p>
          <p className="text-2xl">The requirements of the exercise are as follows:</p>
          <ul className="text-2xl !ml-12">
            <li>
              Update the provided <InlineCode>Counter</InlineCode> by one when any{" "}
              <InlineCode>Effect.log*</InlineCode> is called
            </li>
            <li>
              The provided label for the <InlineCode>LogLevel</InlineCode>{" "}
              should be used to tag the counter with the log level
            </li>
          </ul>
          <CodeSample>{codeExercises.sessionFour.exerciseOne}</CodeSample>
        </div>
      </section>

      <section>
        <h3>Metric</h3>
        <CodeSample>{codeExamples.sessionFour.metric}</CodeSample>
        <p className="text-4xl">
          Represents a concurrent metric which accepts updates of type <InlineCode>In</InlineCode>
          {" "}
          and are aggregated to a stateful value of type <InlineCode>Out</InlineCode>
        </p>
      </section>

      <section>
        <h3>Supported Metrics</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            Effect has built-in support for five different types of metrics:
          </p>
          <ol className="text-xl !ml-12 space-y-8">
            <li>
              <span className="font-bold underline">Counter</span>: tracks a value that increase or
              decreases over time
            </li>
            <li>
              <span className="font-bold underline">Gauge</span>: tracks a single numeric value that
              can increase or decrease
            </li>
            <li>
              <span className="font-bold underline">Histogram</span>: tracks distribution of values
              across specific buckets
            </li>
            <li>
              <span className="font-bold underline">Summary</span>: tracks a sliding window of a
              time series
            </li>
            <li>
              <span className="font-bold underline">Frequency</span>: tracks distinct occurrences of
              a string value
            </li>
          </ol>
        </div>
      </section>

      <section>
        <h3>Counter</h3>
        <div className="flex justify-center">
          <CodeSample className="text-sm" lineNumbers="|9|14">
            {codeExamples.sessionFour.counter}
          </CodeSample>
        </div>
      </section>

      <section>
        <h3>Counter - When to Use?</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-3xl">Tracking the count of a value over time</p>
          <p className="text-2xl font-bold underline">Examples:</p>
          <ul className="text-2xl">
            <li>
              <span className="font-bold">Request Counts</span>: monitoring the number of incoming
              requests to a server
            </li>
            <li>
              <span className="font-bold">Completed Tasks</span>: tracking how many tasks or
              processes have been completed
            </li>
            <li>
              <span className="font-bold">Error Counts</span>: counting the occurence of errors in
              your application
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Gauge</h3>
        <div className="flex justify-center">
          <CodeSample className="text-md" lineNumbers="|9">
            {codeExamples.sessionFour.gauge}
          </CodeSample>
        </div>
      </section>

      <section>
        <h3>Gauge - When to Use?</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-3xl">
            Monitoring a single numeric value that can increase or decrease
          </p>
          <p className="text-2xl font-bold underline">Examples:</p>
          <ul className="text-2xl">
            <li>
              <span className="font-bold">Memory Utilization</span>: how much memory is my
              application currently utilizing
            </li>
            <li>
              <span className="font-bold">Temperature</span>: measuring the current temperature of
              your hardware
            </li>
            <li>
              <span className="font-bold">Queue Size</span>: monitoring the size of a task queue
            </li>
            <li>
              <span className="font-bold">In-Progress Requests</span>: tracking the number of
              requests currently being processed
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Histogram</h3>
        <div className="flex justify-center">
          <CodeSample className="text-md" lineNumbers="|3-6|8-11">
            {codeExamples.sessionFour.histogram}
          </CodeSample>
        </div>
      </section>

      <section>
        <h3>Histogram - When to Use?</h3>
        <div className="text-left mx-16 mt-10">
          <ul className="text-2xl">
            <li>Observe many values and later calculate percentiles</li>
            <li>When you can estimate the range of values in advance</li>
            <li>No need for granularity (i.e. bucketing is acceptable)</li>
            <li>Want to aggregate values across multiple instances</li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Summary</h3>
        <div className="flex justify-center">
          <CodeSample className="text-md">
            {codeExamples.sessionFour.summary}
          </CodeSample>
        </div>
      </section>

      <section>
        <h3>Summary - When to Use?</h3>
        <div className="text-left mx-16 mt-10">
          <ul className="text-2xl">
            <li>Range of values is not easily estimatable</li>
            <li>When you can estimate the range of values in advance</li>
            <li>No need for granularity (i.e. bucketing is acceptable)</li>
            <li>Do not need to aggregate across multiple instances</li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Frequency</h3>
        <div className="flex justify-center">
          <CodeSample className="text-md">
            {codeExamples.sessionFour.summary}
          </CodeSample>
        </div>
      </section>

      <section>
        <h3>Frequency - When to Use?</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-3xl">Useful for counting distinct string values</p>
          <p className="text-2xl font-bold underline">Examples:</p>
          <ul className="text-2xl">
            <li>Tracking invocation of remote procedure call endpoints</li>
            <li>Monitor frequency of different type of failures</li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Coding Exercise</h3>
        <div className="text-left mx-16 mt-10">
          <p className="text-2xl">
            <span className="font-bold underline">Goal</span>:
          </p>
          <p className="text-2xl">
            The goal of this exercise will be to add metrics to an Effect HTTP application.
          </p>
          <p className="text-2xl">The requirements of the exercise are as follows:</p>
          <ul className="text-2xl !ml-12">
            <li>
              Implement <InlineCode>trackSuccessfulRequests</InlineCode>
            </li>
            <li>
              Implement <InlineCode>trackMethodFrequency</InlineCode>
            </li>
          </ul>
          <div className="grid grid-cols-2">
            <CodeSample className="text-sm">
              {codeExercises.sessionFour.exerciseTwoPartOne}
            </CodeSample>
            <CodeSample className="text-sm">
              {codeExercises.sessionFour.exerciseTwoPartTwo}
            </CodeSample>
          </div>
        </div>
      </section>

      <section>
        <h3>Traces</h3>
        <div>
          <p className="text-2xl">
            Effect has built-in support for instrumenting your application with traces
          </p>
          <div className="flex justify-center">
            <CodeSample className="text-md" lineNumbers="|1|3|4">
              {codeExamples.sessionFour.tracing}
            </CodeSample>
          </div>
        </div>
      </section>

      <section>
        <h3>Traces</h3>
        <div className="mt-10">
          <Image
            src={TraceWaterfall}
            alt="An image of an Effect application trace visualized in Grafana Tempo"
            className="!my-8"
          />
        </div>
      </section>

      <section>
        <h3>Traces</h3>
        <div className="mt-10">
          <Image
            src={TraceSpan}
            alt="An image of an individual span from an Effect application trace visualized in Grafana Tempo"
            className="!my-8"
          />
        </div>
      </section>

      <section>
        <h3>Demo</h3>
      </section>

      <section>
        <h3>Thank you!</h3>
        <p className="text-2xl">We appreciate your attention and hope you enjoyed the workshop!</p>
        <p className="text-2xl">Please provide feedback for how we can improve!</p>
      </section>
    </Presentation>
  )
}

Slides.displayName = "Slides"

export default Slides
