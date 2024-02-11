import { Metric } from "effect"

export const numberCounter = Metric.counter("request_count", {
  description: "A counter for tracking requests"
})

export const bigintCounter = Metric.counter("error_count", {
  description: "A counter for tracking errors",
  bigint: true
})

export const incrementalCounter = Metric.counter("count", {
  description: "a counter that only increases its value",
  incremental: true
})
