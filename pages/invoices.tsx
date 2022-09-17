import { useCallback, useEffect, useState } from "react";
import type { NextPage } from "next";
// @ts-ignore
import dateFormat from "dateformat";
import { useTronlink } from "../hooks";
import Sidebar from "../components/sidebar";
import Top from "../components/top";
import { TronWeb } from "../@types/tronweb";
import Link from "next/link";
import ActionPanel from "../components/actionPanel";

const people = [
  {
    name: "1",
    title: "10 MAY 2022",
    email: "10 MAY 2022",
    role: "500 USDT",
  },
  // More people...
];

interface CookedList {
  listed: boolean;
  amount: number;
  createdAt: Date;
  invoiceId: number;
  paidAt?: Date;
  token: string;
}

const Invoices: NextPage = () => {
  const {
    address, // The connected wallet address
    walletName, // The wallet name
    trxBalance, // The wallet TRX balance
    isConnected, // A boolean checking it is connected or not
    tronWeb,
  } = useTronlink();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cookedList, setCookedList] = useState<Array<CookedList>>();

  const cooking = (invoices: any, tronWeb: TronWeb) => {
    if (invoices.dataAmount.length === 0) {
      return false;
    }

    const convert = require("ethereum-unit-converter");

    const cookedList: CookedList[] = [];

    invoices.dataCurrentlyListed.forEach((isListed: any, i: number) => {
      cookedList.push({
        listed: isListed,
        amount:
          tronWeb.address.fromHex(invoices.dataToken[i]) ===
          process.env.NEXT_PUBLIC_USDT
            ? convert(Number(invoices.dataAmount[i].toString()), "wei").mwei
            : convert(Number(invoices.dataAmount[i].toString()), "wei").ether,
        createdAt: dateFormat(
          new Date(Number(invoices.dataCreatedAt[i].toString()) * 1000),
          "d mmm yyyy"
        ),
        invoiceId: Number(invoices.dataInvoiceId[i].toString()),
        paidAt:
          invoices.dataPaidAt[i] > 0
            ? dateFormat(
                new Date(Number(invoices.dataPaidAt[i].toString()) * 1000),
                "d mmm yyyy"
              )
            : undefined,
        token: tronWeb.address.fromHex(invoices.dataToken[i]),
      });
    });

    setCookedList(cookedList);
  };

  const start = useCallback(async (isConnected: boolean, tronWeb?: TronWeb) => {
    if (!isConnected || !tronWeb) {
      return false;
    }

    const InvoicerContract = await tronWeb
      ?.contract()
      .at(process.env.NEXT_PUBLIC_INVOICER);
    const rawCreatedInvoices =
      await InvoicerContract.getCreatedInvoices().call();

    cooking(rawCreatedInvoices, tronWeb);
  }, []);

  useEffect(() => {
    start(isConnected, tronWeb);
  }, [isConnected, tronWeb]);

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
            {isConnected && (
              <>
                <div className="py-6">
                  <div className="sm:flex sm:items-center">
                    <div className="sm:flex-auto">
                      <h1 className="text-xl font-semibold text-gray-900">
                        Incoming/Paid
                      </h1>
                      <p className="mt-2 text-sm text-gray-700">
                        A list of all the invoices paid
                      </p>
                    </div>
                    <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                      {/* <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                  >
                    Refresh
                  </button> */}
                    </div>
                  </div>
                  <div className="mt-8 flex flex-col">
                    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                      <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead>
                            <tr>
                              <th
                                scope="col"
                                className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
                              >
                                ID
                              </th>
                              <th
                                scope="col"
                                className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900"
                              >
                                Date of Creation
                              </th>
                              <th
                                scope="col"
                                className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900"
                              >
                                Date of Paid
                              </th>
                              <th
                                scope="col"
                                className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900"
                              >
                                Amount
                              </th>
                              <th
                                scope="col"
                                className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0"
                              >
                                <span className="sr-only">View Invoice</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {people.map((person) => (
                              <tr key={person.email}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
                                  {person.name}
                                </td>
                                <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">
                                  {person.title}
                                </td>
                                <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">
                                  {person.email}
                                </td>
                                <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">
                                  {person.role}
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 md:pr-0">
                                  <a
                                    href="#"
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    View Invoice
                                    <span className="sr-only">
                                      , {person.name}
                                    </span>
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden="true"
                  >
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-sm text-gray-500">
                      -
                    </span>
                  </div>
                </div>

                <div className="py-6">
                  <div className="sm:flex sm:items-center">
                    <div className="sm:flex-auto">
                      <h1 className="text-xl font-semibold text-gray-900">
                        Outgoing
                      </h1>
                      <p className="mt-2 text-sm text-gray-700">
                        A list of all the generated invoices
                      </p>
                    </div>
                    <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                      {/* <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                  >
                    Refresh
                  </button> */}
                    </div>
                  </div>
                  <div className="mt-8 flex flex-col">
                    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                      <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead>
                            <tr>
                              <th
                                scope="col"
                                className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
                              >
                                ID
                              </th>
                              <th
                                scope="col"
                                className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900"
                              >
                                Date of Creation
                              </th>
                              <th
                                scope="col"
                                className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900"
                              >
                                Status
                              </th>
                              <th
                                scope="col"
                                className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900"
                              >
                                Amount
                              </th>
                              <th
                                scope="col"
                                className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0"
                              >
                                <span className="sr-only">View Invoice</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {cookedList &&
                              cookedList
                                .sort(function (a: CookedList, b: CookedList) {
                                  return b.invoiceId - a.invoiceId;
                                })
                                .map((invoice) => (
                                  <tr key={invoice.invoiceId}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
                                      {invoice.invoiceId}
                                    </td>
                                    <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">
                                      {invoice.createdAt.toString()}
                                    </td>
                                    <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">
                                      <span
                                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                          invoice.listed
                                            ? "bg-red-100 text-red-800"
                                            : "bg-green-100 text-green-800"
                                        }`}
                                      >
                                        {invoice.listed ? "Not Paid" : "Paid"}
                                      </span>
                                    </td>
                                    <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">
                                      {invoice.amount}{" "}
                                      {invoice.token ===
                                      process.env.NEXT_PUBLIC_USDT
                                        ? "USDT"
                                        : "USDD"}
                                    </td>
                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 md:pr-0">
                                      <Link
                                        href={`/invoice/${invoice.invoiceId}`}
                                      >
                                        <a className="text-indigo-600 hover:text-indigo-900">
                                          View Invoice
                                        </a>
                                      </Link>
                                    </td>
                                  </tr>
                                ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!isConnected && (
              <div className="py-6">
                <ActionPanel />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Invoices;
