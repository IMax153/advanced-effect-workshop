import { Metric } from "effect"

export const responseTimeSummary = Metric.summary({
  name: "response_time_summary",
  maxAge: "1 days",
  maxSize: 100,
  error: 0.03,
  quantiles: [0.1, 0.5, 0.9]
})
