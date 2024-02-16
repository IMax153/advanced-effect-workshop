import { Schema } from "@effect/schema"
import {
  Cache,
  Console,
  Context,
  Effect,
  Layer,
  ReadonlyArray,
  Request,
  RequestResolver
} from "effect"
import { gql, GraphQLClient } from "graphql-request"

// Exercise Summary:
//
// The following exercise will explore how we can utilize a `Cache` to cache
// expensive computations with Effect. We will re-use our Pokemon API code for
// this example.
//
// Please note that, though we are using `Request`s to explore `Cache` in this
// exercise, we previously explored the built-in request caching APIs that
// Effect provides which should be preferred for caching requests (in most
// scenarios).
//
// Your goal will be to re-work the implementation of `PokemonRepo.getById` to
// utilize a custom `Cache`. The `lookup` function of the cache should:
//
//   - Take a numeric identifier as the input key
//   - Return the cached result of a `GetPokemonById` request if there is an
//     entry in the cache
//   - Issue a `GetPokemonById` request if there is no existing entry in the cache

// =============================================================================
// PokemonRepo
// =============================================================================

const makePokemonRepo = Effect.gen(function*(_) {
  const pokemonApi = yield* _(PokemonApi)

  const GetPokemonByIdResolver: RequestResolver.RequestResolver<GetPokemonById, never> =
    RequestResolver.makeBatched((requests: ReadonlyArray<GetPokemonById>) =>
      Effect.gen(function*(_) {
        // Adding a log so we can see when requests were issued vs cached
        console.log(`Batching ${requests.length} requests...`)
        const ids = ReadonlyArray.map(requests, (request) => request.id)
        const pokemons = yield* _(pokemonApi.getByIds(ids))
        yield* _(Effect.forEach(requests, (request) => {
          const pokemon = pokemons.find((pokemon) => pokemon.id === request.id)!
          return Request.completeEffect(request, Effect.succeed(pokemon))
        }, { discard: true }))
      }).pipe(
        Effect.catchAll((error) =>
          Effect.forEach(requests, (request) => Request.completeEffect(request, error))
        )
      )
    )

  const cache: Cache.Cache<number, PokemonError, Pokemon> =
    // =============================================================================
    // Please provide your implementation here!
    // =============================================================================

  const getById = (id: number) => cache.get(id)

  return { getById } as const
})

export class PokemonRepo extends Context.Tag("PokemonRepo")<
  PokemonRepo,
  Effect.Effect.Success<typeof makePokemonRepo>
>() {
  static readonly Live = Layer.effect(this, makePokemonRepo)
}

// =============================================================================
// Pokemon Models
// =============================================================================

export class PokemonError extends Schema.TaggedError<PokemonError>()(
  "PokemonError",
  { message: Schema.string }
) {}

export class Pokemon extends Schema.Class<Pokemon>()({
  id: Schema.number,
  name: Schema.string
}) {}

export class GetPokemonById extends Schema.TaggedRequest<GetPokemonById>()(
  "GetPokemonById",
  PokemonError,
  Pokemon,
  { id: Schema.number }
) {}

// =============================================================================
// PokemonApi
// =============================================================================

const makePokemonApi = Effect.sync(() => {
  const client = new GraphQLClient("https://beta.pokeapi.co/graphql/v1beta")

  const query = <A = unknown>(
    document: string,
    variables?: Record<string, any>
  ) =>
    Effect.tryPromise({
      try: (signal) =>
        client.request<A, any>({
          document,
          variables,
          signal
        }),
      catch: (error) => new PokemonError({ message: String(error) })
    })

  const pokemonById = gql`
    query pokemonById($ids: [Int!]!) {
      pokemon_v2_pokemon(where: { id: { _in: $ids } }) {
        id
        name
      }
    }
  `

  const getByIds = (ids: ReadonlyArray<number>) =>
    query<Pokemon>(pokemonById, { ids }).pipe(
      Effect.flatMap(
        Schema.decodeUnknown(
          Schema.struct({
            pokemon_v2_pokemon: Schema.array(Pokemon)
          })
        )
      ),
      Effect.map((response) => response.pokemon_v2_pokemon),
      Effect.catchTag("ParseError", (e) => Effect.fail(new PokemonError({ message: e.toString() })))
    )

  return { getByIds } as const
})

class PokemonApi extends Context.Tag("PokemonApi")<
  PokemonApi,
  Effect.Effect.Success<typeof makePokemonApi>
>() {
  static readonly Live = Layer.effect(this, makePokemonApi)
}

// =============================================================================
// Program
// =============================================================================

const program = Effect.gen(function*(_) {
  const repo = yield* _(PokemonRepo)

  // Warm up the cache
  yield* _(
    Effect.forEach(ReadonlyArray.range(1, 100), repo.getById, {
      batching: true
    }),
    Effect.timed,
    Effect.map(([duration, pokemon]) => ({ duration: duration.toString(), pokemon }))
  )
  // Re-running should hit the cache for each request
  const pokemon = yield* _(
    Effect.forEach(ReadonlyArray.range(1, 100), repo.getById, {
      batching: true
    }),
    Effect.timed,
    Effect.map(([duration, pokemon]) => ({ duration: duration.toString(), pokemon }))
  )

  yield* _(Console.log(pokemon))
})

const MainLive = PokemonRepo.Live.pipe(
  Layer.provide(PokemonApi.Live)
)

program.pipe(
  Effect.provide(MainLive),
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
