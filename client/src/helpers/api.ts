import axios, { AxiosInstance } from "axios";
import { IChainData, IAssetData, IGasPrices } from "./types";
import { convertStringToNumber, divide, multiply } from "./bignumber";

const api: AxiosInstance = axios.create({
  baseURL: "https://blockscout.com/",
  timeout: 30000, // 30 secs
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json"
  }
});

export async function apiGetAccountBalance(
  chainData: IChainData,
  address: string
) {
  const { chain, network } = chainData;
  const module = "account";
  const action = "balance";

  const result = await api.get(
    `/${chain}/${network}/api?module=${module}&action=${action}&address=${address}`
  );
  return result;
}

export async function apiGetAccountTokenList(
  chainData: IChainData,
  address: string
) {
  const { chain, network } = chainData;
  const module = "account";
  const action = "tokenlist";
  const result = await api.get(
    `/${chain}/${network}/api?module=${module}&action=${action}&address=${address}`
  );
  return result;
}

export async function apiGetAccountTokenBalance(
  chainData: IChainData,
  address: string,
  contractAddress: string
) {
  const { chain, network } = chainData;
  const module = "account";
  const action = "tokenbalance";
  const result = await api.get(
    `/${chain}/${network}/api?module=${module}&action=${action}&contractaddress=${contractAddress}&address=${address}`
  );
  return result;
}

export async function apiGetAccountFullBalances(
  chainData: IChainData,
  address: string
) {
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

  const balanceRes = await apiGetAccountBalance(chainData, address);

  nativeCurrency.balance = balanceRes.data.result;

  const tokenListRes = await apiGetAccountTokenList(chainData, address);

  const tokenList: IAssetData[] = tokenListRes.data.result;

  const tokens: IAssetData[] = await Promise.all(
    tokenList.map(
      async (token: IAssetData): Promise<IAssetData> => {
        const tokenBalanceRes = await apiGetAccountTokenBalance(
          chainData,
          address,
          token.contractAddress
        );

        token.balance = tokenBalanceRes.data.result;

        return token;
      }
    )
  );

  const fullBalances: IAssetData[] = [nativeCurrency, ...tokens];

  return fullBalances;
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
  chainData: IChainData
): Promise<any> => {
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
