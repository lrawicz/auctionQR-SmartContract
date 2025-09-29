
import 'dotenv/config';
import * as anchor from "@coral-xyz/anchor";

type NetworkConfig = {
    idl: string;
    type: string;
}
type settingsType = {
    solana:{
        networkSelected:anchor.web3.Cluster,
        networks:Partial<Record<anchor.web3.Cluster, NetworkConfig>>
    },
    db:{
        user:string,
        host:string,
        database:string,
        password:string,
        port:number
    }

}
export const settings:settingsType= {
    solana:{
        networkSelected:process.env.NETWORK_SELECTED as anchor.web3.Cluster || "devnet",
        networks:{
            "devnet":{
                idl:"idls/devnet/idl.json",
                type:"idls/devnet/types.ts"
            },
            "mainnet-beta":{
                idl:"idls/mainnet/idl.json",
                type:"idls/mainnet/types.ts"
            },
        }
    },
    db:{
        user:process.env.PG_USER || 'postgres',
        host:process.env.PG_HOST || 'localhost',
        database:process.env.PG_DATABASE || 'postgres',
        password:process.env.PG_PASSWORD || 'password',
        port:parseInt(process.env.PG_PORT || '5432', 10)
    }
}