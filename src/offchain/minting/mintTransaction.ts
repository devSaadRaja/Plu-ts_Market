import {
  Transaction,
  AssetMetadata,
  Mint,
  Action,
  BrowserWallet,
  PlutusScript,
  resolvePlutusScriptAddress,
} from "@meshsdk/core";
import { nftScriptCbor } from "../../../contracts/mintNFT";
import { _filterUtxos, network } from "../constants";
import { Address } from "@harmoniclabs/plu-ts";

export async function mintTransaction(
  wallet: BrowserWallet,
  metadata: AssetMetadata
): Promise<string> {
  const script: PlutusScript = {
    code: nftScriptCbor,
    version: "V2",
  };
  const scriptAddress = resolvePlutusScriptAddress(script, network);

  const recipient = await wallet.getChangeAddress();

  const asset: Mint = {
    // assetName: "Fantasy Player | Desmond Ridder",
    assetName: "MeshToken",
    assetQuantity: "1",
    metadata,
    label: "721",
    recipient,
  };

  const redeemer: Partial<Action> = {
    tag: "MINT",
    // data: {
    //   alternative: 0,
    //   fields: ["Please Mint"], // "Please Mint"
    // },
  };

  const myUTxOs = await wallet.getUtxos();
  const filteredUTxOs = await _filterUtxos(myUTxOs);

  const address = await wallet.getChangeAddress();
  const myAddr = Address.fromString(address);
  const paymentCredsHash = myAddr.paymentCreds.hash;

  console.log(paymentCredsHash.toString());

  const toAddress =
    "addr_test1qzflfsqmgkfzncurmx3h3qt3gye5t6drn0l3vh95rgt4rzdchgneut9gu6v3rgjddzsgk0wdy2z6cxyn36w4dhvl9gqqk48lty";

  const tx = new Transaction({ initiator: wallet })
    .sendLovelace(
      {
        address: toAddress, // scriptAddress,
        // datum: {
        //   value: walletKeyhash,
        //   // value: "supersecret",
        //   inline: true,
        // },
      },
      "2000000"
    )
    .mintAsset(script, asset, redeemer)
    .setCollateral(filteredUTxOs);

  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);

  return txHash;
}
