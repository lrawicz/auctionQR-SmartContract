import inquirer from 'inquirer';
import { QrAuction } from '../tools/qrAuction';
async function  main(){
  await inquirer
    .prompt([
      {
        type: 'list',
        name: 'network',
        message: 'Select the network',
        choices: ['localnet', 'devnet', 'mainnet-beta'],
      },
      {
        type: 'list',
        name: 'command',
        message: 'Select the command',
        choices: ['init', 'start', 'end','getData', 'set-authority', 'reset','set-auction-number'],
      },
    ])
    .then(async (answers) => {
      try{

      const smartContract = new QrAuction( );
      console.log("------------")
      console.log("  network: ", answers.network);
      console.log("  adddress: ", smartContract.getContractAddress());
      console.log("  command: ", answers.command);
      console.log("------------")
      switch(answers.command){
          case "init":
              await smartContract.initialize({initialContent:"Initial Content"})
              .then(() => console.log("Auction initialized"))
              .catch(err => console.error(err));
          break;
          case "start":
              await smartContract.start_auction()
              .then(() => console.log("contract started"))
              .catch(err => console.error(err));
          break;
          case "end":
              await smartContract.end_auction()
              .then(async () => {
                console.log("contract ended");
              })
              .catch(err => console.error(err));
          break;
          case "getData":
              await smartContract.getData().then(data => console.log("Data: ", data))
              await smartContract.getBalance().then(balance => console.log("Balance: ", balance))
          break;
          case "set-authority":
            let userInput_01 = await inquirer.prompt([{type:"input", name:"newAuthority", message:"new authority pubkey"}])
            await smartContract.setAuthority(userInput_01.newAuthority)
            .then(() => console.log("Authority updated"))
            .catch(err => console.error(err));
          break;
          case "set-auction-number":
            const userInput_setAuctionNumber = await inquirer.prompt([{type:"input", name:"newAuctionNumber", message:"new auction index number"}])
            await smartContract.setAuctionNumber(userInput_setAuctionNumber.newAuctionNumber)
              .then(() => console.log(`auction number set to ${userInput_setAuctionNumber.newAuctionNumber}`))
              .catch(err => console.error(err));
          break;
          case "reset":
            let userInput_02 = await inquirer.prompt([{type:"input", name:"newContent", message:"new content"}])
            await smartContract.endAndStartAuction(userInput_02.newContent)
            .then(() => console.log("Auction reset"))
            .catch(err => console.error(err));
          break;
      }
      }
      catch(error){
        console.log(error)
      }
      })
    .catch((error) => {
      if (error.isTtyError) {
        // Prompt couldn't be rendered in the current environment
      } else {
        // Something else went wrong
      }
    });
}
main()