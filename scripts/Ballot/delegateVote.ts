import { Contract, ethers } from "ethers";
import "dotenv/config";
import * as ballotJson from "../../artifacts/contracts/Ballot.sol/Ballot.json";
// eslint-disable-next-line node/no-missing-import
import { Ballot } from "../../typechain";

const EXPOSED_KEY =
  "8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f";

async function main() {
    const wallet =
      process.env.MNEMONIC && process.env.MNEMONIC.length > 0
        ? ethers.Wallet.fromMnemonic(process.env.MNEMONIC)
        : new ethers.Wallet(process.env.PRIVATE_KEY ?? EXPOSED_KEY);
    console.log(`Using address ${wallet.address}`);
    const provider = ethers.providers.getDefaultProvider("ropsten");
    const signer = wallet.connect(provider);
    const balanceBN = await signer.getBalance();
    const balance = Number(ethers.utils.formatEther(balanceBN));
    console.log(`Wallet balance ${balance}`);
    if (balance < 0.01) {
      throw new Error("Not enough ether");
    }
    if (process.argv.length < 3) throw new Error("Ballot address missing");
    const ballotAddress = process.argv[2];

    if(process.argv.length < 4) throw new Error("Delegate to address missing");

    console.log(
      `Attaching ballot contract interface to address ${ballotAddress}`
    );
    const ballotContract: Ballot = new Contract(
      ballotAddress,
      ballotJson.abi,
      signer
    ) as Ballot;
  
    const delegateTo = await ballotContract.voters(process.argv[3]);
    const sender = await ballotContract.voters(signer.address);

    if(sender.weight.toNumber() < 1) throw new Error("Sender does not have any votes to delegate");
    if(sender.voted) throw new Error("Sender already voted");
    if(delegateTo == sender) throw new Error("Cannot self-delegate");
    if(delegateTo.weight.toNumber() < 1) throw new Error("Delegate does not have any weight");

    const tx = await ballotContract.delegate(process.argv[3]);
    console.log("Awaiting confirmations");
    await tx.wait();
    console.log(`Transaction completed. Hash: ${tx.hash}`);

    console.log(sender);

  }
  
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });