import { Data, Effect, Option, Secret, Stream } from "effect"
import { OpenAI as OpenAIApi } from "openai"

export interface OpenAIOptions {
  readonly apiKey: Secret.Secret
  readonly organization: Option.Option<Secret.Secret>
}

export class OpenAIError extends Data.TaggedError("OpenAIError")<{
  readonly error: unknown
}> {}

const handleError = (error: unknown) =>
  new OpenAIError({
    error: (error as any).error?.message ?? error
  })

// =============================================================================
// Option 1 - One-Off Approach
// =============================================================================

export const oneOffApproach = (
  client: OpenAIApi,
  body: OpenAIApi.ChatCompletionCreateParamsNonStreaming,
  options?: Omit<OpenAIApi.RequestOptions, "signal">
) =>
  Effect.tryPromise({
    try: (signal) => client.chat.completions.create(body, { ...options, signal }),
    catch: (error) => new OpenAIError({ error })
  })

// =============================================================================
// Option 2 - Flexible Approach
// =============================================================================

export const flexibleApproach = (options: OpenAIOptions) =>
  Effect.gen(function*(_) {
    const client = yield* _(getClient(options))

    const call = <A>(
      f: (client: OpenAIApi, signal: AbortSignal) => Promise<A>
    ): Effect.Effect<A, OpenAIError> =>
      Effect.tryPromise({
        try: (signal) => f(client, signal),
        catch: (error) => new OpenAIError({ error })
      })

    return {
      call
    }
  })

// =============================================================================
// Option 3 - All-In Effect Approach
// =============================================================================

export const comboApproach = (options: OpenAIOptions) =>
  Effect.gen(function*(_) {
    const client = yield* _(getClient(options))

    const call = <A>(
      f: (client: OpenAIApi, signal: AbortSignal) => Promise<A>
    ): Effect.Effect<A, OpenAIError> =>
      Effect.tryPromise({
        try: (signal) => f(client, signal),
        catch: (error) => new OpenAIError({ error })
      })

    const completion = (options: {
      readonly model: string
      readonly system: string
      readonly maxTokens: number
      readonly messages: ReadonlyArray<OpenAIApi.ChatCompletionMessageParam>
    }) =>
      call((_, signal) =>
        _.chat.completions.create(
          {
            model: options.model,
            temperature: 0.1,
            max_tokens: options.maxTokens,
            messages: [
              {
                role: "system",
                content: options.system
              },
              ...options.messages
            ],
            stream: true
          },
          { signal }
        )
      ).pipe(
        Effect.map((stream) => Stream.fromAsyncIterable(stream, handleError)),
        Stream.unwrap,
        Stream.filterMap((chunk) => Option.fromNullable(chunk.choices[0].delta.content))
      )

    return {
      call,
      completion
    }
  })

// =============================================================================
// Internals
// =============================================================================

const getClient = (options: OpenAIOptions): Effect.Effect<OpenAIApi> =>
  Effect.sync(() =>
    new OpenAIApi({
      apiKey: Secret.value(options.apiKey),
      organization: options.organization.pipe(
        Option.map(Secret.value),
        Option.getOrNull
      )
    })
  )
