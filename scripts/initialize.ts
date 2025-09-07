import {QrAuction} from "../tools/qrAuction"

let smartContract = new QrAuction()

smartContract.initialize({initialContent:"Initial Content"})
  .then(() => console.log("Auction initialized"))
  .catch(err => console.error(err));