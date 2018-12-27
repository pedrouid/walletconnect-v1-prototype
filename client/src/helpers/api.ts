import axios, { AxiosInstance } from "axios";
import { IAssetData, IGasPrices } from "./types";
import { convertStringToNumber, divide, multiply } from "./bignumber";
import { getChainData } from "./utilities";

const api: AxiosInstance = axios.create({
  baseURL: "https://blockscout.com/",
  timeout: 30000, // 30 secs
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json"
  }
});

export async function apiGetAccountBalance(address: string, chainId: number) {
  const chainData = getChainData(chainId);
  const chain = chainData.chain.toLowerCase();
  const network = chainData.network.toLowerCase();
  const module = "account";
  const action = "balance";

  const result = await api.get(
    `/${chain}/${network}/api?module=${module}&action=${action}&address=${address}`
  );
  return result;
}

export async function apiGetAccountTokenList(address: string, chainId: number) {
  const chainData = getChainData(chainId);
  const chain = chainData.chain.toLowerCase();
  const network = chainData.network.toLowerCase();
  const module = "account";
  const action = "tokenlist";
  const result = await api.get(
    `/${chain}/${network}/api?module=${module}&action=${action}&address=${address}`
  );
  return result;
}

export async function apiGetAccountTokenBalance(
  address: string,
  chainId: number,
  contractAddress: string
) {
  const chainData = getChainData(chainId);
  const chain = chainData.chain.toLowerCase();
  const network = chainData.network.toLowerCase();
  const module = "account";
  const action = "tokenbalance";
  const result = await api.get(
    `/${chain}/${network}/api?module=${module}&action=${action}&contractaddress=${contractAddress}&address=${address}`
  );
  return result;
}

export async function apiGetAccountAssets(address: string, chainId: number) {
  const chainData = getChainData(chainId);

  const nativeCurrency: IAssetData =
    chainData.chain.toLowerCase() !== "dai"
      ? {
          symbol: "ETH",
          name: "Ethereum",
          decimals: "18",
          contractAddress: "",
          balance: ""
        }
      : {
          symbol: "DAI",
          name: "Dai Stablecoin v1.0",
          decimals: "18",
          contractAddress: "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359",
          balance: ""
        };

  const balanceRes = await apiGetAccountBalance(address, chainId);

  nativeCurrency.balance = balanceRes.data.result;

  const tokenListRes = await apiGetAccountTokenList(address, chainId);

  const tokenList: IAssetData[] = tokenListRes.data.result;

  const tokens: IAssetData[] = await Promise.all(
    tokenList.map(
      async (token: IAssetData): Promise<IAssetData> => {
        const tokenBalanceRes = await apiGetAccountTokenBalance(
          address,
          chainId,
          token.contractAddress
        );

        token.balance = tokenBalanceRes.data.result;

        return token;
      }
    )
  );

  const assets: IAssetData[] = [nativeCurrency, ...tokens];

  return assets;
}
export const apiGetGasPrices = async (): Promise<IGasPrices> => {
  const { data } = await axios.get(
    `https://ethgasstation.info/json/ethgasAPI.json`
  );
  const result: IGasPrices = {
    slow: {
      time: convertStringToNumber(multiply(data.safeLowWait, 60)),
      price: convertStringToNumber(divide(data.safeLow, 10))
    },
    average: {
      time: convertStringToNumber(multiply(data.avgWait, 60)),
      price: convertStringToNumber(divide(data.average, 10))
    },
    fast: {
      time: convertStringToNumber(multiply(data.fastestWait, 60)),
      price: convertStringToNumber(divide(data.fastest, 10))
    }
  };
  return result;
};

export const apiGetAccountNonce = (
  address: string,
  chainId: number
): Promise<any> => {
  const chainData = getChainData(chainId);
  if (chainData.chain !== "ETH") {
    throw new Error("Chain not supported");
  }
  const network = chainData.network;
  return axios.post(`https://${network}.infura.io/`, {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "eth_getTransactionCount",
    params: [address, "pending"]
  });
};
