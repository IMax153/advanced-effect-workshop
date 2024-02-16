import * as Metrics from "@effect/opentelemetry/Metrics"
import * as Resource from "@effect/opentelemetry/Resource"
import { PrometheusExporter, PrometheusSerializer } from "@opentelemetry/exporter-prometheus"
import {
  Console,
  Effect,
  FiberRef,
  FiberRefs,
  Layer,
  Logger,
  Metric,
  MetricLabel,
  Option,
  ReadonlyArray,
  Runtime,
  RuntimeFlags,
  Schedule
} from "effect"

const makeMetricLogger = (counter: Metric.Metric.Counter<number>, logLevelLabel: string) =>
  Logger.make(({ context, logLevel }): void => {
    const labels = FiberRefs.get(context, FiberRef.currentMetricLabels).pipe(
      Option.getOrElse(() => ReadonlyArray.empty<MetricLabel.MetricLabel>())
    )
    const label = MetricLabel.make(logLevelLabel, logLevel.label.toLowerCase())
    counter.unsafeUpdate(1, ReadonlyArray.append(labels, label))
  })

const MetricLoggerLive = Logger.add(makeMetricLogger(Metric.counter("effect_log_total"), "level"))

const ResourceLive = Resource.layer({
  serviceName: "advanced-effect-workshop",
  serviceVersion: "1.0.0"
})

const MetricReporterLive = Layer.scopedDiscard(Effect.gen(function*(_) {
  const serializer = new PrometheusSerializer()
  const producer = yield* _(Metrics.makeProducer)
  const reader = yield* _(Metrics.registerProducer(producer, () => new PrometheusExporter()))
  yield* _(
    Effect.promise(() => reader.collect()),
    Effect.flatMap(({ resourceMetrics }) => Console.log(serializer.serialize(resourceMetrics))),
    Effect.repeat({
      schedule: Schedule.spaced("5 seconds")
    }),
    Effect.fork
  )
}))

const program = Effect.gen(function*(_) {
  yield* _(Effect.all([
    Effect.log("Logging...").pipe(
      Effect.schedule(Schedule.jitteredWith(
        Schedule.spaced("1 seconds"),
        { min: 0.5, max: 1.5 }
      ))
    ),
    Effect.logError("Logging an error...").pipe(
      Effect.schedule(Schedule.jitteredWith(
        Schedule.spaced("1 seconds"),
        { min: 0.5, max: 1.5 }
      ))
    )
  ], { concurrency: "unbounded" }))
})

const MainLive = MetricReporterLive.pipe(
  Layer.provide(ResourceLive),
  Layer.merge(MetricLoggerLive)
)

const runtime = Runtime.defaultRuntime.pipe(
  Runtime.disableRuntimeFlag(RuntimeFlags.RuntimeMetrics)
)

Effect.awaitAllChildren,
  program.pipe(
    Effect.tapErrorCause(Effect.logError),
    Effect.scoped,
    Effect.provide(MainLive),
    Runtime.runFork(runtime)
  )
