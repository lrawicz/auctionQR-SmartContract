import inquirer from 'inquirer';
import { QrAuction } from '../tools/qrAuction';

inquirer
  .prompt([
    {
      type: 'list',
      name: 'network',
      message: 'Select the network',
      choices: ['localnet', 'devnet', 'mainnet-beta'],
    },
    {
      type: 'input',
      name: 'programId',
      message: 'Enter the programId (optional)',
    },
    {
      type: 'list',
      name: 'command',
      message: 'Select the command',
      choices: ['init', 'start', 'end','getData'],
    },
  ])
  .then(async (answers) => {
    console.log(answers);
    console.log("------------")
    console.log("  network: ", answers.network);
    console.log("  programId: ", answers.programId);
    console.log("  command: ", answers.command);
    console.log("------------")
    const smartContract = new QrAuction(answers.network,answers.programId!==""? answers.programId:undefined );
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
            .then(() => console.log("contract ended"))
            .catch(err => console.error(err));
        break;
        case "getData":
            await smartContract.getData().then(data => console.log("Data: ", data))
            await smartContract.getBalance().then(balance => console.log("Balance: ", balance))
        break;
    }
    })
  .catch((error) => {
    if (error.isTtyError) {
      // Prompt couldn't be rendered in the current environment
    } else {
      // Something else went wrong
    }
  });