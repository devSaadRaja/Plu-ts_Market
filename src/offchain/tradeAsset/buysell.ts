import {
  Transaction,
  BrowserWallet,
  PlutusScript,
  resolvePlutusScriptAddress,
  resolvePaymentKeyHash,
  resolveDataHash,
  BlockfrostProvider,
  Action,
  resolveSlotNo,
  parseAssetUnit,
} from "@meshsdk/core";
import { marketScriptCbor } from "../../../contracts/market";
import { _filterUtxos, network } from "../constants";

const SELLER =
  "addr_test1qzflfsqmgkfzncurmx3h3qt3gye5t6drn0l3vh95rgt4rzdchgneut9gu6v3rgjddzsgk0wdy2z6cxyn36w4dhvl9gqqk48lty";
const BIDDER =
  "addr_test1qrqgd7g7csgj3xlk0jtttucrx58hcm28f3zjkqp3859t4x55y8jtxy7xmtga59r02nlcnxpgmq60q8dy50wsfg4xs6jqvvevk0";

const script: PlutusScript = {
  code: marketScriptCbor,
  version: "V2",
};

const scriptAddress = resolvePlutusScriptAddress(script, network);

export async function listAsset(
  wallet: BrowserWallet,
  asset: any
): Promise<string> {
  const address = await wallet.getChangeAddress();

  // AUCTION ---

  const deadline = Date.now() + 180_000;

  const { policyId, assetName } = parseAssetUnit(asset);

  console.log("LIST", policyId, assetName);

  const datum = {
    alternative: 0,
    fields: [resolvePaymentKeyHash(address), "", deadline, policyId, assetName],
  };

  const tx = new Transaction({ initiator: wallet }).sendAssets(
    {
      address: scriptAddress,
      datum: {
        value: datum,
        inline: true,
      },
    },
    [
      {
        unit: asset,
        quantity: "1",
      },
    ]
  );

  // // SIMPLE SELLING
  // const tx = new Transaction({ initiator: wallet }).sendAssets(
  //   {
  //     address: scriptAddress,
  //     datum: {
  //       value: {
  //         alternative: 0,
  //         fields: [paymentCredsHash.toString(), 2000000], // owner, cost
  //       },
  //       inline: true,
  //     },
  //   },
  //   [
  //     {
  //       unit: asset.unit,
  //       quantity: "1",
  //     },
  //   ]
  // );

  tx.setChangeAddress(address);

  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);

  return txHash;
}

export async function cancelListing(
  wallet: BrowserWallet,
  asset: any
): Promise<string> {
  const address = await wallet.getChangeAddress();
  // const walletKeyhash = resolvePaymentKeyHash(address);
  // const dataHash = resolveDataHash(walletKeyhash);

  // const utxo = await _getAssetUtxo(scriptAddress, dataHash);
  const utxo = await _getUnitAssetUtxo(scriptAddress, asset);

  const myUTxOs = await wallet.getUtxos();
  const filteredUTxOs = await _filterUtxos(myUTxOs);

  const redeemer: Partial<Action> = {
    tag: "SPEND",
    data: {
      alternative: 1,
      fields: ["cancel"],
    },
  };

  // let minutes = 1; // add 1 minutes
  // let nowDateTime = new Date();
  // let dateTimeAdd = new Date(nowDateTime.getTime() + minutes * 60);
  // const chain = network == 0 ? "preprod" : "mainnet";
  // const SLOT = resolveSlotNo(chain, dateTimeAdd.getTime());
  // console.log(SLOT);

  const tx = new Transaction({ initiator: wallet })
    .redeemValue({
      value: utxo,
      script,
      datum: utxo,
      redeemer,
    })
    .sendValue(address, utxo)
    .setRequiredSigners([address])
    .setCollateral(filteredUTxOs)
    .setTimeToExpire("49041850");

  // // SIMPLE SELLING
  // const redeemer: Partial<Action> = {
  //   tag: "SPEND",
  //   data: {
  //     alternative: 1,
  //     fields: ["bid"],
  //   },
  // };

  // const toAddress =
  //   "addr_test1qzflfsqmgkfzncurmx3h3qt3gye5t6drn0l3vh95rgt4rzdchgneut9gu6v3rgjddzsgk0wdy2z6cxyn36w4dhvl9gqqk48lty";

  // const tx = new Transaction({ initiator: wallet })
  //   .sendLovelace(toAddress, "1000000")
  //   .redeemValue({
  //     value: utxo,
  //     script,
  //     datum: utxo,
  //     redeemer, // ! test if needed
  //   })
  //   .sendValue(address, utxo)
  //   .setRequiredSigners([address])
  //   .setCollateral(filteredUTxOs);

  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx, true);
  const txHash = await wallet.submitTx(signedTx);

  return txHash;
}

export async function bidding(
  wallet: BrowserWallet,
  asset: any
): Promise<string> {
  const address = await wallet.getChangeAddress();

  const { policyId, assetName } = parseAssetUnit(asset);

  console.log("BID", policyId, assetName);

  const datum = {
    alternative: 0,
    fields: [
      resolvePaymentKeyHash(SELLER),
      resolvePaymentKeyHash(address),
      0,
      policyId,
      assetName,
    ],
  };

  const tx = new Transaction({ initiator: wallet })
    .sendLovelace(
      {
        address: scriptAddress,
        datum: {
          value: datum,
          inline: true,
        },
      },
      "1500000"
    )
    .setChangeAddress(address);

  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);

  return txHash;
}

