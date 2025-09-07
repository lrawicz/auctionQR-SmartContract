import {QrAuction} from "../tools/qrAuction"
import * as anchor from "@coral-xyz/anchor";

let smartContract = new QrAuction()
let bidder = anchor.web3.Keypair.generate()

smartContract.getData().then(data => {
   smartContract.bid({
     bidder,
     oldBidderPublicKey:data.highestBidder,
     bidAmount:1,
     newContent:"New Content"
   })
     .then(() => console.log("Bid placed"))
     .catch(err => console.error(err));

})