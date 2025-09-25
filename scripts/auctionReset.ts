import { QrAuction } from '../tools/qrAuction';
import fs from 'fs';

async function  main(){
    try{
        const idlsData = await fs.readdirSync('./idls')
                        .filter(file => file.endsWith('.json'))
                        .reduce((acc, file) => {
                            acc[file] = JSON.parse(fs.readFileSync(`./idls/${file}`, 'utf8'));
                            return acc;
                        }, {} as any)
        const smartContract = new QrAuction('devnet',idlsData['idl_devnet.json'])
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