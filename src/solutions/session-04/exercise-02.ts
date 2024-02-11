import { Metrics, Resource } from "@effect/opentelemetry"
import { NodeContext, NodeHttpServer } from "@effect/platform-node"
import * as Middleware from "@effect/platform/Http/Middleware"
import * as ServerRequest from "@effect/platform/Http/ServerRequest"
import * as Http from "@effect/platform/HttpServer"
import { PrometheusExporter, PrometheusSerializer } from "@opentelemetry/exporter-prometheus"
import {
  Console,
  Context,
  Effect,
  flow,
  Layer,
  Metric,
  MetricLabel,
  ReadonlyArray,
  Runtime,
  RuntimeFlags,
  Schedule
} from "effect"
import { createServer } from "node:http"

const trackSuccessfulRequests = (
  method: string,
  route: string
): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> =>
  Metric.counter("http_request_successes", {
    description: "Track the count of successful HTTP requests by method and route",
    incremental: true
  }).pipe(
    Metric.withConstantInput(1),
    Metric.taggedWithLabels([
      MetricLabel.make("method", method),
      MetricLabel.make("route", route)
    ])
  )

const trackMethodFrequency = (
  method: string,
  route: string
): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> =>
  Metric.frequency(
    "http_method",
    "Track the frequency of all HTTP requests by method and route"
  ).pipe(
    Metric.tagged("route", route),
    Metric.trackAll(method)
  )

const trackRequestLatency = Metric.timerWithBoundaries(
  "request_latency",
  [50, 75, 100, 150, 200, 250, 300, 350, 400],
  "Track request latency"
)

const metricMiddleware = Middleware.make((httpApp) =>
  ServerRequest.ServerRequest.pipe(Effect.flatMap((request) =>
    httpApp.pipe(
      trackSuccessfulRequests(request.method, request.url),
      trackMethodFrequency(request.method, request.url),
      Metric.trackDuration(trackRequestLatency)
    )
  ))
)

const router = Http.router.empty.pipe(
  Http.router.get(
    "/",
    Effect.flatMap(
      Http.request.ServerRequest,
      (req) => Effect.sleep("200 millis").pipe(Effect.as(Http.response.text(req.url)))
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

const middleware = flow(Http.middleware.logger, metricMiddleware)

const HttpLive = router.pipe(
  Http.server.serve(middleware),
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

// Some useful cURL commands for testing your server:
//
// Request the root endpoint:
//   curl -X GET "http://127.0.0.1:8888"
//
// Request the health endpoint:
//   curl -X GET "http://127.0.0.1:8888/healthz"
//
// Request the metrics endpoint:
//   curl -X GET "http://127.0.0.1:8888/metrics"
