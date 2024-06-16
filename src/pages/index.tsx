import ConnectionHandler from "../components/ConnectionHandler";
import { Button, useToast } from "@chakra-ui/react";
import { AssetMetadata } from "@meshsdk/core";
import { useNetwork, useWallet } from "@meshsdk/react";
import { mintTransaction } from "@/offchain/minting/mintTransaction";
import {
  listAsset,
  cancelListing,
  bidding,
  withdrawBid,
  closeListing,
  editBid,
} from "@/offchain/tradeAsset/buysell";

export default function Home() {
  const { wallet, connected } = useWallet();
  const network = useNetwork();
  const toast = useToast();

  if (typeof network === "number" && network !== 0) {
    return (
      <div className={"center-child-flex-even"}>
        <b
          style={{
            margin: "auto 10vw",
          }}
        >
          Make sure to set your wallet in testnet mode
        </b>
        <Button
          onClick={() => window.location.reload()}
          style={{
            margin: "auto 10vw",
          }}
        >
          Refresh page
        </Button>
      </div>
    );
  }

  const transaction = (func: any, params: any) => {
    func(...params)
      .then((txHash: any) => {
        console.log(
          `Transaction submitted: https://preprod.cardanoscan.io/transaction/${txHash}`
        );
      })
      .catch((e: any) => {
        toast({
          title: `something went wrong`,
          status: "error",
        });
        console.error(e);
        console.error(e.message);
      });
  };

  const mint = () => {
    const metadata: AssetMetadata = {
      // ADD HERE ---
      id: 1,
      tier: 1,
      name: "Token 123",
      description: "This NFT is minted by Testing",
      image: "ipfs://",
      mediaType: "image/jpg",
    };

    // const metadata: AssetMetadata = {
    //   // ADD HERE ---
    //   id: 22502,
    //   tier: 1,
    //   name: "Desmond Ridder",
    //   description: "An American football quarterback for the Atlanta Falcons.",
    //   image: "ipfs://",
    //   mediaType: "image/jpg",
    // };

    transaction(mintTransaction, [wallet, metadata]);
  };

  const asset =
    "0efbf22329b452e6fc458230340cae532d005e2333fe2c083808eb244d657368546f6b656e";

  const list = async () => {
    const assets = await wallet.getAssets();
    console.log(assets);
    console.log(assets[0].unit);
    console.log(assets[0].quantity);
    transaction(listAsset, [wallet, assets[0].unit]);
  };

  const delist = async () => {
    transaction(cancelListing, [wallet, asset]);
  };

  const bid = async () => {
    let utxos = await wallet.getUtxos();
    // utxos = utxos.filter((u) => u.output.amount[0].quantity >= "2000000");
    // u.output.amount.length == 1 &&
    console.log(utxos);
    transaction(bidding, [wallet, asset]);
  };

  const edit = async () => {
    transaction(editBid, [wallet, asset]);
  };

  const withdraw = async () => {
    transaction(withdrawBid, [wallet, asset]);
  };

  const close = async () => {
    transaction(closeListing, [wallet, asset]);
  };

  return (
    <>
      <ConnectionHandler />
      {connected && (
        <>
          <br />
          <br />
          <Button className="content-center" onClick={mint}>
            MINT
          </Button>
          <br />
          <br />
          <Button className="content-center" onClick={bid}>
            BID
          </Button>
          <br />
          <br />
          <Button className="content-center" onClick={edit}>
            EDIT BID
          </Button>
          <br />
          <br />
          <Button className="content-center" onClick={withdraw}>
            WITHDRAW BID
          </Button>
          <br />
          <br />
          <Button className="content-center" onClick={close}>
            CLOSE
          </Button>
          <br />
          <br />
          <Button className="content-center" onClick={list}>
            LIST
          </Button>
          <br />
          <br />
          <Button className="content-center" onClick={delist}>
            DELIST
          </Button>
        </>
      )}
    </>
  );
}
