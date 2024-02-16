import { Schema } from "@effect/schema"
import {
  Console,
  Context,
  Data,
  Effect,
  Layer,
  ReadonlyArray,
  Request,
  RequestResolver
} from "effect"
import { gql, GraphQLClient } from "graphql-request"

// Exercise Summary:
//
// The following exercise will explore how we can utilize `RequestResolver` to
// take advantage of data sources that support batching requests. For example,
// the Pokemon GraphQL API (see https://pokeapi.co/docs/graphql) supports
// providing multiple Pokemon identifiers to retrieve in the `where` clause of
// the input to the `getPokemonById` query type. Therefore, we can make many
// queries for pokemon by identifier and utilize Effect's built-in request
// batching capability to batch these requests together and only send a single
// request to the data source.
//
// Your goal will be to complete the implementation of the `GetPokemonById`
// resolver.
//
// As a bonus, you can attempt to improve the `Pokemon`, `PokemonError`, and
// `GetPokemonById` models using `@effect/schema/Schema`.

// =============================================================================
// PokemonRepo
// =============================================================================

const makePokemonRepo = Effect.gen(function*(_) {
  const pokemonApi = yield* _(PokemonApi)

  const GetPokemonByIdResolver: RequestResolver.RequestResolver<GetPokemonById> =
    RequestResolver.makeBatched((requests: ReadonlyArray<GetPokemonById>) => {
      // =============================================================================
      // Please provide your implementation here!
      // =============================================================================
    })

  const getById = (id: number) => Effect.request(new GetPokemonById({ id }), GetPokemonByIdResolver)

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

export class PokemonError extends Data.TaggedError("PokemonError")<{
  readonly message: string
}> {}

export class Pokemon extends Data.Class<{
  readonly id: number
  readonly name: string
}> {}

export class GetPokemonById extends Request.TaggedClass("GetPokemonById")<
  PokemonError,
  Pokemon,
  { readonly id: number }
> {}

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
            pokemon_v2_pokemon: Schema.array(Schema.struct({
              id: Schema.number,
              name: Schema.string
            }))
          })
        )
      ),
      Effect.map((response) =>
        ReadonlyArray.map(response.pokemon_v2_pokemon, (params) => new Pokemon(params))
      ),
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

  const pokemon = yield* _(
    // Toggle batching on and off to see time difference
    Effect.forEach(ReadonlyArray.range(1, 100), repo.getById),
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
  Effect.runFork
)
