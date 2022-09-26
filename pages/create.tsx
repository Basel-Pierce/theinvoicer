import React, { FC, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import format from "date-fns/format";
// @ts-ignore
import { useScreenshot } from "use-react-screenshot";
import { Web3Storage, File } from "web3.storage";
// @ts-ignore
import { CopyToClipboard } from "react-copy-to-clipboard";
import QRCode from "react-qr-code";
import { toast } from "react-toastify";
import { PlusCircleIcon } from "@heroicons/react/20/solid";
import { useTronlink } from "../hooks";
import Sidebar from "../components/sidebar";
import Top from "../components/top";
import { Invoice, ProductLine } from "../data/types";
import { initialInvoice, initialProductLine } from "../data/initialData";
import EditableInput from "../components/editableInput";
import EditableSelect from "../components/editableSelect";
import EditableTextarea from "../components/editableTextarea";
import EditableCalendarInput from "../components/editableCalendarInput";
import EditableFileImage from "../components/editableFileImage";
import countryList from "../data/countryList";
import stableList from "../data/stableList";
import Text from "../components/text";
import Spinner from "../components/spinner";
import ActionPanel from "../components/actionPanel";
import Link from "next/link";

interface Props {
  data?: Invoice;
  onChange?: (invoice: Invoice) => void;
}

const Create: FC<Props> = ({ data, onChange }) => {
  const {
    address, // The connected wallet address
    walletName, // The wallet name
    trxBalance, // The wallet TRX balance
    isConnected, // A boolean checking it is connected or not
    tronWeb,
  } = useTronlink();

  const [image, takeScreenshot] = useScreenshot();
  const [watermarkImage, setWatermarkImage] = useState();

  const router = useRouter();
  const ref = useRef<HTMLElement>(
    null
  ) as React.MutableRefObject<HTMLInputElement>;

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [invoice, setInvoice] = useState<Invoice>(
    data ? { ...data } : { ...initialInvoice }
  );
  const [subTotal, setSubTotal] = useState<number>();
  const [saleTax, setSaleTax] = useState<number>();
  const [generating, setGenerating] = useState<boolean>(false);
  const [disabled, setDisabled] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  const [link, setLink] = useState<string>();
  const [showQR, setShowQR] = useState<boolean>(false);

  const dateFormat = "MMM dd, yyyy";
  const invoiceDate =
    invoice.invoiceDate !== "" ? new Date(invoice.invoiceDate) : new Date();
  const invoiceDueDate =
    invoice.invoiceDueDate !== ""
      ? new Date(invoice.invoiceDueDate)
      : new Date(invoiceDate.valueOf());

  if (invoice.invoiceDueDate === "") {
    invoiceDueDate.setDate(invoiceDueDate.getDate() + 30);
  }

  const rotate = function (target: any) {
    const context = target.getContext("2d");
    const text = "[PAID]";
    const metrics = context.measureText(text);
    const x = target.width / 2 - (metrics.width + 90);
    const y = target.height / 2 + 90;

    context.translate(x, y);
    context.globalAlpha = 0.5;
    context.fillStyle = "#f01e2c";
    context.font = "90px Verdana";
    context.rotate((-35 * Math.PI) / 180);
    context.fillText(text, 0, 0);
    return target;
  };

  const upload = async (image: any) => {
    try {
      const invoiceAmount =
        typeof subTotal !== "undefined" && typeof saleTax !== "undefined"
          ? subTotal + saleTax
          : 0;

      if (invoiceAmount === 0) {
        toast.error("Total should be greater than zero", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
        });
        setGenerating(false);
        setDisabled(false);
        return false;
      }

      const convert = require("ethereum-unit-converter");

      const InvoicerContract = await tronWeb
        ?.contract()
        .at(process.env.NEXT_PUBLIC_INVOICER);

      const rawCreationPrice = await InvoicerContract.getCreationPrice().call();

      const enoughBalance =
        Number(
          convert(process.env.NEXT_PUBLIC_CREATE_INVOICE_COST, "mwei").wei
        ) + Number(rawCreationPrice.toString());

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
        setGenerating(false);
        setDisabled(false);
        return false;
      }

      const watermarkjs = require("watermarkjs");
      const { src: watermarkImage } = await watermarkjs([image]).image(rotate);
      setWatermarkImage(watermarkImage);
      const client = new Web3Storage({
        token: process.env.NEXT_PUBLIC_WEB3_STORAGE!,
      });
      const [original, paid] = await Promise.all([
        fetch(image),
        fetch(watermarkImage),
      ]);
      const originalBlob = await original.blob();
      const paidBlob = await paid.blob();
      const names = ["invoice.png", "paid.png"];
      const files = [
        new File([originalBlob], names[0], { type: "image/png" }),
        new File([paidBlob], names[1], { type: "image/png" }),
      ];
      const imagesCid = await client.put(files);
      const metadata = [
        new File(
          [
            new Blob(
              [
                JSON.stringify({
                  name: "Invoice",
                  description: "Invoice",
                  image: `ipfs://${imagesCid}/${names[0]}`,
                }),
              ],
              { type: "application/json" }
            ),
          ],
          "metadata"
        ),
        new File(
          [
            new Blob(
              [
                JSON.stringify({
                  name: "Paid Invoice",
                  description: "Paid Invoice",
                  image: `ipfs://${imagesCid}/${names[1]}`,
                }),
              ],
              { type: "application/json" }
            ),
          ],
          "metadata_paid"
        ),
      ];
      const metadatasCid = await client.put(metadata);

      try {
        const tx = await InvoicerContract.createInvoice(
          // "ipfs://bafybeiagxlzoaecpfuhknb6jvwbitk4pb5badvsedfzf5agltcok5mptpq/metadata",
          `ipfs://${metadatasCid}/metadata`,
          invoice.currency === "USDT"
            ? Number(convert(invoiceAmount, "mwei").wei)
            : convert(invoiceAmount, "ether").wei,
          invoice.currency === "USDT"
            ? process.env.NEXT_PUBLIC_USDT
            : process.env.NEXT_PUBLIC_USDD
        ).send({
          feeLimit: 100000000,
          callValue: rawCreationPrice,
        });

        let result;

        do {
          result = await tronWeb?.getEventByTransactionID(tx);
        } while (result.length === 0);

        const eventIndex = result.findIndex(
          (item: { name: string }) => item.name === "InvoiceListed"
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
          setGenerating(false);
          setDisabled(false);
          return false;
        }

        setDone(true);
        setLink(`/invoice/${result[eventIndex].result.invoiceId}`);
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
        setGenerating(false);
        setDisabled(false);
        return false;
      }

      setGenerating(false);
      setDisabled(false);
    } catch (e) {
      setGenerating(false);
      setDisabled(false);
    }
  };

  const getImage = () => {
    if (!generating) {
      setGenerating(true);
      setDisabled(true);
      stakeScreenshot(ref.current).then(upload);
    }
  };

  const handleChange = (name: keyof Invoice, value: string | number) => {
    if (name !== "productLines") {
      const newInvoice = { ...invoice };

      if (name === "logoWidth" && typeof value === "number") {
        newInvoice[name] = value;
      } else if (name !== "logoWidth" && typeof value === "string") {
        newInvoice[name] = value;
      }

      setInvoice(newInvoice);
    }
  };

  const handleProductLineChange = (
    index: number,
    name: keyof ProductLine,
    value: string
  ) => {
    const productLines = invoice.productLines.map((productLine, i) => {
      if (i === index) {
        const newProductLine = { ...productLine };

        if (name === "description") {
          newProductLine[name] = value;
        } else {
          if (
            value[value.length - 1] === "." ||
            (value[value.length - 1] === "0" && value.includes("."))
          ) {
            newProductLine[name] = value;
          } else {
            const n = parseFloat(value);

            newProductLine[name] = (n ? n : 0).toString();
          }
        }

        return newProductLine;
      }

      return { ...productLine };
    });

    setInvoice({ ...invoice, productLines });
  };

  const handleRemove = (i: number) => {
    const productLines = invoice.productLines.filter(
      (productLine, index) => index !== i
    );

    setInvoice({ ...invoice, productLines });
  };

  const handleAdd = () => {
    const productLines = [...invoice.productLines, { ...initialProductLine }];

    setInvoice({ ...invoice, productLines });
  };

  const calculateAmount = (quantity: string, rate: string) => {
    const quantityNumber = parseFloat(quantity);
    const rateNumber = parseFloat(rate);
    const amount =
      quantityNumber && rateNumber ? quantityNumber * rateNumber : 0;

    return amount.toFixed(2);
  };

  useEffect(() => {
    let subTotal = 0;

    invoice.productLines.forEach((productLine) => {
      const quantityNumber = parseFloat(productLine.quantity);
      const rateNumber = parseFloat(productLine.rate);
      const amount =
        quantityNumber && rateNumber ? quantityNumber * rateNumber : 0;

      subTotal += amount;
    });

    setSubTotal(subTotal);
  }, [invoice.productLines]);

  useEffect(() => {
    const match = invoice.taxLabel.match(/(\d+)%/);
    const taxRate = match ? parseFloat(match[1]) : 0;
    const saleTax = subTotal ? (subTotal * taxRate) / 100 : 0;

    setSaleTax(saleTax);
  }, [subTotal, invoice.taxLabel]);

  useEffect(() => {
    if (onChange) {
      onChange(invoice);
    }
  }, [onChange, invoice]);

  return (
    <div className="relative">
      {showQR && (
        <div
          className="absolute top-0 w-full h-full z-50 bg-white/90"
          onClick={() => {
            setShowQR(false);
          }}
        >
          <div className="w-full h-full relative">
            <div className="flex justify-center items-center absolute inset-0">
              <QRCode
                value={
                  isConnected && done && link
                    ? `${process.env.NEXT_PUBLIC_ABSOLUTE_URL}${link}`
                    : ""
                }
              />
            </div>
          </div>
        </div>
      )}

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
              {isConnected && !done && (
                <div className="px-4 sm:px-6 md:px-0">
                  <div className="py-4 relative">
                    {generating && (
                      <div className="absolute top-0 w-full h-full z-50 bg-white/90">
                        <div className="w-full h-full relative">
                          <div className="flex justify-center items-center absolute inset-0">
                            <Spinner styles="h-6 w-6 text-black" />
                            <p className="text-gray-800 text-base ml-3">
                              Creating invoice, please be patient
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={ref}>
                      <div>
                        <div className="sm:flex sm:items-center">
                          <div className="sm:flex-auto">
                            <EditableFileImage
                              className="ml-3"
                              placeholder="Your Logo"
                              value={invoice.logo}
                              width={invoice.logoWidth}
                              onChangeImage={(value) =>
                                handleChange("logo", value)
                              }
                              onChangeWidth={(value) =>
                                handleChange("logoWidth", value)
                              }
                            />
                            <EditableInput
                              className="text-xl font-semibold text-gray-900"
                              placeholder="Your Company"
                              value={invoice.companyName}
                              onChange={(value) =>
                                handleChange("companyName", value)
                              }
                              autoFocus={true}
                            />
                            <EditableInput
                              className="text-sm text-gray-700"
                              placeholder="Your Name"
                              value={invoice.name}
                              onChange={(value) => handleChange("name", value)}
                            />
                            <EditableInput
                              className="text-sm text-gray-700"
                              placeholder="Company's Address"
                              value={invoice.companyAddress}
                              onChange={(value) =>
                                handleChange("companyAddress", value)
                              }
                            />
                            <EditableInput
                              className="text-sm text-gray-700"
                              placeholder="City, State Zip"
                              value={invoice.companyAddress2}
                              onChange={(value) =>
                                handleChange("companyAddress2", value)
                              }
                            />
                          </div>
                        </div>
                        <div className="md:grid md:grid-cols-2 gap-2">
                          <div>
                            <EditableInput
                              className="font-bold"
                              value={invoice.billTo}
                              onChange={(value) =>
                                handleChange("billTo", value)
                              }
                            />
                            <EditableInput
                              className="text-sm text-gray-700"
                              placeholder="Your Client's Name"
                              value={invoice.clientName}
                              onChange={(value) =>
                                handleChange("clientName", value)
                              }
                            />
                            <EditableInput
                              className="text-sm text-gray-700"
                              placeholder="Client's Address"
                              value={invoice.clientAddress}
                              onChange={(value) =>
                                handleChange("clientAddress", value)
                              }
                            />
                            <EditableInput
                              className="text-sm text-gray-700"
                              placeholder="City, State Zip"
                              value={invoice.clientAddress2}
                              onChange={(value) =>
                                handleChange("clientAddress2", value)
                              }
                            />
                          </div>
                          <div className="">
                            <div className="grid grid-cols-2 items-start gap-2">
                              <EditableInput
                                className="block text-sm font-bold text-gray-700 mt-px pt-2"
                                value={invoice.invoiceTitleLabel}
                                onChange={(value) =>
                                  handleChange("invoiceTitleLabel", value)
                                }
                              />
                              <EditableInput
                                placeholder="INV-1"
                                value={invoice.invoiceTitle}
                                onChange={(value) =>
                                  handleChange("invoiceTitle", value)
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 items-start gap-2">
                              <EditableInput
                                className="block text-sm font-bold text-gray-700 mt-px pt-2"
                                value={invoice.invoiceDateLabel}
                                onChange={(value) =>
                                  handleChange("invoiceDateLabel", value)
                                }
                              />
                              <EditableCalendarInput
                                value={format(invoiceDate, dateFormat)}
                                selected={invoiceDate}
                                onChange={(date) =>
                                  handleChange(
                                    "invoiceDate",
                                    date && !Array.isArray(date)
                                      ? format(date, dateFormat)
                                      : ""
                                  )
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 items-start gap-2">
                              <EditableInput
                                className="block text-sm font-bold text-gray-700 mt-px pt-2"
                                value={invoice.invoiceDueDateLabel}
                                onChange={(value) =>
                                  handleChange("invoiceDueDateLabel", value)
                                }
                              />
                              <EditableCalendarInput
                                value={format(invoiceDueDate, dateFormat)}
                                selected={invoiceDueDate}
                                onChange={(date) =>
                                  handleChange(
                                    "invoiceDueDate",
                                    date && !Array.isArray(date)
                                      ? format(date, dateFormat)
                                      : ""
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-8 overflow-hidden shadow ring-1 ring-black ring-opacity-5  md:rounded-lg">
                          <table className="min-w-full">
                            <thead className="bg-gray-400">
                              <tr>
                                <th
                                  scope="col"
                                  className="text-left text-sm font-semibold text-gray-900"
                                >
                                  <EditableInput
                                    className="bg-transparent"
                                    value={invoice.productLineDescription}
                                    onChange={(value) =>
                                      handleChange(
                                        "productLineDescription",
                                        value
                                      )
                                    }
                                  />
                                </th>
                                <th
                                  scope="col"
                                  className="hidden text-left text-sm font-semibold text-gray-900 lg:table-cell"
                                >
                                  <EditableInput
                                    className="bg-transparent"
                                    value={invoice.productLineQuantity}
                                    onChange={(value) =>
                                      handleChange("productLineQuantity", value)
                                    }
                                  />
                                </th>
                                <th
                                  scope="col"
                                  className="hidden text-left text-sm font-semibold text-gray-900 sm:table-cell"
                                >
                                  <EditableInput
                                    className="bg-transparent"
                                    value={invoice.productLineQuantityRate}
                                    onChange={(value) =>
                                      handleChange(
                                        "productLineQuantityRate",
                                        value
                                      )
                                    }
                                  />
                                </th>
                                <th
                                  scope="col"
                                  className="text-left text-sm font-semibold text-gray-900"
                                >
                                  <EditableInput
                                    className="bg-transparent"
                                    value={invoice.productLineQuantityAmount}
                                    onChange={(value) =>
                                      handleChange(
                                        "productLineQuantityAmount",
                                        value
                                      )
                                    }
                                  />
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {invoice.productLines.map((productLine, i) => (
                                <tr key={i}>
                                  <td className="w-full max-w-0 text-sm font-medium text-gray-900 sm:w-auto sm:max-w-none">
                                    <EditableTextarea
                                      rows={2}
                                      placeholder="Enter item name/description"
                                      value={productLine.description}
                                      onChange={(value) =>
                                        handleProductLineChange(
                                          i,
                                          "description",
                                          value
                                        )
                                      }
                                    />
                                    <dl className="font-normal lg:hidden">
                                      <dt className="font-bold">
                                        <EditableInput
                                          value={invoice.productLineQuantity}
                                          onChange={(value) =>
                                            handleChange(
                                              "productLineQuantity",
                                              value
                                            )
                                          }
                                        />
                                      </dt>
                                      <dd className="truncate text-gray-700">
                                        <EditableInput
                                          value={productLine.quantity}
                                          onChange={(value) =>
                                            handleProductLineChange(
                                              i,
                                              "quantity",
                                              value
                                            )
                                          }
                                        />
                                      </dd>
                                      <dt className="sm:hidden font-bold">
                                        <EditableInput
                                          value={
                                            invoice.productLineQuantityRate
                                          }
                                          onChange={(value) =>
                                            handleChange(
                                              "productLineQuantityRate",
                                              value
                                            )
                                          }
                                        />
                                      </dt>
                                      <dd className="truncate text-gray-500 sm:hidden">
                                        <EditableInput
                                          value={productLine.rate}
                                          onChange={(value) =>
                                            handleProductLineChange(
                                              i,
                                              "rate",
                                              value
                                            )
                                          }
                                        />
                                      </dd>
                                    </dl>
                                  </td>
                                  <td className="hidden text-sm text-gray-500 lg:table-cell">
                                    <EditableInput
                                      value={productLine.quantity}
                                      onChange={(value) =>
                                        handleProductLineChange(
                                          i,
                                          "quantity",
                                          value
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="hidden text-sm text-gray-500 sm:table-cell">
                                    <EditableInput
                                      value={productLine.rate}
                                      onChange={(value) =>
                                        handleProductLineChange(
                                          i,
                                          "rate",
                                          value
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="text-sm text-gray-500 pl-3">
                                    {calculateAmount(
                                      productLine.quantity,
                                      productLine.rate
                                    )}
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td colSpan={4}>
                                  <button
                                    onClick={handleAdd}
                                    type="button"
                                    className="mt-2 ml-2 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
                                  >
                                    <PlusCircleIcon
                                      className="-ml-0.5 mr-2 h-4 w-4 text-green-600"
                                      aria-hidden="true"
                                    />
                                    Add Item
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={4}>
                                  <div className="flex flex-row-reverse">
                                    <div className="xl:w-1/2 w-full mt-20">
                                      <div className="flex items-center pr-4">
                                        <div>
                                          <EditableInput
                                            value={invoice.subTotalLabel}
                                            onChange={(value) =>
                                              handleChange(
                                                "subTotalLabel",
                                                value
                                              )
                                            }
                                          />
                                        </div>
                                        <div className="w-full">
                                          <p className="leading-7 text-sm font-bold text-gray-600 sm:text-right">
                                            {subTotal?.toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center pr-4">
                                        <div>
                                          <EditableInput
                                            value={invoice.taxLabel}
                                            onChange={(value) =>
                                              handleChange("taxLabel", value)
                                            }
                                          />
                                        </div>
                                        <div className="w-full">
                                          <div className="leading-7 text-sm font-bold text-gray-600 sm:text-right">
                                            {saleTax?.toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="bg-gray-100 flex items-center pr-4">
                                        <div className="flex">
                                          <EditableInput
                                            className="bg-transparent font-bold w-20"
                                            value={invoice.totalLabel}
                                            onChange={(value) =>
                                              handleChange("totalLabel", value)
                                            }
                                          />

                                          <EditableSelect
                                            className="bg-transparent w-24"
                                            options={stableList}
                                            value={invoice.currency}
                                            onChange={(value) =>
                                              handleChange("currency", value)
                                            }
                                          />
                                        </div>

                                        <div className="w-full">
                                          <div className="leading-7 font-bold text-sm text-gray-600 sm:text-right">
                                            {(typeof subTotal !== "undefined" &&
                                            typeof saleTax !== "undefined"
                                              ? subTotal + saleTax
                                              : 0
                                            ).toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={getImage}
                      type="button"
                      disabled={disabled}
                      className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      Generate Invoice
                    </button>
                  </div>

                  {/* <img src={image} />
                  <img src={watermarkImage} /> */}
                </div>
              )}

              {isConnected && done && link && true && (
                <>
                  <div className="bg-white shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg font-medium leading-6 text-gray-900">
                        The Invoice was generated!
                      </h3>
                      <div className="mt-2 max-w-xl text-sm text-gray-500">
                        <p>
                          <CopyToClipboard
                            text={`${process.env.NEXT_PUBLIC_ABSOLUTE_URL}${link}`}
                            onCopy={() =>
                              toast.success("Copied", {
                                position: "top-right",
                                autoClose: 2000,
                                theme: "dark",
                              })
                            }
                          >
                            <button
                              type="button"
                              className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                              Copy the link to clipboard
                            </button>
                          </CopyToClipboard>
                        </p>
                        <p className="mt-2">
                          <button
                            onClick={() => {
                              setShowQR(true);
                            }}
                            type="button"
                            className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                          >
                            QR code link
                          </button>
                        </p>
                      </div>
                      <div className="mt-3 text-sm">
                        <Link href={link}>
                          <a className="font-medium text-indigo-600 hover:text-indigo-500">
                            div the Invoice
                            <span aria-hidden="true"> &rarr;</span>
                          </a>
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => router.reload()}
                      type="button"
                      className="mt-4 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      Generate a new Invoice
                    </button>
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

export default Create;
