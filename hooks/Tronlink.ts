import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { TronWeb } from "../@types/tronweb";

interface IReturnInteface {
  address: string;
  walletName: string;
  trxBalance: number;
  isConnected: boolean;
  tronWeb?: TronWeb;
}

export const useTronlink = (): IReturnInteface => {
  const [trxBalance, setTrxBalance] = useState(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [address, setAddress] = useState<string>("");
  const [walletName, setWalletName] = useState<string>("");
  const [tronWeb, setTronWeb] = useState<TronWeb>();

  const connectToWallet = useCallback(async (): Promise<boolean> => {
    if (window.tronLink) {
      try {
        const { code, message } = await window.tronLink.request({
          method: "tron_requestAccounts",
        });
        if (code !== 200) {
          return false;
        }
      } catch (e) {
        console.log(e);
      }
    }

    if (!window.tronWeb) return false;

    if (typeof window.tronWeb === "boolean") return false;

    const { name, base58 } = window.tronWeb.defaultAddress;

    if (base58) {
      setAddress(base58);
      setWalletName(name || "");
      setIsConnected(true);
      setTronWeb(window.tronWeb);

      try {
        const trxAmount = await window.tronWeb.trx.getBalance(base58);

        setTrxBalance(trxAmount);
      } catch (e) {}

      tronLinkEventListener();
      return true;
    }

    setIsConnected(false);
    return false;
  }, []);

  const cleanData = useCallback(() => {
    setTrxBalance(0);
    setIsConnected(false);
    setAddress("");
    setWalletName("");
    setTronWeb(undefined);
  }, []);

  const processConnection = async (msg: any) => {
    const { message } = msg.data;

    if (!message) return;

    // console.log(message);

    if (
      message.action === "setAccount" ||
      message.action === "setNode" ||
      message.action === "tabReply" ||
      message.action === "accountsChanged"
    ) {
      if (message.data.address) {
        connectToWallet();
      }

      if (message.action !== "tabReply" && !message.data.address) {
        cleanData();
      }
    }

    if (message.action === "connect" || message.action === "connectWeb") {
      setIsConnected(true);
    }

    if (message.action === "disconnect" || message.action === "disconnectWeb") {
      setIsConnected(false);
    }
  };

  const tronLinkEventListener = useCallback(() => {
    window.addEventListener("load", connectToWallet);
    window.addEventListener("message", processConnection);
  }, []);

  useEffect(() => {
    connectToWallet();
    // return () => {
    //   window.removeEventListener("load", connectToWallet);
    //   window.removeEventListener("message", processConnection);
    // };
  }, []);

  return {
    address,
    isConnected,
    trxBalance,
    walletName,
    tronWeb,
  };
};
