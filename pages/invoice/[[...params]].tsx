import React, { FC, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
// @ts-ignore
import dateFormat from "dateformat";
import { toast } from "react-toastify";
// @ts-ignore
import { LazyLoadImage } from "react-lazy-load-image-component";
import Sidebar from "../../components/sidebar";
import Top from "../../components/top";
import { useTronlink } from "../../hooks";
import { NextPage } from "next/types";
import ActionPanel from "../../components/actionPanel";
import { TronWeb } from "../../@types/tronweb";
import Spinner from "../../components/spinner";

import "react-lazy-load-image-component/src/effects/blur.css";

interface CookedList {
  listed: boolean;
  amount: number;
  createdAt: Date;
  invoiceId: number;
  paidAt?: Date;
  token: string;
  seller: string;
  paidBy?: string;
}

const Invoice: NextPage = () => {
  const {
    address, // The connected wallet address
    walletName, // The wallet name
    trxBalance, // The wallet TRX balance
    isConnected, // A boolean checking it is connected or not
    tronWeb,
  } = useTronlink();

  const router = useRouter();
  const { params } = router.query;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [invoiceImage, setInvoiceImage] = useState<string>();
  const [invoiceInfo, setInvoiceInfo] = useState<CookedList>();
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState<boolean>(false);

  const pay = async () => {
    setWorking(true);

    if (!isConnected || !tronWeb || !invoiceInfo || address === "") {
      setWorking(false);
      return false;
    }

    const convert = require("ethereum-unit-converter");

    const addressToken = tronWeb.address.fromHex(invoiceInfo.token);

    const [InvoicerContract, TokenContract] = await Promise.all([
      tronWeb?.contract().at(process.env.NEXT_PUBLIC_INVOICER),
      tronWeb?.contract().at(addressToken),
    ]);

    // TODO descomment this
    const rawPayPrice = 1000000;
    const [rawBalanceOf, tokenAllowance /*, rawPayPrice */] = await Promise.all(
      [
        TokenContract.balanceOf(address).call(),
        TokenContract.allowance(
          address,
          process.env.NEXT_PUBLIC_INVOICER
        ).call(),
        // InvoicerContract.getPayPrice().call(),
      ]
    );

    const enoughBalance =
      Number(convert(process.env.NEXT_PUBLIC_PAY_INVOICE_COST, "mwei").wei) +
      Number(rawPayPrice.toString());

    if (enoughBalance > trxBalance) {
      toast.error(
        `Not enough TRX balance to pay the transaction. We recommend at least ${
          convert(enoughBalance, "wei").mwei
        } TRX in wallet`,
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
        }
      );
      setWorking(false);
      return false;
    }

    const balanceOf = Number(rawBalanceOf.toString());

    if (balanceOf < invoiceInfo.amount) {
      toast.error(
        `Not enough ${
          addressToken === process.env.NEXT_PUBLIC_USDT ? "USDT" : "USDD"
        } balance to pay the invoice`,
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
        }
      );
      setWorking(false);
      return false;
    }

    if (tokenAllowance < invoiceInfo.amount) {
      try {
        const tx = await TokenContract.approve(
          process.env.NEXT_PUBLIC_INVOICER,
          invoiceInfo.amount.toString()
        ).send({
          feeLimit: 100000000,
        });

        let result;

        do {
          result = await tronWeb?.getEventByTransactionID(tx);
        } while (result.length === 0);

        const eventIndex = result.findIndex(
          (item: { name: string }) => item.name === "Approval"
        );

        if (eventIndex === -1) {
          toast.error("Transaction error", {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
          });
          setWorking(false);
          return false;
        }
      } catch (e) {
        console.log(e);
        toast.error("Something wrong happened", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
        });
        setWorking(false);
        return false;
      }
    }

    try {
      const tx = await InvoicerContract.payInvoice(
        invoiceInfo.invoiceId,
        invoiceInfo.amount.toString()
      ).send({
        feeLimit: 100000000,
        callValue: rawPayPrice,
      });

      let result;

      do {
        result = await tronWeb?.getEventByTransactionID(tx);
      } while (result.length === 0);

      const eventIndex = result.findIndex(
        (item: { name: string }) => item.name === "InvoicePaid"
      );

      if (eventIndex === -1) {
        toast.error("Transaction error", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
        });
        setWorking(false);
        return false;
      }

      toast.success("You paid the Invoice!", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });

      setWorking(false);
      setDone(true);
    } catch (e) {
      console.log(e);
      toast.error("Something wrong happened", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
      setWorking(false);
      return false;
    }
  };

  const cooking = (invoice: any, tronWeb: TronWeb) => {
    if (invoice.dataAmount.length === 0) {
      return false;
    }

    setInvoiceInfo({
      listed: invoice.dataCurrentlyListed,
      amount: Number(invoice.dataAmount.toString()),
      createdAt: dateFormat(
        new Date(Number(invoice.dataCreatedAt.toString()) * 1000),
        "d mmm yyyy"
      ),
      invoiceId: Number(invoice.dataInvoiceId.toString()),
      paidAt:
        invoice.dataPaidAt > 0
          ? dateFormat(
              new Date(Number(invoice.dataPaidAt.toString()) * 1000),
              "d mmm yyyy"
            )
          : undefined,
      token: tronWeb.address.fromHex(invoice.dataToken),
      seller: tronWeb.address.fromHex(invoice.dataSeller),
      paidBy: tronWeb.address.fromHex(invoice.dataPaidBy),
    });
  };

  const start = useCallback(
    async (params: any, isConnected: boolean, tronWeb?: TronWeb) => {
      if (typeof params === "undefined" || !isConnected || !tronWeb) {
        return false;
      }

      const InvoicerContract = await tronWeb
        ?.contract()
        .at(process.env.NEXT_PUBLIC_INVOICER);

      const [rawTokenURI, rawInvoiceById] = await Promise.all([
        InvoicerContract.tokenURI(params![0]).call(),
        InvoicerContract.getInvoiceById(params![0]).call(),
      ]);

      cooking(rawInvoiceById, tronWeb);

      const tokenURI = rawTokenURI.replace(
        "ipfs://",
        "https://nftstorage.link/ipfs/"
      );

      const metadataResponse = await fetch(tokenURI);
      const metadata = await metadataResponse.json();

      const image = metadata.image.replace(
        "ipfs://",
        "https://nftstorage.link/ipfs/"
      );

      setInvoiceImage(image);
    },
    []
  );

  useEffect(() => {
    start(params, isConnected, tronWeb);
  }, [params, isConnected, tronWeb]);

  return (
    <div>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="md:pl-64">
        <div className="mx-auto flex max-w-4xl flex-col md:px-8 xl:px-0">
          <Top
            setSidebarOpen={setSidebarOpen}
            address={address}
            isConnected={isConnected}
          />

          <main className="flex-1">
            <div className="py-6">
              {isConnected &&
                typeof params !== "undefined" &&
                params.length === 1 && (
                  <>
                    <div>
                      {invoiceImage && invoiceInfo && (
                        <div className="relative">
                          {working && (
                            <div className="absolute top-0 w-full h-full z-50 bg-white/90">
                              <div className="w-full h-full relative">
                                <div className="flex justify-center items-center absolute inset-0">
                                  <Spinner styles="h-10 w-10 text-black" />
                                </div>
                              </div>
                            </div>
                          )}
                          {!done && (
                            <LazyLoadImage
                              placeholderSrc="The image is still not available. Please wait..."
                              effect="blur"
                              src={invoiceImage}
                            />
                          )}
                          {done && (
                            <LazyLoadImage
                              placeholderSrc="The image is still not available. Please wait..."
                              effect="blur"
                              src={invoiceImage.replace("invoice", "paid")}
                            />
                          )}
                          {invoiceInfo &&
                            invoiceInfo.listed &&
                            !done &&
                            address !== invoiceInfo.seller && (
                              <div className="flex justify-center">
                                <div className="text-center">
                                  <p className="text-gray-500 text-sm mt-4">
                                    (You will sign two transactions)
                                  </p>
                                  <button
                                    onClick={pay}
                                    type="button"
                                    disabled={working}
                                    className="mt-4 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                                  >
                                    Pay Invoice
                                  </button>
                                </div>
                              </div>
                            )}
                          {invoiceInfo && !invoiceInfo.listed && (
                            <div className="flex justify-center">
                              <div className="text-center">
                                <p className="text-gray-500 text-sm mt-4">
                                  Paid by <strong>{invoiceInfo.paidBy}</strong>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {!invoiceImage && (
                        <div className="flex justify-center items-center">
                          <Spinner styles="h-10 w-10 text-black" />
                          <p className="text-gray-800 text-lg ml-3 font-semibold">
                            Loading Invoice...
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

              {!isConnected && <ActionPanel />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
