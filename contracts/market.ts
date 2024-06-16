import {
  Script,
  Address,
  PPubKeyHash,
  PScriptContext,
  PaymentCredentials,
  makeValidator,
  compile,
  pstruct,
  pfn,
  bs,
  int,
  bool,
  pmatch,
  PTokenName,
  PCurrencySymbol,
  perror,
  pBool,
  pif,
  pdelay,
  plet,
  punsafeConvertType,
  pforce,
} from "@harmoniclabs/plu-ts";
import { network } from "@/offchain/constants";

export const NFTData = pstruct({
  NFTData: {
    seller: PPubKeyHash.type,
    bidder: PPubKeyHash.type,
    deadline: int,
    policy: PCurrencySymbol.type,
    token: PTokenName.type,
  },
});

const redeemer = pstruct({
  redeemer: {
    action: bs,
  },
});

// ! IN PROGRESS ---
export const market = pfn(
  [NFTData.type, redeemer.type, PScriptContext.type],
  bool
)((nftData, { action }, ctx) => {
  const isBidder = ctx.tx.signatories.some(nftData.bidder.eqTerm);
  const isSeller = ctx.tx.signatories.some(nftData.seller.eqTerm);

  const inTime = pmatch(ctx.tx.interval.to.bound)
    .onPFinite(({ _0: upperBound }) => upperBound.ltEq(nftData.deadline))
    ._((_) => pBool(false));

  const deadlineReached = pmatch(ctx.tx.interval.from.bound)
    .onPFinite(({ _0: lowerBound }) => nftData.deadline.ltEq(lowerBound))
    ._((_) => pBool(false));

  const paidToSeller = ctx.tx.outputs.some(({ value, address }) => {
    const toSeller = pmatch(address.credential)
      .onPPubKeyCredential(({ pkh }) => nftData.seller.eq(pkh))
      ._((_) => perror(bool));
    const valueIncludesADA = value.some((entry) => entry.fst.eq(""));

    return toSeller.and(valueIncludesADA);
  });

  const metadata = plet(
    pdelay(
      pmatch(ctx.tx.inputs.head.resolved.datum)
        .onInlineDatum(({ datum }) => punsafeConvertType(datum, NFTData.type))
        ._((_) => perror(NFTData.type) as any)
    )
  );

  const sentToBidder = ctx.tx.outputs.some(({ value, address }) => {
    const toBidder = pmatch(address.credential)
      .onPPubKeyCredential(({ pkh }) => pforce(metadata).bidder.eq(pkh))
      ._((_) => perror(bool));
    const valueIncludesNFT = value.some((entries) =>
      entries.fst
        .eq(nftData.policy)
        .and(
          entries.snd.some((entry) =>
            entry.fst.eq(nftData.token).and(entry.snd.eq(1))
          )
        )
    );

    return toBidder.and(valueIncludesNFT);
  });

  return pif(bool)
    .$(action.eq("cancel")) // ? cancel listing
    .then(isSeller && inTime)
    .else(
      pif(bool)
        .$(action.eq("bid")) // ? bidding
        .then(inTime)
        .else(
          pif(bool)
            .$(action.eq("edit")) // ? edit bid
            .then(isBidder && inTime)
            .else(
              pif(bool)
                .$(action.eq("close")) // ? close listing
                .then(
                  isSeller && deadlineReached && paidToSeller && sentToBidder
                )
                .else(
                  pif(bool)
                    .$(action.eq("withdraw")) // ? withdraw bid
                    .then(isBidder)
                    .else(pBool(false))
                )
            )
        )
    );
});

// // ---------------------------------------
// // ---------------------------------------
// // ---------------------------------------

// // --- SIMPLE SELLING --- //

// export const datum = pstruct({
//   datum: {
//     seller: PPubKeyHash.type,
//     price: int,
//   },
// });

// const redeemer = pstruct({
//   redeemer: {
//     message: bs,
//   },
// });

// // ! COMPLETED ---
// export const market = pfn(
//   [datum.type, redeemer.type, PScriptContext.type],
//   bool
// )((datum, message, ctx) => {
//   const isOwner = ctx.tx.signatories.some(datum.seller.eqTerm);

//   const sellerPaid = pmatch(ctx.tx.outputs.head.address.credential)
//     .onPPubKeyCredential(({ pkh }) => datum.seller.eq(pkh))
//     ._((_) => perror(bool));

//   const adaAmountSent = ctx.tx.outputs.head.value.head.fst
//     .eq("")
//     .and(ctx.tx.outputs.head.value.head.snd.head.snd.gtEq(datum.price));

//   return isOwner.or(sellerPaid.and(adaAmountSent));
// });

///////////////////////////////////////////////////////////////////
// ------------------------------------------------------------- //
// ------------------------- utilities ------------------------- //
// ------------------------------------------------------------- //
///////////////////////////////////////////////////////////////////

// MAKE VALIDATOR
export const untypedValidator = makeValidator(market);

// COMPILE
export const compiledContract = compile(untypedValidator);

// NATIVE FORMAT that CARDANO uses (CBOR Hex)
export const marketScript = new Script("PlutusScriptV2", compiledContract);

// CBOR HEX
export const marketScriptCbor = marketScript.cbor.toString();

// SUBMITTED AND STORED ONCHAIN
export const marketScriptTestnetAddr = new Address(
  network == 0 ? "testnet" : "mainnet",
  PaymentCredentials.script(marketScript.hash)
);
