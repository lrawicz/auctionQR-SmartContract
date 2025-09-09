import {QrAuction} from "../tools/qrAuction"
let smartContract = new QrAuction()

async function main(){

  await smartContract.getData().then(data => {
    console.log("Data: ", data)
  })
  await smartContract.getBalance().then(balance => {
    console.log("Balance: ", balance)
})
  }
  main()  