// GET NETWORK YOU ARE WORKING ON
// 0 - preprod (testnet), 1 - mainnet
export const network = 0;

// // --------------------------------------------// //
// // --------------------------------------------// //
// // --------------------------------------------// //

// FILTER UTXOs
export async function _filterUtxos(myUTxOs: any) {
  if (myUTxOs.length === 0)
    throw new Error("Have you requested funds from the faucet?");

  const adaOnlyUtxos = myUTxOs.filter(
    (utxo: any) =>
      utxo.output.amount.length === 1 &&
      utxo.output.amount[0].unit === "lovelace"
  );

  const utxos = adaOnlyUtxos.sort(
    (a: any, b: any) =>
      b.output.amount[0].quantity - a.output.amount[0].quantity
  );

  // if (utxos.length > 3) return utxos.slice(0, 3);
  // else return utxos;
  return [utxos[0]];
}
