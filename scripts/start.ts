import {QrAuction} from "../tools/qrAuction"

let smartContract = new QrAuction()
smartContract.start_auction()
  .then(() => console.log("Auction started"))
  .catch(err => console.error(err));