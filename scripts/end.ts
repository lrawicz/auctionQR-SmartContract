import {QrAuction} from "../tools/qrAuction"

let smartContract = new QrAuction()
smartContract.end_auction()
  .then(() => console.log("Auction ended"))
  .catch(err => console.error(err));