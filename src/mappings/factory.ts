/* eslint-disable prefer-const */
import { Address, log } from '@graphprotocol/graph-ts'
import { UniswapFactory, Pair, Token, Bundle } from '../types/schema'
import { PairCreated } from '../types/Factory/Factory'
import { Pair as PairTemplate } from '../types/templates'
import {
  FACTORY_ADDRESS,
  ZERO_BD,
  ZERO_BI,
  fetchTokenSymbol,
  fetchTokenName,
  fetchTokenDecimals,
  fetchTokenTotalSupply
} from './helpers'


function getOrCreateFactory(address: string): UniswapFactory | null {
  // Creates a factory if it doesn't already exist

  let factory = UniswapFactory.load(FACTORY_ADDRESS)
  if (factory == null) {
    factory = new UniswapFactory(FACTORY_ADDRESS)
    factory.pairCount = 0
    factory.totalVolumeETH = ZERO_BD
    factory.totalLiquidityETH = ZERO_BD
    factory.totalVolumeUSD = ZERO_BD
    factory.untrackedVolumeUSD = ZERO_BD
    factory.totalLiquidityUSD = ZERO_BD
    factory.txCount = ZERO_BI
    factory.mostLiquidTokens = []

    // create new bundle
    let bundle = new Bundle('1')
    bundle.ethPrice = ZERO_BD
    bundle.save()
  }
  factory.pairCount = factory.pairCount + 1
  factory.save()

  return factory

}

function getOrCreateToken(event: PairCreated, is_first: boolean): Token | null {
  // get or create the token

  // get token identifier from event
  let token_from_event = is_first ? event.params.token0 : event.params.token1
  let token = Token.load(token_from_event.toHexString())
  if (!token) {
    token = new Token(token_from_event.toHexString())
    token.symbol = fetchTokenSymbol(token_from_event) // eth call
    token.name = fetchTokenName(token_from_event) // eth call
    token.totalSupply = fetchTokenTotalSupply(token_from_event) // eth call

    // Get token details from event
    let decimals = fetchTokenDecimals(token_from_event) // eth call
    token.decimals = decimals
    token.derivedETH = ZERO_BD
    token.tradeVolume = ZERO_BD
    token.tradeVolumeUSD = ZERO_BD
    token.untrackedVolumeUSD = ZERO_BD
    token.totalLiquidity = ZERO_BD
    // token0.allPairs = []
    token.mostLiquidPairs = []
    token.txCount = ZERO_BI
  }

  return token

}


export function handleNewPair(event: PairCreated): void {
  // load factory (create if first exchange)

  // Creates a factory if it doesn't already exist
  let factory = getOrCreateFactory(FACTORY_ADDRESS)
  if (!factory) {
    log.warning('Subgraph decimals warning. Block number: {}, block hash: {}, transaction hash: {}', [
      event.block.number.toString(), // "47596000"
      event.block.hash.toHexString(), // "0x..."
      event.transaction.hash.toHexString(), // "0x..."
    ])
    return
  }

  // create the tokens
  let token0 = getOrCreateToken(event, true)
  let token1 = getOrCreateToken(event, false)
  if (!token0 || !token1) {
    log.warning('Subgraph decimals warning. Block number: {}, block hash: {}, transaction hash: {}', [
      event.block.number.toString(), // "47596000"
      event.block.hash.toHexString(), // "0x..."
      event.transaction.hash.toHexString(), // "0x..."
    ])
    return
  }


  if (token0.decimals === null || token1.decimals === null) {
    log.warning('Subgraph decimals warning. Block number: {}, block hash: {}, transaction hash: {}', [
      event.block.number.toString(), // "47596000"
      event.block.hash.toHexString(), // "0x..."
      event.transaction.hash.toHexString(), // "0x..."
    ])
    return
  }

  let pair = new Pair(event.params.pair.toHexString()) as Pair
  pair.token0 = token0.id
  pair.token1 = token1.id
  pair.liquidityProviderCount = ZERO_BI
  pair.createdAtTimestamp = event.block.timestamp
  pair.createdAtBlockNumber = event.block.number
  pair.txCount = ZERO_BI
  pair.reserve0 = ZERO_BD
  pair.reserve1 = ZERO_BD
  pair.trackedReserveETH = ZERO_BD
  pair.reserveETH = ZERO_BD
  pair.reserveUSD = ZERO_BD
  pair.totalSupply = ZERO_BD
  pair.volumeToken0 = ZERO_BD
  pair.volumeToken1 = ZERO_BD
  pair.volumeUSD = ZERO_BD
  pair.untrackedVolumeUSD = ZERO_BD
  pair.token0Price = ZERO_BD
  pair.token1Price = ZERO_BD

  // create the tracked contract based on the template
  PairTemplate.create(event.params.pair)

  // save updated values
  token0.save()
  token1.save()
  pair.save()
  factory.save()

}
