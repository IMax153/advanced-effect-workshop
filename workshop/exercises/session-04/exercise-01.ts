import * as Metrics from "@effect/opentelemetry/Metrics"
import * as Resource from "@effect/opentelemetry/Resource"
import { PrometheusExporter, PrometheusSerializer } from "@opentelemetry/exporter-prometheus"
import { Console, Effect, Layer, Logger, Metric, Runtime, RuntimeFlags, Schedule } from "effect"

// Exercise Summary:
//
// The following exercise will explore how we can create custom `Logger`s with
// Effect. While traditionally loggers are used to log output to the console or
// some other location, we can also perform other useful tasks with custom
// `Logger`s. We will also see that multiple loggers can be added to an Effect
// application to perform multiple logging tasks with a single call to an
// `Effect.log*` combinator.
//
// Your task will be to implement a `MetricLogger` which takes a `Counter` and
// a label for the `LogLevel` and constructs a custom `Logger` which updates the
// `Counter` by `1` every time `log` is called. Additionally, the metric should
// be tagged with the log level.
//
// For example, in Prometheus format the output might look like:
// # HELP effect_log_total description missing
// # UNIT effect_log_total 1
// # TYPE effect_log_total gauge
// effect_log_total{level="error"} 6
// # HELP effect_log_total description missing
// # UNIT effect_log_total 1
// # TYPE effect_log_total gauge
// effect_log_total{level="info"} 4

declare const makeMetricLogger: (
  counter: Metric.Metric.Counter<number>,
  logLevelLabel: string
) => Logger.Logger<unknown, void>
// Implementation goes here

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
  yield* _(
    Effect.log("Logging..."),
    Effect.schedule(Schedule.jitteredWith(
      Schedule.spaced("1 seconds"),
      { min: 0.5, max: 1.5 }
    )),
    Effect.fork
  )
  yield* _(
    Effect.logError("Logging an error..."),
    Effect.schedule(Schedule.jitteredWith(
      Schedule.spaced("1 seconds"),
      { min: 0.5, max: 1.5 }
    )),
    Effect.fork
  )
})

const MainLive = MetricReporterLive.pipe(
  Layer.provide(ResourceLive),
  Layer.merge(MetricLoggerLive)
)

// Disabling the `RuntimeMetrics` flag for cleaner output
const runtime = Runtime.defaultRuntime.pipe(
  Runtime.disableRuntimeFlag(RuntimeFlags.RuntimeMetrics)
)

program.pipe(
  Effect.awaitAllChildren,
  Effect.tapErrorCause(Effect.logError),
  Effect.scoped,
  Effect.provide(MainLive),
  Runtime.runFork(runtime)
)
