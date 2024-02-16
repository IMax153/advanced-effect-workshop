import { Schema } from "@effect/schema"
import {
  Console,
  Context,
  Effect,
  Layer,
  ReadonlyArray,
  Request,
  RequestResolver,
  Schedule
} from "effect"
import { gql, GraphQLClient } from "graphql-request"

// =============================================================================
// PokemonRepo
// =============================================================================

const makePokemonRepo = Effect.gen(function*(_) {
  const pokemonApi = yield* _(PokemonApi)

  const GetPokemonByIdResolver = RequestResolver.makeBatched((
    requests: ReadonlyArray<GetPokemonById>
  ) =>
    Effect.gen(function*(_) {
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

  const getById = (id: number) =>
    Effect.request(
      new GetPokemonById({ id }),
      GetPokemonByIdResolver
    )

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

  yield* _(
    Effect.forEach(ReadonlyArray.range(1, 100), repo.getById, {
      // Toggle batching on and off to see time difference
      batching: true
    }),
    Effect.tap((pokemon) => Console.log(`Got ${pokemon.length} pokemon`)),
    Effect.repeat(Schedule.fixed("2 seconds"))
  )
})

const MainLive = PokemonRepo.Live.pipe(
  Layer.provide(PokemonApi.Live)
)

program.pipe(
  Effect.provide(MainLive),
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
