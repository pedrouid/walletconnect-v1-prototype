export interface IEncryptionPayload {
  data: string;
  hmac: string;
  iv: string;
}

export interface ISocketMessage {
  topic: string;
  payload: string;
}

export interface ISessionStatus {
  chainId: number;
  accounts: string[];
}

export interface ISessionError {
  message?: string;
}

export interface IInternalEvent {
  event: string;
  params: any;
}

export interface ITxData {
  from: string;
  to: string;
  nonce: string;
  gasPrice: string;
  gasLimit: string;
  value: string;
  data: string;
}

export interface IRpcResponse {
  id: number;
  jsonrpc: string;
  result: any;
}

export interface IPartialRpcRequest {
  id?: number;
  jsonrpc?: string;
  method: string;
  params: any[];
}

export interface IFullRpcRequest {
  id: number;
  jsonrpc: string;
  method: string;
  params: any[];
}

export interface IClientMeta {
  description: string;
  url: string;
  icons: string[];
  name: string;
  ssl: boolean;
}

export interface IEventEmitter {
  event: string;
  callback: (error: Error | null, request: any | null) => void;
}

export interface IRequiredParamsResult {
  handshakeTopic: string;
  version: number;
}

export interface IQueryParamsResult {
  node: string;
  key: string;
}

export interface IParseURIResult {
  protocol: string;
  handshakeTopic: string;
  version: number;
  node: string;
  key: string;
}

export interface ISessionParams {
  approved: boolean;
  chainId: number | null;
  accounts: string[] | null;
  peerId?: string | null;
  peerMeta?: IClientMeta | null;
  message?: string | null;
}

export interface IWalletConnectSession {
  connected: boolean;
  accounts: string[];
  chainId: number;
  node: string;
  key: string;
  clientId: string;
  clientMeta: IClientMeta;
  peerId: string;
  peerMeta: IClientMeta | null;
  handshakeId: number;
  handshakeTopic: string;
}

export interface IWalletConnectOptions {
  node?: string;
  uri?: string;
  session?: IWalletConnectSession;
}
