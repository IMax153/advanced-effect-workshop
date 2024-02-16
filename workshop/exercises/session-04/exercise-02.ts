import { Metrics, Resource } from "@effect/opentelemetry"
import { NodeContext, NodeHttpServer } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpServer"
import { PrometheusExporter, PrometheusSerializer } from "@opentelemetry/exporter-prometheus"
import { Console, Context, Effect, Layer, Runtime, RuntimeFlags, Schedule } from "effect"
import { createServer } from "node:http"

// Exercise Summary:
//
// The following exercise will explore how we can utilize metrics to gain deep
// observability into the performance of our application. Effect allows for
// extremely flexible composition of metrics with your Effect workflows. These
// metrics can then be later captured and sent to a metrics server for later
// investigation.
//
// Your task will be to implement two methods: `trackSuccessfulRequests` and
// `trackMethodFrequency`. The requirements of each method are listed below.

export declare const trackSuccessfulRequests: (
  method: string,
  route: string
) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
// Your implementation should:
//   - Create a metric which tracks the **count** of successful requests made to our Http server
//     - NOTE: this metric should only capture successful requests
//   - Tag the metric with the request method name (i.e. `GET`) and the requested route
//   - Apply the metric to all routes

export declare const trackMethodFrequency: (
  method: string,
  route: string
) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
// Your implementation should:
//   - Create a metric which tracks the **frequency** of request methods (i.e. `GET`, `POST`) made to our Http server
//     - NOTE: this metric should capture both successful and failed requests
//   - Tag the metric with the requested route
//   - Apply the metric to all routes

const router = Http.router.empty.pipe(
  Http.router.get(
    "/",
    Effect.map(
      Http.request.ServerRequest,
      (req) => Http.response.text(req.url)
    )
  ),
  Http.router.get(
    "/healthz",
    Http.response.text("ok").pipe(
      Http.middleware.withLoggerDisabled
    )
  ),
  Http.router.get(
    "/metrics",
    Effect.gen(function*(_) {
      const prometheusReporter = yield* _(PrometheusMetricReporter)
      const report = yield* _(prometheusReporter.report)
      return Http.response.text(report)
    })
  )
)

class PrometheusMetricReporter extends Context.Tag("PrometheusMetricReporter")<
  PrometheusMetricReporter,
  {
    readonly report: Effect.Effect<string>
  }
>() {
  static readonly Live = Layer.scoped(
    PrometheusMetricReporter,
    Effect.gen(function*(_) {
      const serializer = new PrometheusSerializer()
      const producer = yield* _(Metrics.makeProducer)
      const reader = yield* _(Metrics.registerProducer(producer, () => new PrometheusExporter()))
      return {
        report: Effect.promise(() => reader.collect()).pipe(
          Effect.map(({ resourceMetrics }) => serializer.serialize(resourceMetrics))
        )
      }
    })
  )
}

class ConsoleMetricReporter extends Context.Tag("ConsoleReporter")<ConsoleMetricReporter, void>() {
  static readonly Live = Layer.scopedDiscard(Effect.gen(function*(_) {
    const prometheusReporter = yield* _(PrometheusMetricReporter)
    yield* _(
      prometheusReporter.report,
      Effect.flatMap((report) => Console.log(report)),
      Effect.repeat({ schedule: Schedule.spaced("5 seconds") }),
      Effect.fork
    )
  }))
}

const ServerLive = NodeHttpServer.server.layer(() => createServer(), { port: 8888 })

const MetricReportingLive = ConsoleMetricReporter.Live.pipe(
  Layer.provideMerge(PrometheusMetricReporter.Live),
  Layer.provide(Resource.layer({
    serviceName: "advanced-effect-workshop",
    serviceVersion: "1.0.0"
  }))
)

const HttpLive = router.pipe(
  Http.server.serve(Http.middleware.logger),
  Http.server.withLogAddress,
  Layer.provide(ServerLive),
  Layer.provide(NodeContext.layer)
)

const MainLive = HttpLive.pipe(
  Layer.provide(MetricReportingLive)
)

const runtime = Runtime.defaultRuntime.pipe(
  Runtime.disableRuntimeFlag(RuntimeFlags.RuntimeMetrics)
)

Layer.launch(MainLive).pipe(
  Runtime.runFork(runtime)
)
