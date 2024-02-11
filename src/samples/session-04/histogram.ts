import { Metric, MetricBoundaries } from "effect"

export const latencyHistogram = Metric.histogram(
  "request_latency",
  MetricBoundaries.linear({ start: 75, width: 25, count: 15 })
)
