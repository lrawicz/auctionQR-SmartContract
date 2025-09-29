import { QrAuction } from '../tools/qrAuction';

async function  main(){
    try{
        const smartContract = new QrAuction()
        await smartContract.getData().then(data => console.log("Data: ", data))
        await smartContract.getBalance().then(balance => console.log("Balance: ", balance))
    }catch(error){
        console.log(error)
    }
}
main()