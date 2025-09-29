import { QrAuction } from '../tools/qrAuction';

async function  main(){
    try{
        const smartContract = new QrAuction()
        console.log("-------------------")
        console.log("Auction reset")
        console.log("-------------------")
        await smartContract.endAndStartAuction('https://qrsol.fun')
        console.log("-------------------")
        console.log("Auction data")
        console.log("-------------------")
        await smartContract.getData().then(data => console.log("Data: ", data))
        await smartContract.getBalance().then(balance => console.log("Balance: ", balance))
    }catch(error){
        console.log(error)
    }
}
main()