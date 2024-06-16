import {
  Address,
  PScriptContext,
  PaymentCredentials,
  Script,
  bool,
  bs,
  compile,
  makeValidator,
  perror,
  pfn,
  pif,
  pmakeUnit,
  pmatch,
  pstruct,
  unit,
} from "@harmoniclabs/plu-ts";

const redeemer = pstruct({
  redeemer: {
    message: bs,
  },
});

export const mintNFT = pfn(
  [redeemer.type, PScriptContext.type],
  bool
  // @ts-ignore
)((redeemer, ctx) => {
  const sellerPaid = pmatch(ctx.tx.outputs.head.address.credential)
    .onPPubKeyCredential(({ pkh: id }) =>
      id.eq("93f4c01b459229e383d9a3788171413345e9a39bff165cb41a175189")
    )
    ._((_) => perror(bool));

  const adaAmountSent = ctx.tx.outputs.head.value.head.fst
    .eq("")
    .and(ctx.tx.outputs.head.value.head.snd.head.snd.gtEq(2000000));

  return pif(unit)
    .$(sellerPaid.and(adaAmountSent))
    .then(pmakeUnit())
    .else(perror(unit));
});

///////////////////////////////////////////////////////////////////
// ------------------------------------------------------------- //
// ------------------------- utilities ------------------------- //
// ------------------------------------------------------------- //
///////////////////////////////////////////////////////////////////

// MAKE VALIDATOR
export const untypedValidator = makeValidator(mintNFT);

// COMPILE
// export const compiledContract = compile(untypedValidator);
export const compiledContract = compile(mintNFT);

// NATIVE FORMAT that CARDANO uses (CBOR Hex)
export const nftScript = new Script("PlutusScriptV2", compiledContract);

export const nftScriptCbor = nftScript.cbor.toString();

// SUBMITTED AND STORED ONCHAIN
export const nftScriptTestnetAddr = new Address(
  // "mainnet",
  "testnet",
  PaymentCredentials.script(nftScript.hash)
);
