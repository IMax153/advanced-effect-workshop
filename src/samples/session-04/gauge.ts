import { Metric } from "effect"

export const numberGauge = Metric.gauge("memory_usage", {
  description: "A gauge for memory usage"
})

export const bigintGauge = Metric.gauge("cpu_load", {
  description: "A gauge for CPU load",
  bigint: true
})