export async function editBid(
  wallet: BrowserWallet,
  asset: any
): Promise<string> {
  const address = await wallet.getChangeAddress();

  const myUTxOs = await wallet.getUtxos();
  const filteredUTxOs = await _filterUtxos(myUTxOs);

  const redeemer: Partial<Action> = {
    tag: "SPEND",
    data: {
      alternative: 1,
      fields: ["edit"],
    },
  };

  const { policyId, assetName } = parseAssetUnit(asset);

  const datum = {
    alternative: 0,
    fields: [
      resolvePaymentKeyHash(SELLER),
      resolvePaymentKeyHash(address),
      policyId,
      assetName,
    ],
  };
  const dataHash = resolveDataHash(datum);
  const utxo = await _getAssetUtxo(scriptAddress, dataHash);

  const tx = new Transaction({ initiator: wallet })
    .sendLovelace(
      {
        address: scriptAddress,
        datum: {
          value: datum,
          inline: true,
        },
      },
      "2000000"
    )
    .redeemValue({
      value: utxo,
      script,
      datum: utxo,
      redeemer,
    })
    .sendValue(address, utxo)
    .setRequiredSigners([address])
    .setCollateral(filteredUTxOs);

  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx, true);
  const txHash = await wallet.submitTx(signedTx);

  return txHash;
}

export async function withdrawBid(
  wallet: BrowserWallet,
  asset: any
): Promise<string> {
  const address = await wallet.getChangeAddress();

  const myUTxOs = await wallet.getUtxos();
  const filteredUTxOs = await _filterUtxos(myUTxOs);

  const redeemer: Partial<Action> = {
    tag: "SPEND",
    data: {
      alternative: 1,
      fields: ["withdraw"],
    },
  };

  const { policyId, assetName } = parseAssetUnit(asset);

  const datum = {
    alternative: 0,
    fields: [
      resolvePaymentKeyHash(SELLER),
      resolvePaymentKeyHash(address),
      policyId,
      assetName,
    ],
  };
  const dataHash = resolveDataHash(datum);
  const utxo = await _getAssetUtxo(scriptAddress, dataHash);

  const tx = new Transaction({ initiator: wallet })
    .redeemValue({
      value: utxo,
      script,
      datum: utxo,
      redeemer,
    })
    .sendValue(address, utxo)
    .setRequiredSigners([address])
    .setCollateral(filteredUTxOs);

  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx, true);
  const txHash = await wallet.submitTx(signedTx);

  return txHash;
}

export async function closeListing(
  wallet: BrowserWallet,
  asset: any
): Promise<string> {
  const adaUtxo = await _getAssetUtxo(scriptAddress, "");
  const assetUtxo = await _getUnitAssetUtxo(scriptAddress, asset);

  const myUTxOs = await wallet.getUtxos();
  const filteredUTxOs = await _filterUtxos(myUTxOs);

  const redeemer: Partial<Action> = {
    tag: "SPEND",
    data: {
      alternative: 1,
      fields: ["close"],
    },
  };

  console.log("CLOSE", assetUtxo);

  const tx = new Transaction({ initiator: wallet })
    .redeemValue({
      value: assetUtxo,
      script,
      datum: assetUtxo,
      redeemer,
    })
    .sendValue(BIDDER, assetUtxo)

    .redeemValue({
      value: adaUtxo,
      script,
      datum: adaUtxo,
      redeemer,
    })
    .sendValue(SELLER, adaUtxo)

    .setRequiredSigners([SELLER])
    .setCollateral(filteredUTxOs)
    .setTimeToStart("49042600");

  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx, true);
  const txHash = await wallet.submitTx(signedTx);

  return txHash;
}

async function _getAssetUtxo(scriptAddress: any, dataHash: any) {
  const provider = new BlockfrostProvider(
    "preprodl8GlCXsH7K34vz80YGbiqSKaVlUC8QDv"
  );
  const utxos = await provider.fetchAddressUTxOs(scriptAddress, "lovelace");
  let utxo = utxos[utxos.length - 1];
  // let utxo = utxos.find((u: any) => u.output.dataHash == dataHash);
  // && u.output.amount[0].quantity == "1100000"

  console.log("utxos lovelace", utxos);
  console.log("utxo lovelace", utxo);

  return utxo;
}

async function _getUnitAssetUtxo(scriptAddress: any, asset: any) {
  const provider = new BlockfrostProvider(
    "preprodl8GlCXsH7K34vz80YGbiqSKaVlUC8QDv"
  );
  const utxos = await provider.fetchAddressUTxOs(scriptAddress, asset);
  let utxo = utxos[utxos.length - 1];
  // let utxo = utxos.find((u: any) => u.output.dataHash == dataHash);

  console.log("utxos asset", utxos);
  console.log("utxo asset", utxo);

  return utxo;
}
